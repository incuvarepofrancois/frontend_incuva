import { Activity, ArrowUpRight, Boxes, CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const availableModels = [
  { name: 'Employee Risk Detection', tag: 'Rétention', description: 'Examine les signaux RH disponibles pour aider les équipes à repérer les situations à accompagner.', icon: Activity, route: '/risk' },
  { name: 'Meeting Intelligence', tag: 'Réunions', description: 'Analyse les transcriptions, extrait les décisions et organise le suivi des actions.', icon: Boxes, route: '/meetings' },
  { name: 'Onboarding AI', tag: 'Intégration', description: 'Propose des trames d’arrivée personnalisables et suit les étapes du parcours.', icon: Sparkles, route: '/onboarding' },
];

const upcomingModels = [
  { name: 'Workforce Prediction', tag: 'Prototype API', description: 'Estimation des besoins en recrutement et des évolutions d’effectifs.', status: 'prototype' },
  { name: 'Talent Intelligence', tag: 'À venir', description: 'Analyse sémantique des profils et cartographie des compétences.', status: 'planned' },
  { name: 'Productivity Intelligence', tag: 'À venir', description: 'Indicateurs de fonctionnement d’équipe à partir des données autorisées.', status: 'planned' },
];

export default function AIModelsPage() {
  return (
    <div className="workspace-page ai-models-page">
      <section className="ai-catalogue-hero" aria-labelledby="ai-catalogue-title">
        <div className="ai-catalogue-copy">
          <span className="ai-catalogue-eyebrow"><span /> MOBYUS · CATALOGUE IA</span>
          <h2 id="ai-catalogue-title">Des intelligences<br /><em>au service de vos équipes.</em></h2>
          <p>Explorez les modules de la plateforme et leur niveau de disponibilité actuel.</p>
        </div>
        <div className="ai-catalogue-summary" aria-label="3 modules sur 6 disponibles">
          <span className="ai-catalogue-summary-label">ÉTAT DU CATALOGUE</span>
          <strong>03<span> / 06</span></strong>
          <span className="ai-catalogue-progress"><span /></span>
          <span className="ai-catalogue-summary-note">modules disponibles aujourd’hui</span>
        </div>
        <span className="ai-catalogue-orbit" aria-hidden="true" />
      </section>

      <section className="ai-models-available" aria-labelledby="available-models-title">
        <header className="ai-models-section-heading">
          <div><span className="module-section-kicker">PRÊTS À UTILISER</span><h3 id="available-models-title">Modules disponibles</h3></div>
          <span><CheckCircle2 size={14} aria-hidden="true" /> 3 modules</span>
        </header>
        <div className="ai-models-feature-grid">
          {availableModels.map(({ name, tag, description, icon: Icon, route }, index) => (
            <article className="ai-model-feature-card" key={name}>
              <div className="ai-model-feature-top"><span className="ai-model-feature-icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span><span className="ai-model-index">0{index + 1}</span></div>
              <span className="ai-model-tag">{tag}</span>
              <h4>{name}</h4>
              <p>{description}</p>
              <footer><span className="ai-model-available-state"><span />Disponible</span><Link to={route} aria-label={`Ouvrir le module ${name}`}>Ouvrir le module <ArrowUpRight size={14} aria-hidden="true" /></Link></footer>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-models-roadmap" aria-labelledby="roadmap-title">
        <header className="ai-models-section-heading">
          <div><span className="module-section-kicker">EN DÉVELOPPEMENT</span><h3 id="roadmap-title">Prochaines intelligences</h3></div>
          <span><Clock3 size={14} aria-hidden="true" /> 3 modules</span>
        </header>
        <div className="ai-model-roadmap-list">
          {upcomingModels.map((model, index) => (
            <article className="ai-model-roadmap-row" key={model.name}>
              <span className="ai-model-roadmap-index">0{index + 4}</span>
              <div className="ai-model-roadmap-copy"><h4>{model.name}</h4><p>{model.description}</p></div>
              <span className={`ai-model-roadmap-status ${model.status}`}>{model.tag}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
