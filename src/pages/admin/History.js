import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../components/Admin.css";
import { rtdb } from "../../firebase";
import {
  onValue,
  push,
  ref,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate
} from "firebase/database";
import { logAdminHistory } from "../../utils/adminHistory";

const toMs = (value) => {
  if (value == null) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(num) && num > 0) return num;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const isPaid = (req) => {
  const paymentStatus = String(req?.paymentStatus || "").toUpperCase();
  return paymentStatus === "PAID" || Boolean(req?.paidAt || req?.cashReceivedAt);
};

const getPaidAt = (req) =>
  toMs(req?.paidAt || req?.cashReceivedAt || req?.completedAt || req?.updatedAt || req?.createdAt);

const getActivityIcon = (type) => {
  const icons = {
    "user-add": <i className="fas fa-user-plus"></i>,
    "user-disable": <i className="fas fa-user-slash"></i>,
    "user-enable": <i className="fas fa-user-check"></i>,
    "password-reset": <i className="fas fa-key"></i>,
    login: <i className="fas fa-sign-in-alt"></i>,
    payment: <i className="fas fa-credit-card"></i>,
    config: <i className="fas fa-cog"></i>,
    backup: <i className="fas fa-database"></i>,
    refund: <i className="fas fa-rotate-left"></i>,
  };
  return icons[type] || <i className="fas fa-pen"></i>;
};

