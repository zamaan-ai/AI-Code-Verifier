import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderTree, Bug, ArrowLeftRight,
  Timer, History, Settings, FileCheck, Shield, LogOut, Menu, X
} from 'lucide-react';
import './Layout.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderTree, label: 'Project Explorer' },
  { to: '/findings', icon: Bug, label: 'Findings' },
  { to: '/transpilation', icon: ArrowLeftRight, label: 'Transpilation' },
  { to: '/wcet', icon: Timer, label: 'WCET Analyzer' },
  { to: '/history', icon: History, label: 'Scan History' },
  { to: '/compliance', icon: FileCheck, label: 'Compliance' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="layout page">
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} />}
      <aside className={`sidebar sidebar-desktop ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Shield size={22} strokeWidth={2} />
          <div>
            <div className="brand-title">Code Verifier</div>
            <div className="brand-sub">Air-Gapped AI</div>
          </div>
          <button className="sidebar-close" onClick={closeMobile} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeMobile}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="trust-badge">
            <span className="trust-dot" />
            Offline · No Telemetry
          </div>
          {user.username && (
            <div className="user-row">
              <span className="user-name">{user.username}</span>
              <button className="logout-btn" onClick={handleLogout} title="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-bar sidebar-mobile">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <strong>Code Verifier</strong>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
