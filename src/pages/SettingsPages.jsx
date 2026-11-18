import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { BellRing, Check, ChevronRight, CircleAlert, Gauge, LoaderCircle, Plus, Shield, Users, X, Database, ScrollText, ShieldCheck, KeyRound, Laptop, RefreshCw, Search, ChevronDown, Ban, CheckCircle2, Clock3, LockKeyhole, BookOpen, ArrowLeft, Info } from 'lucide-react';
import {
  createGovernanceBudget, createOrganizationUser, getGovernanceBudgets, getGovernanceRules,
  getOrganizationUsers, saveGovernanceRule, updateGovernanceBudget, updateOrganizationUserRole,
  getRetentionPolicy, saveRetentionPolicy, previewRetentionPurge, getGovernanceApprovals,
  reviewGovernanceApproval, getGovernanceControls, saveGovernanceControl, getGovernanceAuditEvents,
  changePassword, getAuthSessions, revokeAuthSession,
} from '../services/api';
import './SettingsPages.css';
import { removeToken } from '../services/auth';

const roleNames = { owner: 'Propriétaire', admin: 'Administrateur', manager: 'Manager', analyst: 'Analyste', viewer: 'Lecture seule' };
const roles = ['admin', 'manager', 'analyst', 'viewer'];
const permissionMatrix = [
  { resource: 'employees', action: 'view', label: 'Consulter les collaborateurs' },
  { resource: 'employees', action: 'manage', label: 'Gérer les collaborateurs' },
  { resource: 'risk', action: 'view', label: 'Consulter les risques' },
  { resource: 'risk', action: 'manage', label: 'Lancer une analyse de risque' },
  { resource: 'meetings', action: 'view', label: 'Consulter les réunions' },
  { resource: 'meetings', action: 'manage', label: 'Analyser et modifier les réunions' },
  { resource: 'onboarding', action: 'view', label: 'Consulter les onboardings' },
  { resource: 'onboarding', action: 'manage', label: 'Gérer les onboardings' },
  { resource: 'integrations', action: 'view', label: 'Voir les sources connectées' },
  { resource: 'integrations', action: 'manage', label: 'Gérer les intégrations' },
];
const roleDefaults = {
  admin: new Set(permissionMatrix.map(({ resource, action }) => `${resource}:${action}`)),
  manager: new Set(['employees:view', 'employees:manage', 'risk:view', 'meetings:view', 'onboarding:view', 'onboarding:manage', 'integrations:view']),
  analyst: new Set(['employees:view', 'risk:view', 'meetings:view', 'meetings:manage', 'onboarding:view', 'integrations:view']),
  viewer: new Set(['employees:view', 'risk:view', 'meetings:view', 'onboarding:view', 'integrations:view']),
};

const settingsTabs = [
  { to: '/settings/budget', label: 'Budget & consommation', icon: Gauge },
  { to: '/settings/retention', label: 'Rétention des données', icon: Database },
  { to: '/settings/guardrails', label: 'Garde-fous', icon: ShieldCheck },
  { to: '/settings/audit', label: 'Journal d’audit', icon: ScrollText },
  { to: '/settings/security', label: 'Sécurité du compte', icon: KeyRound },
];

export function SettingsLayout({ user }) {
  const visibleTabs = ['admin', 'owner'].includes(user?.role) ? settingsTabs : settingsTabs.filter(({ to }) => to === '/settings/security');
  return <div className="settings-page">
    <header className="settings-heading">
      <div className="settings-heading-icon"><Gauge size={17} /></div>
      <div><span className="settings-kicker">CONFIGURATION DE L’ORGANISATION</span><h2>Paramètres</h2><p>Gérez la consommation, la conservation des données et les contrôles de sécurité.</p></div>
    </header>
    <nav className="settings-tabs" aria-label="Rubriques des paramètres">
      {visibleTabs.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `settings-tab${isActive ? ' active' : ''}`}>
        <Icon size={16} /><span>{label}</span><ChevronRight className="settings-tab-arrow" size={14} />
      </NavLink>)}
    </nav>
    <Outlet />
  </div>;
}

function formatMoney(value, currency = 'EUR') {
  const number = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(number);
}
function formatBudgetValue(value, unit = 'EUR') {
  if (unit === 'REQUESTS') return `${Number(value || 0).toLocaleString('fr-FR')} analyse${Number(value || 0) === 1 ? '' : 's'}`;
  return formatMoney(value, unit);
}

