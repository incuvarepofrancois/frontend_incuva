import { useEffect, useState } from 'react';
import { Activity, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AutomationHeader, readWorkflows } from './AutomationShared';

export default function AutomationRunsPage({ user }) {
  const [workflowCount, setWorkflowCount] = useState(() => readWorkflows(user?.org_id).length);
  useEffect(() => {
    const reload = () => setWorkflowCount(readWorkflows(user?.org_id).length);
    window.addEventListener('incuva:workflows-updated', reload);
    window.addEventListener('storage', reload);
    return () => { window.removeEventListener('incuva:workflows-updated', reload); window.removeEventListener('storage', reload); };
  }, [user?.org_id]);

  return (
    <div className="automation-page">
      <AutomationHeader index="03" kicker="SUIVI DES SCÉNARIOS" title="Historique d’intégration" description="Retrouvez les événements et les actions effectuées dans les parcours d’arrivée." />
      <div className="automation-run-summary"><div><span>Scénarios préparés</span><strong>{workflowCount}</strong></div><div><span>Exécutions enregistrées</span><strong>—</strong></div><div><span>Dernière activité</span><strong>À venir</strong></div></div>
      <section className="automation-empty automation-runs-empty"><span className="automation-empty-icon"><Clock3 size={21} aria-hidden="true" /></span><div><h3>Le suivi apparaîtra quand l’exécution sera activée</h3><p>Les scénarios sont encore des brouillons dans ce navigateur : aucune étape n’est lancée et aucun historique d’exécution n’est généré.</p><Link className="automation-secondary-link" to="/automations"><Activity size={14} aria-hidden="true" />Voir les scénarios</Link></div></section>
      <div className="automation-next-step"><Clock3 size={15} aria-hidden="true" /><span>L’historique devra conserver le parcours concerné, la règle appliquée, l’action et son résultat.</span></div>
    </div>
  );
}
