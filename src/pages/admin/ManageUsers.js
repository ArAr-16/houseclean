import React, { useState } from 'react';
import '../../components/Admin.css';

const initialUsers = [
  { id: 1, firstName: 'Alice', lastName: 'Reyes', email: 'alice@example.com', phone: '09171234567', active: true, joinDate: '2025-10-15' },
  { id: 2, firstName: 'Bob', lastName: 'Garcia', email: 'bob@example.com', phone: '09179876543', active: true, joinDate: '2025-11-20' },
  { id: 3, firstName: 'Cathy', lastName: 'Lopez', email: 'cathy@example.com', phone: '09170001111', active: false, joinDate: '2025-09-10' },
  { id: 4, firstName: 'David', lastName: 'Santos', email: 'david@example.com', phone: '09175551234', active: true, joinDate: '2026-01-05' },
  { id: 5, firstName: 'Emma', lastName: 'Cruz', email: 'emma@example.com', phone: '09179994455', active: true, joinDate: '2026-01-12' },
];

function ManageUsers() {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  // Placeholder for add user logic
  const handleAddUser = () => {
    alert('Add user functionality coming soon!');
  };

  const toggleActive = (id) => {
    setUsers((u) => u.map(item => item.id === id ? { ...item, active: !item.active } : item));
  };

  const removeUser = (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setUsers((u) => u.filter(item => item.id !== id));
  };

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = users.filter(u => u.active).length;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Manage Users</h1>
        <p className="page-subtitle">View and control all user accounts</p>
      </div>

      <div className="users-stats">
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-users"></i></div>
          <div className="stat-info">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{users.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-user-check"></i></div>
          <div className="stat-info">
            <div className="stat-label">Active</div>
            <div className="stat-value">{activeCount}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-user-slash"></i></div>
          <div className="stat-info">
            <div className="stat-label">Disabled</div>
            <div className="stat-value">{users.length - activeCount}</div>
          </div>
        </div>
      </div>

      <div className="users-container">
        <div className="search-box" style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#aaa',
            fontSize: '1rem',
            pointerEvents: 'none',
            zIndex: 2
          }}>
            <i className="fas fa-search"></i>
          </span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th> Name</th>
                <th> Email</th>
                <th> Phone</th>
                <th> Joined</th>
                <th> Status</th>
                <th> Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <tr key={u.id} className={u.active ? 'row-active' : 'row-disabled'}>
                    <td className="user-name">
                      <span className="user-avatar">{u.firstName[0]}{u.lastName[0]}</span>
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="user-email">{u.email}</td>
                    <td className="user-phone">{u.phone}</td>
                    <td className="user-date">{u.joinDate}</td>
                    <td className="user-status">
                      <span className={`status-badge ${u.active ? 'active' : 'disabled'}`}>
                        {u.active ? <><i className="fas fa-check-circle"></i> Active</> : <><i className="fas fa-ban"></i> Disabled</>}
                      </span>
                    </td>
                    <td className="user-actions">
                      <button 
                        onClick={() => toggleActive(u.id)} 
                        className={`btn small ${u.active ? 'btn-disable' : 'btn-enable'}`}
                      >
                        {u.active ? <><i className="fas fa-ban"></i> Disable</> : <><i className="fas fa-check-circle"></i> Enable</>}
                      </button>
                      <button 
                        onClick={() => removeUser(u.id)} 
                        className="btn small btn-delete"
                      >
                        <i className="fas fa-trash-alt"></i> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-results">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Floating Add User Button */}
      <button
        onClick={handleAddUser}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #83ebc8 0%, #83d9ee 100%)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          fontSize: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          cursor: 'pointer',
        }}
        title="Add User"
      >
        <i className="fas fa-user-plus"></i>
      </button>
    </div>
  );
}

export default ManageUsers;