function History() {
  const navigate = useNavigate();
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
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);

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
  useEffect(() => {
    const usersRef = ref(rtdb, "Users");
    const unsub = onValue(usersRef, (snap) => {
      const val = snap.val() || {};
      setUsers(Object.entries(val).map(([id, data]) => ({ id, ...(data || {}) })));
    });
    return () => unsub();
  }, []);
  useEffect(() => {
    const reqRef = ref(rtdb, "ServiceRequests");
    const unsub = onValue(reqRef, (snap) => {
      const val = snap.val() || {};
      setRequests(Object.entries(val).map(([id, data]) => ({ id, ...(data || {}) })));
    });
    return () => unsub();
  }, []);
  useEffect(() => {
    const refundRef = ref(rtdb, "RefundRequests");
    const unsub = onValue(refundRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val).map(([id, data]) => ({ id, ...(data || {}) }));
      list.sort((a, b) => (toMs(b?.createdAt) || 0) - (toMs(a?.createdAt) || 0));
      setRefundRequests(list);
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

  const formatWhen = (item) =>
    item?.when || (item?.createdAt ? new Date(item.createdAt).toLocaleString() : "--");
  const formatWhenShort = (value) => {
    const ms = toMs(value);
    if (!ms) return "Just now";
    const diff = Math.max(0, Date.now() - ms);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };
  const formatAddress = (req) =>
    [
      req?.street || req?.address,
      req?.barangay ? `Barangay ${req.barangay}` : "",
      req?.landmark,
      "Dagupan City",
      "Pangasinan",
      "Philippines"
    ]
      .filter(Boolean)
      .join(", ")
      .trim() || String(req?.location || "").trim() || "--";
  const sendCustomerNotification = async ({ customerId, title, body, requestId }) => {
    if (!customerId) return;
    const listRef = ref(rtdb, `UserNotifications/${String(customerId)}`);
    const notifRef = push(listRef);
    await rtdbSet(notifRef, {
      title: String(title || "Update"),
      body: String(body || ""),
      requestId: String(requestId || ""),
      createdAt: rtdbServerTimestamp(),
      read: false,
      source: "admin"
    });
  };
  const handleRefundStatus = async (refund, nextStatus) => {
    if (!refund?.id) return;
    const refundId = refund.id;
    const requestId = String(refund.requestId || "").trim();
    const updates = {
      [`RefundRequests/${refundId}/status`]: nextStatus,
      [`RefundRequests/${refundId}/${nextStatus === "APPROVED" ? "approvedAt" : "deniedAt"}`]:
        rtdbServerTimestamp(),
      [`RefundRequests/${refundId}/updatedAt`]: rtdbServerTimestamp()
    };
    if (requestId) {
      updates[`ServiceRequests/${requestId}/refundStatus`] = nextStatus;
      updates[`ServiceRequests/${requestId}/updatedAt`] = rtdbServerTimestamp();
    }
    await rtdbUpdate(ref(rtdb), updates);
    await sendCustomerNotification({
      customerId: refund.customerId,
      requestId,
      title: nextStatus === "APPROVED" ? "Refund approved" : "Refund denied",
      body:
        nextStatus === "APPROVED"
          ? "Your refund request was approved. We will process the refund shortly."
          : "Your refund request was denied. Please contact support for more details."
    });
    await logAdminHistory({
      type: "refund",
      status: nextStatus === "APPROVED" ? "success" : "warning",
      action: `${nextStatus === "APPROVED" ? "Approved" : "Denied"} refund request`,
      message: `Refund ${nextStatus.toLowerCase()} for request ${requestId || refundId}.`,
      refundRequestId: refundId,
      requestId,
      customerId: refund.customerId
    });
  };
  const recentActivity = useMemo(() => {
    const joinedItems = users.map((user) => ({
      id: `user-${user.id}`,
      type: "user",
      title: `${user.firstName || user.fullName || user.email || "User"} joined`,
      detail: `${user.role || "User"} account${user.status ? ` • ${user.status}` : ""}`,
      when: toMs(user.joined)
    }));
    const requestItems = requests.map((req) => ({
      id: `request-${req.id}`,
      type: "request",
      title: `${req.householderName || req.customerEmail || "Customer"} booked ${req.serviceType || req.service || "service"}`,
      detail: `${formatAddress(req)} • ${String(req.status || "PENDING").toUpperCase()}`,
      when: toMs(req.createdAt || req.timestamp || req.updatedAt)
    }));
    return [...joinedItems, ...requestItems]
      .filter((item) => item.when > 0)
      .sort((a, b) => b.when - a.when)
      .slice(0, 8);
  }, [users, requests]);
  const transactionItems = useMemo(() => {
    return (requests || [])
      .filter((req) => isPaid(req) || String(req?.refundStatus || "").trim())
      .map((req) => ({
        id: req.id,
        customer: req.householderName || req.customerEmail || "Customer",
        service: req.serviceType || req.service || "Service",
        method: String(req.paymentMethod || req.paidVia || "--"),
        amount: Number(req.totalPrice || 0),
        paymentStatus: String(req.paymentStatus || (isPaid(req) ? "PAID" : "PENDING")).toUpperCase(),
        refundStatus: String(req.refundStatus || "").toUpperCase(),
        when: getPaidAt(req) || toMs(req.updatedAt || req.createdAt),
        address: formatAddress(req)
      }))
      .sort((a, b) => b.when - a.when)
      .slice(0, 8);
  }, [requests]);
  const pendingRefunds = useMemo(
    () => refundRequests.filter((item) => String(item.status || "PENDING").toUpperCase() === "PENDING"),
    [refundRequests]
  );

  const handleExportCsv = () => {
    const rows = [["When", "Action", "Type", "Status"]];
    filtered.forEach((h) => {
      rows.push([
        formatWhen(h),
        h.action || h.message || "Activity",
        h.type || "log",
        h.status || "info"
      ]);
    });
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

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
                <button className="btn primary large" onClick={handleExportCsv}>
                  <i className="fas fa-file-export" /> Export CSV
                </button>
                <button className="btn ghost" onClick={() => navigate("/admin/settings#security-rules")}>
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
                  <option value="user-enable">User enable</option>
                  <option value="password-reset">Password reset</option>
                  <option value="login">Login</option>
                  <option value="payment">Payment</option>
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

            <div className="history-layout">
              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Action</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length ? (
                      filtered.map((h) => (
                        <tr key={h.id}>
                          <td className="nowrap">{formatWhen(h)}</td>
                          <td>{h.action || h.message || "Activity"}</td>
                          <td className="nowrap">
                            <span className="history-type">
                              {getActivityIcon(h.type)} {h.type || "log"}
                            </span>
                          </td>
                          <td className="nowrap">
                            <span className={`history-badge badge-${h.status}`}>{h.status || "info"}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="muted">No activity found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                          {formatWhen(h)}
                        </span>
                        <span className={`history-badge badge-${h.status}`}>{h.status || "info"}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {!filtered.length && <p className="muted small">No activity yet.</p>}
              </div>
            </div>
            <div className="history-actions">
              <button className="btn primary" onClick={handleExportCsv}>
                <i className="fas fa-file-export"></i> Export CSV
              </button>
              <button className="btn ghost"><i className="fas fa-trash-restore"></i> Archive</button>
            </div>
          </div>

          <div className="admin-monitor-grid">
            <div className="admin-card admin-card--activity-monitor">
              <div className="admin-card__header">
                <div>
                  <span className="muted small">User activity</span>
                  <h4>Recent customer and booking activity</h4>
                </div>
              </div>
              <div className="admin-activity-list">
                {recentActivity.length === 0 ? (
                  <p className="muted small">No recent activity found.</p>
                ) : (
                  recentActivity.map((item) => (
                    <div key={item.id} className="admin-activity-row">
                      <div className={`admin-activity-icon ${item.type}`}>
                        <i className={`fas ${item.type === "user" ? "fa-user-plus" : "fa-receipt"}`}></i>
                      </div>
                      <div className="admin-activity-copy">
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                      <span className="admin-activity-time">{formatWhenShort(item.when)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="admin-card admin-card--finance-monitor">
              <div className="admin-card__header">
                <div>
                  <span className="muted small">Financial transactions</span>
                  <h4>Payments, refunds, and review queue</h4>
                </div>
              </div>
              <div className="admin-finance-summary">
                <div className="finance-kpi">
                  <span>Paid jobs</span>
                  <strong>{transactionItems.filter((item) => item.paymentStatus === "PAID").length}</strong>
                </div>
                <div className="finance-kpi">
                  <span>Pending refunds</span>
                  <strong>{pendingRefunds.length}</strong>
                </div>
                <div className="finance-kpi">
                  <span>Tracked payments</span>
                  <strong>{transactionItems.length}</strong>
                </div>
              </div>
              <div className="admin-transaction-list">
                {transactionItems.length === 0 ? (
                  <p className="muted small">No financial transactions found.</p>
                ) : (
                  transactionItems.map((item) => (
                    <div key={item.id} className="admin-transaction-row">
                      <div className="admin-transaction-copy">
                        <strong>{item.customer} • {item.service}</strong>
                        <p>{item.address}</p>
                        <span className="muted tiny">
                          {item.method} • {formatWhenShort(item.when)}
                          {item.refundStatus ? ` • Refund ${item.refundStatus}` : ""}
                        </span>
                      </div>
                      <div className="admin-transaction-meta">
                        <strong>{`PHP ${Math.round(item.amount || 0).toLocaleString()}`}</strong>
                        <span className={`history-badge badge-${item.paymentStatus === "PAID" ? "success" : "warning"}`}>
                          {item.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {pendingRefunds.length > 0 && (
                <div className="admin-refund-review">
                  <h5>Refunds needing action</h5>
                  {pendingRefunds.slice(0, 4).map((refund) => (
                    <div key={refund.id} className="admin-refund-row">
                      <div>
                        <strong>{refund.customerName || "Customer"}</strong>
                        <p>{refund.serviceType || "Service"} • {refund.reason || "No reason provided"}</p>
                      </div>
                      <div className="admin-refund-actions">
                        <button className="btn pill ghost" type="button" onClick={() => handleRefundStatus(refund, "DENIED")}>
                          Deny
                        </button>
                        <button className="btn pill primary" type="button" onClick={() => handleRefundStatus(refund, "APPROVED")}>
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default History;
