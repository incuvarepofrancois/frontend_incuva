import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, LoaderCircle, RefreshCw, UserRound } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getEmployee, getOnboardingPlans } from '../services/api';
import './EmployeeProfilePage.css';

const PLAN_LIMIT = 200;
const TASK_STATUSES = new Set(['pending', 'in_progress', 'completed']);
const PLAN_STATUSES = new Set(['active', 'completed']);

function parseDate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? { date, key: `${match[1]}-${match[2]}-${match[3]}` }
    : null;
}

function formatDate(value) {
  const parsed = parseDate(value);
  return parsed ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed.date) : 'Non renseignée';
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function displayValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'Non renseigné';
}

function employeeStatusLabel(status) {
  if (status === 'active') return 'Actif';
  return displayValue(status);
}

function JourneyStatus({ status }) {
  const known = PLAN_STATUSES.has(status);
  const label = status === 'active' ? 'En cours' : status === 'completed' ? 'Terminé' : 'Non renseigné';
  return <span className={`profile-status${known ? ` is-${status}` : ' is-unknown'}`}>{label}</span>;
}

function TaskStatus({ status }) {
  const labels = { completed: 'Terminée', in_progress: 'En cours', pending: 'En attente' };
  const known = TASK_STATUSES.has(status);
  return <span className={`profile-task-status${known ? ` is-${status}` : ' is-unknown'}`}>{labels[status] || 'Non renseigné'}</span>;
}

function employeeErrorContent(error) {
  if (error?.status === 401) return ['Session requise', 'Votre session a expiré. Connectez-vous à nouveau pour consulter ce profil.'];
  if (error?.status === 403) return ['Accès refusé', 'Votre compte ne dispose pas de la permission employees:view.'];
  if (error?.status === 404) return ['Collaborateur introuvable', 'Ce profil n’existe pas ou n’est pas accessible dans votre organisation.'];
  return ['Profil indisponible', error?.message || 'Les informations du collaborateur n’ont pas pu être chargées.'];
}

function onboardingErrorContent(error) {
  if (error?.status === 401) return ['Session requise', 'Votre session ne permet pas de consulter les parcours.'];
  if (error?.status === 403) return ['Parcours non autorisés', 'Votre compte ne dispose pas de la permission onboarding:view. Le profil professionnel reste disponible.'];
  return ['Parcours indisponibles', error?.message || 'Les parcours n’ont pas pu être chargés. Le profil professionnel reste disponible.'];
}

function validatePlans(response) {
  if (!response || !Array.isArray(response.plans) || response.plans.length > PLAN_LIMIT) {
    throw new Error('La réponse des parcours est invalide.');
  }
  const ids = new Set();
  for (const plan of response.plans) {
    if (!plan || !Number.isInteger(plan.id) || !Number.isInteger(plan.employee_id) || !Array.isArray(plan.tasks) || ids.has(plan.id)) {
      throw new Error('La réponse des parcours contient des données incomplètes ou incohérentes.');
    }
    ids.add(plan.id);
    if (plan.tasks.some((task) => !task || !Number.isInteger(task.id))) {
      throw new Error('La réponse contient une tâche sans identifiant de parcours valide.');
    }
  }
  return response.plans;
}

