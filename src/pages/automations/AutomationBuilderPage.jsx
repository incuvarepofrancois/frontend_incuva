import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowDown, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, Clock3, Plus, Settings2, Webhook, Zap } from 'lucide-react';
import { actions, AutomationHeader, conditions, newWorkflowId, readWorkflows, triggers, writeWorkflows } from './AutomationShared';

const triggerIcons = { plan_created: Plus, arrival_soon: CalendarDays, task_due: Clock3, task_completed: Check };
const actionIcons = { slack: Bell, task: Check, webhook: Webhook };

export default function AutomationBuilderPage({ user }) {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const existing = useMemo(() => workflowId ? readWorkflows(user?.org_id).find((flow) => flow.id === workflowId) : null, [workflowId, user?.org_id]);
  const [name, setName] = useState(existing?.name || 'Nouvelle automatisation d’intégration');
  const [trigger, setTrigger] = useState(triggers.some((item) => item.id === existing?.trigger) ? existing.trigger : triggers[0].id);
  const [action, setAction] = useState(actions.some((item) => item.id === existing?.action) ? existing.action : actions[0].id);
  const [conditionEnabled, setConditionEnabled] = useState(Boolean(existing?.conditionEnabled));
  const [condition, setCondition] = useState(conditions.some((item) => item.id === existing?.condition) ? existing.condition : conditions[0].id);
  const [target, setTarget] = useState(existing?.target || '');
  const [saved, setSaved] = useState(false);
  const selectedTrigger = triggers.find((item) => item.id === trigger) || triggers[0];
  const selectedAction = actions.find((item) => item.id === action) || actions[0];
  const TriggerIcon = triggerIcons[trigger] || Activity;
  const ActionIcon = actionIcons[action] || Webhook;

  function saveWorkflow(event) {
    event.preventDefault();
    const current = readWorkflows(user?.org_id);
    const id = workflowId || newWorkflowId();
    const workflow = { id, name: name.trim() || 'Nouvelle automatisation', trigger, action, conditionEnabled, condition, target: target.trim(), updatedAt: new Date().toISOString(), status: 'draft' };
    writeWorkflows(user?.org_id, [workflow, ...current.filter((item) => item.id !== id)]);
    setSaved(true);
    if (!workflowId) navigate(`/automations/${id}/edit`, { replace: true });
  }

  return (
    <div className="automation-page">
      <AutomationHeader index="02" kicker="SCÉNARIO D’INTÉGRATION" title={workflowId ? 'Modifier le scénario' : 'Créer un scénario'} description="Préparez une suite d’étapes autour d’une arrivée, d’une échéance ou de l’avancement d’un parcours.">
        <Link className="automation-back-link" to="/automations"><ArrowLeft size={14} aria-hidden="true" />Automatisations d’intégration</Link>
      </AutomationHeader>
      <div className="automation-prototype-note"><Activity size={16} aria-hidden="true" /><span>Mode préparation : les scénarios sont enregistrés dans ce navigateur. Leur exécution automatique n’est pas encore activée.</span></div>
      <form className="automation-builder-layout" onSubmit={saveWorkflow}>
        <section className="automation-builder-canvas" aria-label="Éditeur de workflow">
          <div className="automation-builder-toolbar"><label htmlFor="workflow-name">Nom du scénario</label><input id="workflow-name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} maxLength={100} required /><span className="automation-canvas-label">PARCOURS D’INTÉGRATION · APERÇU</span></div>
          <div className="automation-nodes">
            <article className="automation-node trigger-node"><div className="automation-node-top"><span>01 · QUAND</span><span className="automation-node-kind">Déclencheur</span></div><div className="automation-node-body"><span className="automation-node-icon"><TriggerIcon size={17} aria-hidden="true" /></span><div><strong>{selectedTrigger.label}</strong><span>Source : {selectedTrigger.source}</span></div></div></article>
            <div className="automation-connector"><span><ArrowDown size={15} aria-hidden="true" /></span></div>
            <article className="automation-node condition-node"><div className="automation-node-top"><span>02 · SI (OPTIONNEL)</span><label className="automation-switch"><input type="checkbox" checked={conditionEnabled} onChange={(event) => { setConditionEnabled(event.target.checked); setSaved(false); }} /><span className="visually-hidden">Activer une condition</span><i aria-hidden="true" /></label></div>{conditionEnabled ? <div className="automation-node-body"><Activity size={17} aria-hidden="true" /><strong>{conditions.find((item) => item.id === condition)?.label}</strong></div> : <p className="automation-node-hint">Aucune condition · chaque événement poursuivra le flux</p>}</article>
            <div className="automation-connector"><span><ArrowDown size={15} aria-hidden="true" /></span></div>
            <article className="automation-node action-node"><div className="automation-node-top"><span>{conditionEnabled ? '03' : '02'} · ALORS</span><span className="automation-node-kind">Action</span></div><div className="automation-node-body"><span className="automation-node-icon"><ActionIcon size={17} aria-hidden="true" /></span><div><strong>{selectedAction.label}</strong><span>Destination : {selectedAction.target}</span></div></div></article>
          </div>
        </section>
        <aside className="automation-config-panel">
          <div className="automation-config-heading"><Settings2 size={17} aria-hidden="true" /><div><span>ONBOARDING AI</span><h3>Étapes du scénario</h3></div></div>
          <label htmlFor="workflow-trigger">Déclencher quand</label><select id="workflow-trigger" value={trigger} onChange={(event) => { setTrigger(event.target.value); setSaved(false); }}>{triggers.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select>
          <label className="automation-condition-label" htmlFor="workflow-condition-toggle"><input id="workflow-condition-toggle" type="checkbox" checked={conditionEnabled} onChange={(event) => { setConditionEnabled(event.target.checked); setSaved(false); }} />Ajouter une condition</label>
          {conditionEnabled && <><label htmlFor="workflow-condition">Continuer si</label><select id="workflow-condition" value={condition} onChange={(event) => { setCondition(event.target.value); setSaved(false); }}>{conditions.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></>}
          <label htmlFor="workflow-action">Effectuer ensuite</label><select id="workflow-action" value={action} onChange={(event) => { setAction(event.target.value); setSaved(false); }}>{actions.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select>
          <label htmlFor="workflow-target">Canal ou détail de l’étape</label><input id="workflow-target" value={target} onChange={(event) => { setTarget(event.target.value); setSaved(false); }} placeholder={action === 'slack' ? '#equipe-rh' : action === 'webhook' ? 'https://…' : 'Ex. préparer le matériel'} />
          <div className="automation-config-note"><Webhook size={14} aria-hidden="true" /><span>Les destinations externes se configurent dans Onboarding AI → Intégrations RH.</span></div>
          <button className="automation-primary-button automation-save-button" type="submit"><Check size={15} aria-hidden="true" />{saved ? 'Brouillon enregistré' : 'Enregistrer le brouillon'}</button>
          <Link className="automation-secondary-link" to="/automations/runs">Voir l’historique d’exécution <ArrowRight size={14} aria-hidden="true" /></Link>
        </aside>
      </form>
      <div className="automation-next-step"><Zap size={15} aria-hidden="true" /><span>Une validation humaine reste nécessaire avant toute action sensible sur le parcours d’un collaborateur.</span></div>
    </div>
  );
}
