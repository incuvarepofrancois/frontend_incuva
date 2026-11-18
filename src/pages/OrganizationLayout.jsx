import { NavLink, Outlet } from 'react-router-dom';
import { ChevronRight, Shield, Users } from 'lucide-react';
import './SettingsPages.css';

const organizationTabs = [
  { to: '/organization/members', label: 'Équipe', icon: Users },
  { to: '/organization/permissions', label: 'Rôles & accès', icon: Shield },
];

export default function OrganizationLayout() {
  return <div className="settings-page organization-page">
    <header className="settings-heading">
      <div className="settings-heading-icon"><Users size={17} /></div>
      <div><span className="settings-kicker">GESTION DE L’ORGANISATION</span><h2>Organisation</h2><p>Gérez les membres de votre espace et les permissions associées à chaque rôle.</p></div>
    </header>
    <nav className="settings-tabs" aria-label="Rubriques de l’organisation">
      {organizationTabs.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `settings-tab${isActive ? ' active' : ''}`}>
        <Icon size={16} /><span>{label}</span><ChevronRight className="settings-tab-arrow" size={14} />
      </NavLink>)}
    </nav>
    <Outlet />
  </div>;
}
