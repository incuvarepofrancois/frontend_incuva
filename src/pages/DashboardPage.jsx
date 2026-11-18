import { Component, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Plug,
  Plus,
  Users,
} from 'lucide-react';
import { getIntegrations, getOnboardingPlans } from '../services/api';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function formatDate(value) {
  if (!value) return 'Date à définir';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Date à définir';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function Metric({ icon: Icon, label, value, note }) {
  return (
    <article className="overview-metric">
      <div className="metric-topline">
        <span className="metric-icon"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
        <span className="metric-label">{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-note">{note}</span>
    </article>
  );
}

function ModuleCard({ icon: Icon, number, title, description, detail, action, onClick, tone }) {
  return (
    <button className={`module-card module-card-${tone}`} onClick={onClick}>
      <span className="module-card-top">
        <span className="module-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
        <span className="module-number">{number}</span>
      </span>
      <span className="module-title">{title}</span>
      <span className="module-description">{description}</span>
      <span className="module-card-bottom">
        <span className="module-detail">{detail}</span>
        <span className="module-action">{action}<ArrowUpRight size={15} aria-hidden="true" /></span>
      </span>
    </button>
  );
}

class DashboardErrorBoundary extends Component {
  state = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Erreur inconnue' };
  }

  componentDidCatch(error) {
    console.error('Erreur de rendu du tableau de bord :', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="dashboard-render-error" role="alert">
          <h2>Le tableau de bord n’a pas pu s’afficher</h2>
          <p>Une erreur de rendu a interrompu le chargement : <code>{this.state.errorMessage}</code></p>
          <button type="button" onClick={() => window.location.reload()}>Recharger la page</button>
        </main>
      );
    }
    return this.props.children;
  }
}