function summarizePlan(plan) {
  const tasks = plan.tasks;
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
  const pending = tasks.filter((task) => task.status === 'pending').length;
  const today = todayKey();
  const overdue = tasks.filter((task) => task.status !== 'completed' && parseDate(task.due_date)?.key < today).length;
  return {
    completed,
    inProgress,
    pending,
    overdue,
    total: tasks.length,
    progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

function ProfileAlert({ error, onRetry, section = 'employee' }) {
  const [title, message] = section === 'employee' ? employeeErrorContent(error) : onboardingErrorContent(error);
  const unauthorized = error?.status === 401;
  const forbidden = error?.status === 403;
  return <div className={`profile-alert${unauthorized || forbidden ? ' is-access' : ''}`} role={unauthorized || forbidden ? 'status' : 'alert'}>
    <AlertCircle size={18} aria-hidden="true" />
    <div><strong>{title}</strong><p>{message}</p></div>
    {onRetry && !unauthorized && !forbidden && <button type="button" className="profile-secondary-button" onClick={onRetry}>Réessayer</button>}
  </div>;
}

function ProfileField({ label, children }) {
  return <div className="profile-field"><dt>{label}</dt><dd>{children}</dd></div>;
}

function TaskRow({ task }) {
  const overdue = task.status !== 'completed' && Boolean(parseDate(task.due_date)?.key < todayKey());
  return <li className={`profile-task${overdue ? ' is-overdue' : ''}`}>
    <span className={`profile-task-marker${task.status === 'completed' ? ' is-completed' : ''}`} aria-hidden="true">{task.status === 'completed' && <Check size={13} />}</span>
    <div className="profile-task-copy">
      <strong>{displayValue(task.title)}</strong>
      {typeof task.description === 'string' && task.description.trim() && <p>{task.description}</p>}
      <span>{overdue ? `En retard · échéance ${formatDate(task.due_date)}` : `Échéance ${formatDate(task.due_date)}`}</span>
    </div>
    <TaskStatus status={task.status} />
  </li>;
}

function JourneyCard({ plan }) {
  const summary = summarizePlan(plan);
  return <article className="profile-journey-card">
    <header className="profile-journey-heading">
      <div><span className="profile-section-eyebrow">PARCOURS D’INTÉGRATION</span><h4>Parcours</h4></div>
      <JourneyStatus status={plan.status} />
    </header>
    <dl className="profile-journey-dates">
      <ProfileField label="Début">{formatDate(plan.start_date)}</ProfileField>
      <ProfileField label="Fin">{plan.completed_at ? formatDate(plan.completed_at) : '—'}</ProfileField>
      <ProfileField label="Progression"><strong>{summary.progress}%</strong></ProfileField>
      <ProfileField label="Étapes terminées">{summary.completed} / {summary.total}</ProfileField>
    </dl>
    <div className="profile-task-summary" aria-label="Synthèse des tâches">
      <span><CheckCircle2 size={14} aria-hidden="true" />Terminées <strong>{summary.completed}</strong></span>
      <span><Clock3 size={14} aria-hidden="true" />En cours <strong>{summary.inProgress}</strong></span>
      <span><CalendarDays size={14} aria-hidden="true" />En attente <strong>{summary.pending}</strong></span>
      <span className={summary.overdue ? 'has-overdue' : ''}><AlertCircle size={14} aria-hidden="true" />En retard <strong>{summary.overdue}</strong></span>
    </div>
    <div className="profile-progress" role="progressbar" aria-label="Progression du parcours" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.progress}>
      <span style={{ width: `${summary.progress}%` }} />
    </div>
    <div className="profile-tasks-heading"><h5>Tâches</h5><span>{summary.total}</span></div>
    {plan.tasks.length
      ? <ol className="profile-task-list">{plan.tasks.map((task) => <TaskRow key={task.id} task={task} />)}</ol>
      : <p className="profile-no-tasks">Ce parcours ne contient aucune tâche.</p>}
    <Link className="profile-journey-link" to={`/onboarding?planId=${encodeURIComponent(plan.id)}`}>Ouvrir ce parcours dans Journeys<ArrowRight size={15} aria-hidden="true" /></Link>
  </article>;
}

export default function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const location = useLocation();
  const [employee, setEmployee] = useState(null);
  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [employeeError, setEmployeeError] = useState(null);
  const [employeeReloadKey, setEmployeeReloadKey] = useState(0);
  const [plans, setPlans] = useState([]);
  const [historyMayBePartial, setHistoryMayBePartial] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState(null);
  const [plansReloadKey, setPlansReloadKey] = useState(0);

  const numericEmployeeId = /^\d+$/.test(employeeId || '') ? Number(employeeId) : NaN;
  const validEmployeeId = Number.isSafeInteger(numericEmployeeId) && numericEmployeeId > 0;

  useEffect(() => {
    let current = true;
    setEmployee(null);
    setPlans([]);
    setHistoryMayBePartial(false);
    setPlansError(null);
    setPlansLoading(false);
    setEmployeeError(null);
    setEmployeeLoading(true);

    if (!validEmployeeId) {
      setEmployeeError({ status: 404 });
      setEmployeeLoading(false);
      return () => { current = false; };
    }

    getEmployee(numericEmployeeId)
      .then((result) => {
        if (!result || result.id !== numericEmployeeId || typeof result.name !== 'string') {
          throw Object.assign(new Error('La réponse du profil est invalide.'), { status: 404 });
        }
        if (current) setEmployee(result);
      })
      .catch((error) => { if (current) setEmployeeError(error); })
      .finally(() => { if (current) setEmployeeLoading(false); });

    return () => { current = false; };
  }, [employeeId, employeeReloadKey, numericEmployeeId, validEmployeeId]);

  useEffect(() => {
    if (!employee || employee.id !== numericEmployeeId) return undefined;
    let current = true;
    setPlansLoading(true);
    setPlansError(null);
    getOnboardingPlans()
      .then((response) => {
        const allPlans = validatePlans(response);
        if (current) {
          setHistoryMayBePartial(allPlans.length === PLAN_LIMIT);
          setPlans(allPlans.filter((plan) => plan.employee_id === employee.id));
        }
      })
      .catch((error) => { if (current) { setPlans([]); setHistoryMayBePartial(false); setPlansError(error); } })
      .finally(() => { if (current) setPlansLoading(false); });
    return () => { current = false; };
  }, [employee, numericEmployeeId, plansReloadKey]);

  const managerName = useMemo(() => {
    if (employee?.manager_id == null) return 'Non renseigné';
    const state = location.state;
    return state?.managerId === employee.manager_id && typeof state?.managerName === 'string' && state.managerName.trim()
      ? state.managerName.trim()
      : 'Non renseigné';
  }, [employee, location.state]);
  const partialHistory = historyMayBePartial;

  if (employeeLoading || (employee && employee.id !== numericEmployeeId)) {
    return <div className="employee-profile-page"><div className="profile-loading" role="status"><LoaderCircle className="profile-spinner" size={19} aria-hidden="true" />Chargement du profil…</div></div>;
  }

  if (employeeError || !employee) {
    return <div className="employee-profile-page">
      <Link className="profile-back-link" to="/employees"><ArrowLeft size={15} aria-hidden="true" />Retour à Employees</Link>
      <ProfileAlert error={employeeError || { status: 404 }} onRetry={employeeError?.status === 404 ? null : () => setEmployeeReloadKey((key) => key + 1)} />
    </div>;
  }

  return <div className="employee-profile-page">
    <Link className="profile-back-link" to="/employees"><ArrowLeft size={15} aria-hidden="true" />Retour à Employees</Link>

    <header className="profile-hero">
      <span className="profile-avatar-placeholder" aria-hidden="true"><UserRound size={22} /></span>
      <div className="profile-hero-copy">
        <span className="profile-section-eyebrow">FICHE COLLABORATEUR</span>
        <h2>{displayValue(employee.name)}</h2>
        <p>{displayValue(employee.role)}<span aria-hidden="true"> · </span>{displayValue(employee.team)}</p>
      </div>
      <div className="profile-hero-meta"><span className={`profile-employee-status${employee.status === 'active' ? ' is-active' : ''}`}>{employeeStatusLabel(employee.status)}</span><span><CalendarDays size={14} aria-hidden="true" />Arrivée · {formatDate(employee.hire_date)}</span></div>
    </header>

    <section className="profile-section" aria-labelledby="profile-professional-title">
      <div className="profile-section-heading"><div><span className="profile-section-eyebrow">INFORMATIONS PROFESSIONNELLES</span><h3 id="profile-professional-title">Profil</h3></div></div>
      <dl className="profile-professional-grid">
        <ProfileField label="Nom">{displayValue(employee.name)}</ProfileField>
        <ProfileField label="Identifiant externe">{displayValue(employee.external_id)}</ProfileField>
        <ProfileField label="Fonction">{displayValue(employee.role)}</ProfileField>
        <ProfileField label="Équipe">{displayValue(employee.team)}</ProfileField>
        <ProfileField label="Manager">{managerName}</ProfileField>
        <ProfileField label="Date d’arrivée">{formatDate(employee.hire_date)}</ProfileField>
        <ProfileField label="Statut"><span className={`profile-employee-status${employee.status === 'active' ? ' is-active' : ''}`}>{employeeStatusLabel(employee.status)}</span></ProfileField>
      </dl>
    </section>

    <section className="profile-section profile-provenance" aria-labelledby="profile-provenance-title">
      <div className="profile-section-heading"><div><span className="profile-section-eyebrow">PROVENANCE DES DONNÉES</span><h3 id="profile-provenance-title">Source individuelle</h3></div></div>
      <p>La source et la date de synchronisation propres à ce collaborateur ne sont pas exposées par l’API. Aucune origine n’est déduite de son identifiant externe.</p>
    </section>

    <section className="profile-section" aria-labelledby="profile-onboarding-title" aria-busy={plansLoading}>
      <div className="profile-section-heading"><div><span className="profile-section-eyebrow">SUIVI OPÉRATIONNEL</span><h3 id="profile-onboarding-title">Onboarding</h3><p>Parcours et tâches associés à ce collaborateur.</p></div></div>
      {plansLoading ? <div className="profile-loading profile-section-loading" role="status"><LoaderCircle className="profile-spinner" size={18} aria-hidden="true" />Chargement des parcours…</div>
        : plansError ? <ProfileAlert section="onboarding" error={plansError} onRetry={() => setPlansReloadKey((key) => key + 1)} />
          : <>
            {partialHistory && <p className="profile-partial-note" role="note">L’API a renvoyé sa limite de 200 parcours. L’historique visible peut être partiel ; les parcours ci-dessous ne représentent que ceux reçus.</p>}
            {plans.length ? <div className="profile-journeys-list">{plans.map((plan) => <JourneyCard key={plan.id} plan={plan} />)}</div>
              : <div className="profile-empty">
                <CheckCircle2 size={20} aria-hidden="true" />
                <div><strong>{partialHistory ? 'Aucun parcours associé parmi les parcours visibles' : 'Aucun parcours associé'}</strong><p>{partialHistory ? 'La limite de l’API peut masquer des parcours plus anciens.' : 'Aucun parcours de cet employé ne figure dans les données retournées par l’API.'}</p></div>
              </div>}
          </>}
    </section>
  </div>;
}
