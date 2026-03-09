import React, { useState } from "react";
import Logo from "../components/Logo.png";
import "./Staff.css";

function Staff() {
  const [menuOpen, setMenuOpen] = useState(false);

  const tasks = [
    { id: "T-1045", title: "Deep clean - Pogo Chico", time: "Today 2:00 PM", status: "due" },
    { id: "T-1046", title: "Laundry & ironing - Bonuan", time: "Tomorrow 9:00 AM", status: "scheduled" },
    { id: "T-1047", title: "Move-out clean - Downtown", time: "Thu 1:30 PM", status: "new" },
  ];

  const requests = [
    { id: "REQ-8721", customer: "Maria D.", location: "Bacayao Norte", service: "Housecleaning", payout: "₱1,200", status: "pending" },
    { id: "REQ-8722", customer: "John P.", location: "Calmay", service: "Deep Cleaning", payout: "₱1,800", status: "pending" },
  ];

  const notifications = [
    { id: 1, title: "Schedule updated", body: "Saturday slot moved to 3:00 PM.", when: "5m ago" },
    { id: 2, title: "Payment reminder", body: "Payout for REQ-8620 releases tomorrow.", when: "1h ago" },
  ];

  const history = [
    { id: "H-441", job: "Housecleaning - Lucao", date: "Mar 05", hours: "3.0", payout: "₱950", status: "paid" },
    { id: "H-442", job: "Deep clean - Calasiao", date: "Mar 04", hours: "4.5", payout: "₱1,750", status: "pending" },
    { id: "H-443", job: "Laundry - Downtown", date: "Mar 03", hours: "2.0", payout: "₱600", status: "paid" },
  ];

  return (
    <div className="staff-shell neo">
      <div className="staff-topbar">
        <div className="brand">
          <img src={Logo} alt="Houseclean Logo" className="logo-img2" />
        </div>
        <nav className="top-links">
          <a href="#tasks">Dashboard</a>
          <a href="#requests">Requests</a>
          <a href="#calendar">Schedule</a>
          <a href="#history">History</a>
          <a href="#staff-settings">Profile</a>
        </nav>
        <div className="top-actions">
          <button className="icon-btn ghost" aria-label="Notifications" onClick={() => document.getElementById("staff-notifications")?.scrollIntoView({ behavior: "smooth" })}>
            <i className="fas fa-bell"></i>
          </button>
          <div className="avatar-menu">
            <button className="icon-btn menu" type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Staff menu">
              <i className="fas fa-ellipsis-v"></i>
            </button>
            {menuOpen && (
              <div className="staff-dropdown" onMouseLeave={() => setMenuOpen(false)}>
                <button type="button" onClick={() => { document.getElementById("staff-notifications")?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }}>
                  <i className="fas fa-bell"></i> Notifications
                </button>
                <button type="button" onClick={() => { document.getElementById("staff-settings")?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }}>
                  <i className="fas fa-cog"></i> Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const root = document.documentElement;
                    const next = !root.classList.contains("dark-mode");
                    root.classList.toggle("dark-mode", next);
                    localStorage.setItem("theme", next ? "dark" : "light");
                    setMenuOpen(false);
                  }}
                >
                  <i className="fas fa-moon"></i> Toggle dark mode
                </button>
                <button type="button" className="danger" onClick={() => (window.location.href = "/login")}>
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="staff-layout">
        <aside className="staff-sidebar">
          <h3 className="sidebar-title">Houseclean Staff</h3>
          <div className="sidebar-card">
            <p className="muted small">Project</p>
            <ul className="pill-list">
              <li className="pill active">All tasks</li>
              <li className="pill">Urgent today</li>
              <li className="pill">Pending requests</li>
              <li className="pill">Payment follow-up</li>
            </ul>
          </div>
          <div className="sidebar-card">
            <p className="muted small">Status</p>
            <ul className="pill-list">
              <li className="pill soft green">Confirmed</li>
              <li className="pill soft amber">Awaiting approval</li>
              <li className="pill soft blue">Training</li>
            </ul>
          </div>
        </aside>

        <main className="staff-main">
          <section className="panel card hero-strip">
            <div className="hero-content">
              <p className="eyebrow">Houseclean Staff</p>
              <h2>Your day, simplified</h2>
              <p className="muted">Accept, schedule, and secure payouts with privacy-first controls.</p>
              <div className="staff-hero-actions">
                <button className="btn primary">Clock in</button>
                <button className="btn ghost">Update availability</button>
              </div>
              <div className="hero-stats">
                <div>
                  <p className="mini-label">Today&apos;s tasks</p>
                  <h3>3</h3>
                </div>
                <div>
                  <p className="mini-label">Unread notices</p>
                  <h3>{notifications.length}</h3>
                </div>
                <div>
                  <p className="mini-label">Next payout</p>
                  <h3>Mar 10</h3>
                </div>
              </div>
            </div>
          </section>

          <section className="panel card list-board" id="tasks">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Tasks</p>
                <h4>Today & Upcoming</h4>
              </div>
              <button className="btn pill ghost">View full schedule</button>
            </div>
            <div className="board-items">
              {tasks.map((t) => (
                <div key={t.id} className={`board-row ${t.status}`}>
                  <div className="row-main">
                    <div className="avatar-pill">{t.id.slice(-2)}</div>
                    <div>
                      <strong>{t.title}</strong>
                      <p className="muted small">{t.time}</p>
                    </div>
                  </div>
                  <div className="row-meta">
                    <span className={`chip ${t.status}`}>{t.status}</span>
                    <button className="icon-btn ghost" aria-label="Open task">
                      <i className="fas fa-pen"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel card list-board" id="requests">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Requests</p>
                <h4>Accept / Decline</h4>
              </div>
              <span className="pill stat">Secure & role-verified</span>
            </div>
            <div className="board-items">
              {requests.map((r) => (
                <div key={r.id} className="board-row pending">
                  <div className="row-main">
                    <div className="avatar-pill alt">{r.customer.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <strong>{r.service}</strong>
                      <p className="muted small">
                        {r.customer} • {r.location}
                      </p>
                    </div>
                  </div>
                  <div className="row-meta actions">
                    <span className="payout">{r.payout}</span>
                    <button className="icon-btn ghost danger" aria-label="Decline">
                      <i className="fas fa-times"></i>
                    </button>
                    <button className="icon-btn ghost" aria-label="Accept">
                      <i className="fas fa-check"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel card calendar-card" id="calendar">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Schedule & Payments</p>
                <h4>Color-coded calendar</h4>
              </div>
              <button className="btn pill ghost">Add event</button>
            </div>
            <div className="calendar-placeholder">
              <div className="legend">
                <span className="dot green"></span> Confirmed jobs
                <span className="dot amber"></span> Payment reminders
                <span className="dot blue"></span> Training/meetings
              </div>
              <div className="mini-calendar">Calendar placeholder</div>
            </div>
          </section>

          <section className="panel card" id="history">
            <div className="panel-header">
              <div>
                <p className="eyebrow">History & Attendance</p>
                <h4>Log & Export</h4>
              </div>
              <button className="btn pill ghost">Export CSV</button>
            </div>
            <div className="history-table">
              <div className="history-head">
                <span>Job</span>
                <span>Date</span>
                <span>Hours</span>
                <span>Payout</span>
                <span>Status</span>
              </div>
              {history.map((h) => (
                <div key={h.id} className="history-row">
                  <span>{h.job}</span>
                  <span>{h.date}</span>
                  <span>{h.hours}</span>
                  <span>{h.payout}</span>
                  <span className={`chip ${h.status}`}>{h.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel card notifications" id="staff-notifications">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Notifications</p>
                <h4>Latest</h4>
              </div>
              <button className="btn pill ghost">Mark all read</button>
            </div>
            <div className="notification-list">
              {notifications.map((n) => (
                <div key={n.id} className="notification-item unread fade-in">
                  <div className="notification-top">
                    <span className="notification-title">{n.title}</span>
                    <span className="muted tiny">{n.when}</span>
                  </div>
                  <p className="notification-body">{n.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel card settings-card" id="staff-settings">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Account & Security</p>
                <h4>Profile</h4>
              </div>
              <span className="pill stat">Admin monitored</span>
            </div>
            <div className="settings-grid-lite">
              <label>
                Display name
                <input type="text" placeholder="Arly Baldonasa" />
              </label>
              <label>
                Email
                <input type="email" placeholder="arly@email.com" />
              </label>
              <label>
                Phone
                <input type="text" placeholder="09•••••••••" />
              </label>
              <label>
                Password
                <input type="password" placeholder="••••••••" />
              </label>
              <label className="full">
                Two-factor authentication
                <div className="switch-row">
                  <span>Enable OTP</span>
                  <input type="checkbox" />
                </div>
              </label>
            </div>
            <div className="settings-actions">
              <button className="btn pill ghost">Reset</button>
              <button className="btn pill primary">Save changes</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Staff;
