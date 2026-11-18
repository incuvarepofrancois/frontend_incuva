import { Link } from 'react-router-dom';

export const storageKey = (orgId) => `incuva-workflows-v1-org-${orgId || 'unknown'}`;

export const triggers = [
  { id: 'plan_created', label: 'Nouveau parcours d’intégration créé', source: 'Onboarding AI' },
  { id: 'arrival_soon', label: 'Arrivée prévue dans 7 jours', source: 'Onboarding AI' },
  { id: 'task_due', label: 'Échéance d’une étape approchante', source: 'Onboarding AI' },
  { id: 'task_completed', label: 'Étape d’intégration terminée', source: 'Onboarding AI' },
];

export const actions = [
  { id: 'task', label: 'Ajouter une étape au parcours', target: 'Onboarding AI' },
  { id: 'slack', label: 'Notifier l’équipe RH sur Slack', target: 'Slack' },
  { id: 'webhook', label: 'Transmettre un événement d’intégration', target: 'Webhook HTTP' },
];

export const conditions = [
  { id: 'manager_assigned', label: 'Un référent est renseigné' },
  { id: 'task_overdue', label: 'Une étape est en retard' },
  { id: 'role_defined', label: 'Le poste du collaborateur est renseigné' },
];

export function readWorkflows(orgId) {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey(orgId)) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function writeWorkflows(orgId, items) {
  localStorage.setItem(storageKey(orgId), JSON.stringify(items));
  window.dispatchEvent(new Event('incuva:workflows-updated'));
}

export function newWorkflowId() {
  return globalThis.crypto?.randomUUID?.() || `workflow-${Date.now()}`;
}

export function AutomationHeader({ index, kicker, title, description, children }) {
  return (
    <header className="module-page-heading automation-page-heading">
      <div>
        <span className="module-page-kicker"><span /> MOBYUS · ONBOARDING AI</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="automation-heading-actions">{children}<div className="module-heading-index"><strong>{index}</strong><span>{kicker}</span></div></div>
    </header>
  );
}

export function AutomationBackLink({ children = 'Tous les workflows' }) {
  return <Link className="automation-back-link" to="/automations">{children}</Link>;
}
