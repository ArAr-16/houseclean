import React, { useEffect, useMemo, useState } from "react";
import "../../components/Admin.css";
import { rtdb } from "../../firebase";
import { onValue, ref } from "firebase/database";

const getActivityIcon = (type) => {
  const icons = {
    "user-add": <i className="fas fa-user-plus"></i>,
    "user-disable": <i className="fas fa-user-slash"></i>,
    "password-reset": <i className="fas fa-key"></i>,
    login: <i className="fas fa-sign-in-alt"></i>,
    config: <i className="fas fa-cog"></i>,
    backup: <i className="fas fa-database"></i>,
    refund: <i className="fas fa-rotate-left"></i>,
  };
  return icons[type] || <i className="fas fa-pen"></i>;
};

function History() {
  const getDefaultRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { from: fmt(start), to: fmt(end) };
  };
  const stored = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("hc_admin_history_filters");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const defaults = getDefaultRange();

  const [status, setStatus] = useState(stored?.status || "all");
  const [type, setType] = useState(stored?.type || "all");
  const [fromDate, setFromDate] = useState(stored?.fromDate || defaults.from);
  const [toDate, setToDate] = useState(stored?.toDate || defaults.to);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = { status, type, fromDate, toDate };
    localStorage.setItem("hc_admin_history_filters", JSON.stringify(payload));
  }, [status, type, fromDate, toDate]);

  useEffect(() => {
    const historyRef = ref(rtdb, "AdminHistory");
    const unsub = onValue(historyRef, (snap) => {
      const val = snap.val();
      if (!val) {
        setHistory([]);
        return;
      }
      const list = Object.entries(val).map(([id, data]) => ({
        id,
        ...data,
        createdAt: data?.createdAt || 0
      }));
      list.sort((a, b) => (Number(b.createdAt || 0) || 0) - (Number(a.createdAt || 0) || 0));
      setHistory(list);
    });
    return () => unsub();
  }, []);
  const filtered = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    const toEnd = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999) : null;
    return (history || []).filter((h) => {
      const sOk = status === "all" || h.status === status;
      const tOk = type === "all" || h.type === type;
      const when = Number(h.createdAt || 0) || 0;
      const fromOk = from ? when >= from.getTime() : true;
      const toOk = toEnd ? when <= toEnd.getTime() : true;
      return sOk && tOk && fromOk && toOk;
    });
  }, [history, status, type, fromDate, toDate]);

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
              <div><p className="mini-label">Success</p><h3>{filtered.filter((h) => h.status === "success").length}</h3></div>
            </div>
            <div className="mini-card">
              <div className="mini-icon amber"><i className="fas fa-exclamation-triangle" /></div>
              <div><p className="mini-label">Warnings</p><h3>{filtered.filter((h) => h.status === "warning").length}</h3></div>
            </div>
            <div className="mini-card">
              <div className="mini-icon blue"><i className="fas fa-info-circle" /></div>
              <div><p className="mini-label">Info</p><h3>{filtered.filter((h) => h.status === "info").length}</h3></div>
            </div>
            <div className="mini-card">
              <div className="mini-icon pink"><i className="fas fa-database" /></div>
              <div><p className="mini-label">Backups</p><h3>{filtered.filter((h) => h.type === "backup").length}</h3></div>
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
                  <option value="refund">Refund</option>
                </select>
                <input
                  className="pill-select"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <input
                  className="pill-select"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            <div className="history-timeline">
              {filtered.map((h) => (
                <div key={h.id} className={`history-item history-${h.status}`}>
                  <div className="history-marker">
                    <span className="history-icon" style={{ color: "var(--admin-accent, #f1b856)" }}>{getActivityIcon(h.type)}</span>
                  </div>
                  <div className="history-content">
                    <div className="history-action-text">{h.action || h.message || "Activity"}</div>
                    <div className="history-meta">
                      <span className="history-time">
                        <i className="fas fa-clock"></i>{" "}
                        {h.when || (h.createdAt ? new Date(h.createdAt).toLocaleString() : "--")}
                      </span>
                      <span className={`history-badge badge-${h.status}`}>{h.status || "info"}</span>
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
