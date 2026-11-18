import { NavLink, Outlet } from 'react-router-dom';
import { Cable, Plug } from 'lucide-react';
import '../WorkspacePages.css';

const tabs = [
  { to: '/workspace/integrations', label: 'Intégrations RH', icon: Plug },
  { to: '/workspace/sources', label: 'Sources connectées', icon: Cable },
];

export default function WorkspaceLayout() {
  return (
    <div className="workspace-layout">
      <nav className="section-local-nav" aria-label="Navigation des intégrations RH">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `section-local-tab${isActive ? ' is-active' : ''}`}>
            <Icon size={15} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
