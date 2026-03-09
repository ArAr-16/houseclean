import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../components/Admin.css";
import { rtdb } from "../../firebase";
import { onValue, ref, update as rtdbUpdate } from "firebase/database";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [activeNotif, setActiveNotif] = useState(null);

  useEffect(() => {
    const notifRef = ref(rtdb, "AdminNotifications");
    const unsub = onValue(notifRef, (snap) => {
      const val = snap.val();
      if (!val) {
        setNotifications([]);
        return;
      }
      const list = Object.entries(val).map(([id, data]) => ({
        id,
        ...data,
        createdAt: data?.createdAt || 0,
      }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(list);
    });
    return () => unsub();
  }, []);


  const markRead = (id, status = "read") =>
    rtdbUpdate(ref(rtdb, `AdminNotifications/${id}`), { status }).catch(() => {});

  const markAllRead = () => {
    notifications
      .filter((n) => n.status !== "read")
      .forEach((n) => markRead(n.id, "read"));
  };

  const filtered = notifications.filter((n) =>
    filter === "all" ? true : (n.type || "contact") === filter
  );

  const openNotif = (n) => {
    if (n.status !== "read") {
      markRead(n.id, "read");
      setActiveNotif({ ...n, status: "read" });
    } else {
      setActiveNotif(n);
    }
  };

  const closeNotif = () => setActiveNotif(null);

  const markUnread = (notif) => {
    markRead(notif.id, "unread");
    setActiveNotif((prev) => (prev ? { ...prev, status: "unread" } : prev));
  };

  return (
    <div className="admin-page neo-admin">
      <div className="settings-shell">
        <div className="breadcrumb-row">
          <Link to="/admin" className="crumb">Dashboard</Link>
          <span className="crumb-sep">/</span>
          <Link to="/admin/notifications" className="crumb active">Notifications</Link>
        </div>
        <header className="settings-header">
          <div className="notif-hero">
            <p className="eyebrow">Inbox</p>
            <h2>Notifications</h2>
            <p className="muted">All incoming contact messages and system alerts.</p>
          </div>
          <div className="pill-group" style={{ marginLeft: "auto" }}>
            <button className="btn pill ghost" type="button" onClick={markAllRead}>
              Mark all read
            </button>
            <select
              className="pill-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="contact">Contact messages</option>
              <option value="system">System</option>
            </select>
          </div>
        </header>
        <div className="panel card">
          <div className="notification-list" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`notification-item ${n.status === "read" ? "read" : "unread"}`}
                onClick={() => openNotif(n)}
              >
                <div className="notification-top">
                  <span className="notification-title">{n.title || "Notification"}</span>
                  {n.createdAt ? (
                    <span className="muted tiny">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                <p className="notification-body">{n.message || n.preview || n.body || "—"}</p>
                {n.email && (
                  <span className="muted tiny">
                    From: {n.name || "Visitor"} · {n.email}
                  </span>
                )}
              </div>
            ))}
            {!filtered.length && <p className="muted">No notifications found.</p>}
          </div>
        </div>
        {activeNotif && (
          <div className="notif-modal">
            <div className="notif-modal__backdrop" onClick={closeNotif} />
            <div className="notif-modal__panel">
              <div className="notif-modal__header">
                <div>
                  <p className="eyebrow">Message detail</p>
                  <h4>{activeNotif.title || "Notification"}</h4>
                  {activeNotif.createdAt && (
                    <span className="muted tiny">
                      {new Date(activeNotif.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <button className="icon-btn" onClick={closeNotif} aria-label="Close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="notif-modal__body">
                <p className="muted tiny">
                  From: {activeNotif.name || "Visitor"} · {activeNotif.email || "—"}
                </p>
                <p className="notification-body" style={{ whiteSpace: "pre-wrap" }}>
                  {activeNotif.message || activeNotif.preview || activeNotif.body || "—"}
                </p>
              </div>
              <div className="notif-modal__actions">
                {activeNotif.status !== "unread" && (
                  <button
                    className="btn pill ghost"
                    type="button"
                    onClick={() => markUnread(activeNotif)}
                  >
                    Mark unread
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
