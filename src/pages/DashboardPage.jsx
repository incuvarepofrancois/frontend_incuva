import { Component, createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, ArrowUpRight, CalendarClock, CheckCircle2, ChevronRight,
  ClipboardCheck, Clock3, Plug, Plus, RefreshCw, ShieldAlert, Users,
} from 'lucide-react';
import { getEmployees, getIntegrations, getOnboardingPlans } from '../services/api';
import './DashboardPage.css';

const dateKey = (value) => value ? String(value).slice(0, 10) : '';
const todayKey = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};
const daysUntil = (value) => {
  const parseCivilDate = (input) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey(input));
    if (!match) return null;
    const [, year, month, day] = match.map(Number);
    const check = new Date(year, month - 1, day);
    if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return null;
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  };
  const target = parseCivilDate(value);
  const today = parseCivilDate(todayKey());
  return target === null || today === null ? null : target - today;
};
const formatDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey(value));
  if (!match) return 'Date non renseignée';
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return 'Date non renseignée';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

async function getAllEmployees() {
  const perPage = 100;
  const first = await getEmployees({ page: 1, per_page: perPage });
  const total = first?.total;
  if (!Array.isArray(first?.employees) || !Number.isInteger(total) || total < 0 || first.page !== 1 || first.employees.length > perPage) {
    throw new Error('La réponse des collaborateurs ne contient pas les informations de pagination attendues.');
  }
  const employees = [...first.employees];
  const ids = new Set();
  for (const employee of employees) {
    if (employee?.id == null || ids.has(employee.id)) throw new Error('La première page des collaborateurs contient des identifiants manquants ou dupliqués.');
    ids.add(employee.id);
  }
  const totalPages = Math.ceil(total / perPage);
  for (let page = 2; page <= totalPages; page += 1) {
    const result = await getEmployees({ page, per_page: perPage });
    const expectedCount = Math.min(perPage, total - (page - 1) * perPage);
    if (!Array.isArray(result?.employees) || result.page !== page || result.total !== total || result.employees.length !== expectedCount) {
      throw new Error(`Impossible de confirmer la page ${page} des collaborateurs.`);
    }
    for (const employee of result.employees) {
      if (employee?.id == null || ids.has(employee.id)) throw new Error(`La page ${page} des collaborateurs contient des identifiants manquants ou répétés.`);
      ids.add(employee.id);
    }
    employees.push(...result.employees);
  }
  if (employees.length !== total) {
    throw new Error('La liste paginée des collaborateurs est incomplète.');
  }
  return employees.filter(Boolean);
}

function Metric({ icon: Icon, label, value, note, tone = '', onClick }) {
  const body = <><span className={`ois-kpi-icon ${tone}`}>{createElement(Icon, { size: 17, 'aria-hidden': true })}</span><span className="ois-kpi-label">{label}</span><strong>{value}</strong><small>{note}</small></>;
  return onClick ? <button type="button" className="ois-kpi ois-kpi-button" onClick={onClick}>{body}<ArrowUpRight className="ois-kpi-arrow" size={14} aria-hidden="true" /></button> : <article className="ois-kpi">{body}</article>;
}

function Heading({ eyebrow, title, description, action, onAction }) {
  return <div className="ois-section-heading"><div><span>{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{action && <button type="button" onClick={onAction}>{action}<ArrowRight size={14} aria-hidden="true" /></button>}</div>;
}

function Pill({ kind, label }) { return <span className={`ois-pill ${kind}`}><span />{label}</span>; }
function PlanStatus({ status }) {
  return status === 'completed' ? <Pill kind="success" label="Terminé" /> : status === 'active' ? <Pill kind="neutral" label="En cours" /> : <Pill kind="muted" label={status || 'Statut indisponible'} />;
}
function ConnectionStatus({ integration }) {
  const status = integration.connection_status;
  if (integration.sync?.status === 'queued') return <Pill kind="warning" label="Synchronisation en attente" />;
  if (integration.sync?.status === 'running') return <Pill kind="warning" label="Synchronisation en cours" />;
  if (integration.sync?.status === 'succeeded') return <Pill kind="success" label="Synchronisation réussie" />;
  if (integration.sync?.status === 'failed') return <Pill kind="danger" label="Synchronisation échouée" />;
  if (status === 'connected') return <Pill kind="success" label="Connexion testée" />;
  if (status === 'failed') return <Pill kind="danger" label="Connexion en échec" />;
  if (status === 'unverified' && integration.credentials_saved) return <Pill kind="warning" label="Identifiants enregistrés" />;
  return <Pill kind="muted" label="Non configuré" />;
}

function ProgressValue({ plan }) {
  const raw = plan.progress;
  const value = raw !== null && raw !== undefined && raw !== '' && Number.isFinite(Number(raw)) && Number(raw) >= 0 && Number(raw) <= 100
    ? Number(raw)
    : null;
  if (value === null) return <span className="ois-progress-unknown">Non renseignée</span>;
  return <div className="ois-progress"><strong>{value}%</strong><span><i style={{ width: `${value}%` }} /></span></div>;
}

class DashboardErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Erreur de rendu de la vue Overview :', error); }
  render() {
    return this.state.failed
      ? <div className="ois-error-state" role="alert"><strong>La vue d’ensemble n’a pas pu s’afficher.</strong><p>Rechargez la page pour réessayer.</p><button type="button" onClick={() => window.location.reload()}>Recharger</button></div>
      : this.props.children;
  }
}

