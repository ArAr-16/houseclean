import React from "react";

function StaffHeader({
  logoSrc,
  menuOpen,
  setMenuOpen,
  popoverRef,
  showGuest,
  isStaffRole,
  profileLoading,
  displayName,
  statusClass,
  roleLabel,
  avatarUrl,
  initials,
  profile,
  onNotificationsClick,
  onScrollToSettings,
  onToggleTheme,
  onLogout
}) {
  return (
    <div className="staff-topbar">
      <img src={logoSrc} alt="Houseclean Logo" />
      <nav className="top-links" />
      <div className="top-actions">
        <button
          className="icon-btn ghost"
          aria-label="Notifications"
          onClick={onNotificationsClick}
        >
          <i className="fas fa-bell"></i>
        </button>
        <div className="mini-profile-wrapper" ref={popoverRef}>
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
                  <span className="guest-link">Sign in</span>
                  <span className="guest-link">Register</span>
                </div>
              )}
            </button>
          )}
          {menuOpen && (isStaffRole || showGuest) && (
            <div className="staff-profile-popover">
              <div className="popover-header">
                <div className="avatar-hero">
                  <div className="hero-avatar">
                    {showGuest ? (
                      "ST"
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} />
                    ) : (
                      initials
                    )}
                    <span className={`dot-overlay ${showGuest ? "pending" : statusClass}`}></span>
                  </div>
                  <div>
                    <h4>{showGuest ? "Guest" : displayName}</h4>
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
                        onScrollToSettings();
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
                          onScrollToSettings();
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
                          onToggleTheme();
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
                          onLogout();
                          setMenuOpen(false);
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

export default StaffHeader;