export function BudgetSettingsPage() {
  const [budgets, setBudgets] = useState([]);
  const [organizationUsers, setOrganizationUsers] = useState([]);
  const [form, setForm] = useState({ name: '', limit: '', period: 'monthly', meter: 'llm_cost', scope: 'organization', scope_key: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(() => Promise.all([getGovernanceBudgets(), getOrganizationUsers()]).then(([budgetData, userData]) => { setBudgets(budgetData.budgets || []); setOrganizationUsers(userData.users || []); }).catch((e) => setError(e.message)).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await createGovernanceBudget({ name: form.name.trim(), limit: form.limit, meter: form.meter, unit: form.meter === 'llm_requests' ? 'REQUESTS' : 'EUR', period: form.period, scope: form.scope, scope_key: form.scope === 'organization' ? null : form.scope_key.trim(), hard_limit: true });
      setForm({ name: '', limit: '', period: 'monthly', meter: 'llm_cost', scope: 'organization', scope_key: '' }); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function changeLimit(budget) {
    const value = window.prompt(`Nouveau plafond (${budget.unit})`, budget.limit);
    if (value === null) return;
    try { await updateGovernanceBudget(budget.id, { limit: value }); await load(); }
    catch (e) { setError(e.message); }
  }

  return <section className="settings-panel">
    <div className="settings-section-title"><div><span className="settings-kicker">DÉPENSES IA</span><h3>Budget de l’entreprise</h3><p>Définissez un plafond de consommation et suivez son utilisation en cours.</p></div><span className="settings-count"><Gauge size={14} />{budgets.length} budget{budgets.length === 1 ? '' : 's'}</span></div>
    <div className="budget-alert-note"><BellRing size={17} /><span><strong>Alertes progressives activées</strong><br />Une fenêtre s’affichera à 60 %, puis à chaque palier de 10 % jusqu’à 100 %, même si vous êtes sur une autre page.</span></div>
    <p className="settings-footnote budget-tracking-note">Le plafond « nombre d’analyses IA » comptabilise les analyses enregistrées. Les montants en euros sont des estimations réservées avant traitement : les coûts réels des fournisseurs ne sont pas encore rapprochés.</p>
    {error && <div className="settings-error" role="alert"><CircleAlert size={15} />{error}</div>}
    {loading ? <div className="settings-loading"><LoaderCircle className="spin" size={17} />Chargement des budgets…</div> : budgets.length === 0 ? <div className="settings-empty"><span className="settings-empty-icon"><Gauge size={19} /></span><strong>Aucun budget défini</strong><p>Ajoutez un premier plafond pour suivre les dépenses IA de votre entreprise.</p></div> : <div className="budget-list">{budgets.map((budget) => {
      const used = Number(budget.spent || 0); const limit = Number(budget.limit || 0); const percent = limit ? Math.min(100, Math.round(used / limit * 100)) : 0;
      const started = new Date(budget.period_started_at || Date.now()); const now = new Date(); const daysElapsed = Math.max(1, Math.ceil((now - started) / 86400000)); const daysTotal = budget.period === 'daily' ? 1 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); const projected = Math.min(limit, used / daysElapsed * daysTotal);
      return <article className="budget-card" key={budget.id}>
        <div className="budget-card-top"><div><span className="budget-period-label">{budget.period === 'monthly' ? 'BUDGET MENSUEL' : 'BUDGET QUOTIDIEN'}</span><h4>{budget.name}</h4></div><button className="settings-quiet-button" type="button" onClick={() => changeLimit(budget)}>Modifier le plafond</button></div>
        <div className="budget-numbers"><strong>{formatBudgetValue(used, budget.unit)} <span>utilisés</span></strong><span>sur {formatBudgetValue(limit, budget.unit)}</span></div>
        <div className="budget-progress-track" role="progressbar" aria-label={`Utilisation du budget ${budget.name}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}><span style={{ width: `${percent}%` }} className={percent >= 90 ? 'critical' : percent >= 60 ? 'warning' : ''} /></div>
        <div className="budget-card-foot"><span>{percent}% consommé · projection {formatBudgetValue(projected, budget.unit)}</span><span>Reste {formatBudgetValue(Math.max(0, limit - used), budget.unit)}</span></div>
        <span className="budget-scope-label">Portée : {budget.scope === 'organization' ? 'organisation' : budget.scope === 'model' ? `modèle · ${budget.scope_key}` : `utilisateur · #${budget.scope_key}`}</span>
      </article>;
    })}</div>}
    <form className="budget-create-form" onSubmit={submit}>
      <div className="form-section-heading"><span className="settings-form-icon"><Plus size={16} /></span><div><h4>Créer un budget</h4><p>Le plafond est appliqué à l’ensemble de l’organisation.</p></div></div>
      <label>Nom du budget<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Budget mensuel des analyses IA" maxLength={100} required /></label>
      <div className="budget-form-row"><label>Type de limite<select value={form.meter} onChange={(e) => setForm({ ...form, meter: e.target.value })}><option value="llm_cost">Dépenses estimées en euros</option><option value="llm_requests">Nombre d’analyses IA</option></select></label><label>{form.meter === 'llm_requests' ? 'Nombre d’analyses' : 'Plafond en euros'}<div className="money-input"><span>{form.meter === 'llm_requests' ? '#' : '€'}</span><input type="number" min="0.01" step={form.meter === 'llm_requests' ? '1' : '0.01'} value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} placeholder={form.meter === 'llm_requests' ? '100' : '500'} required /></div></label><label>Période<select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}><option value="monthly">Par mois</option><option value="daily">Par jour</option></select></label><label>Portée<select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value, scope_key: '' })}><option value="organization">Organisation entière</option><option value="model">Un modèle</option><option value="user">Un utilisateur</option></select></label></div>
      {form.scope === 'model' && <label className="budget-scope-input">Identifiant du modèle<input value={form.scope_key} onChange={(e) => setForm({ ...form, scope_key: e.target.value })} placeholder="ex. mobyus-risk-v1" required /></label>}
      {form.scope === 'user' && <label className="budget-scope-input">Utilisateur<select value={form.scope_key} onChange={(e) => setForm({ ...form, scope_key: e.target.value })} required><option value="">Choisir un membre</option>{organizationUsers.map((member) => <option key={member.id} value={String(member.id)}>{member.email} · #{member.id}</option>)}</select></label>}
      <button className="settings-primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={15} />Enregistrement…</> : 'Créer le budget'}</button>
    </form>
  </section>;
}

export function PermissionsSettingsPage() {
  const [rules, setRules] = useState([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(() => getGovernanceRules().then((data) => setRules(data.rules || [])).catch((e) => setError(e.message)).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);
  const ruleMap = useMemo(() => new Map(rules.map((rule) => [`${rule.role}:${rule.resource}:${rule.action}`, rule])), [rules]);
  async function toggle(role, permission, checked) {
    const key = `${role}:${permission.resource}:${permission.action}`; setSaving(key); setError(''); setNotice('');
    try { await saveGovernanceRule({ role, resource: permission.resource, action: permission.action, effect: checked ? 'allow' : 'deny', enabled: true }); await load(); setNotice('Droits mis à jour.'); }
    catch (e) { setError(e.message); } finally { setSaving(''); }
  }
  return <section className="settings-panel">
    <div className="settings-section-title"><div><span className="settings-kicker">CONTRÔLE DES ACCÈS</span><h3>Qui peut faire quoi ?</h3><p>Accordez des permissions ciblées aux rôles de votre entreprise.</p></div></div>
    <div className="permission-explainer"><Shield size={17} /><span>Les administrateurs disposent de tous les droits par défaut. Les autres rôles ont besoin d’une autorisation explicite.</span></div>
    {error && <div className="settings-error" role="alert"><CircleAlert size={15} />{error}</div>}{notice && <div className="settings-success" role="status"><Check size={15} />{notice}</div>}
    {loading ? <div className="settings-loading"><LoaderCircle className="spin" size={17} />Chargement des permissions…</div> : <div className="permission-table-wrap"><table className="permission-table"><thead><tr><th scope="col">Permission</th>{roles.map((role) => <th scope="col" key={role}>{roleNames[role]}</th>)}</tr></thead><tbody>{permissionMatrix.map((permission) => <tr key={`${permission.resource}:${permission.action}`}><th scope="row">{permission.label}</th>{roles.map((role) => {
      const rule = ruleMap.get(`${role}:${permission.resource}:${permission.action}`); const checked = rule ? rule.effect === 'allow' && rule.enabled : roleDefaults[role]?.has(`${permission.resource}:${permission.action}`) || false;
      return <td key={role}><label className="permission-switch" title={`${roleNames[role]} : ${permission.label}`}><input type="checkbox" checked={checked} disabled={Boolean(saving)} onChange={(e) => toggle(role, permission, e.target.checked)} /><span className="switch-track" /><span className="sr-only">{roleNames[role]} — {permission.label}</span></label></td>;
    })}</tr>)}</tbody></table></div>}
    <p className="settings-footnote">Les nouvelles permissions sont appliquées immédiatement. Les sessions sont vérifiées avec le rôle actuel du compte.</p>
  </section>;
}

export function TeamSettingsPage({ currentUser }) {
  const [users, setUsers] = useState([]); const [form, setForm] = useState({ email: '', password: '', role: 'viewer' }); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(() => getOrganizationUsers().then((data) => setUsers(data.users || [])).catch((e) => setError(e.message)).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);
  async function createUser(event) { event.preventDefault(); setSaving(true); setError(''); setNotice(''); try { await createOrganizationUser(form); setForm({ email: '', password: '', role: 'viewer' }); await load(); setNotice('Le membre peut maintenant se connecter avec son adresse et son mot de passe temporaire.'); } catch (e) { setError(e.message); } finally { setSaving(false); } }
  async function changeRole(user, role) { setError(''); try { await updateOrganizationUserRole(user.id, role); await load(); setNotice('Rôle mis à jour. Les sessions de cet utilisateur ont été révoquées.'); } catch (e) { setError(e.message); } }
  return <section className="settings-panel">
    <div className="settings-section-title"><div><span className="settings-kicker">MEMBRES</span><h3>Équipe de l’entreprise</h3><p>Créez des comptes rattachés à cette organisation et attribuez-leur un rôle.</p></div><span className="settings-count"><Users size={14} />{users.length} membre{users.length === 1 ? '' : 's'}</span></div>
    <div className="team-security-note"><CircleAlert size={16} /><span>Le mot de passe temporaire est transmis à la personne que vous invitez. Elle pourra se connecter immédiatement.</span></div>
    {error && <div className="settings-error" role="alert"><CircleAlert size={15} />{error}</div>}{notice && <div className="settings-success" role="status"><Check size={15} />{notice}</div>}
    <form className="team-create-form" onSubmit={createUser}>
      <div className="form-section-heading"><span className="settings-form-icon"><Plus size={16} /></span><div><h4>Ajouter un membre</h4><p>Chaque compte rejoint automatiquement votre organisation.</p></div></div>
      <div className="team-form-grid"><label>Adresse e-mail<input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nom@entreprise.fr" required /></label><label>Mot de passe temporaire<input type="password" autoComplete="new-password" minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="12 caractères minimum" required /></label><label>Rôle<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{roles.map((role) => <option value={role} key={role}>{roleNames[role]}</option>)}</select></label></div>
      <button className="settings-primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={15} />Création…</> : 'Créer le compte'}</button>
    </form>
    <div className="team-list-heading"><h4>Membres actuels</h4><span>Les rôles déterminent l’accès aux fonctionnalités.</span></div>
    {loading ? <div className="settings-loading"><LoaderCircle className="spin" size={17} />Chargement des membres…</div> : <div className="team-list">{users.map((member) => <article className="team-member" key={member.id}>
      <div className="team-avatar" aria-hidden="true">{member.email?.slice(0, 1).toUpperCase()}</div><div className="team-member-copy"><strong>{member.email}{member.id === currentUser?.id && <span className="you-pill">Vous</span>}</strong><span>Ajouté le {member.created_at ? new Date(member.created_at).toLocaleDateString('fr-FR') : '—'}</span></div>
      {member.role === 'owner' ? <span className="owner-badge">Propriétaire</span> : <select aria-label={`Rôle de ${member.email}`} value={member.role} disabled={member.id === currentUser?.id} onChange={(e) => changeRole(member, e.target.value)}>{roles.map((role) => <option key={role} value={role}>{roleNames[role]}</option>)}</select>}
    </article>)}</div>}
  </section>;
}

const retentionFields = [
  ['meetings_days', 'Réunions et transcriptions'],
  ['signals_days', 'Signaux collaborateurs'],
  ['risk_scores_days', 'Scores de risque'],
  ['insights_days', 'Insights générés'],
  ['completed_onboarding_days', 'Onboardings terminés'],
];

export function RetentionSettingsPage() {
  const [policy, setPolicy] = useState(Object.fromEntries(retentionFields.map(([key]) => [key, ''])));
  const [preview, setPreview] = useState(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [data, sample] = await Promise.all([getRetentionPolicy(), previewRetentionPurge()]); setPolicy(Object.fromEntries(retentionFields.map(([key]) => [key, data.retention?.[key] ?? '']))); setPreview(sample); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const payload = Object.fromEntries(retentionFields.map(([key]) => [key, policy[key] === '' ? null : Number(policy[key])]));
      const result = await saveRetentionPolicy(payload); setPolicy(Object.fromEntries(retentionFields.map(([key]) => [key, result.retention?.[key] ?? '']))); await load(); setNotice('Politique de conservation enregistrée.');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  return <section className="settings-panel">
    <div className="settings-section-title"><div><span className="settings-kicker">CONSERVATION ET SUPPRESSION</span><h3>Rétention des données</h3><p>Fixez une durée par catégorie. Une valeur vide signifie conservation indéfinie.</p></div><button type="button" className="settings-quiet-button" onClick={load}><RefreshCw size={13} /> Actualiser l’aperçu</button></div>
    <div className="permission-explainer"><Database size={17} /><span>L’aperçu compte les éléments éligibles selon la politique. La purge est exécutée par la tâche backend planifiée par l’administrateur système.</span></div>
    {error && <div className="settings-error" role="alert"><CircleAlert size={15} />{error}</div>}{notice && <div className="settings-success" role="status"><Check size={15} />{notice}</div>}
    {loading ? <div className="settings-loading"><LoaderCircle className="spin" size={17} />Chargement de la politique…</div> : <>
      <form className="retention-grid" onSubmit={submit}>{retentionFields.map(([key, label]) => <label className="retention-field" key={key}><span>{label}</span><div className="retention-input"><input type="number" min="1" max="3650" value={policy[key]} onChange={(e) => setPolicy({ ...policy, [key]: e.target.value })} placeholder="Indéfinie" /><span>jours</span></div><small>{preview?.counts?.[key.replace('_days', '')]?.eligible ?? 0} élément(s) éligible(s)</small></label>)}
        <div className="retention-actions"><span>Plage acceptée : 1 à 3 650 jours, ou indéfinie.</span><button className="settings-primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={15} />Enregistrement…</> : 'Enregistrer la politique'}</button></div>
      </form>
      <article className="last-run-card"><span className="last-run-icon"><Clock3 size={17} /></span><div><strong>Dernière purge exécutée</strong><p>{preview?.last_purge?.created_at ? new Date(preview.last_purge.created_at).toLocaleString('fr-FR') : 'Aucune purge enregistrée'}</p>{preview?.last_purge?.details?.deleted && <small>{Object.entries(preview.last_purge.details.deleted).filter(([key]) => key !== 'org_id').map(([key, value]) => `${value} ${key.replaceAll('_', ' ')}`).join(' · ')}</small>}</div><span className="status-pill">{preview?.last_purge ? 'Terminée' : 'En attente'}</span></article>
      <p className="settings-footnote">L’aperçu est indicatif et peut évoluer avant l’exécution. La suppression définitive est tracée dans le journal d’audit.</p>
    </>}
  </section>;
}

const actionChoices = [
  { key: 'meeting.analyze', description: 'analyser une transcription de réunion' },
  { key: 'integration.credentials.save', description: 'enregistrer ou remplacer les identifiants d’une intégration' },
  { key: 'integration.credentials.delete', description: 'supprimer les identifiants enregistrés d’une intégration' },
];

function ActionCommandSelect({ value, onChange, label }) {
  const selected = Array.isArray(value) ? value : [];
  const rootRef = useRef(null);
  useEffect(() => {
    function closeOnOutsidePointer(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        const menu = rootRef.current.querySelector('details');
        if (menu) menu.open = false;
      }
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        const menu = rootRef.current?.querySelector('details');
        if (menu?.open) {
          menu.open = false;
          menu.querySelector('summary')?.focus();
        }
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  function toggle(key, checked) {
    onChange(checked ? [...new Set([...selected, key])] : selected.filter((item) => item !== key));
  }
  return <div className="guardrail-command-control" ref={rootRef}><details className="guardrail-command-select">
    <summary aria-label={label}><span>{selected.length ? `${selected.length} commande${selected.length === 1 ? '' : 's'} sélectionnée${selected.length === 1 ? '' : 's'}` : 'Choisir une ou plusieurs commandes'}</span><ChevronDown size={14} /></summary>
    <div className="guardrail-command-menu">{actionChoices.map((choice) => <label className="guardrail-command-option" key={choice.key}>
      <input type="checkbox" checked={selected.includes(choice.key)} onChange={(event) => toggle(choice.key, event.target.checked)} />
      <span><code>{choice.key}</code><small>({choice.description})</small></span>
    </label>)}</div>
  </details>{selected.length > 0 && <div className="guardrail-selected-actions" aria-label="Commandes sélectionnées">{selected.map((key) => <code key={key}>{key}</code>)}</div>}</div>;
}

const controlDefinitions = [
  { key: 'action_allowlist', label: 'Actions autorisées', description: 'Les clés d’action disponibles comprennent meeting.analyze et integration.credentials.save/delete.', field: 'allowed_actions', placeholder: 'meeting.analyze, integration.credentials.save' },
  { key: 'export_row_limit', label: 'Limite d’export', description: 'Fixe le nombre maximal de lignes par export.', field: 'max_rows' },
  { key: 'require_approval', label: 'Approbation humaine', description: 'Exige une validation distincte pour certaines actions sensibles.', field: 'actions', placeholder: 'meeting.analyze, integration.credentials.delete' },
];

export function GuardrailsSettingsPage() {
  const [controls, setControls] = useState({}); const [approvals, setApprovals] = useState([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [notes, setNotes] = useState({});
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [controlData, approvalData] = await Promise.all([getGovernanceControls(), getGovernanceApprovals('pending')]); const next = {}; (controlData.controls || []).forEach((item) => { next[item.key] = item; }); setControls(next); setApprovals(approvalData.approvals || []); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  async function save(definition) {
    const current = controls[definition.key] || { enabled: true, mode: 'block', settings: definition.key === 'export_row_limit' ? { max_rows: 10000 } : { [definition.field]: [] } };
    let value = current.settings?.[definition.field];
    if (definition.field === 'max_rows') value = Number(value || 10000);
    else if (!Array.isArray(value)) value = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
    setSaving(definition.key); setError(''); setNotice('');
    try { const result = await saveGovernanceControl(definition.key, { enabled: Boolean(current.enabled), mode: current.mode || 'block', settings: { [definition.field]: value } }); setControls((old) => ({ ...old, [definition.key]: result })); setNotice(`Contrôle « ${definition.label} » enregistré.`); }
    catch (e) { setError(e.message); } finally { setSaving(''); }
  }
  async function review(item, decision) { setSaving(`approval-${item.id}`); setError(''); try { await reviewGovernanceApproval(item.id, decision, notes[item.id] || ''); await load(); setNotice(decision === 'approve' ? 'Demande approuvée.' : 'Demande refusée.'); } catch (e) { setError(e.message); } finally { setSaving(''); } }
  return <section className="settings-panel">
    <div className="settings-section-title"><div><span className="settings-kicker">RÈGLES ET VALIDATIONS</span><h3>Garde-fous & validations humaines</h3><p>Configurez les limites et traitez les demandes nécessitant une validation.</p></div><Link className="guardrail-doc-link" to="/settings/guardrails/documentation"><BookOpen size={15} /> Guide des actions <ChevronRight size={14} /></Link></div>
    <div className="settings-error guardrail-caveat"><CircleAlert size={15} />Les contrôles ne s’appliquent qu’aux opérations reliées au backend. Les actions autorisées et approbations protègent déjà certaines opérations sensibles. L’application n’a pas encore d’export serveur : la limite de lignes est enregistrable, mais ne bloque pas les exports CSV actuels réalisés dans le navigateur.</div>
    {error && <div className="settings-error" role="alert"><CircleAlert size={15} />{error}</div>}{notice && <div className="settings-success" role="status"><Check size={15} />{notice}</div>}
    {loading ? <div className="settings-loading"><LoaderCircle className="spin" size={17} />Chargement des contrôles…</div> : <>
      <div className="guardrail-list">{controlDefinitions.map((item) => { const control = controls[item.key] || { enabled: false, mode: 'block', settings: item.key === 'export_row_limit' ? { max_rows: 10000 } : { [item.field]: [] } }; const raw = control.settings?.[item.field]; return <article className="guardrail-card" key={item.key}>
        <div className="guardrail-card-heading"><div><strong>{item.label}</strong><p>{item.description}</p></div><label className="permission-switch"><input type="checkbox" checked={Boolean(control.enabled)} onChange={(e) => setControls({ ...controls, [item.key]: { ...control, enabled: e.target.checked } })} /><span className="switch-track" /><span className="sr-only">Activer {item.label}</span></label></div>
        <div className="guardrail-setting"><span>{item.field === 'max_rows' ? 'Nombre maximal de lignes' : 'Commandes sélectionnées'}</span>{item.field === 'max_rows' ? <input type="number" min="1" max="1000000" value={raw ?? 10000} onChange={(e) => setControls({ ...controls, [item.key]: { ...control, settings: { ...control.settings, [item.field]: Number(e.target.value) } } })} /> : <ActionCommandSelect label={`${item.label} : sélectionner les commandes`} value={raw} onChange={(next) => setControls({ ...controls, [item.key]: { ...control, settings: { ...control.settings, [item.field]: next } } })} />}</div>
        <div className="guardrail-card-foot"><label>Comportement<select value={control.mode || 'block'} onChange={(e) => setControls({ ...controls, [item.key]: { ...control, mode: e.target.value } })}><option value="block">Bloquer en cas d’écart</option><option value="monitor">Journaliser seulement</option></select></label><button type="button" className="settings-primary-button" disabled={saving === item.key} onClick={() => save(item)}>{saving === item.key ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </article>; })}</div>
      <div className="approval-section"><div className="team-list-heading"><h4>Demandes en attente</h4><span>{approvals.length} demande(s)</span></div>{approvals.length ? <div className="approval-list">{approvals.map((item) => <article className="approval-card" key={item.id}><div><span className="approval-action">{item.action_key}</span><p>{item.resource_type}{item.resource_id ? ` · ${item.resource_id}` : ''} · demandeur #{item.requested_by}</p><small>{new Date(item.created_at).toLocaleString('fr-FR')}</small></div><div className="approval-controls"><input aria-label="Note de décision" placeholder="Note (facultative)" maxLength="500" value={notes[item.id] || ''} onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })} /><button type="button" className="approve-button" disabled={Boolean(saving)} onClick={() => review(item, 'approve')}><CheckCircle2 size={14} />Approuver</button><button type="button" className="reject-button" disabled={Boolean(saving)} onClick={() => review(item, 'reject')}><Ban size={14} />Refuser</button></div></article>)}</div> : <div className="settings-empty compact-empty"><strong>Aucune demande en attente</strong><p>Les actions soumises à validation apparaîtront ici.</p></div>}</div>
    </>}
  </section>;
}

const governanceActions = [
  {
    key: 'meeting.analyze',
    label: 'Analyser une réunion',
    route: 'POST /v1/meeting-analyze',
    allowlist: true,
    approval: true,
    frontend: 'L’écran Réunions lance l’analyse, mais ne sait pas encore transmettre un identifiant d’approbation. Une approbation obligatoire en mode Bloquer ne peut donc pas encore être menée de bout en bout depuis l’interface.',
  },
  {
    key: 'integration.credentials.save',
    label: 'Enregistrer ou remplacer des identifiants d’intégration',
    route: 'PUT /v1/integrations/{integration_key}/credentials',
    allowlist: true,
    approval: true,
    frontend: 'L’écran Intégrations enregistre les identifiants, mais ne transmet pas encore d’identifiant d’approbation. Une validation obligatoire en mode Bloquer n’est donc pas encore complète depuis l’interface.',
  },
  {
    key: 'integration.credentials.delete',
    label: 'Supprimer des identifiants d’intégration',
    route: 'DELETE /v1/integrations/{integration_key}/credentials',
    allowlist: true,
    approval: true,
    frontend: 'Le contrôle existe dans le backend. L’interface actuelle ne propose pas encore le parcours de suppression des identifiants.',
  },
];

export function GuardrailsDocumentationPage() {
  return <section className="settings-panel guardrail-documentation">
    <Link className="guardrail-doc-back" to="/settings/guardrails"><ArrowLeft size={14} />Retour aux garde-fous</Link>
    <div className="settings-section-title"><div><span className="settings-kicker">RÉFÉRENCE DES CLÉS BACKEND</span><h3>Guide des actions et approbations</h3><p>Les valeurs doivent correspondre exactement à une action que le backend contrôle.</p></div><span className="settings-count"><BookOpen size={14} />Documentation</span></div>
    <div className="documentation-callout"><Info size={17} /><div><strong>Classez chaque action selon l’effet attendu</strong><p>« Actions autorisées » répond à <em>quelles opérations l’organisation permet-elle ?</em> « Approbation humaine » répond à <em>quelles opérations permises doivent être validées par une autre personne avant leur exécution ?</em> Une même clé peut figurer dans les deux listes.</p></div></div>
    <div className="guardrail-doc-section"><div className="team-list-heading"><h4>Clés actuellement reconnues</h4><span>{governanceActions.length} actions câblées côté backend</span></div>
      <div className="governance-action-list">{governanceActions.map((item) => <article className="governance-action-card" key={item.key}>
        <div className="governance-action-top"><div><code>{item.key}</code><strong>{item.label}</strong></div><div className="governance-action-badges"><span className={item.allowlist ? 'supported-badge' : 'unsupported-badge'}>Actions autorisées : {item.allowlist ? 'oui' : 'non'}</span><span className={item.approval ? 'supported-badge' : 'unsupported-badge'}>Approbation : {item.approval ? 'oui' : 'non'}</span></div></div>
        <p className="governance-route"><span>Route backend</span><code>{item.route}</code></p><p className="governance-frontend-note">{item.frontend}</p>
      </article>)}</div>
    </div>
    <div className="guardrail-doc-columns">
      <article className="documentation-rule-card"><span className="settings-kicker">ACTIONS AUTORISÉES</span><h4>Définir ce qui est permis</h4><p>Ajoutez une clé à la liste lorsque l’organisation doit pouvoir utiliser cette action. Quand la règle est activée en mode <strong>Bloquer</strong>, une action omise est refusée. En mode <strong>Journaliser seulement</strong>, l’écart est enregistré et l’action continue.</p><div className="documentation-example"><span>Exemple</span><code>meeting.analyze, integration.credentials.save</code></div><p className="settings-footnote">Si la liste est activée mais vide, toutes les actions actuellement reliées à cette règle seront refusées en mode Bloquer.</p></article>
      <article className="documentation-rule-card"><span className="settings-kicker">APPROBATION HUMAINE</span><h4>Ajouter une validation ponctuelle</h4><p>Ajoutez une clé quand l’action peut être autorisée en général, mais doit recevoir un accord humain avant certaines exécutions. Le demandeur ne peut pas valider sa propre demande.</p><div className="documentation-example"><span>Exemple</span><code>integration.credentials.delete</code></div><p className="settings-footnote">En mode Bloquer, le backend exige une approbation liée à la ressource et à l’action avant de poursuivre.</p></article>
    </div>
    <div className="documentation-combined"><ShieldCheck size={17} /><div><strong>Quand placer une clé dans les deux listes ?</strong><p>Quand l’action doit être disponible uniquement à l’organisation, et que chaque exécution doit en plus être validée. L’action doit d’abord être autorisée ; l’approbation ajoute ensuite le contrôle humain. Une approbation ne réactive jamais une action refusée par la liste d’autorisation.</p></div></div>
    <div className="documentation-limits"><Info size={15} /><p><strong>Contrôles distincts :</strong> « Limite d’export » ne prend pas de clé d’action : elle configure un nombre maximal de lignes. Comme les exports actuels sont produits dans le navigateur, cette limite n’est pas encore imposée côté serveur. Les actions listées ci-dessus sont les seules actuellement reliées aux contrôles Actions autorisées et Approbation humaine.</p></div>
  </section>;
}

export function AuditSettingsPage() {
  const [events, setEvents] = useState([]); const [cursor, setCursor] = useState(null); const [nextCursor, setNextCursor] = useState(null); const [filters, setFilters] = useState({ event_type: '', outcome: '', actor_user_id: '' }); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async (beforeId = null, append = false) => { setLoading(true); setError(''); try { const params = { limit: '50', ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) }; if (beforeId) params.before_id = String(beforeId); const result = await getGovernanceAuditEvents(params); setEvents((old) => append ? [...old, ...(result.events || [])] : result.events || []); setNextCursor(result.next_before_id || null); setCursor(beforeId); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { load(); }, [load]);
  return <section className="settings-panel"><div className="settings-section-title"><div><span className="settings-kicker">TRAÇABILITÉ DE GOUVERNANCE</span><h3>Journal d’audit</h3><p>Historique append-only des changements et contrôles sensibles de l’organisation.</p></div><span className="settings-count"><ScrollText size={14} />{events.length} événements</span></div>
    <div className="audit-filter-row"><label><Search size={14} /><input placeholder="Filtrer les événements" aria-label="Filtrer les événements" value={filters.event_type} onChange={(e) => setFilters({ ...filters, event_type: e.target.value })} /></label><select aria-label="Filtrer par résultat" value={filters.outcome} onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}><option value="">Tous les résultats</option><option value="success">Succès</option><option value="denied">Refusé</option><option value="error">Erreur</option></select><input aria-label="Identifiant de l’acteur" type="number" min="1" placeholder="ID utilisateur" value={filters.actor_user_id} onChange={(e) => setFilters({ ...filters, actor_user_id: e.target.value })} /><button type="button" className="settings-quiet-button" onClick={() => load()}><RefreshCw size={13} /> Actualiser</button></div>
    {error && <div className="settings-error" role="alert"><CircleAlert size={15} />{error}</div>}
    {loading && !events.length ? <div className="settings-loading"><LoaderCircle className="spin" size={17} />Chargement du journal…</div> : events.length ? <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>Date</th><th>Acteur</th><th>Événement</th><th>Ressource</th><th>Résultat</th><th>Détails</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{new Date(event.created_at).toLocaleString('fr-FR')}</td><td>{event.actor_user_id ? `#${event.actor_user_id}` : 'Système'}</td><td><code>{event.event_type}</code></td><td>{event.resource_type}{event.resource_id ? ` · ${event.resource_id}` : ''}</td><td><span className={`audit-outcome ${event.outcome}`}>{event.outcome}</span></td><td><details><summary>Voir</summary><pre>{JSON.stringify(event.details, null, 2)}</pre></details></td></tr>)}</tbody></table></div> : <div className="settings-empty"><strong>Aucun événement trouvé</strong><p>Les changements de gouvernance apparaîtront ici.</p></div>}
    <div className="audit-pagination"><span>{cursor ? 'Page suivante de l’historique' : 'Événements les plus récents'}</span><button type="button" className="settings-quiet-button" disabled={!nextCursor || loading} onClick={() => load(nextCursor, true)}>{loading ? 'Chargement…' : 'Charger les événements précédents'} <ChevronDown size={13} /></button></div>
  </section>;
}

export function AccountSecuritySettingsPage() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' }); const [sessions, setSessions] = useState([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(() => getAuthSessions().then((data) => setSessions(data.sessions || [])).catch((e) => setError(e.message)).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);
  async function submit(event) { event.preventDefault(); setError(''); setNotice(''); if (form.new_password !== form.confirm_password) { setError('Les nouveaux mots de passe ne correspondent pas.'); return; } setSaving(true); try { await changePassword({ current_password: form.current_password, new_password: form.new_password }); removeToken(); window.dispatchEvent(new Event('incuva:unauthenticated')); setNotice('Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.'); } catch (e) { setError(e.message); } finally { setSaving(false); } }
  async function revoke(id) { setError(''); try { await revokeAuthSession(id); await load(); setNotice('Session révoquée.'); } catch (e) { setError(e.message); } }
  return <section className="settings-panel"><div className="settings-section-title"><div><span className="settings-kicker">ACCÈS AU COMPTE</span><h3>Sécurité du compte</h3><p>Changez votre mot de passe et révoquez les sessions ouvertes sur d’autres appareils.</p></div></div>
    {error && <div className="settings-error" role="alert"><CircleAlert size={15} />{error}</div>}{notice && <div className="settings-success" role="status"><Check size={15} />{notice}</div>}
    <form className="password-form" onSubmit={submit}><div className="form-section-heading"><span className="settings-form-icon"><LockKeyhole size={16} /></span><div><h4>Changer le mot de passe</h4><p>12 caractères minimum. Le changement révoque les sessions existantes.</p></div></div><label>Mot de passe actuel<input type="password" autoComplete="current-password" required value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} /></label><label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength="12" maxLength="1024" required value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} /></label><label>Confirmer le nouveau mot de passe<input type="password" autoComplete="new-password" minLength="12" maxLength="1024" required value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} /></label><button className="settings-primary-button" disabled={saving}>{saving ? 'Mise à jour…' : 'Modifier le mot de passe'}</button></form>
    <div className="session-section"><div className="team-list-heading"><h4>Sessions actives</h4><button className="settings-quiet-button" type="button" onClick={load}><RefreshCw size={13} /> Actualiser</button></div>{loading ? <div className="settings-loading"><LoaderCircle className="spin" size={17} />Chargement…</div> : <div className="session-list">{sessions.map((session) => <article className="session-row" key={session.id}><span className="session-icon"><Laptop size={16} /></span><div><strong>{session.current ? 'Session actuelle' : 'Session active'}</strong><span>Ouverte le {new Date(session.created_at).toLocaleString('fr-FR')}</span></div>{session.current ? <span className="status-pill">Cet appareil</span> : <button className="revoke-button" type="button" onClick={() => revoke(session.id)}>Révoquer</button>}</article>)}{!sessions.length && <p className="settings-footnote">Aucune session active trouvée.</p>}</div>}</div>
    <div className="security-roadmap"><Shield size={17} /><div><strong>Authentification multifacteur et SSO</strong><p>Ces méthodes ne sont pas encore configurables dans l’application. Elles ne sont pas activées pour votre organisation.</p><span>Disponible dans une prochaine étape</span></div></div>
  </section>;
}

export function BudgetAlertMonitor({ user }) {
  const [alert, setAlert] = useState(null);
  useEffect(() => {
    if (!user || !['admin', 'owner'].includes(user.role)) return undefined;
    let active = true;
    const check = async () => {
      try {
        const data = await getGovernanceBudgets(); if (!active) return;
        const candidates = (data.budgets || []).filter((item) => item.enabled && ['llm_cost', 'llm_requests'].includes(item.meter) && item.scope === 'organization').map((item) => {
          const percent = Number(item.limit) > 0 ? Number(item.spent) / Number(item.limit) * 100 : 0;
          if (percent < 60) return null;
          const milestone = Math.min(100, 60 + Math.floor((Math.min(percent, 100) - 60) / 10) * 10);
          const key = `incuva-budget-alert:${user.org_id}:${item.id}:${item.period_started_at}`;
          const dismissed = Number(localStorage.getItem(key) || 0);
          return milestone > dismissed ? { ...item, percent, milestone, alertKey: key } : null;
        }).filter(Boolean).sort((a, b) => a.milestone - b.milestone);
        if (candidates.length) setAlert(candidates[0]);
        else setAlert(null);
      } catch { /* Governance may not be configured for this account yet. */ }
    };
    check(); const interval = window.setInterval(check, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [user?.id, user?.org_id, user?.role]);

  if (!alert) return null;
  const dismiss = () => { localStorage.setItem(alert.alertKey, String(alert.milestone)); setAlert(null); };
  return <div className="budget-alert-backdrop" role="presentation"><section className="budget-alert-modal" role="alertdialog" aria-modal="true" aria-labelledby="budget-alert-title" aria-describedby="budget-alert-description">
    <button className="budget-alert-close" type="button" onClick={dismiss} aria-label="Fermer l’alerte"><X size={17} /></button><span className={`budget-alert-symbol${alert.milestone >= 90 ? ' critical' : ''}`}><BellRing size={22} /></span>
    <span className="settings-kicker">SURVEILLANCE DU BUDGET</span><h2 id="budget-alert-title">{alert.milestone >= 100 ? 'Plafond de budget atteint' : `${alert.milestone} % du budget consommé`}</h2>
    <p id="budget-alert-description">Le budget <strong>{alert.name}</strong> a atteint {Math.round(alert.percent)} % de son plafond. Vous avez utilisé {formatBudgetValue(alert.spent, alert.unit)} sur {formatBudgetValue(alert.limit, alert.unit)}.</p>
    <div className="alert-progress-track"><span style={{ width: `${Math.min(100, alert.percent)}%` }} /></div><div className="alert-progress-label"><span>{Math.round(alert.percent)} % utilisé</span><span>{formatBudgetValue(Math.max(0, Number(alert.limit) - Number(alert.spent)), alert.unit)} restants</span></div>
    <button className="settings-primary-button alert-acknowledge" type="button" onClick={dismiss}><Check size={15} />J’ai compris</button>
  </section></div>;
}
