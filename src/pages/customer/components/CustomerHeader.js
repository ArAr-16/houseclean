import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CustomerHeader({
  logoSrc,
  logoAlt = "Houseclean Logo",
  avatarUrl,
  displayName = "Householder",
  firstNameDisplay = "",
  roleLabel = "Householder",
  statusClass = "active",
  showGuest = false,
  email = "",
  phone = "",
  location = "",
  metaLine = "",
  basePath = "/customer",
  showNotificationPing = false,
  onNotificationsOpen
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark-mode");
    root.classList.toggle("dark-mode", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const safeEmail = String(email || "").trim();
  const safePhone = String(phone || "").trim();
  const safeLocation = String(location || "").trim();
  const safeMeta = String(metaLine || "").trim();

  return (
    <div className="staff-topbar">
      <img src={logoSrc} alt={logoAlt} className="logo-img2" />
      <nav className="top-links" />
      <div className="top-actions">
        <button
          className="icon-btn ghost"
          aria-label={showNotificationPing ? "Notifications (new)" : "Notifications"}
          type="button"
          onClick={() => {
            if (typeof onNotificationsOpen === "function") onNotificationsOpen();
            navigate(`${basePath}/notifications`);
          }}
        >
          <i className="fas fa-bell"></i>
          {showNotificationPing && <span className="notif-indicator" aria-hidden="true" />}
        </button>

        <div className="mini-profile-wrapper" ref={popoverRef}>
          <button
            className={`staff-mini-profile ${showGuest ? "guest" : ""}`}
            type="button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div className="avatar-badge">
              {showGuest ? "CU" : avatarUrl ? <img src={avatarUrl} alt={displayName} /> : "HU"}
            </div>
            <div className="mini-profile-meta">
              <strong>{showGuest ? "Guest" : firstNameDisplay || displayName}</strong>
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
                    {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : <span className="avatar">HU</span>}
                    <span className={`dot-overlay ${showGuest ? "pending" : statusClass}`}></span>
                  </div>
                  <div>
                    <h4>{showGuest ? "Guest" : firstNameDisplay || displayName}</h4>
                    <p className="role">{showGuest ? "Preview mode" : roleLabel}</p>
                  </div>
                </div>
              </div>

              {!showGuest && (safeEmail || safePhone || safeLocation) && (
                <div className="popover-body">
                  {safeEmail && (
                    <div className="info-line">
                      <i className="fas fa-envelope"></i>
                      <span>{safeEmail}</span>
                    </div>
                  )}
                  {safePhone && (
                    <div className="info-line">
                      <i className="fas fa-phone"></i>
                      <span>{safePhone}</span>
                    </div>
                  )}
                  {safeLocation && (
                    <div className="info-line">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{safeLocation}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="popover-actions">
                {showGuest ? (
                  <>
                    <a className="btn primary block" href="/login">Sign in</a>
                    <a className="btn ghost block" href="/register">Create account</a>
                  </>
                ) : (
                  <>
                    <Link className="btn primary block" to={`${basePath}/settings#profile`} onClick={() => setMenuOpen(false)}>
                      View profile
                    </Link>
                    <div className="chip-actions">
                      <button
                        className="icon-chip"
                        type="button"
                        aria-label="Settings"
                        onClick={() => {
                          navigate(`${basePath}/settings`);
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
                          toggleTheme();
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
  );
}

export default CustomerHeader;
