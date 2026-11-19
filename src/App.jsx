import { createElement, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, GitBranch, LayoutDashboard, LogOut, Menu, Plug, RefreshCw, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { getRefreshToken, getToken, removeToken } from './services/auth';
import { getCurrentUser, logout } from './services/api';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeProfilePage from './pages/EmployeeProfilePage';
import OnboardingPage from './pages/OnboardingPage';
import WorkspaceLayout from './pages/workspace/WorkspaceLayout';
import IntegrationsPage from './pages/workspace/IntegrationsPage';
import ConnectedSourcesPage from './pages/workspace/ConnectedSourcesPage';
import AutomationLayout from './pages/automations/AutomationLayout';
import AutomationsPage from './pages/automations/AutomationsPage';
import AutomationBuilderPage from './pages/automations/AutomationBuilderPage';
import AutomationRunsPage from './pages/automations/AutomationRunsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AccountSecuritySettingsPage, AuditSettingsPage, BudgetAlertMonitor, BudgetSettingsPage, GuardrailsDocumentationPage, GuardrailsSettingsPage, PermissionsSettingsPage, RetentionSettingsPage, SettingsLayout, TeamSettingsPage } from './pages/SettingsPages';
import OrganizationLayout from './pages/OrganizationLayout';
import './App.css';

const overviewLinks = [{ to: '/dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard, end: true }];
const employeeLinks = [{ to: '/employees', label: 'Employees', icon: Users }];
const onboardingLinks = [{ to: '/onboarding', label: 'Parcours', icon: ClipboardCheck }];
const operationsLinks = [
  { to: '/automations', label: 'Scénarios', icon: GitBranch, end: true },
  { to: '/automations/new', label: 'Créer un scénario', icon: GitBranch },
  { to: '/automations/runs', label: 'Historique', icon: GitBranch },
  { to: '/workspace/integrations', label: 'Intégrations RH', icon: Plug },
  { to: '/workspace/sources', label: 'Sources connectées', icon: Plug },
];
const organizationLinks = [
  { to: '/organization/members', label: 'Membres', icon: Users },
  { to: '/organization/permissions', label: 'Rôles et accès', icon: ShieldCheck },
];

const pageDetails = {
  '/dashboard': ['Vue d’ensemble', 'Overview'],
  '/employees': ['Employees', 'Organization'],
  '/onboarding': ['Parcours d’intégration', 'Onboarding'],
  '/workspace/integrations': ['Intégrations RH', 'Operations'],
  '/workspace/sources': ['Sources connectées', 'Operations'],
  '/automations': ['Scénarios d’intégration', 'Operations'],
  '/automations/new': ['Créer un scénario', 'Operations'],
  '/automations/runs': ['Historique des scénarios', 'Operations'],
  '/settings': ['Paramètres', 'Governance & settings'],
  '/settings/budget': ['Budget et consommation', 'Governance & settings'],
  '/settings/retention': ['Rétention des données', 'Governance & settings'],
  '/settings/guardrails': ['Garde-fous et validations', 'Governance & settings'],
  '/settings/guardrails/documentation': ['Guide des garde-fous', 'Governance & settings'],
  '/settings/audit': ['Journal d’audit', 'Governance & settings'],
  '/settings/security': ['Sécurité du compte', 'Governance & settings'],
  '/organization/members': ['Membres', 'Organization'],
  '/organization/permissions': ['Rôles et accès', 'Organization'],
};

function LinkList({ links, onNavigate }) {
  return links.map(({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} title={label} onClick={onNavigate} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
      {createElement(Icon, { size: 17, strokeWidth: 1.8, 'aria-hidden': true })}<span>{label}</span>
    </NavLink>
  ));
}

function NavGroup({ label, icon: Icon, items, id, open, active, collapsed, onToggle, onNavigate }) {
  return <div className="nav-group">
    <button className={`nav-link nav-group-toggle${active ? ' is-active' : ''}`} type="button" aria-expanded={open} aria-controls={id} title={label} onClick={onToggle}>
      {createElement(Icon, { size: 17, strokeWidth: 1.8, 'aria-hidden': true })}<span>{label}</span><ChevronDown className={`workspace-chevron${open ? ' is-open' : ''}`} size={15} aria-hidden="true" />
    </button>
    {open && !collapsed && <div className="workspace-subnav" id={id} aria-label={label}>
      {items.map(({ to, label: itemLabel, icon: ItemIcon, end }) => <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => `workspace-subnav-link${isActive ? ' is-active' : ''}`}>
        {createElement(ItemIcon, { size: 14, 'aria-hidden': true })}<span>{itemLabel}</span>
      </NavLink>)}
    </div>}
  </div>;
}

function AppLayout({ user, onLogout }) {
  const location = useLocation();
  const [title, crumb] = pageDetails[location.pathname]
    || (location.pathname.startsWith('/employees/') ? ['Employee profile', 'Employees'] : null)
    || (location.pathname.startsWith('/automations/') ? ['Modifier le scénario', 'Operations'] : ['Vue d’ensemble', 'Overview']);
  const isOnboarding = location.pathname === '/onboarding';
  const isOperations = location.pathname.startsWith('/automations') || location.pathname.startsWith('/workspace/');
  const isOrganization = location.pathname.startsWith('/organization/');
  const [onboardingOpen, setOnboardingOpen] = useState(isOnboarding);
  const [operationsOpen, setOperationsOpen] = useState(isOperations);
  const [organizationOpen, setOrganizationOpen] = useState(isOrganization);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('incuva-sidebar-collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const isAdmin = ['admin', 'owner'].includes(user?.role);

  useEffect(() => { if (isOnboarding) setOnboardingOpen(true); }, [isOnboarding]);
  useEffect(() => { if (isOperations) setOperationsOpen(true); }, [isOperations]);
  useEffect(() => { if (isOrganization) setOrganizationOpen(true); }, [isOrganization]);
  useEffect(() => { setMobileOpen(false); setAccountOpen(false); }, [location.pathname]);

  function toggleCollapsed() {
    const next = !collapsed;
    localStorage.setItem('incuva-sidebar-collapsed', String(next));
    setCollapsed(next);
  }
  function openGroup(setter) {
    if (collapsed) toggleCollapsed();
    setter(true);
  }
  const closeMobile = () => setMobileOpen(false);
  const initial = (user?.email || 'I').charAt(0).toUpperCase();

  return <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-navigation-open' : ''}`}>
    <aside className="app-sidebar" aria-label="Navigation INCUVA OIS">
      <div className="sidebar-brand-row">
        <NavLink to="/dashboard" className="brand" aria-label="INCUVA OIS, vue d’ensemble" onClick={closeMobile}>
          <span className="brand-mark" aria-hidden="true">i</span>
          <span className="brand-copy"><span className="brand-name">INCUVA <em>OIS</em></span><span className="brand-caption">Onboarding Intelligence System</span></span>
        </NavLink>
        <button className="sidebar-collapse-button" type="button" onClick={toggleCollapsed} aria-label={collapsed ? 'Développer la barre latérale' : 'Replier la barre latérale'} title={collapsed ? 'Développer la barre latérale' : 'Replier la barre latérale'} aria-expanded={!collapsed} aria-controls="dashboard-sidebar-navigation">{collapsed ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}</button>
        <button className="mobile-navigation-close" type="button" onClick={closeMobile} aria-label="Fermer la navigation"><X size={18} aria-hidden="true" /></button>
      </div>
      <nav className="main-nav" id="dashboard-sidebar-navigation" aria-label="Navigation principale">
        <span className="sidebar-label">Overview</span><LinkList links={overviewLinks} onNavigate={closeMobile} />
        <span className="sidebar-label">Organization</span><LinkList links={employeeLinks} onNavigate={closeMobile} />
        <span className="sidebar-label">Onboarding</span>
        <NavGroup label="Onboarding" icon={ClipboardCheck} items={onboardingLinks} id="onboarding-subnav" open={onboardingOpen} active={isOnboarding} collapsed={collapsed} onNavigate={closeMobile} onToggle={() => collapsed ? openGroup(setOnboardingOpen) : setOnboardingOpen((open) => !open)} />
        <span className="sidebar-label">Operations</span>
        <NavGroup label="Opérations" icon={GitBranch} items={operationsLinks} id="operations-subnav" open={operationsOpen} active={isOperations} collapsed={collapsed} onNavigate={closeMobile} onToggle={() => collapsed ? openGroup(setOperationsOpen) : setOperationsOpen((open) => !open)} />
        {isAdmin && <><span className="sidebar-label">Organization</span><NavGroup label="Organisation" icon={Building2} items={organizationLinks} id="organization-subnav" open={organizationOpen} active={isOrganization} collapsed={collapsed} onNavigate={closeMobile} onToggle={() => collapsed ? openGroup(setOrganizationOpen) : setOrganizationOpen((open) => !open)} /></>}
      </nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings" title="Gouvernance et paramètres" onClick={closeMobile} className={({ isActive }) => `nav-link settings-nav-item${isActive ? ' is-active' : ''}`}><Settings size={18} strokeWidth={1.8} aria-hidden="true" /><span>Gouvernance et paramètres</span></NavLink>
        <div className="sidebar-footer"><div className="account-avatar" aria-hidden="true">{initial}</div><div className="account-copy"><span className="account-name">{user?.email || 'Compte connecté'}</span><span className="account-caption">{user?.role || 'Espace sécurisé'}</span></div><button className="icon-button signout-button" onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={17} aria-hidden="true" /></button></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <div className="topbar-heading"><span className="topbar-eyebrow">INCUVA OIS <span>/</span> {crumb}</span><h1>{title}</h1></div>
        <div className="topbar-actions">
          <button className="refresh-button" type="button" onClick={() => window.location.reload()}><RefreshCw size={15} aria-hidden="true" /><span>Actualiser</span></button>
          <div className="account-menu"><button className="account-menu-trigger" type="button" onClick={() => setAccountOpen((open) => !open)} aria-label="Ouvrir le menu du compte" aria-haspopup="menu" aria-expanded={accountOpen}><span className="topbar-avatar" aria-hidden="true">{initial}</span><ChevronDown size={14} aria-hidden="true" /></button>{accountOpen && <div className="account-menu-panel" role="menu"><div className="account-menu-identity"><strong>{user?.email || 'Compte connecté'}</strong><span>{user?.role || 'Membre'}</span></div><NavLink to="/settings/security" role="menuitem" onClick={() => setAccountOpen(false)}>Sécurité du compte</NavLink><button type="button" role="menuitem" onClick={onLogout}><LogOut size={14} aria-hidden="true" />Se déconnecter</button></div>}</div>
          <button className="mobile-navigation-trigger" type="button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir la navigation" aria-expanded={mobileOpen} aria-controls="dashboard-sidebar-navigation"><Menu size={19} aria-hidden="true" /></button>
        </div>
      </header>
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/employees" element={<div className="legacy-module-page"><EmployeesPage /></div>} /><Route path="/employees/:employeeId" element={<div className="legacy-module-page"><EmployeeProfilePage /></div>} /><Route path="/risk" element={<Navigate to="/dashboard" replace />} /><Route path="/meetings" element={<Navigate to="/dashboard" replace />} />
          <Route path="/onboarding" element={<div className="legacy-module-page"><OnboardingPage currentUser={user} /></div>} />
          <Route path="/workspace" element={<div className="legacy-module-page"><WorkspaceLayout /></div>}><Route index element={<Navigate to="integrations" replace />} /><Route path="models" element={<Navigate to="integrations" replace />} /><Route path="logs" element={<Navigate to="/onboarding" replace />} /><Route path="integrations" element={<IntegrationsPage />} /><Route path="sources" element={<ConnectedSourcesPage />} /></Route>
          <Route path="/automations" element={<div className="legacy-module-page"><AutomationLayout /></div>}><Route index element={<AutomationsPage user={user} />} /><Route path="new" element={<AutomationBuilderPage user={user} />} /><Route path="runs" element={<AutomationRunsPage user={user} />} /><Route path=":workflowId/edit" element={<AutomationBuilderPage user={user} />} /></Route>
          <Route path="/settings" element={<SettingsLayout user={user} />}><Route index element={<Navigate to="budget" replace />} /><Route path="budget" element={isAdmin ? <BudgetSettingsPage /> : <Navigate to="/settings/security" replace />} /><Route path="retention" element={isAdmin ? <RetentionSettingsPage /> : <Navigate to="/settings/security" replace />} /><Route path="guardrails" element={isAdmin ? <GuardrailsSettingsPage /> : <Navigate to="/settings/security" replace />} /><Route path="guardrails/documentation" element={isAdmin ? <GuardrailsDocumentationPage /> : <Navigate to="/settings/security" replace />} /><Route path="audit" element={isAdmin ? <AuditSettingsPage /> : <Navigate to="/settings/security" replace />} /><Route path="security" element={<AccountSecuritySettingsPage />} /></Route>
          <Route path="/settings/permissions" element={<Navigate to="/organization/permissions" replace />} /><Route path="/settings/team" element={<Navigate to="/organization/members" replace />} />
          <Route path="/organization" element={<div className="legacy-module-page"><OrganizationLayout /></div>}><Route index element={<Navigate to="members" replace />} /><Route path="members" element={<TeamSettingsPage currentUser={user} />} /><Route path="permissions" element={<PermissionsSettingsPage />} /></Route><Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
    <BudgetAlertMonitor user={user} />
  </div>;
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  useEffect(() => {
    let active = true;
    const onAuthenticated = (event) => { setUser(event.detail || null); setAuthError(''); setAuthReady(true); };
    const onUnauthenticated = () => { setUser(null); setAuthError(''); setAuthReady(true); };
    window.addEventListener('incuva:authenticated', onAuthenticated);
    window.addEventListener('incuva:unauthenticated', onUnauthenticated);
    if (!getToken() && !getRefreshToken()) setAuthReady(true);
    else getCurrentUser().then((result) => { if (active) { setUser(result?.user || null); setAuthError(''); } }).catch((error) => { if (active) { if (error.status === 401) removeToken(); else setAuthError('Impossible de vérifier la session. Vérifiez que le backend et PostgreSQL sont disponibles.'); setUser(null); } }).finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; window.removeEventListener('incuva:authenticated', onAuthenticated); window.removeEventListener('incuva:unauthenticated', onUnauthenticated); };
  }, []);
  async function handleLogout() { try { await logout(); } catch { /* Credentials are cleared below even if the API is unavailable. */ } finally { removeToken(); setUser(null); setAuthReady(true); navigate('/login', { replace: true }); } }
  if (!authReady) return <main className="auth-loading"><span className="auth-loading-indicator" />Vérification de la session…</main>;
  if (authError) return <main className="auth-loading"><span>{authError}</span><button className="auth-retry" onClick={() => window.location.reload()}>Réessayer</button></main>;
  const isPublicPage = location.pathname === '/login' || location.pathname === '/register';
  if (!user && !isPublicPage) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user && isPublicPage) return <Navigate to="/dashboard" replace />;
  if (location.pathname === '/login') return <LoginPage />;
  if (location.pathname === '/register') return <RegisterPage />;
  return <AppLayout user={user} onLogout={handleLogout} />;
}

export default function App() { return <BrowserRouter><AppRoutes /></BrowserRouter>; }
