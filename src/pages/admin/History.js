import React from 'react';
import '../../components/Admin.css';

const mockHistory = [
  { id: 1, action: 'User Alice created', when: '2026-02-01 09:12', type: 'user-add', status: 'success' },
  { id: 2, action: 'User Bob disabled', when: '2026-02-03 14:05', type: 'user-disable', status: 'warning' },
  { id: 3, action: 'Password reset for Cathy', when: '2026-02-05 11:22', type: 'password-reset', status: 'info' },
  { id: 4, action: 'Admin login - IP: 192.168.1.1', when: '2026-02-10 08:30', type: 'login', status: 'success' },
  { id: 5, action: 'Service configuration updated', when: '2026-02-10 10:15', type: 'config', status: 'info' },
  { id: 6, action: 'Database backup completed', when: '2026-02-10 16:45', type: 'backup', status: 'success' },
];

const getActivityIcon = (type) => {
  const icons = {
    'user-add': <i className="fas fa-user-plus"></i>,
    'user-disable': <i className="fas fa-user-slash"></i>,
    'password-reset': <i className="fas fa-key"></i>,
    'login': <i className="fas fa-sign-in-alt"></i>,
    'config': <i className="fas fa-cog"></i>,
    'backup': <i className="fas fa-database"></i>,
  };
  return icons[type] || <i className="fas fa-pen"></i>;
};

function History() {
  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Activity History</h1>
        <p className="page-subtitle">Track all system activities and user actions</p>
      </div>

      <div className="history-container">
        <div className="history-card">
          <div className="history-header">
            <h2><i className="fas fa-scroll" style={{color: '#f1b856'}}></i> Recent Activities</h2>
            <span className="activity-count">{mockHistory.length} records</span>
          </div>

          <div className="history-timeline">
            {mockHistory.map((h) => (
              <div key={h.id} className={`history-item history-${h.status}`}>
                <div className="history-marker">
                  <span className="history-icon" style={{color: 'var(--admin-accent, #f1b856)'}}>{getActivityIcon(h.type)}</span>
                </div>
                <div className="history-content">
                  <div className="history-action-text">{h.action}</div>
                  <div className="history-meta">
                    <span className="history-time"><i className="fas fa-clock"></i> {h.when}</span>
                    <span className={`history-badge badge-${h.status}`}>{h.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="history-stats">
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-chart-bar"></i></div>
            <div className="stat-info">
              <div className="stat-label">Total Activities</div>
              <div className="stat-value">{mockHistory.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-check-circle"></i></div>
            <div className="stat-info">
              <div className="stat-label">Successful</div>
              <div className="stat-value">{mockHistory.filter(h => h.status === 'success').length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-exclamation-triangle"></i></div>
            <div className="stat-info">
              <div className="stat-label">Warnings</div>
              <div className="stat-value">{mockHistory.filter(h => h.status === 'warning').length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default History;
