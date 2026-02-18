import React from 'react';
import '../../components/Admin.css';

function Dashboard() {
  const stats = {
    users: 124,
    active: 98,
    requests: 21,
    completed: 156,
  };

  const recentActivity = [
    { id: 1, action: 'User Alice registered', time: '2 hours ago', icon: <i className="fas fa-user-plus"></i> },
    { id: 2, action: 'New service request from John', time: '4 hours ago', icon: <i className="fas fa-file-alt"></i> },
    { id: 3, action: 'Payment received from Maria', time: '6 hours ago', icon: <i className="fas fa-money-bill-wave"></i> },
  ];

  return (
    <div className="admin-page">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Welcome back, Administrator!</p>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-grid">
          <div className="tile">
            <div className="tile-icon"><i className="fas fa-users"></i></div>
            <div className="tile-content">
              <div className="tile-value">{stats.users}</div>
              <div className="tile-label">Total Users</div>
            </div>
          </div>
          <div className="tile">
            <div className="tile-icon"><i className="fas fa-user-check"></i></div>
            <div className="tile-content">
              <div className="tile-value">{stats.active}</div>
              <div className="tile-label">Active Users</div>
            </div>
          </div>
          <div className="tile">
            <div className="tile-icon"><i className="fas fa-chart-bar"></i></div>
            <div className="tile-content">
              <div className="tile-value">{stats.completed}</div>
              <div className="tile-label">Completed</div>
            </div>
          </div>
          <div className="tile">
            <div className="tile-icon"><i className="fas fa-clipboard-list"></i></div>
            <div className="tile-content">
              <div className="tile-value">{stats.requests}</div>
              <div className="tile-label">Pending</div>
            </div>
          </div>
        </div>

        <div className="dashboard-large">
          <div className="box">
            <h3 className="box-title"><i className="fas fa-chart-line"></i> Performance</h3>
            <div className="chart-placeholder">
              <p>Total Revenue: $45,230</p>
              <p>Monthly Growth: +12.5%</p>
              <p>Conversion Rate: 3.8%</p>
            </div>
          </div>
          <div className="box">
            <h3 className="box-title"><i className="fas fa-star"></i> Ratings</h3>
            <div className="ratings-display">
              <div className="rating-item">
                <span>5 Star: 87%</span>
              </div>
              <div className="rating-item">
                <span>4 Star: 10%</span>
              </div>
              <div className="rating-item">
                <span>3 Star: 3%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-large" style={{marginTop: '24px'}}>
          <div className="box history-box">
            <h3 className="box-title"><i className="fas fa-scroll"></i> Recent Activity</h3>
            <div className="activity-list">
              {recentActivity.map(activity => (
                <div key={activity.id} className="activity-item">
                  <span className="activity-icon">{activity.icon}</span>
                  <div className="activity-details">
                    <p className="activity-text">{activity.action}</p>
                    <p className="activity-time">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="box">
            <h3 className="box-title"><i className="fas fa-bullseye"></i> Quick Stats</h3>
            <div className="quick-stats">
              <div className="stat-row">
                <span><i className="fas fa-user-check"></i> Active Now</span>
                <strong>45</strong>
              </div>
              <div className="stat-row">
                <span><i className="fas fa-dollar-sign"></i> Today's Revenue</span>
                <strong >$2,450</strong>
              </div>
              <div className="stat-row">
                <span><i className="fas fa-calendar-alt"></i> This Month</span>
                <strong>858 Orders</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
