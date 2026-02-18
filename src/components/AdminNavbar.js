import React from 'react';
import { NavLink } from 'react-router-dom';
import './Admin.css';

function AdminNavbar() {
  return (
    <aside className="admin-nav">
      <div className="admin-avatar">
        <div className="avatar-circle"> <span>👤</span> </div>
      </div>
      <div className="admin-brand">ADMIN</div>
      <nav>
        <ul>
          <li><NavLink to="/admin" end>Dashboard</NavLink></li>
          <li><NavLink to="/admin/users">Users</NavLink></li>
          <li><NavLink to="/admin/history">History</NavLink></li>
        </ul>
      </nav>
      <div className="admin-logout">
        <NavLink to="/">Log Out</NavLink>
      </div>
    </aside>
  );
}

export default AdminNavbar;