function DashboardContent() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState({ plans: [], employees: [], integrations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [integrationError, setIntegrationError] = useState(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIntegrationError(null);
    try {
      const [planData, employees] = await Promise.all([getOnboardingPlans(), getAllEmployees()]);
      if (!planData || !Array.isArray(planData.plans) || planData.plans.length > 200 || planData.plans.some((plan) => !plan || plan.id == null || !Array.isArray(plan.tasks))) {
        throw new Error('La réponse des parcours est invalide ou incomplète.');
      }
      const planIds = new Set();
      if (planData.plans.some((plan) => planIds.has(plan.id) || !planIds.add(plan.id))) {
        throw new Error('La réponse des parcours contient des identifiants manquants ou dupliqués.');
      }
      let integrations = [];
      try {
        const result = await getIntegrations();
        integrations = Array.isArray(result?.integrations) ? result.integrations : [];
      } catch (requestError) {
        setIntegrationError({ status: requestError.status, message: requestError.message });
      }
      setOverview({
        plans: planData.plans,
        employees,
        integrations,
      });
    } catch (requestError) {
      const status = requestError.status;
      const kind = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'error';
      setError({ kind, message: kind === 'unauthorized'
        ? 'Votre session a expiré ou ne permet plus cette consultation.'
        : kind === 'forbidden'
          ? 'Votre rôle ne permet pas de consulter les données d’onboarding ou les collaborateurs.'
          : requestError.message || 'Les données du tableau de bord sont indisponibles.' });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const plans = overview.plans;
  const tasks = useMemo(() => plans.flatMap((plan) => (Array.isArray(plan.tasks) ? plan.tasks : []).filter(Boolean).map((task) => ({ ...task, plan }))), [plans]);
  const activePlans = plans.filter((plan) => plan.status === 'active');
  const completedPlans = plans.filter((plan) => plan.status === 'completed');
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const overdueTasks = tasks.filter((task) => task.status !== 'completed' && daysUntil(task.due_date) !== null && daysUntil(task.due_date) < 0);
  const activeEmployeeIds = new Set(activePlans.map((plan) => plan.employee_id));
  const employeesWithoutPlan = overview.employees.filter((employee) => !activeEmployeeIds.has(employee.id));
  const progressValues = plans.map((plan) => plan.progress).filter((progress) => progress !== null && progress !== undefined && progress !== '' && Number.isFinite(Number(progress)) && Number(progress) >= 0 && Number(progress) <= 100).map(Number);
  const averageProgress = progressValues.length ? Math.round(progressValues.reduce((sum, progress) => sum + progress, 0) / progressValues.length) : null;
  const attentionPlans = activePlans.filter((plan) => (plan.tasks || []).some((task) => task.status !== 'completed' && daysUntil(task.due_date) !== null && daysUntil(task.due_date) < 0));
  const upcomingTasks = tasks.filter((task) => task.status !== 'completed' && daysUntil(task.due_date) !== null && daysUntil(task.due_date) >= 0 && daysUntil(task.due_date) <= 7)
    .sort((a, b) => dateKey(a.due_date).localeCompare(dateKey(b.due_date))).slice(0, 5);
  const recentlyCompleted = tasks.filter((task) => task.status === 'completed' && task.completed_at)
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))).slice(0, 5);
  const journeyRows = [...plans].sort((a, b) => (a.status === b.status ? dateKey(a.start_date).localeCompare(dateKey(b.start_date)) : a.status === 'active' ? -1 : 1)).slice(0, 6);
  const number = (value) => loading || error ? '—' : value.toLocaleString('fr-FR');
  const integrationItems = overview.integrations.filter((item) => item.credentials_saved || ['connected', 'failed'].includes(item.connection_status) || item.sync?.status);
  const plansMayBeTruncated = plans.length === 200;
  const integrationErrorMessage = integrationError?.status === 401
    ? 'Votre session ne permet plus de consulter l’état des intégrations.'
    : integrationError?.status === 403
      ? 'Votre rôle ne permet pas de consulter l’état des intégrations.'
      : 'L’état des intégrations n’a pas pu être chargé.';

  const attention = [
    ...(overdueTasks.length ? [{ key: 'tasks', icon: CalendarClock, title: `${overdueTasks.length} tâche${overdueTasks.length > 1 ? 's' : ''} en retard`, copy: 'Échéance passée et tâche non terminée.', action: 'Examiner', tone: 'danger' }] : []),
    ...(attentionPlans.length ? [{ key: 'plans', icon: AlertCircle, title: `${attentionPlans.length} parcours avec des tâches échues`, copy: 'Au moins une tâche non terminée a dépassé son échéance.', action: 'Voir les parcours', tone: 'warning' }] : []),
    ...(employeesWithoutPlan.length ? [{ key: 'employees', icon: Users, title: `${employeesWithoutPlan.length} collaborateur${employeesWithoutPlan.length > 1 ? 's' : ''} sans parcours actif`, copy: 'D’après la liste complète de collaborateurs chargée.', action: 'Préparer une arrivée', tone: 'neutral' }] : []),
  ];

  return <div className="dashboard-overview ois-overview">
    <header className="ois-page-heading"><div><span>INCUVA OIS · PILOTAGE</span><h2>Vue d’ensemble</h2><p>Suivez les parcours d’intégration et identifiez les prochaines actions de votre équipe.</p></div><div className="ois-page-actions"><span className="ois-current-date">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date())}</span><button type="button" className="ois-secondary-button" onClick={loadOverview} disabled={loading}><RefreshCw size={15} className={loading ? 'ois-spinning' : ''} aria-hidden="true" />Actualiser</button><button type="button" className="ois-primary-button" onClick={() => navigate('/onboarding')}><Plus size={15} aria-hidden="true" />Préparer une arrivée</button></div></header>

    {error && <div className={`ois-alert ${error.kind}`} role={error.kind === 'error' ? 'alert' : 'status'}><ShieldAlert size={18} aria-hidden="true" /><div><strong>{error.kind === 'unauthorized' ? 'Session requise' : error.kind === 'forbidden' ? 'Accès refusé' : 'Données indisponibles'}</strong><p>{error.message}</p></div>{error.kind === 'error' && <button type="button" onClick={loadOverview}>Réessayer</button>}{error.kind === 'unauthorized' && <button type="button" onClick={() => navigate('/login')}>Se reconnecter</button>}</div>}

    {!error && plansMayBeTruncated && <div className="ois-scope-note" role="note">Les indicateurs et alertes d’onboarding portent sur les 200 parcours renvoyés au maximum par l’API. Ils peuvent ne pas couvrir tous les parcours de l’organisation.</div>}
    <section className="ois-kpi-grid" aria-label="Indicateurs d’onboarding" aria-busy={loading}>
      <Metric icon={ClipboardCheck} label="Parcours actifs" value={number(activePlans.length)} note="Parmi les parcours chargés (maximum 200)" tone="accent" onClick={() => navigate('/onboarding')} />
      <Metric icon={Users} label="Collaborateurs en onboarding" value={number(activeEmployeeIds.size)} note="Identifiants distincts dans les parcours actifs chargés" tone="teal" onClick={() => navigate('/onboarding')} />
      <Metric icon={CheckCircle2} label="Parcours terminés" value={number(completedPlans.length)} note="Parmi les parcours chargés (maximum 200)" tone="success" onClick={() => navigate('/onboarding')} />
      <Metric icon={CheckCircle2} label="Tâches terminées" value={number(completedTasks.length)} note={`Sur ${number(tasks.length)} tâche${tasks.length === 1 ? '' : 's'} chargée${tasks.length === 1 ? '' : 's'}`} tone="success" onClick={() => navigate('/onboarding')} />
      <Metric icon={Clock3} label="Tâches en retard" value={number(overdueTasks.length)} note="Dans les parcours chargés; échéance passée et non terminée" tone={overdueTasks.length ? 'danger' : ''} onClick={() => navigate('/onboarding')} />
      <Metric icon={ArrowUpRight} label="Progression moyenne" value={loading || error || averageProgress === null ? '—' : `${averageProgress}%`} note={`${progressValues.length} parcours valides sur ${plans.length} chargé${plans.length === 1 ? '' : 's'}`} tone="teal" />
    </section>

    <section className="ois-panel" aria-labelledby="ois-attention-title"><Heading eyebrow="À TRAITER" title="Attention opérationnelle" description={plansMayBeTruncated ? 'Constats calculés sur les parcours chargés (maximum 200).' : 'Constats déterministes calculés depuis les statuts et dates disponibles.'} action="Ouvrir les parcours" onAction={() => navigate('/onboarding')} />
      {loading ? <div className="ois-loading" role="status">Analyse des parcours…</div> : error ? <p className="ois-inline-state">Les alertes sont masquées tant que les données ne sont pas disponibles.</p> : attention.length ? <div className="ois-attention-list">{attention.map(({ key, icon, title, copy, action, tone }) => <article className={`ois-attention-item ${tone}`} key={key}><span>{createElement(icon, { size: 17, 'aria-hidden': true })}</span><div><strong>{title}</strong><p>{copy}</p></div><button type="button" onClick={() => navigate('/onboarding')}>{action}<ChevronRight size={14} aria-hidden="true" /></button></article>)}</div> : <div className="ois-empty compact"><CheckCircle2 size={19} aria-hidden="true" /><div><strong>Aucun point d’attention détecté</strong><p>Aucune tâche échue ni collaborateur sans parcours actif dans les données chargées.</p></div></div>}
    </section>

    <section className="ois-panel" aria-labelledby="ois-journeys-title"><Heading eyebrow="SUIVI DES PARCOURS" title="Parcours d’onboarding" description={plansMayBeTruncated ? 'Parcours chargés par l’API (maximum 200) ; la liste peut être partielle.' : 'Progression et tâches associées à chaque collaborateur.'} action="Voir tous les parcours" onAction={() => navigate('/onboarding')} />
      {loading ? <div className="ois-loading" role="status">Chargement des parcours…</div> : error ? <p className="ois-inline-state">Les parcours ne peuvent pas être affichés sans accès aux données.</p> : journeyRows.length ? <div className="ois-table-wrap"><table className="ois-table"><caption className="ois-visually-hidden">Parcours d’onboarding chargés, avec progression, date d’arrivée et statut. Activez une ligne avec Entrée ou Espace pour ouvrir les parcours.</caption><thead><tr><th scope="col">Collaborateur</th><th scope="col">Date d’arrivée</th><th scope="col">Progression</th><th scope="col">Tâches terminées</th><th scope="col">Statut</th></tr></thead><tbody>{journeyRows.map((plan) => <tr key={plan.id} onClick={() => navigate('/onboarding')} tabIndex="0" aria-label={`Ouvrir les parcours d’onboarding, ${plan.employee?.name || 'collaborateur'}`} onKeyDown={(event) => { if (event.key === 'Enter') navigate('/onboarding'); if (event.key === ' ') { event.preventDefault(); navigate('/onboarding'); } }}><td><strong>{plan.employee?.name || 'Collaborateur'}</strong><small>{plan.employee?.role || 'Poste non renseigné'}</small></td><td>{formatDate(plan.start_date)}</td><td><ProgressValue plan={plan} /></td><td>{plan.completed_tasks ?? 0} / {plan.total_tasks ?? 0}</td><td><PlanStatus status={plan.status} />{(plan.tasks || []).some((task) => task.status !== 'completed' && daysUntil(task.due_date) !== null && daysUntil(task.due_date) < 0) && <small className="ois-late-label">Retard</small>}</td></tr>)}</tbody></table></div> : <div className="ois-empty"><ClipboardCheck size={20} aria-hidden="true" /><div><strong>Aucun parcours enregistré</strong><p>Créez un parcours pour organiser les étapes d’une prochaine arrivée.</p></div><button type="button" onClick={() => navigate('/onboarding')}>Créer un parcours<ArrowRight size={14} aria-hidden="true" /></button></div>}
    </section>

    <div className="ois-two-column">
      <section className="ois-panel"><Heading eyebrow="PROCHAINES ÉCHÉANCES" title="Tâches à suivre" description="Tâches ouvertes dont l’échéance arrive sous 7 jours." action="Parcours" onAction={() => navigate('/onboarding')} />
        {loading ? <div className="ois-loading" role="status">Chargement des tâches…</div> : error ? <p className="ois-inline-state">Tâches indisponibles sans les données des parcours.</p> : upcomingTasks.length ? <ul className="ois-task-list">{upcomingTasks.map((task) => { const left = daysUntil(task.due_date); return <li key={task.id}><Clock3 size={16} aria-hidden="true" /><div><strong>{task.title}</strong><small>{task.plan.employee?.name || 'Collaborateur'} · {task.owner_type === 'hr' ? 'RH' : task.owner_type === 'employee' ? 'Collaborateur' : 'Manager'}</small></div><time>{left === 0 ? 'Aujourd’hui' : left === 1 ? 'Demain' : `Dans ${left} j`}</time></li>; })}</ul> : <div className="ois-empty compact"><CheckCircle2 size={18} aria-hidden="true" /><div><strong>Aucune échéance sous 7 jours</strong><p>Aucune tâche ouverte avec une date proche dans les parcours chargés.</p></div></div>}
      </section>
      <section className="ois-panel"><Heading eyebrow="AVANCEMENT" title="Tâches récemment terminées" description="Triées selon la date de complétion enregistrée." />
        {loading ? <div className="ois-loading" role="status">Chargement des tâches…</div> : error ? <p className="ois-inline-state">Éléments indisponibles sans les données des parcours.</p> : recentlyCompleted.length ? <ul className="ois-completed-list">{recentlyCompleted.map((task) => <li key={task.id}><CheckCircle2 size={16} aria-hidden="true" /><div><strong>{task.title}</strong><small>{task.plan.employee?.name || 'Collaborateur'} · {formatDate(task.completed_at)}</small></div></li>)}</ul> : <div className="ois-empty compact"><CheckCircle2 size={18} aria-hidden="true" /><div><strong>Aucune complétion datée</strong><p>Les tâches sans date de complétion ne sont pas présentées comme activité récente.</p></div></div>}
      </section>
    </div>

    <section className="ois-panel"><Heading eyebrow="CONNEXIONS" title="État des intégrations" description="La connexion testée est distincte d’une synchronisation réussie." action="Gérer les intégrations" onAction={() => navigate('/workspace/integrations')} />
      {loading ? <div className="ois-loading" role="status">Chargement des intégrations…</div> : integrationError ? <div className="ois-inline-state" role={integrationError.status === 401 ? 'status' : integrationError.status === 403 ? 'status' : 'alert'}>{integrationErrorMessage} {integrationError.status === 401 ? <button type="button" onClick={() => navigate('/login')}>Se reconnecter</button> : integrationError.status === 403 ? <button type="button" onClick={() => navigate('/workspace/integrations')}>Ouvrir les intégrations</button> : <button type="button" onClick={loadOverview}>Réessayer</button>}</div> : integrationItems.length ? <div className="ois-integration-list">{integrationItems.slice(0, 6).map((integration) => <article key={integration.key}><span className="ois-integration-mark">{(integration.name || integration.key).slice(0, 1).toUpperCase()}</span><div><strong>{integration.name}</strong><small>{integration.category || 'Intégration'}</small></div><ConnectionStatus integration={integration} /></article>)}</div> : <div className="ois-empty compact"><Plug size={18} aria-hidden="true" /><div><strong>Aucune intégration configurée</strong><p>Des identifiants enregistrés ne sont pas présentés comme une connexion active.</p></div><button type="button" onClick={() => navigate('/workspace/integrations')}>Configurer<ArrowRight size={14} aria-hidden="true" /></button></div>}
    </section>
  </div>;
}

export default function DashboardPage() { return <DashboardErrorBoundary><DashboardContent /></DashboardErrorBoundary>; }
