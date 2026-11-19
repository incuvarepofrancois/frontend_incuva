import { createElement, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, RotateCcw, Search, UserCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEmployees } from '../services/api';
import './EmployeesPage.css';

const PAGE_SIZE = 10;
const API_PAGE_SIZE = 100;
const MISSING_FILTER = '__missing__';

async function loadAllEmployees() {
  const first = await getEmployees({ page: 1, per_page: API_PAGE_SIZE });
  const total = first?.total;
  if (!Array.isArray(first?.employees) || !Number.isSafeInteger(total) || total < 0 || first.page !== 1 || first.employees.length !== Math.min(API_PAGE_SIZE, total)) {
    throw new Error('La réponse de l’API ne contient pas une pagination cohérente.');
  }

  const employees = [];
  const ids = new Set();
  const appendPage = (items, page) => {
    for (const employee of items) {
      if (!employee || employee.id == null || ids.has(employee.id)) {
        throw new Error(`La page ${page} contient un collaborateur sans identifiant ou un doublon.`);
      }
      ids.add(employee.id);
      employees.push(employee);
    }
  };

  appendPage(first.employees, 1);
  const totalPages = Math.ceil(total / API_PAGE_SIZE);
  for (let page = 2; page <= totalPages; page += 1) {
    const result = await getEmployees({ page, per_page: API_PAGE_SIZE });
    const expectedCount = Math.min(API_PAGE_SIZE, total - (page - 1) * API_PAGE_SIZE);
    if (!Array.isArray(result?.employees) || result.page !== page || result.total !== total || result.employees.length !== expectedCount) {
      throw new Error(`Impossible de confirmer la page ${page} des collaborateurs. Actualisez la liste pour réessayer.`);
    }
    appendPage(result.employees, page);
  }

  if (employees.length !== total) {
    throw new Error('Le nombre de collaborateurs reçus ne correspond pas au total annoncé par l’API.');
  }
  return employees;
}

function formatDate(value) {
  if (typeof value !== 'string') return 'Non renseignée';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
  if (!match) return 'Non renseignée';
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return 'Non renseignée';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function displayValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'Non renseigné';
}

function statusText(status) {
  if (status === 'active') return 'Actif';
  if (typeof status !== 'string' || !status.trim()) return 'Non renseigné';
  return status.trim();
}

function StatusBadge({ status }) {
  const kind = status === 'active' ? 'is-active' : status ? 'is-other' : 'is-missing';
  return <span className={`employees-status ${kind}`}>{statusText(status)}</span>;
}

