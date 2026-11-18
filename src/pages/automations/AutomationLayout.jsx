import { NavLink, Outlet } from 'react-router-dom';
import { Clock3, GitBranch, Plus } from 'lucide-react';
import '../AutomationPages.css';

const tabs = [
  { to: '/automations', label: 'Scénarios d’intégration', icon: GitBranch, end: true },
  { to: '/automations/new', label: 'Créer un scénario', icon: Plus },
  { to: '/automations/runs', label: 'Historique d’intégration', icon: Clock3 },
];

export default function AutomationLayout() {
  return (
    <div className="automation-layout">
      <nav className="section-local-nav" aria-label="Automatisations d’intégration">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `section-local-tab${isActive ? ' is-active' : ''}`}>
            <Icon size={15} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
