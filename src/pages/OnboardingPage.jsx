import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ClipboardCheck, Clock3, Plus, UserRound, Users } from 'lucide-react';
import { addOnboardingTask, createOnboardingPlan, getEmployees, getOnboardingPlans, updateOnboardingTask } from '../services/api';
import './OnboardingPage.css';

const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const displayDate = (value) => value ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : 'À définir';

function Metric({ icon: Icon, label, value, note }) {
  return <article className="onboarding-metric"><span className="onboarding-metric-icon"><Icon size={17} aria-hidden="true" /></span><span className="onboarding-metric-label">{label}</span><strong>{value}</strong><span className="onboarding-metric-note">{note}</span></article>;
}

export default function OnboardingPage() {
  const [employees, setEmployees] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    const [employeeData, planData] = await Promise.all([getEmployees(), getOnboardingPlans()]);
    const nextPlans = planData?.plans || [];
    setEmployees(employeeData?.employees || []);
    setPlans(nextPlans);
    setSelectedId((current) => nextPlans.some((plan) => plan.id === current) ? current : nextPlans[0]?.id ?? null);
  }, []);

  useEffect(() => {
    refresh().catch((loadError) => setError(loadError.message || 'Impossible de charger les parcours.')).finally(() => setLoading(false));
  }, [refresh]);

  const selectedPlan = plans.find((plan) => plan.id === selectedId) || null;
  const activeCount = plans.filter((plan) => plan.status === 'active').length;
  const allTasks = plans.flatMap((plan) => plan.tasks || []);
  const overdueCount = allTasks.filter((task) => task.status !== 'completed' && task.due_date < today()).length;
  const completion = plans.length ? Math.round(plans.reduce((sum, plan) => sum + (plan.progress || 0), 0) / plans.length) : 0;

  async function runAction(action, successMessage) {
    setSaving(true); setError(''); setNotice('');
    try { await action(); await refresh(); setNotice(successMessage); }
    catch (actionError) { setError(actionError.message || 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  }

  function handleCreate(event) {
    event.preventDefault();
    if (!employeeId) return;
    runAction(async () => {
      const result = await createOnboardingPlan({ employee_id: Number(employeeId), start_date: startDate });
      setSelectedId(result.id);
    }, 'Le parcours a été créé.');
  }

  function handleAddTask(event) {
    event.preventDefault();
    if (!selectedPlan || !taskTitle.trim()) return;
    runAction(() => addOnboardingTask(selectedPlan.id, { title: taskTitle.trim(), due_date: taskDate }), 'Étape ajoutée au parcours.');
    setTaskTitle('');
  }

  function handleStatus(taskId, status) {
    runAction(() => updateOnboardingTask(taskId, status), 'Avancement enregistré.');
  }

  const eligibleEmployees = useMemo(() => employees.filter((employee) => !plans.some((plan) => plan.employee_id === employee.id && plan.status === 'active')), [employees, plans]);

  return (
    <div className="onboarding-page">
      <header className="module-page-heading onboarding-heading">
        <div><span className="module-page-kicker"><span /> MOBYUS · TALENT EXPERIENCE</span><h2>Onboarding AI</h2><p>Préparez l’arrivée de vos collaborateurs et suivez chaque étape dans un parcours que votre équipe garde en main.</p></div>
        <div className="module-heading-index"><strong>03</strong><span>PARCOURS D’INTÉGRATION</span></div>
      </header>

      <section className="onboarding-metrics" aria-label="Indicateurs d’intégration">
        <Metric icon={Users} label="Parcours actifs" value={activeCount} note="Collaborateurs en intégration" />
        <Metric icon={ClipboardCheck} label="Étapes suivies" value={allTasks.length} note="Sur tous les parcours" />
        <Metric icon={Clock3} label="En retard" value={overdueCount} note="Échéances à examiner" />
        <Metric icon={Check} label="Avancement moyen" value={`${completion}%`} note="Parcours actifs et terminés" />
      </section>

      {(error || notice) && <div className={`onboarding-feedback ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>{error || notice}</div>}

      <div className="onboarding-workspace">
        <section className="onboarding-panel onboarding-create-panel">
          <div className="onboarding-panel-heading"><span className="onboarding-panel-icon"><Plus size={17} aria-hidden="true" /></span><div><span className="module-section-kicker">NOUVEAU PARCOURS</span><h3>Préparer une arrivée</h3></div></div>
          {eligibleEmployees.length ? <form className="onboarding-form" onSubmit={handleCreate}>
            <label htmlFor="onboarding-employee">Collaborateur</label>
            <select id="onboarding-employee" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
              <option value="">Choisir un collaborateur</option>{eligibleEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}{employee.role ? ` · ${employee.role}` : ''}</option>)}
            </select>
            <label htmlFor="onboarding-start-date">Date d’arrivée</label>
            <input id="onboarding-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            <button className="onboarding-primary-button" type="submit" disabled={saving || !employeeId}>{saving ? 'Création…' : 'Créer le parcours'}<ArrowRight size={15} aria-hidden="true" /></button>
            <p className="onboarding-form-note">Mobyus propose une trame de départ selon le poste. Vous pouvez ensuite la compléter et l’adapter.</p>
          </form> : <div className="onboarding-no-employees"><UserRound size={19} aria-hidden="true" /><p>{employees.length ? 'Tous les collaborateurs ont déjà un parcours actif.' : 'Ajoutez d’abord les collaborateurs dans votre espace pour préparer leur arrivée.'}</p></div>}
        </section>

        <section className="onboarding-panel onboarding-list-panel">
          <div className="onboarding-panel-heading"><span className="onboarding-panel-icon"><CalendarDays size={17} aria-hidden="true" /></span><div><span className="module-section-kicker">SUIVI DES ARRIVÉES</span><h3>Parcours d’intégration</h3></div><span className="onboarding-count">{plans.length}</span></div>
          {loading ? <p className="onboarding-empty">Chargement des parcours…</p> : plans.length ? <div className="onboarding-plan-list">
            {plans.map((plan) => <button className={`onboarding-plan-row${selectedId === plan.id ? ' is-selected' : ''}`} type="button" key={plan.id} onClick={() => setSelectedId(plan.id)} aria-pressed={selectedId === plan.id}>
              <span className="onboarding-plan-avatar" aria-hidden="true">{(plan.employee?.name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
              <span className="onboarding-plan-copy"><strong>{plan.employee?.name || 'Collaborateur'}</strong><span>{plan.employee?.role || 'Poste à préciser'} · Arrivée le {displayDate(plan.start_date)}</span></span>
              <span className="onboarding-plan-progress"><span>{plan.progress}%</span><span className="onboarding-progress-track"><span style={{ width: `${plan.progress}%` }} /></span></span>
            </button>)}
          </div> : <div className="onboarding-empty"><span className="onboarding-empty-icon"><ClipboardCheck size={19} aria-hidden="true" /></span><div><strong>Aucun parcours pour le moment</strong><p>Créez un parcours pour organiser les premières étapes d’intégration.</p></div></div>}
        </section>
      </div>

      {selectedPlan && <section className="onboarding-panel onboarding-detail-panel">
        <div className="onboarding-detail-header"><div><span className="module-section-kicker">PLAN INDIVIDUEL · {displayDate(selectedPlan.start_date)}</span><h3>{selectedPlan.employee?.name || 'Collaborateur'} <span>{selectedPlan.employee?.role || ''}</span></h3></div><span className={`onboarding-status-pill ${selectedPlan.status}`}>{selectedPlan.status === 'completed' ? 'Terminé' : 'En cours'}</span></div>
        <div className="onboarding-progress-summary"><div><span>Progression globale</span><strong>{selectedPlan.completed_tasks}/{selectedPlan.total_tasks} étapes</strong></div><div className="onboarding-progress-track"><span style={{ width: `${selectedPlan.progress}%` }} /></div></div>
        <ol className="onboarding-task-list">{(selectedPlan.tasks || []).map((task) => <li className={`onboarding-task ${task.status === 'completed' ? 'is-complete' : ''}`} key={task.id}>
          <span className="onboarding-task-marker" aria-hidden="true">{task.status === 'completed' ? <Check size={13} /> : null}</span><div className="onboarding-task-copy"><strong>{task.title}</strong>{task.description && <p>{task.description}</p>}<span>{task.owner_type === 'hr' ? 'Ressources humaines' : task.owner_type === 'employee' ? 'Collaborateur' : 'Manager'} · Échéance {displayDate(task.due_date)}</span></div>
          <label className="visually-hidden" htmlFor={`task-status-${task.id}`}>Avancement : {task.title}</label><select id={`task-status-${task.id}`} value={task.status} disabled={saving} onChange={(event) => handleStatus(task.id, event.target.value)}><option value="pending">À faire</option><option value="in_progress">En cours</option><option value="completed">Terminé</option></select>
        </li>)}</ol>
        {selectedPlan.status !== 'completed' && <form className="onboarding-add-task" onSubmit={handleAddTask}><div><label htmlFor="new-task-title">Ajouter une étape</label><input id="new-task-title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} placeholder="Ex. Présenter les interlocuteurs clés" required /></div><div><label htmlFor="new-task-date">Échéance</label><input id="new-task-date" type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} required /></div><button className="onboarding-secondary-button" type="submit" disabled={saving || !taskTitle.trim()}><Plus size={15} aria-hidden="true" />Ajouter</button></form>}
        <p className="onboarding-human-note">La trame est une suggestion à personnaliser. L’avancement décrit des tâches du parcours, sans évaluer le collaborateur.</p>
      </section>}
    </div>
  );
}
