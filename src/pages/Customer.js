import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Customer.css";
import Logo from "../components/Logo.png";
import { auth, rtdb } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref, serverTimestamp, push } from "firebase/database";
import BroomLoader from "../components/BroomLoader";

function Customer() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    location: "",
    service: "",
    time: "",
    payout: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState("");
  const [error, setError] = useState("");
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!menuOpen) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [menuOpen]);

  // Apply saved theme immediately
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("theme");
    const root = document.documentElement;
    if (saved === "dark") root.classList.add("dark-mode");
    else if (saved === "light") root.classList.remove("dark-mode");
  }

  useEffect(() => {
    let stopProfile;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setProfileLoading(true);
      if (stopProfile) {
        stopProfile();
        stopProfile = undefined;
      }
      if (!user) {
        setAuthUser(null);
        setProfile(null);
        setProfileLoading(false);
        navigate("/login", { replace: true });
        return;
      }
      setAuthUser(user);
      const userRef = ref(rtdb, `Users/${user.uid}`);
      stopProfile = onValue(
        userRef,
        (snap) => {
          const data = snap.val();
          if (data) {
            setProfile({ id: user.uid, email: user.email, ...data });
          } else {
            setProfile({ id: user.uid, email: user.email });
          }
          setProfileLoading(false);
        },
        () => {
          setProfile({ id: user.uid, email: user.email });
          setProfileLoading(false);
        }
      );
    });

    return () => {
      if (stopProfile) stopProfile();
      unsubscribeAuth();
    };
  }, [navigate]);

  const role = String(profile?.role || "").trim().toLowerCase();
  const isHouseholderRole = ["householder", "customer", "user"].includes(role);

  useEffect(() => {
    if (profileLoading) return;
    if (!authUser) return;
    if (!role) return;

    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "housekeeper" || role === "staff") navigate("/staff", { replace: true });
    else if (!isHouseholderRole) navigate("/", { replace: true });
  }, [authUser, isHouseholderRole, navigate, profileLoading, role]);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) return;

    const fullName =
      (profile.fullName || `${profile.firstName || ""} ${profile.lastName || ""}`)
        .replace(/\s+/g, " ")
        .trim();
    const location =
      (profile.location ||
        [profile.barangay, profile.municipality, profile.province]
          .filter(Boolean)
          .join(", ")).trim();

    setForm((prev) => ({
      ...prev,
      name: prev.name || fullName,
      location: prev.location || location
    }));
  }, [profile, profileLoading]);

  
  const normalizeRoleLabel = (raw) => {
    const value = String(raw || "").trim().toLowerCase();
    if (!value) return "Householder";
    if (["householder", "customer", "user"].includes(value)) return "Householder";
    if (value === "staff") return "Staff";
    if (value === "housekeeper") return "Housekeeper";
    if (value === "admin") return "Admin";
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  };

  const displayName =
    (
      authUser?.displayName ||
      profile?.fullName ||
      profile?.name ||
      `${profile?.firstName || ""} ${profile?.lastName || ""}` ||
      profile?.email ||
      authUser?.email ||
      "Householder"
    )
      .replace(/\s+/g, " ")
      .trim();

  const firstNameDisplay = (() => {
    const direct = String(profile?.firstName || "").trim();
    if (direct) return direct;
    const full = String(displayName || "").trim();
    if (!full) return "";
    return full.split(" ").filter(Boolean)[0] || full;
  })();

  const status = String(profile?.status || "active").toLowerCase();
  const statusClass =
    status === "active" ? "active" : status === "disabled" ? "disabled" : "pending";
  const roleLabel = profileLoading ? "Connecting..." : normalizeRoleLabel(profile?.role);
  const showGuest = !profile && !profileLoading;

  const createAvatarDataUri = (seed) => {
    const text = String(seed || "HU").trim() || "HU";
    const safe = text.slice(0, 2).toUpperCase();
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    const hue = hash % 360;
    const bg = `hsl(${hue} 72% 42%)`;
    const fg = "#ffffff";
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
      `<rect width="96" height="96" rx="18" fill="${bg}"/>` +
      `<text x="48" y="54" text-anchor="middle" font-family="system-ui,Segoe UI,Arial" font-size="34" font-weight="800" fill="${fg}">${safe}</text>` +
      `</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const avatarUrl =
    profile?.photoURL ||
    profile?.avatar ||
    profile?.image ||
    authUser?.photoURL ||
    createAvatarDataUri(displayName);

  const contactLine = (profile?.phone || profile?.contact || "").trim();
  const addressLine = [
    profile?.address,
    profile?.barangay,
    profile?.municipality,
    profile?.province
  ]
    .filter(Boolean)
    .join(", ")
    .trim();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authUser) {
      setError("Please sign in to submit a request.");
      return;
    }
    if (!profileLoading && role && !isHouseholderRole) {
      setError("This account does not have householder access.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSubmittedId("");
    try {
      const requestsRef = ref(rtdb, "Requests");
      const payload = {
        customerId: authUser.uid,
        customerEmail: authUser.email || profile?.email || "",
        customer: form.name,
        location: form.location,
        service: form.service,
        preferredTime: form.time,
        payout: form.payout,
        notes: form.notes,
        status: "pending",
        createdAt: serverTimestamp()
      };
      const newReq = await push(requestsRef, payload);
      setSubmittedId(newReq.key || "");
      setForm({ name: "", location: "", service: "", time: "", payout: "", notes: "" });
    } catch (err) {
      setError("Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const notifications = [
    { id: 1, title: "Booking received", body: "Your latest request is pending staff review.", when: "5m ago" },
    { id: 2, title: "Payment reminder", body: "Settle bill for REQ-8620 before Friday to confirm slot.", when: "1h ago" },
    { id: 3, title: "Role verified", body: "Your account is role-verified for customer access.", when: "Today" }
  ];

  const history = [
    { id: "C-441", job: "Housecleaning - Lucao", date: "Mar 05", hours: "3.0", payout: "PHP 950", status: "Paid" },
    { id: "C-442", job: "Deep clean - Calasiao", date: "Mar 04", hours: "4.5", payout: "PHP 1,750", status: "Pending" },
    { id: "C-443", job: "Laundry - Downtown", date: "Mar 03", hours: "2.0", payout: "PHP 600", status: "Paid" }
  ];

  return (
    <div className="customer-shell neo">
      {profileLoading && (
        <BroomLoader message="Sweeping your workspace..." fullscreen />
      )}
      <div className="staff-topbar">
          <img src={Logo} alt="Houseclean Logo"/>
        <nav className="top-links">
        </nav>
        <div className="top-actions">
          <button
            className="icon-btn ghost"
            aria-label="Notifications"
            onClick={() => document.getElementById("notifications")?.scrollIntoView({ behavior: "smooth" })}
          >
            <i className="fas fa-bell"></i>
          </button>
          <div
            className="mini-profile-wrapper"
            ref={popoverRef}
          >
            <button
              type="button"
              className={`staff-mini-profile ${showGuest ? "guest" : ""}`}
              title={profile?.email || authUser?.email || "Not signed in"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <div className="avatar-badge">
                {showGuest ? "CU" : <img src={avatarUrl} alt={displayName} />}
              </div>
              <div className="mini-profile-meta">
                <strong>{profileLoading ? "Loading..." : showGuest ? "Guest" : (firstNameDisplay || displayName)}</strong>
                <span className="role-line">
                  <span className={`status-dot ${showGuest ? "pending" : statusClass}`}></span>
                  {showGuest ? "Preview mode" : roleLabel}
                </span>
              </div>
              {showGuest && (
                <div className="guest-actions">
                  <a className="guest-link" href="/login">Sign in</a>
                  <a className="guest-link" href="/register">Create account</a>
                </div>
              )}
            </button>
            {menuOpen && (
              <div className="staff-profile-popover">
                <div className="popover-header">
                  <div className="avatar-hero">
                    <div className="hero-avatar">
                      <img src={avatarUrl} alt={displayName} />
                      <span className={`dot-overlay ${showGuest ? "pending" : statusClass}`}></span>
                    </div>
                    <div>
                      <h4>{profileLoading ? "Loading..." : showGuest ? "Guest" : (firstNameDisplay || displayName)}</h4>
                      <p className="role">{showGuest ? "Preview mode" : roleLabel}</p>
                      {!showGuest && <p className="muted small">{addressLine || profile?.location || profile?.email}</p>}
                    </div>
                  </div>
                </div>
                <div className="popover-body">
                  <div className="info-line">
                    <i className="fas fa-envelope"></i>
                    <span>{profile?.email || authUser?.email || "signin@houseclean.app"}</span>
                  </div>
                  <div className="info-line">
                    <i className="fas fa-phone"></i>
                    <span>{contactLine || "+63 *** *** ****"}</span>
                  </div>
                  <div className="info-line">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{addressLine || profile?.location || "Dagupan City"}</span>
                  </div>
                </div>
                <div className="popover-actions">
                  {showGuest ? (
                    <>
                      <a className="btn primary block" href="/login">Sign in</a>
                      <a className="btn ghost block" href="/register">Create account</a>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn primary block"
                        type="button"
                        onClick={() => {
                          document.getElementById("staff-settings")?.scrollIntoView({ behavior: "smooth" });
                          setMenuOpen(false);
                        }}
                      >
                        View profile
                      </button>
                      <div className="chip-actions">
                        <button
                          className="icon-chip"
                          type="button"
                          aria-label="Settings"
                          onClick={() => {
                            document.getElementById("staff-settings")?.scrollIntoView({ behavior: "smooth" });
                            setMenuOpen(false);
                          }}
                        >
                          <i className="fas fa-cog"></i>
                        </button>
                        <button
                          className="icon-chip"
                          type="button"
                          aria-label="Toggle dark mode"
                          onClick={() => {
                            const root = document.documentElement;
                            const next = !root.classList.contains("dark-mode");
                            root.classList.toggle("dark-mode", next);
                            localStorage.setItem("theme", next ? "dark" : "light");
                            setMenuOpen(false);
                          }}
                        >
                          <i className="fas fa-moon"></i>
                        </button>
                        <button
                          className="icon-chip danger"
                          type="button"
                          aria-label="Logout"
                          onClick={() => {
                            window.location.href = "/login";
                          }}
                        >
                          <i className="fas fa-sign-out-alt"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* <header className="topbar">
        <button className="icon-btn ghost mobile-only" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle sidebar">
          <i className="fas fa-bars"></i>
        </button>
        <div className="brand">
          <img src={Logo} alt="Houseclean Logo" className="logo-img2" />
        </div>
        <div className="top-actions">
          <button className="icon-btn ghost" aria-label="Notifications">
            <i className="fas fa-bell"></i>
            <span className="badge">3</span>
          </button>
          <div className="mini-profile-wrapper" ref={popoverRef}>
            <button
              type="button"
              className={`staff-mini-profile ${showGuest ? "guest" : ""}`}
              title={profile?.email || "Not signed in"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <div className="avatar-badge">
                {showGuest ? (
                  "CU"
                ) : (
                  <img src={avatarUrl} alt={displayName} />
                )}
              </div>
              <div className="mini-profile-meta">
                <strong>{profileLoading ? "Loading..." : showGuest ? "Guest" : (firstNameDisplay || displayName)}</strong>
                <span className="role-line">
                  <span className={`status-dot ${showGuest ? "pending" : statusClass}`}></span>
                  {showGuest ? "Preview mode" : roleLabel}
                </span>
              </div>
              {showGuest && (
                <div className="guest-actions">
                  <a className="guest-link" href="/login">Sign in</a>
                  <a className="guest-link" href="/register">Create account</a>
                </div>
              )}
            </button>
            {menuOpen && (
              <div className="staff-profile-popover">
                <div className="popover-header">
                  <div className="avatar-hero">
                    <div className="hero-avatar">
                      <img src={avatarUrl} alt={displayName} />
                      <span className={`dot-overlay ${showGuest ? "pending" : statusClass}`}></span>
                    </div>
                    <div>
                      <h4>{profileLoading ? "Loading..." : showGuest ? "Guest" : (firstNameDisplay || displayName)}</h4>
                      <p className="role">{showGuest ? "Preview mode" : roleLabel}</p>
                      {!showGuest && <p className="muted small">{profile?.barangay || profile?.location || profile?.email}</p>}
                    </div>
                  </div>
                </div>
                <div className="popover-body">
                  <div className="info-line">
                    <i className="fas fa-envelope"></i>
                    <span>{profile?.email || authUser?.email || "signin@houseclean.app"}</span>
                  </div>
                  <div className="info-line">
                    <i className="fas fa-phone"></i>
                    <span>{contactLine || "+63 *** *** ****"}</span>
                  </div>
                  <div className="info-line">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{addressLine || profile?.location || "Dagupan City"}</span>
                  </div>
                </div>
                <div className="popover-actions">
                  {showGuest ? (
                    <>
                      <a className="btn primary block" href="/login">Sign in</a>
                      <a className="btn ghost block" href="/register">Create account</a>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn primary block"
                        type="button"
                        onClick={() => {
                          document.getElementById("profile")?.scrollIntoView({ behavior: "smooth" });
                          setMenuOpen(false);
                        }}
                      >
                        View profile
                      </button>
                      <div className="chip-actions">
                        <button
                          className="icon-chip"
                          type="button"
                          aria-label="Settings"
                          onClick={() => {
                            document.getElementById("settings")?.scrollIntoView({ behavior: "smooth" });
                            setMenuOpen(false);
                          }}
                        >
                          <i className="fas fa-cog"></i>
                        </button>
                        <button
                          className="icon-chip"
                          type="button"
                          aria-label="Toggle dark mode"
                          onClick={() => {
                            const root = document.documentElement;
                            const next = !root.classList.contains("dark-mode");
                            root.classList.toggle("dark-mode", next);
                            localStorage.setItem("theme", next ? "dark" : "light");
                            setMenuOpen(false);
                          }}
                        >
                          <i className="fas fa-moon"></i>
                        </button>
                        <button
                          className="icon-chip danger"
                          type="button"
                          aria-label="Logout"
                          onClick={() => {
                            window.location.href = "/login";
                          }}
                        >
                          <i className="fas fa-sign-out-alt"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header> */}

      <div className="layout">
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <nav>
            <a href="#dashboard" className="active"><i className="fas fa-th-large"></i> Dashboard</a>
            <a href="#request"><i className="fas fa-broom"></i> Cleaning Requests</a>
            <a href="#calendar"><i className="fas fa-calendar-alt"></i> Schedule</a>
            <a href="#payments"><i className="fas fa-wallet"></i> Payments & Billing</a>
            <a href="#history"><i className="fas fa-history"></i> History</a>
            <a href="#settings"><i className="fas fa-cog"></i> Settings</a>
          </nav>
        </aside>

        <main className="main">
          <section className="panel card hero" id="dashboard">
            <div>
              <p className="eyebrow">Welcome back</p>
              <h1>Manage your cleans, payments, and schedule in one view.</h1>
              <p className="muted">
                Secure, role-verified customer workspace synced with staff operations.
              </p>
              <div className="quick-actions">
                <Link className="btn primary" to="#request"><i className="fas fa-plus-circle"></i> Request Cleaning</Link>
                <Link className="btn ghost" to="#payments"><i className="fas fa-wallet"></i> Pay Bill</Link>
                <Link className="btn ghost" to="#calendar"><i className="fas fa-calendar-alt"></i> View Schedule</Link>
              </div>
            </div>
          </section>

          <div className="grid-2">
            <section className="panel card profile-card" id="profile">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Profile</p>
                  <h3>Householder</h3>
                </div>
                <span className="pill stat">Role-verified</span>
              </div>
              <div className="profile-meta-grid">
                <div>
                  <p className="mini-label">Name</p>
                  <strong>{profileLoading ? "Loading..." : (displayName || "—")}</strong>
                </div>
                <div>
                  <p className="mini-label">Address</p>
                  <strong>{profileLoading ? "Loading..." : (addressLine || profile?.location || "—")}</strong>
                </div>
                <div>
                  <p className="mini-label">Contact</p>
                  <strong>{profileLoading ? "Loading..." : (contactLine || "—")}</strong>
                </div>
                <div>
                  <p className="mini-label">Email</p>
                  <strong>{profileLoading ? "Loading..." : (profile?.email || authUser?.email || "—")}</strong>
                </div>
              </div>
              <div className="profile-actions">
                <button className="btn pill ghost" type="button">Edit profile</button>
                <button className="btn pill primary" type="button">Account security</button>
              </div>
            </section>

            <section className="panel card payments-card" id="payments">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Payments</p>
                  <h3>Billing status</h3>
                </div>
                <span className="pill soft amber">Secure checkout</span>
              </div>
              <div className="payment-grid compact">
                <div className="pay-card">
                  <p className="mini-label">Outstanding</p>
                  <h3>PHP 1,750</h3>
                  <p className="muted small">Due Friday for REQ-8620</p>
                  <button className="btn pill primary small">Pay now</button>
                </div>
                <div className="pay-card">
                  <p className="mini-label">Receipts</p>
                  <h3>Download</h3>
                  <p className="muted small">View recent invoices</p>
                  <button className="btn pill ghost small">View receipts</button>
                </div>
                <div className="pay-card">
                  <p className="mini-label">Methods</p>
                  <h3>GCash •••• 8123</h3>
                  <p className="muted small">Role-protected</p>
                  <button className="btn pill ghost small">Manage methods</button>
                </div>
              </div>
            </section>
          </div>

          <div className="grid-2">
            <section className="panel card calendar" id="calendar">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Schedule</p>
                  <h3>Upcoming appointments</h3>
                </div>
                <span className="pill soft green">Staff synced</span>
              </div>
              <div className="calendar-body">
                <div className="legend">
                  <span className="dot green"></span> Confirmed visits
                  <span className="dot amber"></span> Payment reminders
                  <span className="dot blue"></span> Requests pending
                </div>
                <div className="calendar-placeholder">Interactive calendar placeholder</div>
              </div>
            </section>

            <section className="panel card" id="request">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Cleaning Requests</p>
                  <h3>Create a booking</h3>
                </div>
                <span className="pill soft blue">Syncs to Staff</span>
              </div>
              <form className="request-form" onSubmit={handleSubmit}>
                <label>
                  Your name
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Maria D." required />
                </label>
                <label>
                  Location / Barangay
                  <input name="location" value={form.location} onChange={handleChange} placeholder="Bacayao Norte" required />
                </label>
                <label>
                  Service type
                  <input name="service" value={form.service} onChange={handleChange} placeholder="Deep cleaning" required />
                </label>
                <label>
                  Preferred time / date
                  <input name="time" value={form.time} onChange={handleChange} placeholder="Tomorrow 9:00 AM" />
                </label>
                <label>
                  Payout offer (optional)
                  <input name="payout" value={form.payout} onChange={handleChange} placeholder="PHP 1,800" />
                </label>
                <label className="full">
                  Notes
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Gate code, parking, pets, surfaces to avoid..."
                    rows={3}
                  />
                </label>
                <div className="request-actions">
                  <button
                    className="btn pill ghost"
                    type="button"
                    onClick={() => setForm({ name: "", location: "", service: "", time: "", payout: "", notes: "" })}
                  >
                    Clear
                  </button>
                  <button className="btn pill primary" type="submit" disabled={submitting}>
                    {submitting ? "Sending..." : "Submit request"}
                  </button>
                </div>
                {submittedId && (
                  <p className="success-note">
                    Sent! Request ID {submittedId.slice(-6)} is now visible in the Staff Requests board.
                  </p>
                )}
                {error && <p className="error-note">{error}</p>}
              </form>
            </section>
          </div>

          <div className="grid-2">
            <section className="panel card history" id="history">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">History</p>
                  <h3>Past services</h3>
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
                    <span className={`chip ${h.status.toLowerCase()}`}>{h.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>

        <aside className="right-rail">
          <section className="panel card">
            <p className="eyebrow">Next cleaning</p>
            <h3>Thu • 2:00 PM</h3>
            <p className="muted small">Bonuan - Deep clean</p>
            <button className="btn pill ghost small">View details</button>
          </section>

          <section className="panel card">
            <p className="eyebrow">Pending payment</p>
            <h3>PHP 1,750</h3>
            <p className="muted small">Due in 2 days</p>
            <button className="btn pill primary small">Quick pay</button>
          </section>

          <section className="panel card notifications" id="notifications">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Notifications</p>
                <h4>Recent</h4>
              </div>
              <button className="btn pill ghost small">Mark all read</button>
            </div>
            <div className="notification-list">
              {notifications.map((n) => (
                <div key={n.id} className="notification-item">
                  <div className="notification-top">
                    <span className="notification-title">{n.title}</span>
                    <span className="muted tiny">{n.when}</span>
                  </div>
                  <p className="notification-body">{n.body}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Customer;
