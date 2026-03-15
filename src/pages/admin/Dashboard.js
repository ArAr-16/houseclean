import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../components/Admin.css";
import AdminSidebar from "../../components/AdminSidebar";
import { auth, rtdb } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref, update as rtdbUpdate } from "firebase/database";
import { Link, useLocation } from "react-router-dom";

const stats = {
  users: 124,
  active: 98,
  requests: 21,
  completed: 156,
};

const recentActivity = [
  { id: 1, action: "User Alice registered", time: "2 hours ago", icon: <i className="fas fa-user-plus"></i> },
  { id: 2, action: "New service request from John", time: "4 hours ago", icon: <i className="fas fa-file-alt"></i> },
  { id: 3, action: "Payment received from Maria", time: "6 hours ago", icon: <i className="fas fa-money-bill-wave"></i> },
];

const quickStats = [
  { label: "Active Now", value: "45", icon: "fas fa-user-check" },
  { label: "Today's Revenue", value: "$2,450", icon: "fas fa-dollar-sign" },
  { label: "This Month", value: "858 Orders", icon: "fas fa-calendar-alt" },
];

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [reminders, setReminders] = useState([
    { id: 1, text: "Call barangay heads re: IDs", done: false },
    { id: 2, text: "Publish weekend rota", done: false },
  ]);
  const [darkLabel, setDarkLabel] = useState(
    document.documentElement.classList.contains("dark-mode") ? "Light mode" : "Dark mode"
  );
  const [newReminder, setNewReminder] = useState("");
  const [notes, setNotes] = useState("Shift notes:\n- Calmay short on staff\n- Verify Juno documents");
  const [notifications, setNotifications] = useState([]);
  const unreadNotifications = notifications.filter((n) => n.status === "unread");
  const unreadCount = unreadNotifications.length;
  const { monthLabel, monthDays, visibleMonth, visibleYear } = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const totalDays = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const leading = base.getDay();
    const cells = Array.from({ length: leading }, () => null);
    for (let d = 1; d <= totalDays; d += 1) cells.push(d);
    const trailing = (7 - (cells.length % 7)) % 7;
    for (let t = 0; t < trailing; t += 1) cells.push(null);
    return {
      monthLabel: base.toLocaleString("default", { month: "long", year: "numeric" }),
      monthDays: cells,
      visibleMonth: base.getMonth(),
      visibleYear: base.getFullYear(),
    };
  }, [monthOffset, today]);

  const addReminder = () => {
    const text = newReminder.trim();
    if (!text) return;
    setReminders((prev) => [{ id: Date.now(), text, done: false }, ...prev]);
    setNewReminder("");
  };

  const toggleReminder = (id) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r))
    );
  };

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user || null));
    return () => unsub();
  }, []);

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
        createdAt: typeof data?.createdAt === "number" ? data.createdAt : 0,
      }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(list);
    });
    return () => unsub();
  }, []);

  const markRead = (id, status = "read") =>
    rtdbUpdate(ref(rtdb, `AdminNotifications/${id}`), { status }).catch(() => {});

  const markAllRead = () => {
    unreadNotifications.forEach((n) => markRead(n.id, "read"));
  };

  const profileNameRaw = currentUser?.displayName || currentUser?.email || "Admin";
  const profileFirst = profileNameRaw.trim().split(" ").filter(Boolean)[0] || "NA";
  const profileName = profileFirst;
  const profileInitials = profileFirst.slice(0, 2).toUpperCase();
  const goToProfile = () => {
    if (currentUser?.uid) {
      window.location.href = `/profile/${currentUser.uid}`;
    } else {
      window.location.href = "/profile";
    }
  };
  const goToUsers = () => {
    window.location.href = "/admin/users";
  };

  return (
    <div className="admin-page neo-admin">
      <div className="dashboard-shell no-sidebar">
        <main className="dash-main">
          <div className="breadcrumb-row">
            <Link to="/admin" className="crumb">Dashboard</Link>
            {location.pathname.includes("/admin/notifications") && (
              <>
                <span className="crumb-sep">/</span>
                <Link to="/admin/notifications" className="crumb active">Notifications</Link>
              </>
            )}
          </div>
          <div className="welcome-card">
            <div className="welcome-copy">
              <p className="eyebrow">Welcome back!</p>
              <h2>Hello, {profileName}!</h2>
              <p className="muted">
                Keep an eye on onboarding, revenue, and service quality. All your core metrics live here.
              </p>
              <div className="cta-row">
                <button className="btn primary large" title="Add staff" onClick={goToUsers}>
                  <i className="fas fa-user-plus" /> Add staff
                </button>
                <button className="btn ghost" title="Review pending accounts" onClick={goToUsers}>
                  <i className="fas fa-clipboard-check" /> Review queue
                </button>
              </div>
            </div>
          </div>

          <div className="mini-stats">
            <div className="mini-card">
              <div className="mini-icon pink"><i className="fas fa-users" /></div>
              <div>
                <p className="mini-label">Total Users</p>
                <h3>{stats.users}</h3>
              </div>
            </div>
            <div className="mini-card">
              <div className="mini-icon green"><i className="fas fa-user-check" /></div>
              <div>
                <p className="mini-label">Active</p>
                <h3>{stats.active}</h3>
              </div>
            </div>
            <div className="mini-card">
              <div className="mini-icon amber"><i className="fas fa-clipboard-list" /></div>
              <div>
                <p className="mini-label">Requests</p>
                <h3>{stats.requests}</h3>
              </div>
            </div>
            <div className="mini-card">
              <div className="mini-icon blue"><i className="fas fa-chart-bar" /></div>
              <div>
                <p className="mini-label">Completed</p>
                <h3>{stats.completed}</h3>
              </div>
            </div>
          </div>

          <div className="panel-grid single-column">
            <div className="panel card">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Performance</p>
                  <h4>Service & Revenue</h4>
                </div>
              </div>
              <div className="dashboard-large no-padding">
                <div className="box soft">
                  <h3 className="box-title"><i className="fas fa-chart-line"></i> Performance</h3>
                  <div className="chart-placeholder">
                    <p>Total Revenue: $45,230</p>
                    <p>Monthly Growth: +12.5%</p>
                    <p>Conversion Rate: 3.8%</p>
                  </div>
                </div>
                <div className="box soft">
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
            </div>

          </div>

          <div className="panel-grid">
            <div className="panel card history-box">
              <div className="panel-header">
                <p className="eyebrow">Timeline</p>
                <h4>Recent activity</h4>
              </div>
              <div className="activity-list">
                {recentActivity.map((activity) => (
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

            <div className="panel card">
              <div className="panel-header">
                <p className="eyebrow">Quick Stats</p>
                <h4>Today</h4>
              </div>
              <div className="quick-stats">
                {quickStats.map((s) => (
                  <div key={s.label} className="stat-row">
                    <span><i className={s.icon}></i> {s.label}</span>
                    <strong>{s.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <aside className="dash-rail">
          <div className="rail-card user-summary profile-card">
            <div className="rail-actions">
              <div className="menu-trigger" title="Menu">
                <button
                  type="button"
                  className="menu-button"
                  style={{ position: "relative" }}
                  aria-label="Menu"
                  onClick={(e) => {
                    const drop = e.currentTarget.nextElementSibling;
                    const isOpen = drop.dataset.open === "true";
                    drop.dataset.open = isOpen ? "false" : "true";
                    drop.style.opacity = isOpen ? "0" : "1";
                    drop.style.pointerEvents = isOpen ? "none" : "auto";
                    drop.style.transform = isOpen ? "translateY(-6px)" : "translateY(0)";
                  }}
                >
                  {unreadCount > 0 && <span className="ping-dot" aria-hidden="true"></span>}
                  <i className="fas fa-ellipsis-v"></i>
                </button>
                <div
                  className="menu-dropdown"
                  data-open="false"
                  onMouseLeave={(e) => {
                    e.currentTarget.dataset.open = "false";
                    e.currentTarget.style.opacity = "0";
                    e.currentTarget.style.pointerEvents = "none";
                    e.currentTarget.style.transform = "translateY(-6px)";
                  }}
                >
                  <button onClick={() => navigate("/admin/settings")}><i className="fas fa-cog"></i> Settings</button>
                  <button onClick={() => {
                    const root = document.documentElement;
                    const next = !root.classList.contains("dark-mode");
                    if (next) root.classList.add("dark-mode");
                    else root.classList.remove("dark-mode");
                    localStorage.setItem("theme", next ? "dark" : "light");
                    setDarkLabel(next ? "Light mode" : "Dark mode");
                  }}>
                    <i className="fas fa-moon"></i> {darkLabel}
                  </button>
                  <button onClick={() => navigate("/admin/notifications")} style={{ position: "relative" }}>
                    <i className="fas fa-bell"></i> Notifications
                    {unreadCount > 0 && <span className="ping-dot small" aria-hidden="true"></span>}
                  </button>
                  <button onClick={() => navigate("/login")} className="danger"><i className="fas fa-sign-out-alt"></i> Logout</button>
                </div>
              </div>
            </div>
            <div className="avatar-circle lg">{profileInitials}</div>
            <h4 className="profile-name">{profileName}</h4>
            <p className="profile-role">Administrator</p>
            <div className="rail-mini-list">
              <div className="rail-mini-item">
                <span className="mini-label"><i className="fas fa-sync"></i> Last sync</span>
                <span className="mini-value">5m ago</span>
              </div>
            </div>
          </div>

          <div className="rail-card notification-card">
            <div className="rail-header">
              <h4>Notifications</h4>
              <span className="muted small">{unreadCount} unread</span>
            </div>
            <div className="notification-list">
              {unreadNotifications.slice(0, 6).map((n) => (
                <button
                  key={n.id}
                  className={`notification-item ${n.status === "read" ? "read" : "unread"} fade-in`}
                  onClick={() => markRead(n.id, "read")}
                  type="button"
                >
                  <div className="notification-top">
                    <span className="notification-title">{n.title || "Notification"}</span>
                    {n.createdAt ? (
                      <span className="muted tiny">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <p className="notification-body">
                    {n.message || n.preview || n.body || "—"}
                  </p>
                  {n.email && (
                    <span className="muted tiny">From: {n.name || "Visitor"} · {n.email}</span>
                  )}
                </button>
              ))}
              {!unreadNotifications.length && (
                <p className="muted small">No notifications yet.</p>
              )}
            </div>
            <div className="rail-actions" style={{ marginTop: 8 }}>
              <button className="btn pill ghost" type="button" onClick={markAllRead}>
                Mark all read
              </button>
            </div>
          </div>

          <div className="rail-card calendar-card">
            <div className="rail-actions">
              <button className="icon-btn ghost" aria-label="Prev month" onClick={() => setMonthOffset((o) => o - 1)}>
                <i className="fas fa-chevron-left"></i>
              </button>
              <div className="muted" style={{ fontWeight: 700 }}>{monthLabel}</div>
              <button className="icon-btn ghost" aria-label="Next month" onClick={() => setMonthOffset((o) => o + 1)}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            <div className="calendar-grid">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div key={d} className="calendar-head">{d}</div>
              ))}
              {monthDays.map((d, idx) => {
                const isToday =
                  d === today.getDate() &&
                  visibleMonth === today.getMonth() &&
                  visibleYear === today.getFullYear();
                return (
                  <div
                    key={`${d}-${idx}`}
                    className={`calendar-cell ${d ? "" : "empty"} ${isToday ? "today" : ""}`}
                  >
                    {d || ""}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rail-card reminder-card">
            <div className="rail-header">
              <h4>Reminders</h4>
              <span className="muted small">{reminders.length} items</span>
            </div>
            <div className="reminder-input">
              <input
                type="text"
                placeholder="Add reminder..."
                value={newReminder}
                onChange={(e) => setNewReminder(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addReminder();
                }}
              />
              <button className="btn pill primary" onClick={addReminder}>Add</button>
            </div>
            <div className="reminder-list">
              {reminders.map((r) => (
                <label key={r.id} className={`reminder-item ${r.done ? "done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={r.done}
                    onChange={() => toggleReminder(r.id)}
                  />
                  <span>{r.text}</span>
                </label>
              ))}
              {!reminders.length && <p className="muted small">No reminders yet.</p>}
            </div>
          </div>

          <div className="rail-card note-card">
            <div className="rail-header">
              <h4>Notes</h4>
              <span className="muted small">Quick pad</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="note-pad"
              placeholder="Type notes..."
            />
          </div>

        </aside>
      </div>
    </div>
  );
}

export default Dashboard;
