import { useEffect, useState } from 'react';
import { ArrowUpRight, Cable, CheckCircle2, Plug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIntegrations } from '../../services/api';
import { WorkspaceHeader } from './WorkspaceShared';

function dateLabel(value) {
  if (!value) return 'Date indisponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date indisponible' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function ConnectedSourcesPage() {
  const navigate = useNavigate();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getIntegrations().then((result) => {
      if (active) setSources((result.integrations || []).filter((source) => source.connection_status === 'connected'));
    }).catch((requestError) => {
      if (active) setError(requestError.message || 'Impossible de charger les sources connectées.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <div className="workspace-page connected-sources-page">
    <WorkspaceHeader index="04" kicker="ÉCOSYSTÈME VÉRIFIÉ" title="Sources connectées" description="Retrouvez les services dont les identifiants et les accès ont été vérifiés pour votre organisation." />
    <div className="connected-sources-toolbar">
      <span><Cable size={15} aria-hidden="true" /> {sources.length} source{sources.length === 1 ? '' : 's'} vérifiée{sources.length === 1 ? '' : 's'}</span>
      <button type="button" onClick={() => navigate('/workspace/integrations')}><Plug size={14} aria-hidden="true" /> Gérer les intégrations <ArrowUpRight size={14} aria-hidden="true" /></button>
    </div>
    {error ? <div className="connected-sources-empty" role="alert"><strong>Sources indisponibles</strong><p>{error}</p><button type="button" onClick={() => navigate('/workspace/integrations')}>Ouvrir les intégrations</button></div>
      : loading ? <div className="connected-sources-loading" role="status">Chargement des connexions…</div>
        : sources.length ? <div className="connected-source-list">
          {sources.map((source) => <article className="connected-source-detail" key={source.key}>
            <span className="connected-source-detail-icon"><CheckCircle2 size={19} aria-hidden="true" /></span>
            <div className="connected-source-detail-main"><div><span className="module-section-kicker">{source.category || 'SOURCE'}</span><h3>{source.name || source.key}</h3></div><p>Connexion vérifiée le {dateLabel(source.connection_checked_at)}.</p>
              {source.sync?.status === 'failed' && <small className="connected-source-sync-error">Dernière synchronisation en échec : {source.sync.last_error || 'Erreur non détaillée.'}</small>}
              {source.sync?.status === 'succeeded' && <small className="connected-source-sync-success">Dernier import réussi le {dateLabel(source.sync.last_success_at)}.</small>}
            </div>
            <span className="connected-source-status"><span />Connectée</span>
          </article>)}
        </div> : <div className="connected-sources-empty"><span className="module-empty-icon"><Plug size={18} aria-hidden="true" /></span><div><strong>Aucune source vérifiée</strong><p>Enregistrer des identifiants ne suffit pas : une vérification de connexion réussie est nécessaire pour afficher une source ici.</p></div><button type="button" onClick={() => navigate('/workspace/integrations')}>Voir les intégrations <ArrowUpRight size={14} aria-hidden="true" /></button></div>}
  </div>;
}
