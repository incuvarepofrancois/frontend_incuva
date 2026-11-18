export function WorkspaceHeader({ kicker, title, description, index }) {
  return (
    <header className="module-page-heading workspace-page-heading">
      <div>
        <span className="module-page-kicker"><span /> MOBYUS · ONBOARDING AI</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="module-heading-index"><strong>{index}</strong><span>{kicker}</span></div>
    </header>
  );
}

export function dateLabel(value) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date inconnue'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function buildActivityEvents({ meetings = [], plans = [], riskScores = [], insights = [] }) {
  const events = [];
  meetings.forEach((meeting) => events.push({ id: `meeting-${meeting.id}`, date: meeting.created_at, category: 'Réunions', title: 'Analyse de réunion enregistrée', detail: meeting.title || 'Réunion sans titre', source: 'Meeting Intelligence' }));
  plans.forEach((plan) => {
    events.push({ id: `plan-created-${plan.id}`, date: plan.created_at, category: 'Onboarding', title: 'Parcours d’intégration créé', detail: `${plan.total_tasks || 0} étapes proposées · ${plan.status === 'completed' ? 'terminé' : 'en cours'}`, source: 'Onboarding AI' });
    if (plan.updated_at && plan.created_at && Math.abs(new Date(plan.updated_at) - new Date(plan.created_at)) > 1000) events.push({ id: `plan-updated-${plan.id}`, date: plan.updated_at, category: 'Onboarding', title: 'Parcours d’intégration mis à jour', detail: `${plan.completed_tasks || 0}/${plan.total_tasks || 0} étapes terminées`, source: 'Onboarding AI' });
  });
  riskScores.forEach((score) => events.push({ id: `risk-${score.employee_id}`, date: score.created_at, category: 'Risques RH', title: 'Évaluation du risque actualisée', detail: score.data_status === 'ready' ? `Analyse calculée · ${score.signals_count || 0} signaux pris en compte` : 'Données insuffisantes pour produire un score', source: 'Employee Risk Detection' }));
  insights.forEach((insight) => events.push({ id: `insight-${insight.id}`, date: insight.created_at, category: 'Insights', title: 'Insight enregistré', detail: insight.title || insight.summary || 'Nouvel insight disponible', source: 'INCUVA' }));
  return events.filter((event) => event.date && !Number.isNaN(new Date(event.date).getTime())).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}
