import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Customer.css";
import Logo from "../../components/Logo.png";
import { auth, rtdb } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  equalTo,
  onValue,
  orderByChild,
  query as rtdbQuery,
  ref as rtdbRef
} from "firebase/database";
import BroomLoader from "../../components/BroomLoader";
import CustomerSidebar from "./CustomerSidebar";
import CustomerHeader from "./CustomerHeader";
import { getCustomerSidebarItems } from "./customerNav";

function Customer() {
  const sidebarOpen = false;
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const location = useLocation();
  const [myRequests, setMyRequests] = useState([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notifSeenAt, setNotifSeenAt] = useState(0);
  const navigate = useNavigate();
  const basePath = String(location?.pathname || "").startsWith("/householder") ? "/householder" : "/customer";
  const latestNotifAt = Number(notifications?.[0]?.createdAt || 0) || 0;

  useEffect(() => {
    if (!authUser?.uid) {
      setNotifSeenAt(0);
      return;
    }
    const key = `hc_notif_seen_${authUser.uid}`;
    const raw = localStorage.getItem(key);
    const seen = Number(raw || 0) || 0;
    setNotifSeenAt(seen);
  }, [authUser?.uid]);

  const showNotificationPing = latestNotifAt > 0 && latestNotifAt > (Number(notifSeenAt) || 0);
  const markNotificationsSeen = () => {
    if (!authUser?.uid) return;
    const key = `hc_notif_seen_${authUser.uid}`;
    const now = latestNotifAt > 0 ? latestNotifAt : Date.now();
    localStorage.setItem(key, String(now));
    setNotifSeenAt(now);
  };

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
      const userRef = rtdbRef(rtdb, `Users/${user.uid}`);
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


  useEffect(() => {
    if (!authUser?.uid) {
      setMyRequests([]);
      setMyRequestsLoading(false);
      return;
    }

    setMyRequestsLoading(true);
    const q = rtdbQuery(
      rtdbRef(rtdb, "ServiceRequests"),
      orderByChild("householderId"),
      equalTo(authUser.uid)
    );

    const stop = onValue(
      q,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, data]) => ({
          id,
          requestId: data?.requestId || id,
          ...(data || {})
        }));
        list.sort((a, b) => {
          const aMs = Number(a.createdAt ?? a.timestamp ?? 0) || 0;
          const bMs = Number(b.createdAt ?? b.timestamp ?? 0) || 0;
          return bMs - aMs;
        });
        setMyRequests(list);
        setMyRequestsLoading(false);
      },
      () => setMyRequestsLoading(false)
    );

    return () => stop();
  }, [authUser?.uid]);

  useEffect(() => {
    if (!authUser?.uid) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    const notifRef = rtdbRef(rtdb, `UserNotifications/${authUser.uid}`);
    const stop = onValue(
      notifRef,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, data]) => ({
          id,
          ...(data || {}),
          createdAt: data?.createdAt || 0
        }));
        list.sort((a, b) => (Number(b.createdAt || 0) || 0) - (Number(a.createdAt || 0) || 0));
        setNotifications(list.slice(0, 25));
        setNotificationsLoading(false);
      },
      () => setNotificationsLoading(false)
    );

    return () => stop();
  }, [authUser?.uid]);

  const parseMoney = (value) => {
    const cleaned = String(value || "").replace(/[^\d.]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  const formatWhen = (value) => {
    if (value == null) return "";
    if (typeof value?.toDate === "function") return value.toDate().toLocaleString();
    const ms = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(ms) || ms <= 0) return "";
    return new Date(ms).toLocaleString();
  };

  const history = (myRequests || []).map((r) => {
    const hours = r.durationHours ?? r.hours ?? null;
    const statusText = String(r.status || "PENDING").toUpperCase();
    const startDate = r.startDate || r.preferredTime || "";
    const serviceType = r.serviceType || r.service || "Service";
    const location = r.location || "";
    const totalPriceValue = r.totalPrice ?? parseMoney(r.payout);
    const payoutLabel =
      typeof totalPriceValue === "number" && Number.isFinite(totalPriceValue) && totalPriceValue > 0
        ? `PHP ${Math.round(totalPriceValue).toLocaleString()}`
        : r.payout || "PHP --";
    const photos = Array.isArray(r.photos)
      ? r.photos
      : Array.isArray(r.images)
        ? r.images
        : Array.isArray(r.pictures)
          ? r.pictures
          : [];

    return {
      id: r.requestId || r.id,
      job: location ? `${serviceType} - ${location}` : serviceType,
      date: startDate,
      hours: hours == null ? "--" : String(hours),
      payout: payoutLabel,
      status: statusText,
      photos
    };
  });

  return (
    <div className="customer-shell neo">
      {profileLoading && (
        <BroomLoader message="Sweeping your workspace..." fullscreen />
      )}
      <CustomerHeader
        logoSrc={Logo}
        avatarUrl={avatarUrl}
        displayName={displayName}
        firstNameDisplay={firstNameDisplay}
        roleLabel={roleLabel}
        statusClass={statusClass}
        showGuest={showGuest}
        email={profile?.email || authUser?.email || ""}
        phone={contactLine}
        location={addressLine || profile?.location || ""}
        metaLine={addressLine || profile?.location || profile?.email || authUser?.email || ""}
        basePath={basePath}
        showNotificationPing={showNotificationPing}
        onNotificationsOpen={markNotificationsSeen}
      />

      <div className="layout">
        <CustomerSidebar
          open={sidebarOpen}
          items={getCustomerSidebarItems(basePath)}
        />

        <main className="main">
          <section className="panel card hero" id="dashboard">
            <div>
              <p className="eyebrow">Welcome back</p>
              <h1>Stay Organized with HOUSECLEAN</h1>
              <p className="muted">
                Choose your service, set the time, and we'll handle the rest.
              </p>
              <div className="quick-actions">
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => navigate(`${basePath}/requests`, { state: { openBooking: true } })}
                >
                  <i className="fas fa-plus-circle"></i> Request Cleaning
                </button>
                <Link className="btn ghost" to={`${basePath}/payments`}><i className="fas fa-wallet"></i> Pay Cleaning</Link>
                <Link className="btn ghost" to={`${basePath}/requests`}><i className="fas fa-list-check"></i> View All Requests</Link>
              </div>
            </div>
          </section>
          <div className="grid-2">
            <section className="panel card payments-card" id="payments">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Payments</p>
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
                {myRequestsLoading ? (
                  <div className="history-empty muted small">Loading your requests...</div>
                ) : history.length === 0 ? (
                  <div className="history-empty muted small">No requests yet. Submit one above to sync with staff.</div>
                ) : (
                  history.map((h) => (
                    <div key={h.id} className="history-row"> 
                      <span className="job-cell">
                        <span className="job-title">{h.job}</span>
                        {Array.isArray(h.photos) && h.photos.length > 0 && (
                          <span className="history-photos" aria-label="Request photos">
                            {h.photos.slice(0, 3).map((u) => (
                              <img key={u} src={u} alt="Request" loading="lazy" />
                            ))}
                          </span>
                        )}
                      </span>
                      <span>{h.date}</span> 
                      <span>{h.hours}</span> 
                      <span>{h.payout}</span> 
                      <span className={`chip ${h.status.toLowerCase()}`}>{h.status}</span> 
                    </div> 
                  ))
                )}
              </div> 
            </section> 
          </div> 

          {false && (
          <div className="grid-2">
            <section className="panel card profile-card" id="settings">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Settings</p>
                  <h3>Profile</h3>
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

            <section className="panel card settings-card">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Security</p>
                  <h3>Account security</h3>
                </div>
                <span className="pill soft green">Protected</span>
              </div>
              <div className="settings-grid-lite">
                <label>
                  Email
                  <input type="email" value={profile?.email || authUser?.email || ""} readOnly />
                </label>
                <label>
                  Phone
                  <input type="text" value={contactLine || ""} readOnly />
                </label>
                <label className="full">
                  Password
                  <input type="password" placeholder="••••••••••••" readOnly />
                </label>
                <label className="full">
                  Two-factor authentication
                  <div className="switch-row">
                    <span>Enable OTP</span>
                    <input type="checkbox" disabled />
                  </div>
                </label>
              </div>
            </section>
          </div>
          )}
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
              {notificationsLoading ? (
                <div className="notification-item">
                  <p className="muted small">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notification-item">
                  <p className="muted small">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="notification-item">
                    <div className="notification-top">
                      <span className="notification-title">{n.title || "Update"}</span>
                      <span className="muted tiny">{formatWhen(n.createdAt) || "Just now"}</span>
                    </div>
                    <p className="notification-body">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Customer;
