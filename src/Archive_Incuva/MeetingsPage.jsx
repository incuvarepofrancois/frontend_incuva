import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  MessageSquareText,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { analyzeMeeting, getMeetings, reviewMeeting } from '../services/api';
import './MeetingsPage.css';

function formatDate(value) {
  if (!value) return 'Date indisponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date indisponible';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function Metric({ icon: Icon, label, value, note }) {
  return (
    <article className="meeting-metric">
      <span className="meeting-metric-icon"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className="meeting-metric-label">{label}</span>
      <strong className="meeting-metric-value">{value}</strong>
      <span className="meeting-metric-note">{note}</span>
    </article>
  );
}

function MeetingDetail({ meeting, error, reviewing, onClose, onReview }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const participants = Array.isArray(meeting.participants) ? meeting.participants : [];
  const decisions = Array.isArray(meeting.decisions) ? meeting.decisions : [];
  const actions = Array.isArray(meeting.action_items) ? meeting.action_items : [];

  return (
    <div className="meeting-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="meeting-dialog" role="dialog" aria-modal="true" aria-labelledby="meeting-dialog-title">
        <header className="meeting-dialog-header">
          <div>
            <span className="meeting-dialog-kicker">COMPTE-RENDU · {formatDate(meeting.created_at || meeting.date)}</span>
            <h2 id="meeting-dialog-title">{meeting.title || 'Réunion sans titre'}</h2>
            {participants.length > 0 && <p><Users size={14} aria-hidden="true" />{participants.join(', ')}</p>}
          </div>
          <button className="meeting-icon-button" type="button" onClick={onClose} aria-label="Fermer le compte-rendu"><X size={18} /></button>
        </header>

        <div className="meeting-dialog-content">
          <section className="meeting-detail-section">
            <div className="meeting-detail-heading"><FileText size={16} aria-hidden="true" /><h3>Transcription</h3></div>
            <div className="meeting-transcript">{meeting.transcript || 'Transcription indisponible.'}</div>
          </section>

          <section className="meeting-detail-section">
            <div className="meeting-detail-heading"><CheckCircle2 size={16} aria-hidden="true" /><h3>Décisions</h3><span>{decisions.length}</span></div>
            {decisions.length ? <ul className="meeting-detail-list">{decisions.map((decision, index) => <li key={index}>{decision}</li>)}</ul> : <p className="meeting-detail-empty">Aucune décision extraite.</p>}
          </section>

          <section className="meeting-detail-section">
            <div className="meeting-detail-heading"><ListChecks size={16} aria-hidden="true" /><h3>Actions à suivre</h3><span>{actions.length}</span></div>
            {actions.length ? (
              <ul className="meeting-action-list">
                {actions.map((action, index) => (
                  <li key={index}>
                    <strong>{typeof action === 'string' ? action : action.task || 'Action à préciser'}</strong>
                    {typeof action === 'object' && <span>{[action.owner, action.due_date].filter(Boolean).join(' · ') || 'Responsable et échéance à préciser'}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="meeting-detail-empty">Aucune action extraite.</p>}
          </section>

          <p className="meeting-review-note">Les éléments extraits par Mobyus sont des propositions à vérifier avant leur partage ou leur mise en œuvre.</p>
          {error && <p className="meeting-inline-error" role="alert">{error}</p>}
        </div>

        <footer className="meeting-dialog-footer">
          <span className={meeting.reviewed_at ? 'meeting-review-label is-reviewed' : 'meeting-review-label'}>
            {meeting.reviewed_at ? <CheckCircle2 size={15} aria-hidden="true" /> : <Clock3 size={15} aria-hidden="true" />}
            {meeting.reviewed_at ? 'Compte-rendu vérifié' : 'À vérifier par votre équipe'}
          </span>
          <button className={meeting.reviewed_at ? 'meeting-secondary-button' : 'meeting-primary-button'} type="button" onClick={onReview} disabled={reviewing}>
            {reviewing ? 'Enregistrement…' : meeting.reviewed_at ? 'Annuler la vérification' : <><Check size={15} aria-hidden="true" /> Marquer comme vérifié</>}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getMeetings();
      setMeetings(Array.isArray(data?.meetings) ? data.meetings : []);
    } catch (loadError) {
      setError(loadError.message || 'Impossible de charger les réunions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAnalyze(event) {
    event.preventDefault();
    const content = transcript.trim();
    if (!content || analyzing) return;
    setAnalyzing(true);
    setError('');
    try {
      const meeting = await analyzeMeeting({ transcript: content });
      setSelected(meeting);
      setTranscript('');
      await load();
    } catch (analysisError) {
      setError(analysisError.message || 'Mobyus n’a pas pu analyser cette réunion.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleReview() {
    if (!selected || reviewing) return;
    setReviewing(true);
    setError('');
    try {
      const updated = await reviewMeeting(selected.id, !selected.reviewed_at);
      setSelected(updated);
      setMeetings((current) => current.map((meeting) => meeting.id === updated.id ? updated : meeting));
    } catch (reviewError) {
      setError(reviewError.message || 'Impossible d’enregistrer la vérification.');
    } finally {
      setReviewing(false);
    }
  }

  const decisionsCount = meetings.reduce((sum, meeting) => sum + (meeting.decisions?.length || 0), 0);
  const actionsCount = meetings.reduce((sum, meeting) => sum + (meeting.action_items?.length || 0), 0);
  const signalsCount = meetings.reduce((sum, meeting) => sum + (meeting.risk_signals?.length || 0), 0);
  const pendingCount = meetings.filter((meeting) => !meeting.reviewed_at).length;

  return (
    <main className="meetings-page">
      <header className="module-page-heading">
        <div>
          <span className="module-page-kicker"><span /> MODULE 01 · CONVERSATIONS</span>
          <h2>Intelligence des réunions</h2>
          <p>Retrouvez les décisions et les actions proposées par Mobyus, puis vérifiez-les avec votre équipe.</p>
        </div>
        <div className="module-heading-index" aria-hidden="true"><MessageSquareText size={19} /><span>INCUVA / 01</span></div>
      </header>

      <section className="meeting-metrics" aria-label="Indicateurs des réunions">
        <Metric icon={MessageSquareText} label="Réunions analysées" value={loading ? '—' : meetings.length} note="Dans votre espace" />
        <Metric icon={CheckCircle2} label="Décisions extraites" value={loading ? '—' : decisionsCount} note="À retrouver dans les comptes-rendus" />
        <Metric icon={ListChecks} label="Actions proposées" value={loading ? '—' : actionsCount} note="Responsables à confirmer" />
        <Metric icon={Clock3} label="À vérifier" value={loading ? '—' : pendingCount} note={signalsCount ? signalsCount + ' signal(aux) RH repéré(s)' : 'Validation humaine recommandée'} />
      </section>

      <section className="meeting-compose-panel" aria-labelledby="meeting-compose-title">
        <div className="meeting-compose-heading">
          <span className="meeting-compose-icon"><FileText size={18} aria-hidden="true" /></span>
          <div><h3 id="meeting-compose-title">Analyser une transcription</h3><p>Collez le texte de la réunion pour en extraire les points clés.</p></div>
        </div>
        <form onSubmit={handleAnalyze}>
          <label className="visually-hidden" htmlFor="meeting-transcript">Transcription de la réunion</label>
          <textarea id="meeting-transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Collez ici la transcription de votre réunion…" rows={6} maxLength={200000} />
          <div className="meeting-compose-footer">
            <span>{transcript.length.toLocaleString('fr-FR')} / 200 000 caractères</span>
            <button className="meeting-primary-button" type="submit" disabled={analyzing || !transcript.trim()}>
              {analyzing ? <><span className="module-spinner" aria-hidden="true" /> Analyse en cours</> : <>Analyser avec Mobyus <ArrowRight size={15} aria-hidden="true" /></>}
            </button>
          </div>
        </form>
      </section>

      <section className="meeting-list-section" aria-labelledby="meeting-list-title">
        <div className="module-section-heading">
          <div><span className="module-section-kicker">VOTRE ESPACE</span><h3 id="meeting-list-title">Comptes-rendus</h3></div>
          {!loading && !error && <span className="meeting-list-count">{meetings.length} résultat{meetings.length === 1 ? '' : 's'}</span>}
        </div>

        {error && !meetings.length ? (
          <div className="module-state module-error" role="alert"><span>{error}</span><button type="button" onClick={load}>Réessayer</button></div>
        ) : loading ? (
          <div className="meeting-list" aria-label="Chargement des comptes-rendus"><div className="meeting-skeleton" /><div className="meeting-skeleton" /></div>
        ) : error ? (
          <p className="meeting-inline-error" role="alert">{error}</p>
        ) : meetings.length ? (
          <div className="meeting-list">
            {meetings.map((meeting) => {
              const participants = Array.isArray(meeting.participants) ? meeting.participants : [];
              const signals = Array.isArray(meeting.risk_signals) ? meeting.risk_signals : [];
              return (
                <article className="meeting-row" key={meeting.id}>
                  <span className="meeting-row-mark"><MessageSquareText size={18} aria-hidden="true" /></span>
                  <div className="meeting-row-main">
                    <div className="meeting-row-title-line"><h4>{meeting.title || 'Réunion sans titre'}</h4>{signals.length > 0 && <span className="meeting-signal-badge"><ShieldAlert size={12} aria-hidden="true" /> Signal à examiner</span>}</div>
                    <div className="meeting-row-meta"><span><CalendarDays size={13} aria-hidden="true" />{formatDate(meeting.created_at || meeting.date)}</span>{participants.length > 0 && <span><Users size={13} aria-hidden="true" />{participants.length} participant{participants.length === 1 ? '' : 's'}</span>}</div>
                    <div className="meeting-row-summary"><span>{meeting.decisions?.length || 0} décision{meeting.decisions?.length === 1 ? '' : 's'}</span><i /> <span>{meeting.action_items?.length || 0} action{meeting.action_items?.length === 1 ? '' : 's'}</span></div>
                  </div>
                  <span className={meeting.reviewed_at ? 'meeting-row-status is-reviewed' : 'meeting-row-status'}>{meeting.reviewed_at ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}{meeting.reviewed_at ? 'Vérifiée' : 'À vérifier'}</span>
                  <button className="meeting-open-button" type="button" onClick={() => { setSelected(meeting); setError(''); }}>Ouvrir <ArrowRight size={14} aria-hidden="true" /></button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="module-state module-empty"><span className="module-empty-icon"><MessageSquareText size={20} aria-hidden="true" /></span><div><strong>Aucun compte-rendu pour le moment</strong><p>Une première analyse apparaîtra ici avec les décisions et actions proposées.</p></div></div>
        )}
      </section>

      {selected && <MeetingDetail meeting={selected} error={error} reviewing={reviewing} onClose={() => setSelected(null)} onReview={handleReview} />}
    </main>
  );
}
