import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Building2, CheckCircle2, RefreshCw, ShieldCheck, Users, X } from 'lucide-react';
import { getEmployees, getRiskScores, predictTurnover } from '../services/api';
import './RiskPage.css';

function levelMeta(level) {
  if (level === 'critical') return { label: 'Critique', tone: 'critical' };
  if (level === 'high') return { label: 'Élevé', tone: 'high' };
  if (level === 'medium') return { label: 'À surveiller', tone: 'medium' };
  if (level === 'low') return { label: 'Faible', tone: 'low' };
  return { label: 'Non classé', tone: 'unknown' };
}

function recommendationLabel(value) {
  const labels = {
    '1:1_urgent': 'Prévoir un échange individuel',
    feedback_session: 'Proposer une session de feedback',
    monitor: 'Suivre l’évolution des signaux',
    no_action: 'Aucune action proposée',
  };
  return labels[value] || value || 'Aucune recommandation disponible';
}

function Metric({ icon: Icon, label, value, note }) {
  return (
    <article className="risk-metric">
      <span className="risk-metric-icon"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className="risk-metric-label">{label}</span>
      <strong className="risk-metric-value">{value}</strong>
      <span className="risk-metric-note">{note}</span>
    </article>
  );
}

function RiskDetail({ employee, analysis, loading, error, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const scoreValue = analysis?.risk_score;
  const confidenceValue = analysis?.confidence;
  const hasData = analysis?.data_status !== 'insufficient_data';
  const score = hasData && scoreValue !== null && scoreValue !== undefined && Number.isFinite(Number(scoreValue)) ? Math.max(0, Math.min(100, Number(scoreValue))) : null;
  const confidence = confidenceValue !== null && confidenceValue !== undefined && Number.isFinite(Number(confidenceValue)) ? Math.max(0, Math.min(1, Number(confidenceValue))) : null;
  const level = analysis && hasData ? levelMeta(analysis.risk_level) : null;
  const drivers = Array.isArray(analysis?.drivers) ? analysis.drivers : [];
  const absenceContext = analysis?.canonical_context?.domains?.absence_history_180d;

  return (
    <div className="risk-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="risk-dialog" role="dialog" aria-modal="true" aria-labelledby="risk-dialog-title">
        <header className="risk-dialog-header">
          <div className="risk-person-mark" aria-hidden="true">{(employee.name || '?').trim().charAt(0).toUpperCase()}</div>
          <div className="risk-person-copy"><span className="module-section-kicker">ANALYSE INDIVIDUELLE</span><h2 id="risk-dialog-title">{employee.name || 'Collaborateur'}</h2><p>{[employee.role, employee.team].filter(Boolean).join(' · ') || 'Informations de poste non renseignées'}</p></div>
          <button className="risk-icon-button" type="button" onClick={onClose} aria-label="Fermer l’analyse"><X size={18} /></button>
        </header>

        <div className="risk-dialog-content">
          {loading ? (
            <div className="risk-analysis-loading"><span className="module-spinner" aria-hidden="true" /><p>Analyse des signaux disponibles…</p></div>
          ) : error ? (
            <div className="risk-analysis-error" role="alert"><AlertCircle size={18} /><p>{error}</p></div>
          ) : analysis ? (
            <>
              <section className="risk-score-panel" aria-label="Résultat de l’analyse">
                <span className="module-section-kicker">INDICATEUR DE RISQUE</span>
                {score === null ? <strong className="risk-score-unavailable">Données insuffisantes</strong> : <strong className={'risk-score-value tone-' + level.tone}>{score}<span>/100</span></strong>}
                {level && <span className={'risk-level-badge tone-' + level.tone}>{level.label}</span>}
                <div className="risk-score-track" aria-hidden="true"><span className={level ? 'tone-' + level.tone : ''} style={{ width: (score === null ? 0 : score) + '%' }} /></div>
                <p>{hasData ? 'Résultat calculé à partir des signaux actuellement disponibles.' : 'Aucun signal exploitable n’est enregistré pour ce profil. Aucun niveau de risque ne peut être établi.'}</p>
              </section>

              <section className="risk-detail-section">
                <div className="risk-detail-heading"><h3>Signaux pris en compte</h3><span>{drivers.length}</span></div>
                {drivers.length ? <ul className="risk-driver-list">{drivers.map((driver, index) => {
                  const type = typeof driver === 'string' ? driver : driver?.type || 'Signal';
                  const source = typeof driver === 'object' ? driver?.source : null;
                  return <li key={index}><span className="risk-driver-dot" /><span>{String(type).replace(/_/g, ' ')}</span>{source && <small>{source}</small>}</li>;
                })}</ul> : <p className="risk-empty-detail">Aucun signal exploitable n’a été renvoyé pour cette analyse.</p>}
              </section>

              <section className="risk-context-section" aria-labelledby="risk-context-title">
                <div className="risk-detail-heading"><h3 id="risk-context-title">Couverture des données</h3><span>{absenceContext?.available ? 'Disponible' : 'Partielle'}</span></div>
                {absenceContext?.available ? (
                  <>
                    <p>Historique d’absences couvert du {absenceContext.covered_from} au {absenceContext.covered_through}.</p>
                    <div className="risk-context-periods">
                      <span><strong>{absenceContext.last_90_days?.approved_records ?? 0}</strong> absences approuvées · 90 derniers jours</span>
                      <span><strong>{absenceContext.previous_90_days?.approved_records ?? 0}</strong> absences approuvées · 90 jours précédents</span>
                    </div>
                  </>
                ) : <p>L’historique complet de 180 jours n’est pas disponible. Vérifiez la synchronisation Frappe HR et ses permissions de lecture.</p>}
                <small>Ces données donnent du contexte ; elles ne contribuent pas au score de risque hr.v1.</small>
              </section>

              {analysis.recommendation && <section className="risk-recommendation"><span className="module-section-kicker">PISTE DE SUIVI</span><p>{recommendationLabel(analysis.recommendation)}</p></section>}

              {hasData && confidence !== null && <div className="risk-confidence"><span>Couverture des signaux</span><strong>{Math.round(confidence * 100)} %</strong><div><span style={{ width: Math.round(confidence * 100) + '%' }} /></div></div>}
              <p className="risk-review-note">Cet indicateur est une aide à l’analyse, pas une décision sur une personne. Toute interprétation doit être contextualisée et vérifiée par une personne.</p>
            </>
          ) : (
            <div className="risk-analysis-empty"><ShieldCheck size={22} aria-hidden="true" /><p>Lance une analyse pour afficher les signaux actuellement disponibles pour ce profil.</p></div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function RiskPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [analyses, setAnalyses] = useState({});
  const [analysisError, setAnalysisError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [data, riskData] = await Promise.all([getEmployees(), getRiskScores()]);
      setEmployees(Array.isArray(data?.employees) ? data.employees : []);
      const savedAnalyses = Array.isArray(riskData?.risk_scores) ? riskData.risk_scores : [];
      setAnalyses(Object.fromEntries(savedAnalyses.map((result) => [result.employee_id, result])));
    } catch (loadError) {
      setError(loadError.message || 'Impossible de charger les collaborateurs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAnalyze(employee) {
    setSelected(employee);
    setAnalysisError('');
    setAnalyzing(true);
    try {
      const result = await predictTurnover({ employee_id: employee.id });
      setAnalyses((current) => ({ ...current, [employee.id]: result }));
    } catch (requestError) {
      setAnalysisError(requestError.message || 'L’analyse des signaux est indisponible.');
    } finally {
      setAnalyzing(false);
    }
  }

  const analysisResults = useMemo(() => Object.values(analyses), [analyses]);
  const elevatedCount = analysisResults.filter((result) => result.data_status !== 'insufficient_data' && (result.risk_level === 'high' || result.risk_level === 'critical')).length;
  const teamsCount = new Set(employees.map((employee) => employee.team).filter(Boolean)).size;

  return (
    <main className="risk-page">
      <header className="module-page-heading">
        <div>
          <span className="module-page-kicker"><span /> MODULE 02 · SIGNAUX RH</span>
          <h2>Détection des risques</h2>
          <p>Examinez les signaux disponibles avec le contexte nécessaire, sans réduire une situation à un score.</p>
        </div>
        <div className="module-heading-index risk-heading-mark" aria-hidden="true"><ShieldCheck size={19} /><span>INCUVA / 02</span></div>
      </header>

      <section className="risk-metrics" aria-label="Périmètre et analyses">
        <Metric icon={Users} label="Collaborateurs" value={loading ? '—' : employees.length} note="Dans votre espace" />
        <Metric icon={Building2} label="Équipes renseignées" value={loading ? '—' : teamsCount} note="D’après les profils disponibles" />
        <Metric icon={CheckCircle2} label="Profils analysés" value={analysisResults.length} note="Dernier résultat sauvegardé" />
        <Metric icon={ShieldCheck} label="Résultats élevés" value={elevatedCount} note="Parmi les analyses lancées ici" />
      </section>

      <section className="risk-table-section" aria-labelledby="risk-list-title">
        <div className="module-section-heading">
          <div><span className="module-section-kicker">DONNÉES DE VOTRE ORGANISATION</span><h3 id="risk-list-title">Collaborateurs suivis</h3></div>
          <button className="risk-refresh-button" type="button" onClick={load} disabled={loading}><RefreshCw size={14} aria-hidden="true" /> Actualiser</button>
        </div>

        {error ? (
          <div className="module-state module-error" role="alert"><span>{error}</span><button type="button" onClick={load}>Réessayer</button></div>
        ) : loading ? (
          <div className="risk-table-card" aria-label="Chargement des collaborateurs"><div className="risk-table-skeleton" /><div className="risk-table-skeleton" /><div className="risk-table-skeleton" /></div>
        ) : employees.length ? (
          <div className="risk-table-card"><div className="risk-table-scroll"><table className="risk-table">
            <thead><tr><th scope="col">Collaborateur</th><th scope="col">Équipe / poste</th><th scope="col">Dernière analyse</th><th scope="col">Signaux</th><th scope="col"><span className="visually-hidden">Action</span></th></tr></thead>
            <tbody>{employees.map((employee) => {
              const result = analyses[employee.id];
              const hasData = result?.data_status !== 'insufficient_data';
              const level = result && hasData ? levelMeta(result.risk_level) : null;
              const driverCount = result ? (result.signals_count ?? (Array.isArray(result.drivers) ? result.drivers.length : 0)) : 0;
              return (
                <tr key={employee.id}>
                  <td><div className="risk-employee-cell"><span className="risk-employee-avatar" aria-hidden="true">{(employee.name || '?').trim().charAt(0).toUpperCase()}</span><span><strong>{employee.name || 'Nom non renseigné'}</strong><small>{employee.status || 'Statut non renseigné'}</small></span></div></td>
                  <td><span className="risk-role-cell">{employee.team || 'Équipe non renseignée'}{employee.role ? <small>{employee.role}</small> : null}</span></td>
                  <td>{level ? <span className={'risk-level-badge tone-' + level.tone}>{level.label}</span> : <span className="risk-not-analyzed">{result ? 'Données insuffisantes' : 'Aucune'}</span>}</td>
                  <td><span className="risk-driver-count">{result ? driverCount + ' signal' + (driverCount === 1 ? '' : 's') : 'À calculer'}</span></td>
                  <td><button className="risk-analyze-button" type="button" onClick={() => handleAnalyze(employee)} disabled={analyzing && selected?.id === employee.id}>{analyzing && selected?.id === employee.id ? <><span className="module-spinner" aria-hidden="true" /> Analyse</> : <>Analyser <ArrowRight size={14} aria-hidden="true" /></>}</button></td>
                </tr>
              );
            })}</tbody>
          </table></div><p className="risk-table-footnote">Un résultat n’apparaît qu’après le lancement d’une analyse. Aucun profil fictif n’est ajouté.</p></div>
        ) : (
          <div className="module-state module-empty"><span className="module-empty-icon"><Users size={20} aria-hidden="true" /></span><div><strong>Aucun collaborateur dans cet espace</strong><p>Les profils apparaîtront ici après leur import ou leur ajout à votre organisation.</p></div></div>
        )}
      </section>

      {selected && <RiskDetail employee={selected} analysis={analyses[selected.id]} loading={analyzing} error={analysisError} onClose={() => { setSelected(null); setAnalysisError(''); }} />}
    </main>
  );
}
