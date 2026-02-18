
import React, { useState } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { NavLink } from 'react-router-dom';
import './Admin.css';

function AdminSidebar() {
  const [isVisible, setIsVisible] = useState(true);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const toggleSidebar = () => {
    setIsVisible(!isVisible);
  };

  return (
    <>
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isVisible ? <i className="fas fa-times"></i> : <i className="fas fa-bars"></i>}
      </button>
      <aside className={`admin-nav ${isVisible ? 'visible' : 'hidden'}`}>
        <div className="sidebar-header">
          <div className="admin-avatar">
            <div className="avatar-circle"><i className="fas fa-user-tie"></i></div>
          </div>
          <div className="admin-brand">ADMIN</div>
          <p className="admin-role">Administrator</p>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li>
              <NavLink to="/admin" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <span className="nav-icon"><i className="fas fa-chart-bar"></i></span>
                <span className="nav-label">Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <span className="nav-icon"><i className="fas fa-users"></i></span>
                <span className="nav-label">Users</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <span className="nav-icon"><i className="fas fa-scroll"></i></span>
                <span className="nav-label">History</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 16,
            minHeight: 40,
            height: 40,
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <button
              className={`sidebar-darkmode-switch${isDarkMode ? ' dark' : ''}`}
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="switch-track">
                <span className="switch-icon sun"><i className="fas fa-sun"></i></span>
                <span className="switch-icon moon"><i className="fas fa-moon"></i></span>
                <span className="switch-thumb"></span>
              </span>
            </button>
            <span style={{
              fontSize: 15,
              color: 'inherit',
              fontWeight: 500,
              lineHeight: '1',
              display: 'flex',
              alignItems: 'center',
              height: 24,
              letterSpacing: 0.2,
              whiteSpace: 'nowrap',
            }}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
          <div className="admin-logout">
            <NavLink to="/" className="logout-link">
              <span className="logout-icon"><i className="fas fa-sign-out-alt"></i></span>
              <span>Log Out</span>
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;

