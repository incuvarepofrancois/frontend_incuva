import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, LoaderCircle, Plus, RefreshCw, Search } from 'lucide-react';
import { addOnboardingTask, createOnboardingPlan, getEmployees, getOnboardingPlans, updateOnboardingTask } from '../services/api';
import './OnboardingPage.css';

const MANAGE_ROLES = new Set(['owner', 'admin', 'manager']);
const PLAN_LIMIT = 200;

function dateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value.slice(0, 10) : null;
}
function today() { const date = new Date(); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); }
function formatDate(value) {
  const key = dateKey(value);
  if (!key) return 'Non renseignée';
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
}
function dayDistance(value) {
  const key = dateKey(value); if (!key) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date();
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
}
function getProgress(plan) {
  const value = plan?.progress;
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100 ? Number(value) : null;
}
function statusLabel(status) { return status === 'active' ? 'En cours' : status === 'completed' ? 'Terminé' : status || 'Indisponible'; }
function ownerLabel(ownerType) { return ownerType === 'hr' ? 'Ressources humaines' : ownerType === 'employee' ? 'Collaborateur' : 'Manager'; }

function validatePlans(data) {
  if (!data || !Array.isArray(data.plans) || data.plans.length > PLAN_LIMIT) throw new Error('La réponse des parcours est invalide ou incomplète.');
  const ids = new Set();
  for (const plan of data.plans) {
    if (!plan || plan.id == null || !Array.isArray(plan.tasks) || ids.has(plan.id)) throw new Error('La réponse des parcours contient des données incohérentes.');
    ids.add(plan.id);
  }
  return data.plans;
}
async function getAllEmployees() {
  const first = await getEmployees({ page: 1, per_page: 100 });
  if (!first || !Array.isArray(first.employees) || !Number.isInteger(first.total) || first.page !== 1 || first.total < first.employees.length) throw new Error('La réponse des collaborateurs est invalide ou incomplète.');
  const employees = [...first.employees]; const seen = new Set(employees.map((item) => item?.id));
  if (seen.has(undefined) || seen.size !== employees.length) throw new Error('La réponse des collaborateurs contient des identifiants incohérents.');
  for (let page = 2; page <= Math.ceil(first.total / 100); page += 1) {
    const result = await getEmployees({ page, per_page: 100 });
    if (!result || !Array.isArray(result.employees) || result.total !== first.total || result.page !== page) throw new Error('La pagination des collaborateurs est incomplète ou incohérente.');
    for (const employee of result.employees) {
      if (!employee || employee.id == null || seen.has(employee.id)) throw new Error('La pagination des collaborateurs contient des identifiants incohérents.');
      seen.add(employee.id); employees.push(employee);
    }
  }
  if (employees.length !== first.total) throw new Error('La pagination des collaborateurs est incomplète.');
  return employees;
}
function Metric({ icon: Icon, label, value, note, tone = 'accent' }) {
  return <article className="journeys-metric"><span className={'journeys-metric-icon ' + tone}>{createElement(Icon, { size: 17, 'aria-hidden': true })}</span><span className="journeys-metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
function StatusPill({ status }) {
  const kind = status === 'completed' ? 'completed' : status === 'active' ? 'active' : 'unknown';
  return <span className={'journeys-status ' + kind}><span aria-hidden="true" />{statusLabel(status)}</span>;
}
function Progress({ plan }) {
  const progress = getProgress(plan);
  if (progress === null) return <span className="journeys-progress-unknown">Non renseignée</span>;
  return <span className="journeys-progress" aria-label={'Progression : ' + progress + ' %'}><strong>{progress}%</strong><span className="journeys-progress-track" aria-hidden="true"><i style={{ width: progress + '%' }} /></span></span>;
}
function PageAlert({ error, onRetry }) {
  const unauthorized = error?.status === 401; const forbidden = error?.status === 403;
  const title = unauthorized ? 'Session requise' : forbidden ? 'Accès refusé' : 'Données indisponibles';
  const copy = unauthorized ? 'Votre session a expiré ou ne permet plus de consulter les parcours.' : forbidden ? 'Votre rôle ne permet pas de consulter les parcours d’onboarding.' : error?.message || 'Les parcours ne peuvent pas être chargés pour le moment.';
  return <div className={'journeys-alert ' + (unauthorized || forbidden ? 'is-access' : '')} role={unauthorized || forbidden ? 'status' : 'alert'}><AlertCircle size={18} aria-hidden="true" /><div><strong>{title}</strong><p>{copy}</p></div>{!unauthorized && !forbidden && <button type="button" onClick={onRetry}>Réessayer</button>}</div>;
}

export default function OnboardingPage({ currentUser }) {
  const [searchParams] = useSearchParams();
  const requestedPlanId = searchParams.get('planId');
  const [employees, setEmployees] = useState([]); const [plans, setPlans] = useState([]); const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState(''); const [statusFilter, setStatusFilter] = useState('all'); const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(today); const [taskTitle, setTaskTitle] = useState(''); const [taskDate, setTaskDate] = useState(today);
  const [loading, setLoading] = useState(true); const [plansError, setPlansError] = useState(null); const [employeesError, setEmployeesError] = useState(null); const [actionError, setActionError] = useState(null);
  const [saving, setSaving] = useState(false); const [notice, setNotice] = useState('');
  const canManage = MANAGE_ROLES.has(currentUser?.role);

  const refresh = useCallback(async () => {
    setLoading(true); setPlansError(null); setEmployeesError(null); setNotice('');
    const [planResult, employeeResult] = await Promise.allSettled([getOnboardingPlans(), getAllEmployees()]);
    if (planResult.status === 'fulfilled') {
      try {
        const nextPlans = validatePlans(planResult.value); setPlans(nextPlans);
        const requestedPlan = nextPlans.find((plan) => String(plan.id) === requestedPlanId);
        setSelectedId((current) => nextPlans.some((plan) => plan.id === current) ? current : requestedPlan?.id ?? nextPlans[0]?.id ?? null);
      } catch (error) { setPlans([]); setSelectedId(null); setPlansError({ message: error.message }); }
    } else { setPlans([]); setSelectedId(null); setPlansError({ status: planResult.reason?.status, message: planResult.reason?.message }); }
    if (employeeResult.status === 'fulfilled') setEmployees(employeeResult.value);
    else { setEmployees([]); setEmployeesError({ status: employeeResult.reason?.status, message: employeeResult.reason?.message }); }
    setLoading(false);
  }, [requestedPlanId]);
  useEffect(() => { refresh(); }, [refresh]);

  const partial = plans.length === PLAN_LIMIT;
  const activePlans = plans.filter((plan) => plan.status === 'active');
  const completedPlans = plans.filter((plan) => plan.status === 'completed');
  const progressValues = plans.map(getProgress).filter((value) => value !== null);
  const averageProgress = progressValues.length ? Math.round(progressValues.reduce((total, value) => total + value, 0) / progressValues.length) : null;
  const selectedPlan = plans.find((plan) => plan.id === selectedId) || null;
  const eligibleEmployees = useMemo(() => employees.filter((employee) => !plans.some((plan) => plan.employee_id === employee.id && plan.status === 'active')), [employees, plans]);
  const filteredPlans = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr-FR');
    return [...plans].filter((plan) => statusFilter === 'all' || plan.status === statusFilter).filter((plan) => !normalized || (String(plan.employee?.name || '') + ' ' + String(plan.employee?.role || '') + ' ' + String(plan.id)).toLocaleLowerCase('fr-FR').includes(normalized)).sort((left, right) => String(right.updated_at || '').localeCompare(String(left.updated_at || '')) || Number(right.id) - Number(left.id));
  }, [plans, query, statusFilter]);

  async function runAction(action, successMessage) {
    setSaving(true); setNotice(''); setActionError(null);
    try { await action(); await refresh(); setNotice(successMessage); }
    catch (error) { setActionError({ status: error.status, message: error.message || 'L’opération n’a pas pu être enregistrée.' }); }
    finally { setSaving(false); }
  }
  function handleCreate(event) {
    event.preventDefault(); if (!employeeId || !canManage) return;
    runAction(async () => { const created = await createOnboardingPlan({ employee_id: Number(employeeId), start_date: startDate }); setSelectedId(created.id); setEmployeeId(''); }, 'Le parcours a été créé.');
  }
  function handleTaskAdd(event) {
    event.preventDefault(); if (!selectedPlan || !taskTitle.trim() || !canManage) return;
    runAction(() => addOnboardingTask(selectedPlan.id, { title: taskTitle.trim(), due_date: taskDate }), 'L’étape a été ajoutée au parcours.'); setTaskTitle('');
  }
  function handleTaskStatus(taskId, status) { if (canManage) runAction(() => updateOnboardingTask(taskId, status), 'L’avancement a été enregistré.'); }

  return <div className="journeys-page">
    <header className="journeys-heading"><div><span className="journeys-eyebrow">INCUVA OIS · ONBOARDING</span><h2>Journeys</h2><p>Manage and monitor employee onboarding journeys across your organization.</p></div><div className="journeys-heading-actions"><button type="button" className="journeys-secondary-button" onClick={refresh} disabled={loading}><RefreshCw size={15} className={loading ? 'journeys-spin' : ''} aria-hidden="true" />Actualiser</button>{canManage && <a className="journeys-primary-button" href="#new-journey"><Plus size={15} aria-hidden="true" />Créer un parcours</a>}</div></header>
    {plansError && <PageAlert error={plansError} onRetry={refresh} />}{actionError && <PageAlert error={actionError} onRetry={() => setActionError(null)} />}{notice && <div className="journeys-notice" role="status"><CheckCircle2 size={17} aria-hidden="true" />{notice}</div>}
    {!plansError && partial && <p className="journeys-scope-note" role="note">Les indicateurs, filtres et recherches portent sur les 200 parcours renvoyés au maximum par l’API. Ils peuvent ne pas couvrir toute l’organisation.</p>}
    <section className="journeys-metrics" aria-label="Indicateurs des parcours" aria-busy={loading}>
      <Metric icon={ClipboardCheck} label="Parcours chargés" value={loading || plansError ? '—' : plans.length} note={partial ? 'Maximum API atteint : couverture partielle possible' : 'Réponse de l’API parcours'} />
      <Metric icon={Clock3} label="Parcours actifs" value={loading || plansError ? '—' : activePlans.length} note="Statut actif parmi les parcours chargés" tone="teal" />
      <Metric icon={CheckCircle2} label="Parcours terminés" value={loading || plansError ? '—' : completedPlans.length} note="Statut terminé parmi les parcours chargés" tone="success" />
      <Metric icon={Check} label="Progression moyenne" value={loading || plansError || averageProgress === null ? '—' : averageProgress + '%'} note={progressValues.length + ' progression' + (progressValues.length > 1 ? 's' : '') + ' valide' + (progressValues.length > 1 ? 's' : '') + ' sur ' + plans.length} tone="teal" />
    </section>
    {canManage && <section className="journeys-create-panel" id="new-journey" aria-labelledby="new-journey-title"><div><span className="journeys-eyebrow">NOUVEAU PARCOURS</span><h3 id="new-journey-title">Préparer une arrivée</h3><p>Le serveur génère une trame initiale selon le poste du collaborateur.</p></div>{employeesError ? <p className="journeys-inline-error" role="status">La liste des collaborateurs n’est pas disponible. La création reste désactivée jusqu’à son chargement.</p> : <form className="journeys-create-form" onSubmit={handleCreate}><label htmlFor="journey-employee">Collaborateur<select id="journey-employee" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={loading || saving || !eligibleEmployees.length} required><option value="">Choisir un collaborateur</option>{eligibleEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}{employee.role ? ' · ' + employee.role : ''}</option>)}</select></label><label htmlFor="journey-start-date">Date d’arrivée<input id="journey-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={loading || saving || !eligibleEmployees.length} required /></label><button type="submit" className="journeys-primary-button" disabled={loading || saving || !employeeId || !eligibleEmployees.length}>{saving ? 'Création…' : 'Créer'}<ArrowRight size={15} aria-hidden="true" /></button>{!loading && !eligibleEmployees.length && <p className="journeys-form-note">{employees.length ? 'Tous les collaborateurs chargés disposent déjà d’un parcours actif.' : 'Ajoutez ou synchronisez des collaborateurs avant de créer un parcours.'}</p>}</form>}</section>}
    <section className="journeys-panel" aria-labelledby="journeys-list-title"><div className="journeys-section-heading"><div><span className="journeys-eyebrow">SUIVI OPÉRATIONNEL</span><h3 id="journeys-list-title">Parcours d’onboarding</h3><p>{partial ? 'Liste partielle : les recherches et filtres couvrent les parcours actuellement chargés.' : 'Recherchez et filtrez les parcours chargés par l’API.'}</p></div><span className="journeys-count">{loading || plansError ? '—' : filteredPlans.length}</span></div><div className="journeys-filters" role="search"><label className="journeys-search" htmlFor="journey-search"><Search size={16} aria-hidden="true" /><span className="visually-hidden">Rechercher un parcours</span><input id="journey-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un collaborateur…" disabled={loading || Boolean(plansError)} /></label><label htmlFor="journey-status-filter">Statut<select id="journey-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={loading || Boolean(plansError)}><option value="all">Tous les statuts</option><option value="active">En cours</option><option value="completed">Terminés</option></select></label></div>
      {loading ? <div className="journeys-loading" role="status"><LoaderCircle className="journeys-spin" size={18} aria-hidden="true" />Chargement des parcours…</div> : plansError ? <p className="journeys-empty">Les parcours ne sont pas affichés tant que leur réponse API n’est pas disponible.</p> : filteredPlans.length ? <div className="journeys-table-wrap"><table className="journeys-table"><caption>Parcours d’onboarding chargés. Sélectionnez « Consulter » pour ouvrir le détail.</caption><thead><tr><th scope="col">Collaborateur</th><th scope="col">Arrivée</th><th scope="col">Progression</th><th scope="col">Étapes</th><th scope="col">Statut</th><th scope="col"><span className="visually-hidden">Action</span></th></tr></thead><tbody>{filteredPlans.map((plan) => <tr className={selectedId === plan.id ? 'is-selected' : ''} key={plan.id}><td><strong>{plan.employee?.name || 'Collaborateur non renseigné'}</strong><small>{plan.employee?.role || 'Poste non renseigné'}</small></td><td>{formatDate(plan.start_date)}</td><td><Progress plan={plan} /></td><td>{Number.isInteger(plan.completed_tasks) ? plan.completed_tasks : '—'} / {Number.isInteger(plan.total_tasks) ? plan.total_tasks : '—'}</td><td><StatusPill status={plan.status} /></td><td><button className="journeys-view-button" type="button" onClick={() => setSelectedId(plan.id)} aria-label={'Consulter le parcours de ' + (plan.employee?.name || 'ce collaborateur')}>Consulter<ChevronRight size={15} aria-hidden="true" /></button></td></tr>)}</tbody></table></div> : <div className="journeys-empty-state"><ClipboardCheck size={21} aria-hidden="true" /><div><strong>{plans.length ? 'Aucun parcours ne correspond aux filtres' : 'Aucun parcours enregistré'}</strong><p>{plans.length ? 'Modifiez la recherche ou le statut sélectionné.' : 'Créez un parcours lorsqu’une arrivée est à préparer.'}</p></div></div>}
    </section>
    {selectedPlan && !plansError && <section className="journeys-detail" aria-labelledby="journey-detail-title"><div className="journeys-detail-header"><div><span className="journeys-eyebrow">DÉTAIL DU PARCOURS</span><h3 id="journey-detail-title">{selectedPlan.employee?.name || 'Collaborateur non renseigné'}</h3><p>{selectedPlan.employee?.role || 'Poste non renseigné'} · Arrivée le {formatDate(selectedPlan.start_date)}</p></div><StatusPill status={selectedPlan.status} /></div><div className="journeys-detail-summary"><div><span>Progression</span><Progress plan={selectedPlan} /></div><div><span>Étapes terminées</span><strong>{Number.isInteger(selectedPlan.completed_tasks) ? selectedPlan.completed_tasks : '—'} / {Number.isInteger(selectedPlan.total_tasks) ? selectedPlan.total_tasks : '—'}</strong></div><div><span>Dernière mise à jour</span><strong>{formatDate(selectedPlan.updated_at)}</strong></div></div><ol className="journeys-task-list">{selectedPlan.tasks.map((task) => { const overdue = task.status !== 'completed' && dayDistance(task.due_date) !== null && dayDistance(task.due_date) < 0; return <li key={task.id} className={task.status === 'completed' ? 'is-completed' : ''}><span className="journeys-task-marker" aria-hidden="true">{task.status === 'completed' && <Check size={13} />}</span><div className="journeys-task-copy"><strong>{task.title}</strong>{task.description && <p>{task.description}</p>}<span>{ownerLabel(task.owner_type)} · Échéance {formatDate(task.due_date)}{overdue && <em>En retard</em>}</span></div>{canManage ? <label className="journeys-task-status"><span className="visually-hidden">Statut de {task.title}</span><select value={task.status} onChange={(event) => handleTaskStatus(task.id, event.target.value)} disabled={saving}><option value="pending">À faire</option><option value="in_progress">En cours</option><option value="completed">Terminé</option></select></label> : <span className="journeys-task-readonly">{task.status === 'completed' ? 'Terminé' : task.status === 'in_progress' ? 'En cours' : 'À faire'}</span>}</li>; })}</ol>{!selectedPlan.tasks.length && <p className="journeys-empty">Ce parcours ne contient aucune étape. La progression renvoyée par le serveur est affichée telle quelle.</p>}{canManage && selectedPlan.status !== 'completed' && <form className="journeys-add-task" onSubmit={handleTaskAdd}><label htmlFor="journey-task-title">Ajouter une étape<input id="journey-task-title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} placeholder="Ex. Présenter les interlocuteurs clés" disabled={saving} required /></label><label htmlFor="journey-task-date">Échéance<input id="journey-task-date" type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} disabled={saving} required /></label><button type="submit" className="journeys-secondary-button" disabled={saving || !taskTitle.trim()}><Plus size={15} aria-hidden="true" />Ajouter</button></form>}</section>}
  </div>;
}
