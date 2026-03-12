import React, { useEffect, useMemo, useRef, useState } from "react";
import Logo from "../components/Logo.png";
import "./Staff.css";
import { auth, rtdb } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  equalTo,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref as rtdbRef,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate
} from "firebase/database";
import BroomLoader from "../components/BroomLoader";

function Staff() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [paymentMethodByRequestId, setPaymentMethodByRequestId] = useState({});
  const popoverRef = useRef(null);

  // Apply saved theme immediately to avoid flash on loader
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
        setProfile(null);
        setProfileLoading(false);
        return;
      }
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
  }, []);

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

  const displayName =
    (profile?.fullName || profile?.name || profile?.email || "Staff guest").trim();
  const initials = (displayName || "ST").slice(0, 2).toUpperCase();
  const status = (profile?.status || "pending").toLowerCase();
  const statusClass =
    status === "active" ? "active" : status === "disabled" ? "disabled" : "pending";
  const roleLabel = profileLoading ? "Connecting..." : profile?.role || "Housekeeper";
  const isStaffRole = ["housekeeper", "staff"].includes((profile?.role || "").toLowerCase());
  const myRole = String(profile?.role || "").toLowerCase();
  const isStaffManager = myRole === "staff";
  const isHousekeeper = myRole === "housekeeper";
  const avatarUrl = profile?.photoURL || profile?.avatar || profile?.image;
  const showGuest = !profile && !profileLoading;
  const clockedInRaw = profile?.clockedIn ?? profile?.clockIn ?? profile?.isClockedIn ?? profile?.clocked_in ?? null;
  const clockedInFlag =
    clockedInRaw === true || clockedInRaw === "true" || clockedInRaw === 1 || clockedInRaw === "1";
  const timeIn = profile?.timeIn ?? profile?.time_in ?? profile?.clockInAt ?? null;
  const timeOut = profile?.timeOut ?? profile?.time_out ?? profile?.clockOutAt ?? null;
  const hasTimeIn = timeIn != null && String(timeIn).trim() !== "";
  const hasTimeOut = timeOut != null && String(timeOut).trim() !== "";
  const isClockedIn = clockedInFlag || (hasTimeIn && !hasTimeOut);

  const toggleClockIn = async () => {
    if (showGuest || !isStaffRole) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const userRef = rtdbRef(rtdb, `Users/${uid}`);
    if (isClockedIn) {
      await rtdbUpdate(userRef, { clockedIn: false, timeOut: rtdbServerTimestamp() });
    } else {
      await rtdbUpdate(userRef, { clockedIn: true, timeIn: rtdbServerTimestamp(), timeOut: null });
    }
  };

  const sendNotification = async ({ toUserId, title, body, requestId }) => {
    if (!toUserId) return;
    const listRef = rtdbRef(rtdb, `UserNotifications/${String(toUserId)}`);
    const notifRef = push(listRef);
    await rtdbSet(notifRef, {
      title: String(title || "Update"),
      body: String(body || ""),
      requestId: String(requestId || ""),
      createdAt: rtdbServerTimestamp(),
      read: false,
      source: "web"
    });
  };

  // Ensure saved theme applies on this route (no FloatingThemeToggle here)
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const root = document.documentElement;
    if (saved === "dark") root.classList.add("dark-mode");
    if (saved === "light") root.classList.remove("dark-mode");
  }, []); 
 
  // Live Requests feed from RTDB
  useEffect(() => {
    if (profileLoading) return;
    setRequestsLoading(true);

    const myId = profile?.id || auth.currentUser?.uid || "";
    const myRoleLocal = String(profile?.role || "").trim().toLowerCase();
    const isStaffLocal = ["housekeeper", "staff"].includes(myRoleLocal);

    if (!isStaffLocal || !myId) {
      setRequests([]);
      setRequestsLoading(false);
      return;
    }

    const q =
      myRoleLocal === "housekeeper"
        ? rtdbQuery(rtdbRef(rtdb, "ServiceRequests"), orderByChild("housekeeperId"), equalTo(myId))
        : rtdbQuery(rtdbRef(rtdb, "ServiceRequests"), orderByChild("createdAt"));
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
        setRequests(list);
        setRequestsLoading(false);
      },
      () => setRequestsLoading(false)
    );
    return () => stop();
  }, [profile?.id, profile?.role, profileLoading]);

  useEffect(() => {
    const uid = auth.currentUser?.uid || profile?.id || "";
    if (!uid) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    const notifRef = rtdbRef(rtdb, `UserNotifications/${uid}`);
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
  }, [profile?.id]);
 
  const tasks = useMemo(() => { 
    return (requests || []) 
      .filter((r) => ["accepted", "scheduled"].includes(String(r.status || "").toLowerCase())) 
      .map((r) => ({ 
        id: r.id, 
        title: `${r.serviceType || r.service || "Service"} - ${r.location || "Location"}`, 
        time: r.startDate || r.preferredTime || "Scheduled", 
        status: String(r.status || "scheduled").toLowerCase() 
      })); 
  }, [requests]); 

  const history = [
    { id: "H-441", job: "Housecleaning - Lucao", date: "Mar 05", hours: "3.0", payout: "PHP 950", status: "paid" },
    { id: "H-442", job: "Deep clean - Calasiao", date: "Mar 04", hours: "4.5", payout: "PHP 1,750", status: "pending" },
    { id: "H-443", job: "Laundry - Downtown", date: "Mar 03", hours: "2.0", payout: "PHP 600", status: "paid" },
  ];

  const handleRequestAction = async (req, statusValue) => { 
    const id = req?.id;
    if (!id) return; 
    const statusUpper = String(statusValue || "PENDING").toUpperCase();
    const payload = {
      status: statusUpper,
      updatedAt: rtdbServerTimestamp()
    };

    if (statusUpper === "CONFIRMED") {
      payload.confirmedAt = rtdbServerTimestamp();
      payload.confirmedById = profile?.id || auth.currentUser?.uid || "";
      payload.confirmedByName = displayName;
    } else if (statusUpper === "ACCEPTED") {
      payload.acceptedAt = rtdbServerTimestamp();
      payload.housekeeperId = profile?.id || auth.currentUser?.uid || "";
      payload.housekeeperName = displayName;
      payload.housekeeperRole = String(profile?.role || "staff");
    } else if (statusUpper === "DECLINED") {
      payload.declinedAt = rtdbServerTimestamp();
      payload.declinedById = profile?.id || auth.currentUser?.uid || "";
      payload.declinedByName = displayName;
    }

    await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), payload);

    const customerId = String(req?.householderId || "").trim();
    const serviceLabel = String(req?.serviceType || req?.service || "Service request");
    const timeLabel = String(req?.startDate || req?.preferredTime || "").trim();

    if (statusUpper === "CONFIRMED") {
      await sendNotification({
        toUserId: customerId,
        requestId: id,
        title: "Request confirmed",
        body: `${serviceLabel}${timeLabel ? ` • ${timeLabel}` : ""} is confirmed. Waiting for staff/housekeeper acceptance.`
      });

      const assignedHousekeeperId = String(req?.housekeeperId || "").trim();
      if (assignedHousekeeperId) {
        await sendNotification({
          toUserId: assignedHousekeeperId,
          requestId: id,
          title: "Request ready to accept",
          body: `${serviceLabel}${timeLabel ? ` - ${timeLabel}` : ""} was confirmed. Please accept it when ready.`
        });
      }
    } else if (statusUpper === "ACCEPTED") {
      await sendNotification({
        toUserId: customerId,
        requestId: id,
        title: "Request accepted",
        body: `${displayName} accepted your request${timeLabel ? ` • ${timeLabel}` : ""}.`
      });
    } else if (statusUpper === "DECLINED") {
      await sendNotification({
        toUserId: customerId,
        requestId: id,
        title: "Request declined",
        body: `${serviceLabel} was declined. You can submit a new request.`
      });
    }
  }; 

  const handleComplete = async (req) => {
    const id = req?.id;
    if (!id) return;
    const method = String(paymentMethodByRequestId[id] || "").trim();
    if (!method) return;

    await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), {
      status: "COMPLETED",
      completedAt: rtdbServerTimestamp(),
      completedById: profile?.id || auth.currentUser?.uid || "",
      completedByName: displayName,
      paymentMethod: method,
      updatedAt: rtdbServerTimestamp()
    });

    const customerId = String(req?.householderId || "").trim();
    const serviceLabel = String(req?.serviceType || req?.service || "Service request");
    await sendNotification({
      toUserId: customerId,
      requestId: id,
      title: "Service completed",
      body: `${serviceLabel} is completed. Payment method: ${method}.`
    });
  };

  const formatWhenShort = (value) => {
    const ms = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(ms) || ms <= 0) return "Just now";
    const diff = Date.now() - ms;
    const s = Math.max(0, Math.floor(diff / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  const markAllRead = async () => {
    const uid = auth.currentUser?.uid || profile?.id || "";
    if (!uid) return;
    const unread = (notifications || []).filter((n) => n && n.read !== true);
    if (!unread.length) return;
    const updates = {};
    unread.forEach((n) => {
      updates[`UserNotifications/${uid}/${n.id}/read`] = true;
    });
    await rtdbUpdate(rtdbRef(rtdb), updates);
  };

  return (
    <div className="staff-shell neo">
      {profileLoading && (
        <BroomLoader message="Sweeping your workspace..." fullscreen />
      )}
      <div className="staff-topbar">
          <img src={Logo} alt="Houseclean Logo"/>
        <nav className="top-links">
          <a href="#tasks">Dashboard</a>
          <a href="#requests">Requests</a>
          <a href="#calendar">Schedule</a>
          <a href="#history">History</a>
        </nav>
        <div className="top-actions">
                    <button className="icon-btn ghost" aria-label="Notifications" onClick={() => document.getElementById("staff-notifications")?.scrollIntoView({ behavior: "smooth" })}>
            <i className="fas fa-bell"></i>
          </button>
          <div
            className="mini-profile-wrapper"
            ref={popoverRef}
          >
            {(isStaffRole || showGuest) && (
              <button
                type="button"
                className={`staff-mini-profile ${showGuest ? "guest" : ""}`}
                title={profile?.email || "Not signed in"}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <div className="avatar-badge">
                  {showGuest ? (
                    "ST"
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} />
                  ) : (
                    initials
                  )}
                </div>
                <div className="mini-profile-meta">
                  <strong>{profileLoading ? "Loading..." : showGuest ? "Guest" : displayName}</strong>
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
            )}
            {menuOpen && (
              <div className="staff-profile-popover">
                <div className="popover-header">
                  <div className="avatar-hero">
                    <div className="hero-avatar">
                      {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : initials}
                      <span className={`dot-overlay ${showGuest ? "pending" : statusClass}`}></span>
                    </div>
                    <div>
                      <h4>{profileLoading ? "Loading..." : showGuest ? "Guest" : displayName}</h4>
                      <p className="role">{showGuest ? "Preview mode" : roleLabel}</p>
                      {!showGuest && <p className="muted small">{profile?.preferredService || profile?.barangay || profile?.email}</p>}
                    </div>
                  </div>
                </div>
                <div className="popover-body">
                  <div className="info-line">
                    <i className="fas fa-envelope"></i>
                    <span>{profile?.email || "signin@houseclean.app"}</span>
                  </div>
                  <div className="info-line">
                    <i className="fas fa-phone"></i>
                    <span>{profile?.contact || "+63 *** *** ****"}</span>
                  </div>
                  <div className="info-line">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{profile?.barangay || "Dagupan City"}</span>
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
          {/* <div className="sidebar-card">
            <p className="muted small">Status</p>
            <ul className="pill-list">
              <li className="pill soft green">Confirmed</li>
              <li className="pill soft amber">Awaiting approval</li>
              <li className="pill soft blue">Training</li>
            </ul>
          </div> */}
        </aside>

        <main className="staff-main">
          <section className="panel card hero-strip">
            <div className="hero-content">
              <p className="eyebrow">Houseclean Staff</p>
              <h2>Your day, simplified</h2>
              <p className="muted">Accept, schedule, and secure payouts with privacy-first controls.</p>
              <div className="staff-hero-actions">
                <button className="btn primary" type="button" disabled={showGuest || !isStaffRole} onClick={toggleClockIn}>
                  {isClockedIn ? "Clock out" : "Clock in"}
                </button>
                <button className="btn ghost">Update availability</button>
              </div>
              <div className="hero-stats">
                <div>
                  <p className="mini-label">Today&apos;s tasks</p>
                  <h3>{tasks.length}</h3>
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
              {tasks.length === 0 ? (
                <div className="empty-state">Accepted requests will appear here after staff action.</div>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className={`board-row ${t.status}`}>
                    <div className="row-main">
                      <div className="avatar-pill">{String(t.id).slice(-2)}</div>
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
                ))
              )}
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
              {requestsLoading ? (
                <div className="empty-state">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="empty-state">
                  No requests yet. Customer submissions from /customer land here in real time.
                </div>
              ) : (
                requests
                  .filter((r) => {
                    const myId = profile?.id || auth.currentUser?.uid || "";
                    if (isHousekeeper) {
                      const assignedId = String(r.housekeeperId || "").trim();
                      const statusLower = String(r.status || "PENDING").toLowerCase();
                      const isVisible = ["pending", "confirmed", "accepted", "completed"].includes(statusLower);
                      if (!isVisible) return false;
                      return Boolean(myId) && assignedId === myId;
                    }
                    return true;
                  })
                  .map((r) => {
                    const statusClass = String(r.status || "PENDING").toLowerCase();
                    const isPending = statusClass === "pending";
                    const isConfirmed = statusClass === "confirmed";
                    const isAccepted = statusClass === "accepted";
                    const customerName = r.householderName || r.customer || "Customer";
                    const serviceLabel = r.serviceType || r.service || "Service request";
                    const timeLabel = r.startDate || r.preferredTime || "";
                    const assignedId = String(r.housekeeperId || "").trim();
                    const assignedName = String(r.housekeeperName || "").trim();
                    const assignedRole = String(r.housekeeperRole || "").trim();
                    const myId = profile?.id || auth.currentUser?.uid || "";
                    const canActOnThis = !assignedId || (Boolean(myId) && assignedId === myId);
                    const canConfirm = isStaffManager && isPending;
                    const canAccept =
                      ((isStaffManager && isConfirmed) || (isHousekeeper && isConfirmed)) && canActOnThis;
                    const canDecline =
                      ((isStaffManager && (isPending || isConfirmed)) || (isHousekeeper && isConfirmed)) &&
                      canActOnThis;
                    const canComplete =
                      (isStaffManager || isHousekeeper) && isAccepted && canActOnThis;
                    const payoutLabel =
                      typeof r.totalPrice === "number" && Number.isFinite(r.totalPrice) && r.totalPrice > 0
                        ? `PHP ${Math.round(r.totalPrice).toLocaleString()}`
                        : r.payout || "PHP --";
                  const photoUrls = Array.isArray(r.photos)
                    ? r.photos
                    : Array.isArray(r.images)
                      ? r.images
                      : Array.isArray(r.pictures)
                        ? r.pictures
                        : [];

                  return (
                    <div key={r.id} className={`board-row ${statusClass}`}>
                      <div className="row-main">
                        <div className="avatar-pill alt">
                          {String(customerName || "??").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{serviceLabel}</strong>
                          <p className="muted small">
                            {customerName} • {r.location || "Location"}
                          </p>
                          {timeLabel && <p className="tiny muted">{timeLabel}</p>}
                          {assignedId && (
                            <p className="tiny muted">
                              Assigned to: {assignedName || assignedId}
                              {assignedRole ? ` (${assignedRole})` : ""}
                            </p>
                          )}
                          {r.notes && <p className="tiny muted">{r.notes}</p>}
                          {photoUrls.length > 0 && (
                            <div className="req-photos" aria-label="Request photos">
                              {photoUrls.slice(0, 3).map((u) => (
                                <img key={u} src={u} alt="Request" loading="lazy" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="row-meta actions">
                        <span className="payout">{payoutLabel}</span>
                        {canComplete ? (
                          <>
                            <select
                              value={String(paymentMethodByRequestId[r.id] || "")}
                              onChange={(e) =>
                                setPaymentMethodByRequestId((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                            >
                              <option value="">Payment method</option>
                              <option value="Cash">Cash</option>
                              <option value="GCash">GCash</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                            </select>
                            <button
                              className="btn pill primary small"
                              type="button"
                              disabled={!paymentMethodByRequestId[r.id]}
                              onClick={() => handleComplete(r)}
                            >
                              Complete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="icon-btn ghost danger"
                              aria-label="Decline"
                              disabled={!canDecline}
                              onClick={() => handleRequestAction(r, "DECLINED")}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                            <button
                              className="icon-btn ghost"
                              aria-label={canConfirm ? "Confirm" : "Accept"}
                              disabled={!(canConfirm || canAccept)}
                              onClick={() => handleRequestAction(r, canConfirm ? "CONFIRMED" : "ACCEPTED")}
                            >
                              <i className={`fas ${canConfirm ? "fa-stamp" : "fa-check"}`}></i>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )} 
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
              <button
                className="btn pill ghost"
                type="button"
                disabled={notificationsLoading || notifications.length === 0}
                onClick={markAllRead}
              >
                Mark all read
              </button>
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
                  <div
                    key={n.id}
                    className={`notification-item ${n.read === true ? "read" : "unread"} fade-in`}
                  >
                    <div className="notification-top">
                      <span className="notification-title">{n.title || "Update"}</span>
                      <span className="muted tiny">{formatWhenShort(n.createdAt)}</span>
                    </div>
                    <p className="notification-body">{n.body || ""}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel card settings-card" id="staff-settings">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Account & Security</p>
                <h4>Profile</h4>
              </div>
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
                <input type="text" placeholder="09*********" />
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
