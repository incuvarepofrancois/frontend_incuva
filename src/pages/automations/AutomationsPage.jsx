import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, GitBranch, Plus, Search, Settings2, Trash2, Zap } from 'lucide-react';
import { actions, AutomationHeader, readWorkflows, triggers, writeWorkflows } from './AutomationShared';

export default function AutomationsPage({ user }) {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState(() => readWorkflows(user?.org_id));
  const [search, setSearch] = useState('');

  useEffect(() => {
    const reload = () => setWorkflows(readWorkflows(user?.org_id));
    window.addEventListener('incuva:workflows-updated', reload);
    window.addEventListener('storage', reload);
    return () => { window.removeEventListener('incuva:workflows-updated', reload); window.removeEventListener('storage', reload); };
  }, [user?.org_id]);

  const filtered = workflows.filter((flow) => (flow.name || '').toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));
  function removeWorkflow(id) { writeWorkflows(user?.org_id, workflows.filter((flow) => flow.id !== id)); }

  return (
    <div className="automation-page">
      <AutomationHeader index="01" kicker="PARCOURS D’INTÉGRATION" title="Automatisations d’intégration" description="Préparez des scénarios pour accompagner les nouvelles arrivées et le suivi des étapes RH.">
        <Link className="automation-primary-button" to="/automations/new"><Plus size={15} aria-hidden="true" />Créer un scénario</Link>
      </AutomationHeader>
      <div className="automation-prototype-note"><Zap size={16} aria-hidden="true" /><span>Les scénarios restent des brouillons locaux : aucune notification ni modification de parcours n’est déclenchée automatiquement.</span></div>
      <div className="automation-list-toolbar"><div className="automation-count"><strong>{workflows.length}</strong><span>scénario{workflows.length === 1 ? '' : 's'} préparé{workflows.length === 1 ? '' : 's'}</span></div><label className="automation-search"><Search size={15} aria-hidden="true" /><span className="visually-hidden">Rechercher un scénario</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" /></label></div>
      {filtered.length ? <section className="automation-flow-list" aria-label="Automatisations d’intégration">{filtered.map((flow) => {
        const trigger = triggers.find((item) => item.id === flow.trigger);
        const action = actions.find((item) => item.id === flow.action);
        return <article className="automation-flow-card" key={flow.id}>
          <span className="automation-flow-symbol"><Zap size={18} aria-hidden="true" /></span>
          <div className="automation-flow-main"><h3>{flow.name}</h3><p><span>{trigger?.label || 'Déclencheur'}</span><ArrowRight size={13} aria-hidden="true" /><span>{action?.label || 'Action'}</span></p><small>Modifié le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(flow.updatedAt))}</small></div>
          <span className="automation-draft-pill"><span />Scénario préparé</span>
          <button className="automation-icon-action" type="button" aria-label={`Supprimer ${flow.name}`} title="Supprimer le scénario" onClick={() => removeWorkflow(flow.id)}><Trash2 size={16} aria-hidden="true" /></button>
          <button className="automation-open-button" type="button" onClick={() => navigate(`/automations/${flow.id}/edit`)}>Modifier <ChevronRight size={15} aria-hidden="true" /></button>
        </article>;
      })}</section> : <section className="automation-empty"><span className="automation-empty-icon"><GitBranch size={21} aria-hidden="true" /></span><div><h3>{workflows.length ? 'Aucun résultat' : 'Préparez le premier scénario d’intégration'}</h3><p>{workflows.length ? 'Essayez un autre terme de recherche.' : 'Choisissez un événement d’onboarding, ajoutez une condition facultative et décrivez l’étape qui doit suivre.'}</p>{!workflows.length && <button className="automation-primary-button" type="button" onClick={() => navigate('/automations/new')}><Plus size={15} aria-hidden="true" />Créer un scénario</button>}</div></section>}
      <div className="automation-next-step"><Settings2 size={15} aria-hidden="true" /><span>La prochaine évolution sera de raccorder ces scénarios aux événements et aux permissions du parcours d’intégration.</span></div>
    </div>
  );
}
