import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, CheckCircle2, CircleDashed, Clock3, Search } from 'lucide-react';
import { getInsights, getMeetings, getOnboardingPlans, getRiskScores } from '../services/api';
import { buildActivityEvents, csvCell, dateLabel, WorkspaceHeader } from './WorkspaceShared';

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('Tous les modules');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([getMeetings(), getOnboardingPlans(), getRiskScores(), getInsights()]).then((results) => {
      if (!active) return;
      const value = (index, key) => results[index].status === 'fulfilled' ? results[index].value?.[key] || [] : [];
      const nextEvents = buildActivityEvents({ meetings: value(0, 'meetings'), plans: value(1, 'plans'), riskScores: value(2, 'risk_scores'), insights: value(3, 'insights') });
      setEvents(nextEvents);
      if (!nextEvents.length && results.every((result) => result.status === 'rejected')) setError('Les activités ne sont pas accessibles pour le moment.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ['Tous les modules', ...new Set(events.map((event) => event.category))], [events]);
  const visibleEvents = useMemo(() => events.filter((event) => (filter === 'Tous les modules' || event.category === filter) && `${event.title} ${event.detail} ${event.source}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))), [events, filter, search]);

  function downloadCsv() {
    const rows = [['Date', 'Module', 'Activité', 'Détail'], ...visibleEvents.map((event) => [dateLabel(event.date), event.source, event.title, event.detail])];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'incuva-activites.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="workspace-page">
      <WorkspaceHeader index="03" kicker="ACTIVITÉ DE LA PLATEFORME" title="Logs" description="Consultez et exportez les activités disponibles dans les enregistrements actuels d’INCUVA." />
      <div className="workspace-log-disclaimer"><Clock3 size={16} aria-hidden="true" /><span>Vue reconstituée à partir des événements métier exposés par l’API. Ce n’est pas encore un journal d’audit exhaustif des connexions et actions utilisateurs.</span></div>
      <div className="workspace-log-toolbar">
        <label className="workspace-search"><Search size={16} aria-hidden="true" /><span className="visually-hidden">Rechercher dans les activités</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une activité" /></label>
        <label className="visually-hidden" htmlFor="log-module-filter">Filtrer par module</label>
        <select id="log-module-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select>
        <button className="workspace-export" type="button" onClick={downloadCsv} disabled={!visibleEvents.length}><ArrowDownToLine size={15} aria-hidden="true" />Exporter CSV</button>
      </div>
      <section className="workspace-log-panel" aria-label="Journal des activités" aria-live="polite">
        {loading ? <div className="workspace-log-empty"><span className="workspace-spinner" />Chargement des activités…</div>
          : error ? <div className="workspace-log-empty" role="alert">{error}</div>
            : visibleEvents.length ? <><div className="workspace-log-table-head"><span>Date & heure</span><span>Activité</span><span>Module</span></div><ol className="workspace-log-list">{visibleEvents.map((event) => <li className="workspace-log-row" key={event.id}><time dateTime={event.date}>{dateLabel(event.date)}</time><div><strong>{event.title}</strong><span>{event.detail}</span></div><span className="workspace-log-source">{event.source}</span></li>)}</ol></>
              : <div className="workspace-log-empty"><span className="workspace-log-empty-icon"><CircleDashed size={18} aria-hidden="true" /></span><div><strong>Aucune activité correspondante</strong><p>Les événements apparaîtront ici lorsque les modules enregistreront de nouvelles données.</p></div></div>}
      </section>
      <p className="workspace-log-count">{visibleEvents.length} activité{visibleEvents.length === 1 ? '' : 's'} affichée{visibleEvents.length === 1 ? '' : 's'}</p>
      <p className="workspace-footnote"><CheckCircle2 size={14} aria-hidden="true" /> Les événements sont limités aux données accessibles à votre organisation.</p>
    </div>
  );
}