function Metric({ label, value, note, icon: Icon }) {
  return <article className="employees-metric">
    <span className="employees-metric-icon">{createElement(Icon, { size: 17, 'aria-hidden': true })}</span>
    <span className="employees-metric-label">{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </article>;
}

function EmployeeDetails({ employee, managerName }) {
  return <dl className="employees-card-details">
    <div><dt>Fonction</dt><dd>{displayValue(employee.role)}</dd></div>
    <div><dt>Équipe</dt><dd>{displayValue(employee.team)}</dd></div>
    <div><dt>Manager</dt><dd>{managerName}</dd></div>
    <div><dt>Date d’arrivée</dt><dd>{formatDate(employee.hire_date)}</dd></div>
    <div><dt>Statut</dt><dd><StatusBadge status={employee.status} /></dd></div>
  </dl>;
}

function AccessError({ error, onRetry }) {
  const forbidden = error?.status === 403;
  const unauthorized = error?.status === 401;
  const title = forbidden ? 'Accès refusé' : unauthorized ? 'Session requise' : 'Collaborateurs indisponibles';
  const message = forbidden
    ? 'Votre compte ne dispose pas de la permission employees:view.'
    : unauthorized
      ? 'Votre session a expiré. Connectez-vous à nouveau pour consulter l’annuaire.'
      : error?.message || 'La liste des collaborateurs n’a pas pu être chargée.';

  return <div className={`employees-alert${forbidden || unauthorized ? ' is-access' : ''}`} role={forbidden || unauthorized ? 'status' : 'alert'}>
    <AlertCircle size={19} aria-hidden="true" />
    <div><strong>{title}</strong><p>{message}</p></div>
    {!forbidden && !unauthorized && <button type="button" className="employees-secondary-button" onClick={onRetry}>Réessayer</button>}
  </div>;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    loadAllEmployees()
      .then((result) => { if (current) setEmployees(result); })
      .catch((requestError) => { if (current) { setEmployees([]); setError(requestError); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [reloadKey]);

  const managerNames = useMemo(() => new Map(employees.map((employee) => [employee.id, employee.name])), [employees]);
  const teams = useMemo(() => [...new Set(employees.map((employee) => employee.team).filter((value) => typeof value === 'string' && value.trim()))].sort((a, b) => a.localeCompare(b, 'fr')), [employees]);
  const roles = useMemo(() => [...new Set(employees.map((employee) => employee.role).filter((value) => typeof value === 'string' && value.trim()))].sort((a, b) => a.localeCompare(b, 'fr')), [employees]);
  const statuses = useMemo(() => [...new Set(employees.map((employee) => employee.status).filter((value) => typeof value === 'string' && value.trim()))].sort((a, b) => a.localeCompare(b, 'fr')), [employees]);

  const filteredEmployees = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('fr-FR');
    return employees.filter((employee) => {
      const haystack = [employee.name, employee.role, employee.team]
        .filter((value) => typeof value === 'string')
        .join(' ')
        .toLocaleLowerCase('fr-FR');
      const matchesSearch = !search || haystack.includes(search);
      const matchesStatus = !statusFilter || (statusFilter === MISSING_FILTER
        ? typeof employee.status !== 'string' || !employee.status.trim()
        : employee.status === statusFilter);
      const matchesTeam = !teamFilter || (teamFilter === MISSING_FILTER
        ? typeof employee.team !== 'string' || !employee.team.trim()
        : employee.team === teamFilter);
      const matchesRole = !roleFilter || (roleFilter === MISSING_FILTER
        ? typeof employee.role !== 'string' || !employee.role.trim()
        : employee.role === roleFilter);
      return matchesSearch && matchesStatus && matchesTeam && matchesRole;
    }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' }) || Number(a.id) - Number(b.id));
  }, [employees, query, roleFilter, statusFilter, teamFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageEmployees = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeCount = employees.filter((employee) => employee.status === 'active').length;
  const hasFilters = Boolean(query || statusFilter || teamFilter || roleFilter);

  function resetFilters() {
    setQuery('');
    setStatusFilter('');
    setTeamFilter('');
    setRoleFilter('');
    setPage(1);
  }

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  const retry = () => setReloadKey((key) => key + 1);

  return <div className="employees-page">
    <header className="employees-heading">
      <div>
        <span className="employees-eyebrow">INCUVA OIS · ORGANISATION</span>
        <h2>Employees</h2>
        <p>L’annuaire opérationnel des collaborateurs de votre organisation.</p>
      </div>
      <div className="employees-heading-meta" aria-live="polite">
        <span>{loading || error ? '—' : employees.length}</span>
        <small>collaborateurs chargés</small>
      </div>
    </header>

    {error && <AccessError error={error} onRetry={retry} />}

    <section className="employees-metrics" aria-label="Indicateurs collaborateurs" aria-busy={loading}>
      <Metric icon={Users} label="Total collaborateurs" value={loading || error ? '—' : employees.length} note="Liste complète confirmée par l’API" />
      <Metric icon={UserCheck} label="Collaborateurs actifs" value={loading || error ? '—' : activeCount} note="Statut exactement égal à active" />
    </section>

    <section className="employees-panel" aria-labelledby="employees-list-title">
      <div className="employees-section-heading">
        <div><span className="employees-eyebrow">ANNUAIRE</span><h3 id="employees-list-title">Collaborateurs</h3><p>Recherchez et filtrez les informations disponibles.</p></div>
        <span className="employees-result-count" aria-live="polite">{loading || error ? '—' : `${filteredEmployees.length} résultat${filteredEmployees.length > 1 ? 's' : ''}`}</span>
      </div>

      <div className="employees-filters" role="search" aria-label="Recherche et filtres des collaborateurs">
        <label className="employees-search" htmlFor="employees-search">
          <Search size={16} aria-hidden="true" />
          <input id="employees-search" type="search" value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder="Nom, fonction ou équipe" disabled={loading || Boolean(error)} />
        </label>
        <label htmlFor="employees-status-filter">Statut<select id="employees-status-filter" value={statusFilter} onChange={(event) => changeFilter(setStatusFilter, event.target.value)} disabled={loading || Boolean(error)}><option value="">Tous</option>{statuses.map((status) => <option key={status} value={status}>{statusText(status)}</option>)}{employees.some((employee) => typeof employee.status !== 'string' || !employee.status.trim()) && <option value={MISSING_FILTER}>Non renseigné</option>}</select></label>
        <label htmlFor="employees-team-filter">Équipe<select id="employees-team-filter" value={teamFilter} onChange={(event) => changeFilter(setTeamFilter, event.target.value)} disabled={loading || Boolean(error)}><option value="">Toutes</option>{teams.map((team) => <option key={team} value={team}>{team}</option>)}{employees.some((employee) => typeof employee.team !== 'string' || !employee.team.trim()) && <option value={MISSING_FILTER}>Non renseignée</option>}</select></label>
        <label htmlFor="employees-role-filter">Fonction<select id="employees-role-filter" value={roleFilter} onChange={(event) => changeFilter(setRoleFilter, event.target.value)} disabled={loading || Boolean(error)}><option value="">Toutes</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}{employees.some((employee) => typeof employee.role !== 'string' || !employee.role.trim()) && <option value={MISSING_FILTER}>Non renseignée</option>}</select></label>
        <button type="button" className="employees-reset-button" onClick={resetFilters} disabled={!hasFilters || loading || Boolean(error)}><RotateCcw size={14} aria-hidden="true" />Réinitialiser</button>
      </div>

      {loading ? <div className="employees-loading" role="status"><LoaderCircle className="employees-spinner" size={19} aria-hidden="true" />Chargement des collaborateurs…</div>
        : error ? <p className="employees-inline-state">Les résultats ne sont pas affichés tant que la liste complète n’a pas pu être vérifiée.</p>
          : employees.length === 0 ? <div className="employees-empty"><Users size={22} aria-hidden="true" /><div><strong>Aucun collaborateur enregistré</strong><p>Les collaborateurs apparaîtront ici lorsqu’ils seront disponibles dans votre organisation.</p></div></div>
            : filteredEmployees.length === 0 ? <div className="employees-empty"><Search size={21} aria-hidden="true" /><div><strong>Aucun résultat</strong><p>Essayez une autre recherche ou réinitialisez les filtres.</p></div><button type="button" className="employees-secondary-button" onClick={resetFilters}>Réinitialiser les filtres</button></div>
              : <>
                <div className="employees-table-wrap">
                  <table className="employees-table">
                    <caption className="employees-visually-hidden">Liste des collaborateurs, triée par nom.</caption>
                    <thead><tr><th scope="col">Collaborateur</th><th scope="col">Fonction</th><th scope="col">Équipe</th><th scope="col">Manager</th><th scope="col">Date d’arrivée</th><th scope="col">Statut</th><th scope="col"><span className="employees-visually-hidden">Action</span></th></tr></thead>
                    <tbody>{pageEmployees.map((employee) => {
                      const managerName = employee.manager_id != null ? managerNames.get(employee.manager_id) || 'Non renseigné' : 'Non renseigné';
                      const profileUrl = `/employees/${encodeURIComponent(employee.id)}`;
                      return <tr key={employee.id}><th scope="row"><Link className="employees-profile-link" to={profileUrl} state={{ managerId: employee.manager_id, managerName }}>{displayValue(employee.name)}</Link></th><td>{displayValue(employee.role)}</td><td>{displayValue(employee.team)}</td><td>{managerName}</td><td>{formatDate(employee.hire_date)}</td><td><StatusBadge status={employee.status} /></td><td><Link className="employees-view-link" to={profileUrl} state={{ managerId: employee.manager_id, managerName }}>Voir le profil<ChevronRight size={14} aria-hidden="true" /></Link></td></tr>;
                    })}</tbody>
                  </table>
                </div>
                <div className="employees-mobile-list">
                  {pageEmployees.map((employee) => {
                    const managerName = employee.manager_id != null ? managerNames.get(employee.manager_id) || 'Non renseigné' : 'Non renseigné';
                    const profileUrl = `/employees/${encodeURIComponent(employee.id)}`;
                    return <article className="employees-card" key={employee.id}>
                      <div className="employees-card-heading"><div><h4><Link className="employees-profile-link" to={profileUrl} state={{ managerId: employee.manager_id, managerName }}>{displayValue(employee.name)}</Link></h4></div><StatusBadge status={employee.status} /></div>
                      <EmployeeDetails employee={employee} managerName={managerName} />
                      <Link className="employees-view-link employees-mobile-view-link" to={profileUrl} state={{ managerId: employee.manager_id, managerName }}>Voir le profil<ChevronRight size={14} aria-hidden="true" /></Link>
                    </article>;
                  })}
                </div>
                <nav className="employees-pagination" aria-label="Pagination des collaborateurs">
                  <span>Affichage {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)} sur {filteredEmployees.length}</span>
                  <div><button type="button" className="employees-page-button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1} aria-label="Page précédente"><ChevronLeft size={17} aria-hidden="true" /><span>Précédent</span></button><span className="employees-page-number">Page {currentPage} sur {pageCount}</span><button type="button" className="employees-page-button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage >= pageCount} aria-label="Page suivante"><span>Suivant</span><ChevronRight size={17} aria-hidden="true" /></button></div>
                </nav>
              </>}
    </section>

    <p className="employees-scope-note">Les indicateurs d’onboarding ne sont pas affichés ici : l’API actuelle ne garantit pas une couverture complète des parcours au-delà de 200 éléments.</p>
    <div className="employees-refresh"><button type="button" className="employees-secondary-button" onClick={retry} disabled={loading}><RefreshCw size={14} className={loading ? 'employees-spin' : ''} aria-hidden="true" />Actualiser la liste</button></div>
  </div>;
}
