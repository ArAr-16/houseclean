import React, { useMemo, useState } from "react";
import "../../components/Admin.css";

const mockHistory = [
  { id: 1, action: "User Alice created", when: "2026-02-01 09:12", type: "user-add", status: "success" },
  { id: 2, action: "User Bob disabled", when: "2026-02-03 14:05", type: "user-disable", status: "warning" },
  { id: 3, action: "Password reset for Cathy", when: "2026-02-05 11:22", type: "password-reset", status: "info" },
  { id: 4, action: "Admin login - IP: 192.168.1.1", when: "2026-02-10 08:30", type: "login", status: "success" },
  { id: 5, action: "Service configuration updated", when: "2026-02-10 10:15", type: "config", status: "info" },
  { id: 6, action: "Database backup completed", when: "2026-02-10 16:45", type: "backup", status: "success" },
];

const getActivityIcon = (type) => {
  const icons = {
    "user-add": <i className="fas fa-user-plus"></i>,
    "user-disable": <i className="fas fa-user-slash"></i>,
    "password-reset": <i className="fas fa-key"></i>,
    login: <i className="fas fa-sign-in-alt"></i>,
    config: <i className="fas fa-cog"></i>,
    backup: <i className="fas fa-database"></i>,
  };
  return icons[type] || <i className="fas fa-pen"></i>;
};

function History() {
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const filtered = useMemo(() => {
    return mockHistory.filter((h) => {
      const sOk = status === "all" || h.status === status;
      const tOk = type === "all" || h.type === type;
      return sOk && tOk;
    });
  }, [status, type]);

  return (
    <div className="admin-page neo-admin">
      <div className="dashboard-shell full-width">
        <main className="dash-main">
          <div className="welcome-card">
            <div className="welcome-copy">
              <p className="eyebrow">Audit log</p>
              <h2>History & compliance</h2>
              <p className="muted">Trace every admin and user action. Filter, export, and review.</p>
              <div className="cta-row">
                <button className="btn primary large">
                  <i className="fas fa-file-export" /> Export CSV
                </button>
                <button className="btn ghost">
                  <i className="fas fa-shield-alt" /> Security rules
                </button>
              </div>
            </div>
            <div className="countdown-pill">
              <span className="pill-label">Records</span>
              <strong>{filtered.length}</strong>
              <small>shown</small>
            </div>
          </div>

          <div className="mini-stats">
            <div className="mini-card">
              <div className="mini-icon green"><i className="fas fa-check-circle" /></div>
              <div><p className="mini-label">Success</p><h3>{mockHistory.filter((h) => h.status === "success").length}</h3></div>
            </div>
            <div className="mini-card">
              <div className="mini-icon amber"><i className="fas fa-exclamation-triangle" /></div>
              <div><p className="mini-label">Warnings</p><h3>{mockHistory.filter((h) => h.status === "warning").length}</h3></div>
            </div>
            <div className="mini-card">
              <div className="mini-icon blue"><i className="fas fa-info-circle" /></div>
              <div><p className="mini-label">Info</p><h3>{mockHistory.filter((h) => h.status === "info").length}</h3></div>
            </div>
            <div className="mini-card">
              <div className="mini-icon pink"><i className="fas fa-database" /></div>
              <div><p className="mini-label">Backups</p><h3>{mockHistory.filter((h) => h.type === "backup").length}</h3></div>
            </div>
          </div>

          <div className="panel card history-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h4>Chronology</h4>
              </div>
              <div className="pill-group">
                <select className="pill-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="all">Status: All</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
                <select className="pill-select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="all">Type: All</option>
                  <option value="user-add">User add</option>
                  <option value="user-disable">User disable</option>
                  <option value="password-reset">Password reset</option>
                  <option value="login">Login</option>
                  <option value="config">Config</option>
                  <option value="backup">Backup</option>
                </select>
              </div>
            </div>

            <div className="history-timeline">
              {filtered.map((h) => (
                <div key={h.id} className={`history-item history-${h.status}`}>
                  <div className="history-marker">
                    <span className="history-icon" style={{ color: "var(--admin-accent, #f1b856)" }}>{getActivityIcon(h.type)}</span>
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
            <div className="history-actions">
              <button className="btn primary"><i className="fas fa-file-export"></i> Export CSV</button>
              <button className="btn ghost"><i className="fas fa-trash-restore"></i> Archive</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default History;