function DashboardContent() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState({ plans: [], connectedSources: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const planData = await getOnboardingPlans();
      let connectedSources = [];
      try {
        const integrationData = await getIntegrations();
        const categories = new Set();
        connectedSources = (Array.isArray(integrationData?.integrations) ? integrationData.integrations : [])
          .filter((source) => source.connection_status === 'connected')
          .filter((source) => {
            if (!source.category || categories.has(source.category)) return false;
            categories.add(source.category);
            return true;
          })
          .slice(0, 3);
      } catch { /* L’état des connecteurs reste indépendant des données d’onboarding. */ }

      setOverview({
        plans: Array.isArray(planData?.plans) ? planData.plans.filter(Boolean) : [],
        connectedSources,
      });
    } catch (requestError) {
      setError(requestError.message || 'Les données du tableau de bord sont indisponibles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const plans = Array.isArray(overview.plans) ? overview.plans : [];
  const activePlans = plans.filter((plan) => plan.status === 'active');
  const tasks = useMemo(() => plans.flatMap((plan) => Array.isArray(plan.tasks) ? plan.tasks.filter(Boolean) : []), [plans]);
  const overdueTasks = tasks.filter((task) => task.status !== 'completed' && task.due_date && task.due_date < today());
  const completion = plans.length
    ? Math.round(plans.reduce((sum, plan) => sum + (Number(plan.progress) || 0), 0) / plans.length)
    : 0;
  const latestPlans = [...plans].sort((a, b) => new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0)).slice(0, 4);
  const connectedSources = Array.isArray(overview.connectedSources) ? overview.connectedSources : [];
  const metricValue = (value) => loading || error ? '—' : value.toLocaleString('fr-FR');

  return (
    <div className="dashboard-overview">
      <section className="welcome-panel">
        <div className="welcome-copy">
          <div className="section-kicker"><span className="kicker-line" /> MOBYUS · ONBOARDING AI</div>
          <h2>Chaque arrivée mérite<br /><span>un parcours bien préparé.</span></h2>
          <p>Organisez les premières étapes, suivez leur avancement et gardez votre équipe au centre de l’intégration.</p>
          <button className="dashboard-primary-action" type="button" onClick={() => navigate('/onboarding')}><Plus size={15} aria-hidden="true" /> Préparer une arrivée</button>
        </div>
        <div className="welcome-index" aria-hidden="true">
          <span className="index-label">MOBYUS</span>
          <span className="index-divider" />
          <span className="index-number">01<span> / 01</span></span>
          <span className="index-caption">Modèle actif</span>
        </div>
      </section>

      <section className="overview-section metrics-section">
        <div className="overview-heading-row metrics-heading">
          <div>
            <h3>Suivi des intégrations</h3>
            <p>Une vue synthétique des parcours et des étapes à traiter.</p>
          </div>
          <span className="scope-note">Données de votre organisation</span>
        </div>
        <div className="metrics-grid">
          <Metric icon={Users} label="Parcours actifs" value={metricValue(activePlans.length)} note="Collaborateurs en intégration" />
          <Metric icon={ClipboardCheck} label="Étapes prévues" value={metricValue(tasks.length)} note="Tous les parcours" />
          <Metric icon={Clock3} label="En retard" value={metricValue(overdueTasks.length)} note="Échéances à examiner" />
          <Metric icon={Check} label="Avancement moyen" value={loading || error ? '—' : `${completion}%`} note="Tous les parcours" />
        </div>
      </section>

      <div className="overview-heading-row">
        <div>
          <h3>Votre espace d’intégration</h3>
          <p>Accédez au suivi des parcours et aux outils qui les alimentent.</p>
        </div>
      </div>
      <section className="module-grid" aria-label="Outils d’intégration">
        <ModuleCard
          icon={ClipboardCheck}
          number="01 / PARCOURS"
          title="Onboarding AI"
          description="Créez une trame de départ par collaborateur, ajustez les étapes et suivez leur progression avec votre équipe."
          detail={loading ? 'Chargement…' : `${activePlans.length} parcours actif${activePlans.length === 1 ? '' : 's'}`}
          action="Gérer les parcours"
          onClick={() => navigate('/onboarding')}
          tone="onboarding"
        />
        <ModuleCard
          icon={Plug}
          number="02 / CONNEXIONS"
          title="Sources de données"
          description="Consultez les outils connectés à votre organisation et gérez les intégrations disponibles."
          detail={loading ? 'Chargement…' : `${connectedSources.length} source${connectedSources.length === 1 ? '' : 's'} vérifiée${connectedSources.length === 1 ? '' : 's'}`}
          action="Voir les intégrations"
          onClick={() => navigate('/workspace/integrations')}
          tone="meeting"
        />
      </section>

      <section className="overview-section connected-sources-section" aria-labelledby="connected-sources-title">
        <div className="overview-heading-row connected-sources-heading">
          <div><h3 id="connected-sources-title">Sources connectées</h3><p>Jusqu’à trois outils, de catégories différentes.</p></div>
          <button className="text-link" onClick={() => navigate('/workspace/sources')}>Voir plus <ChevronRight size={16} aria-hidden="true" /></button>
        </div>
        {loading ? <div className="connected-source-empty" role="status">Chargement des sources connectées…</div> : connectedSources.length ? <div className="connected-source-grid">
          {connectedSources.map((source) => <button className="connected-source-card" key={source.key} onClick={() => navigate('/workspace/sources')}>
            <span className="connected-source-icon"><Plug size={16} aria-hidden="true" /></span>
            <span className="connected-source-copy"><strong>{source.name}</strong><small>{source.category}</small></span>
            <span className="connected-source-status"><span />Connectée</span>
          </button>)}
        </div> : <div className="connected-source-empty"><span>Aucune source vérifiée pour le moment.</span><button onClick={() => navigate('/workspace/integrations')}>Configurer une intégration <ArrowUpRight size={14} aria-hidden="true" /></button></div>}
      </section>

      <section className="overview-section activity-section">
        <div className="overview-heading-row activity-heading">
          <div>
            <h3>Parcours récents</h3>
            <p>Les intégrations créées dans votre organisation.</p>
          </div>
          <button className="text-link" onClick={() => navigate('/onboarding')}>Tout voir <ChevronRight size={16} aria-hidden="true" /></button>
        </div>

        {error ? (
          <div className="dashboard-state dashboard-error" role="alert"><span>{error}</span><button onClick={loadOverview}>Réessayer</button></div>
        ) : loading ? (
          <div className="activity-list" aria-label="Chargement des parcours"><div className="activity-skeleton" /><div className="activity-skeleton" /><div className="activity-skeleton" /></div>
        ) : latestPlans.length ? (
          <div className="activity-list">
            {latestPlans.map((plan) => (
              <button className="activity-row" key={plan.id} onClick={() => navigate('/onboarding')}>
                <span className="activity-date">{formatDate(plan.start_date)}</span>
                <span className="activity-title">{plan.employee?.name || 'Collaborateur'}</span>
                <span className="activity-summary">{plan.employee?.role || 'Poste à préciser'} <span>·</span> {plan.completed_tasks || 0}/{plan.total_tasks || 0} étapes</span>
                <span className={`review-status${plan.status === 'completed' ? ' is-reviewed' : ''}`}>
                  {plan.status === 'completed' ? <CheckCircle2 size={14} aria-hidden="true" /> : <CalendarDays size={14} aria-hidden="true" />}
                  {plan.status === 'completed' ? 'Terminé' : 'En cours'}
                </span>
                <ChevronRight className="activity-chevron" size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="dashboard-state dashboard-empty">
            <span className="empty-icon"><ClipboardCheck size={20} aria-hidden="true" /></span>
            <div><strong>Aucun parcours pour le moment</strong><p>Créez le premier parcours d’intégration pour préparer une arrivée et suivre ses étapes.</p></div>
            <button onClick={() => navigate('/onboarding')}>Créer un parcours <ArrowUpRight size={14} aria-hidden="true" /></button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardErrorBoundary><DashboardContent /></DashboardErrorBoundary>;
}
