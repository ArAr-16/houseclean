import React from "react";

function StaffMain({
  showGuest,
  isStaffRole,
  availability,
  availabilityLabel,
  toggleAvailability,
  assignedTodayCount,
  nextJobLabel,
  pendingPaymentsCount,
  notificationsLoading,
  notifications,
  handleClockIn,
  handleClockOut,
  ratingDisplay,
  latestFeedback,
  tasks,
  completedTasks = [],
  requests,
  requestsLoading,
  isHousekeeper,
  isStaffManager,
  profile,
  currentUserId,
  paymentMethodByRequestId,
  setPaymentMethodByRequestId,
  handleRequestAction,
  handleComplete,
  handleCashPaymentReceived,
  history,
  attendanceEntries = [],
  attendanceLoading = false,
  markAllRead,
  formatWhenShort,
  visibleSections = {},
  onGoToRequests,
  onGoToHistory,
  onGoToSettings,
  isClockedIn,
  timeIn,
  timeOut,
  staffServiceOptions = [],
  weekdayOptions = [],
  staffProfileForm,
  setStaffProfileForm,
  staffProfileErrors = {},
  setStaffProfileErrors,
  staffProfileSaving,
  handleStaffProfileSave,
  handleStaffProfileReset,
  showProfilePrompt,
  profileToast,
  onDismissProfileToast
}) {
  const isVisible = (key) => visibleSections[key] !== false;
  const [nowTime, setNowTime] = React.useState(new Date());
  const [activeRequest, setActiveRequest] = React.useState(null);
  const [showRequestModal, setShowRequestModal] = React.useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = React.useState(false);
  const [completionToast, setCompletionToast] = React.useState("");
  const profileForm = staffProfileForm || {};
  const avatarPresets = [
    {
      id: "mop",
      label: "Mop",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0F2FE\" stroke=\"#0EA5E9\" stroke-width=\"2\"/><rect x=\"45\" y=\"18\" width=\"6\" height=\"42\" rx=\"3\" fill=\"#0EA5E9\"/><rect x=\"34\" y=\"54\" width=\"28\" height=\"8\" rx=\"4\" fill=\"#38BDF8\"/><path d=\"M28 62c6 10 34 10 40 0\" fill=\"none\" stroke=\"#0EA5E9\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>"
    },
    {
      id: "broom",
      label: "Broom",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FEF3C7\" stroke=\"#F59E0B\" stroke-width=\"2\"/><rect x=\"46\" y=\"16\" width=\"4\" height=\"46\" rx=\"2\" fill=\"#B45309\"/><path d=\"M32 60h32l-6 16H38l-6-16z\" fill=\"#F59E0B\"/><path d=\"M38 60l2 8M44 60l2 8M50 60l2 8M56 60l2 8\" stroke=\"#B45309\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>"
    },
    {
      id: "vacuum",
      label: "Vacuum",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#EDE9FE\" stroke=\"#8B5CF6\" stroke-width=\"2\"/><rect x=\"30\" y=\"48\" width=\"28\" height=\"18\" rx=\"9\" fill=\"#8B5CF6\"/><circle cx=\"62\" cy=\"58\" r=\"8\" fill=\"#C4B5FD\"/><path d=\"M58 36h12\" stroke=\"#8B5CF6\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M70 36v18\" stroke=\"#8B5CF6\" stroke-width=\"4\" stroke-linecap=\"round\"/></svg>"
    },
    {
      id: "spray",
      label: "Spray Bottle",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DCFCE7\" stroke=\"#22C55E\" stroke-width=\"2\"/><rect x=\"40\" y=\"34\" width=\"16\" height=\"8\" rx=\"3\" fill=\"#22C55E\"/><rect x=\"36\" y=\"42\" width=\"24\" height=\"34\" rx=\"8\" fill=\"#4ADE80\"/><path d=\"M56 30h10\" stroke=\"#16A34A\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"72\" cy=\"34\" r=\"3\" fill=\"#22C55E\"/></svg>"
    },
    {
      id: "bucket",
      label: "Bucket",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DBEAFE\" stroke=\"#3B82F6\" stroke-width=\"2\"/><path d=\"M30 36h36l-4 36H34l-4-36z\" fill=\"#60A5FA\"/><path d=\"M36 32c0-6 24-6 24 0\" fill=\"none\" stroke=\"#3B82F6\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M38 54c6 6 14 6 20 0\" stroke=\"#3B82F6\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>"
    },
    {
      id: "apron",
      label: "Apron",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FFE4E6\" stroke=\"#F43F5E\" stroke-width=\"2\"/><path d=\"M34 28c8 10 20 10 28 0\" fill=\"none\" stroke=\"#F43F5E\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M30 36h36l-4 36H34l-4-36z\" fill=\"#FB7185\"/><rect x=\"40\" y=\"48\" width=\"16\" height=\"10\" rx=\"4\" fill=\"#FFE4E6\"/></svg>"
    },
    {
      id: "gloves",
      label: "Gloves",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FEE2E2\" stroke=\"#EF4444\" stroke-width=\"2\"/><path d=\"M30 54c0-10 6-14 10-14s6 4 6 8v20H36c-4 0-6-4-6-14z\" fill=\"#F87171\"/><path d=\"M60 50c0-8 6-12 10-12s6 4 6 8v18H66c-4 0-6-4-6-14z\" fill=\"#FB7185\"/></svg>"
    },
    {
      id: "housekeeper",
      label: "Housekeeper",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0E7FF\" stroke=\"#6366F1\" stroke-width=\"2\"/><circle cx=\"48\" cy=\"38\" r=\"12\" fill=\"#A5B4FC\"/><path d=\"M28 74c4-16 36-16 40 0\" fill=\"#818CF8\"/><path d=\"M38 36c6 4 14 4 20 0\" stroke=\"#6366F1\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>"
    },
    {
      id: "sparkle_home",
      label: "Sparkling Home",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#ECFCCB\" stroke=\"#65A30D\" stroke-width=\"2\"/><path d=\"M26 50l22-18 22 18v22H26V50z\" fill=\"#84CC16\"/><path d=\"M44 72V56h8v16\" fill=\"#D9F99D\"/><path d=\"M70 30l4 4m0-4l-4 4\" stroke=\"#65A30D\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>"
    },
    {
      id: "bubbles",
      label: "Bubbles",
      svg:
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0F2FE\" stroke=\"#0EA5E9\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"52\" r=\"12\" fill=\"#BAE6FD\"/><circle cx=\"58\" cy=\"42\" r=\"10\" fill=\"#7DD3FC\"/><circle cx=\"58\" cy=\"64\" r=\"8\" fill=\"#38BDF8\"/></svg>"
    }
  ];
  const currentPreset = avatarPresets.find((preset) => preset.id === profileForm.avatarSeed) || avatarPresets[0];
  const avatarPreview = currentPreset?.svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(currentPreset.svg)}`
    : "";

  const updateField = (field, value) => {
    if (typeof setStaffProfileForm !== "function") return;
    const nextValue = field === "contact" ? String(value || "").replace(/\D/g, "") : value;
    setStaffProfileForm((prev) => ({ ...(prev || {}), [field]: nextValue }));
    if (typeof setStaffProfileErrors === "function") {
      setStaffProfileErrors((prev) => {
        if (!prev || !prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleSkill = (skill) => {
    const list = Array.isArray(profileForm.skills) ? profileForm.skills : [];
    const next = list.includes(skill) ? list.filter((s) => s !== skill) : list.concat(skill);
    updateField("skills", next);
  };

  const toggleDay = (day) => {
    const list = Array.isArray(profileForm.availabilityDays) ? profileForm.availabilityDays : [];
    const next = list.includes(day) ? list.filter((d) => d !== day) : list.concat(day);
    updateField("availabilityDays", next);
  };

  React.useEffect(() => {
    const id = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (!completionToast) return undefined;
    const timer = setTimeout(() => setCompletionToast(""), 3000);
    return () => clearTimeout(timer);
  }, [completionToast]);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = [];
  for (let i = 0; i < firstDay; i += 1) calendarCells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) calendarCells.push(day);

  const toDateKey = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const attendanceByDate = (attendanceEntries || []).reduce((acc, entry) => {
    const key = String(entry.dateKey || "") || toDateKey(entry.timeIn);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const formatTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const todayLabel = nowTime.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const formatSchedule = (req) => {
    const startDate = req?.startDate || "";
    const combined = `${req?.date || ""} ${req?.time || ""}`.trim();
    return startDate || combined || "--";
  };

  const formatPaymentMethodLabel = (value) => {
    const key = String(value || "").trim().toUpperCase();
    if (key === "STATIC_QR") return "Static QR";
    if (key === "CASH_ON_HAND") return "Cash on Hand";
    return value ? String(value) : "--";
  };

  const openRequestModal = (req) => {
    if (!req) return;
    setActiveRequest(req);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setActiveRequest(null);
    setShowRequestModal(false);
  };

  const openCompleteConfirm = () => {
    setShowCompleteConfirm(true);
  };

  const closeCompleteConfirm = () => {
    setShowCompleteConfirm(false);
  };

  const reservedCashRequests = (requests || []).filter((r) => {
    const statusLower = String(r.status || "").toLowerCase();
    const method = String(r.paymentMethod || r.paidVia || "").toUpperCase();
    if (statusLower !== "reserved" || method !== "CASH_ON_HAND") return false;
    if (isHousekeeper) {
      const assignedId = String(r.housekeeperId || "").trim();
      return Boolean(currentUserId) && assignedId === currentUserId;
    }
    return true;
  });

  return (
    <main className="staff-main">
      {completionToast && (
        <div className="staff-toast success" role="status">
          <span>{completionToast}</span>
          <button
            type="button"
            className="staff-toast__close"
            onClick={() => setCompletionToast("")}
            aria-label="Dismiss"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      {profileToast && (
        <div className="staff-toast success" role="status">
          <span>{profileToast}</span>
          <button
            type="button"
            className="staff-toast__close"
            onClick={() => {
              if (typeof onDismissProfileToast === "function") onDismissProfileToast();
            }}
            aria-label="Dismiss"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      {showProfilePrompt && (
        <div className="staff-blocking-modal" role="dialog" aria-modal="true" aria-label="Complete staff profile">
          <div className="staff-blocking-modal__backdrop" />
          <div className="staff-blocking-modal__panel">
            <h3>Complete Your Staff Profile</h3>
            <p>
              Welcome! Please complete your staff profile. This information will be saved to your account and shown to
              customers when they book and select staff. Fields marked * are required.
            </p>
            <div className="avatar-uploader">
              <p className="mini-label">Choose an avatar</p>
              <div className="avatar-preview">
                {avatarPreview ? <img src={avatarPreview} alt="Avatar" /> : <span>Avatar</span>}
              </div>
              <div className="avatar-presets">
                {avatarPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`avatar-chip ${profileForm.avatarSeed === preset.id ? "active" : ""}`}
                    onClick={() => updateField("avatarSeed", preset.id)}
                    aria-label={preset.label}
                    title={preset.label}
                  >
                    <img
                      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preset.svg)}`}
                      alt=""
                      className="avatar-thumb"
                    />
                  </button>
                ))}
              </div>
              <span className="muted tiny">Pick a style. It updates everywhere in your account.</span>
            </div>
            <div className="staff-modal-form">
              <label>
                First name *
                <input
                  type="text"
                  value={profileForm.firstName || ""}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="Maria"
                />
                {staffProfileErrors.firstName && <span className="form-error">{staffProfileErrors.firstName}</span>}
              </label>
              <label>
                Last name *
                <input
                  type="text"
                  value={profileForm.lastName || ""}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="Santos"
                />
                {staffProfileErrors.lastName && <span className="form-error">{staffProfileErrors.lastName}</span>}
              </label>
              <label>
                Email *
                <input
                  type="email"
                  value={profileForm.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="maria@example.com"
                />
                {staffProfileErrors.email && <span className="form-error">{staffProfileErrors.email}</span>}
              </label>
              <label>
                Contact number *
                <input
                  type="text"
                  value={profileForm.contact || ""}
                  onChange={(e) => updateField("contact", e.target.value)}
                  placeholder="09XXXXXXXXX"
                />
                {staffProfileErrors.contact && <span className="form-error">{staffProfileErrors.contact}</span>}
              </label>
              <label className="full">
                Address *
                <input
                  type="text"
                  value={profileForm.address || ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Dagupan City"
                />
                {staffProfileErrors.address && <span className="form-error">{staffProfileErrors.address}</span>}
              </label>
              <div className="full">
                <p className="form-label">Service capability *</p>
                <div className="skill-grid">
                  {(staffServiceOptions || []).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      className={`skill-pill ${
                        Array.isArray(profileForm.skills) && profileForm.skills.includes(skill) ? "selected" : ""
                      }`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                {staffProfileErrors.skills && <span className="form-error">{staffProfileErrors.skills}</span>}
              </div>
              <div className="full">
                <p className="form-label">Availability *</p>
                <div className="schedule-grid">
                  <div className="day-grid">
                    {(weekdayOptions || []).map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`day-pill ${
                          Array.isArray(profileForm.availabilityDays) &&
                          profileForm.availabilityDays.includes(day)
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => toggleDay(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <div className="time-range">
                    <label>
                      Start
                      <input
                        type="time"
                        value={profileForm.availabilityStart || ""}
                        onChange={(e) => updateField("availabilityStart", e.target.value)}
                      />
                    </label>
                    <label>
                      End
                      <input
                        type="time"
                        value={profileForm.availabilityEnd || ""}
                        onChange={(e) => updateField("availabilityEnd", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
                {staffProfileErrors.availability && <span className="form-error">{staffProfileErrors.availability}</span>}
              </div>
              <label>
                Experience (years) *
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={profileForm.experienceYears || ""}
                  onChange={(e) => updateField("experienceYears", e.target.value)}
                  placeholder="5"
                />
                {staffProfileErrors.experienceYears && (
                  <span className="form-error">{staffProfileErrors.experienceYears}</span>
                )}
              </label>
              <label>
                Preferred workload (jobs/day) *
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={profileForm.preferredWorkload || ""}
                  onChange={(e) => updateField("preferredWorkload", e.target.value)}
                  placeholder="3"
                />
                {staffProfileErrors.preferredWorkload && (
                  <span className="form-error">{staffProfileErrors.preferredWorkload}</span>
                )}
              </label>
              <label className="full">
                Experience details (optional)
                <textarea
                  rows={3}
                  value={profileForm.experienceNotes || ""}
                  onChange={(e) => updateField("experienceNotes", e.target.value)}
                  placeholder="Brief description of your experience..."
                />
              </label>
            </div>
            <div className="staff-blocking-modal__actions">
              <button
                className="btn primary"
                type="button"
                onClick={handleStaffProfileSave}
                disabled={staffProfileSaving}
              >
                {staffProfileSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isVisible("dashboard") && (
        <section className="panel card staff-dashboard" id="dashboard">
          <div className="dashboard-split">
            <div className="dashboard-left">
              <div className="dashboard-banner">
                <div>
                  <p className="mini-label">Houseclean</p>
                  <h2>Welcome back{showGuest ? "" : `, ${profile?.fullName || profile?.name || profile?.email || "Staff"}`}</h2>
                </div>
              </div>


              <div className="dashboard-actions">
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => {
                    if (typeof onGoToRequests === "function") onGoToRequests();
                    else document.getElementById("requests")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  View Assigned Requests
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    if (typeof onGoToHistory === "function") onGoToHistory();
                    else document.getElementById("history")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Confirm Attendance
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    if (typeof onGoToSettings === "function") onGoToSettings();
                    else document.getElementById("staff-settings")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Update Profile
                </button>
              </div>


                <div className="dash-card">
                  <div className="panel-header compact">
                    <h4>Feedback & Ratings</h4>
                  </div>
                  <div className="rating-row">
                    <span className="stars">*****</span>
                    <strong>{ratingDisplay} Average Rating</strong>
                  </div>
                  <p className="muted small">"{latestFeedback}" - Householder</p>
                </div>

            </div>
          </div>
        </section>
      )}

      {isVisible("requests") && (
        <section className="panel card list-board" id="requests">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Requests</p>
              <h4>Accept / Decline</h4>
            </div>
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
                  if (isHousekeeper) {
                    const assignedId = String(r.housekeeperId || "").trim();
                    const statusLower = String(r.status || "PENDING").toLowerCase();
                    const isVisibleRow = ["pending", "confirmed", "reserved"].includes(statusLower);
                    if (!isVisibleRow) return false;
                    return Boolean(currentUserId) && assignedId === currentUserId;
                  }
                  const statusLower = String(r.status || "PENDING").toLowerCase();
                  return ["pending", "confirmed", "reserved", "pending_payment"].includes(statusLower);
                })
                .map((r) => {
                  const statusClass = String(r.status || "PENDING").toLowerCase();
                  const isPending = statusClass === "pending";
                  const isConfirmed = statusClass === "confirmed";
                  const isReserved = statusClass === "reserved";
                  const customerName = r.householderName || r.customer || "Customer";
                  const serviceLabel = r.serviceType || r.service || "Service request";
                  const timeLabel = r.startDate || r.preferredTime || "";
                  const assignedId = String(r.housekeeperId || "").trim();
                  const assignedName = String(r.housekeeperName || "").trim();
                  const assignedRole = String(r.housekeeperRole || "").trim();
                  const canActOnThis = !assignedId || (Boolean(currentUserId) && assignedId === currentUserId);
                  const canConfirm = isStaffManager && isPending;
                  const canAccept =
                    ((isStaffManager && (isPending || isConfirmed)) ||
                      (isHousekeeper && (isPending || isConfirmed))) &&
                    canActOnThis;
                  const canDecline =
                    ((isStaffManager && (isPending || isConfirmed)) ||
                      (isHousekeeper && (isPending || isConfirmed))) &&
                    canActOnThis;
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
                    <div
                      key={r.id}
                      className={`board-row ${statusClass}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openRequestModal(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openRequestModal(r);
                        }
                      }}
                    >
                      <div className="row-main">
                        <div className="avatar-pill alt">
                          {String(customerName || "??").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{serviceLabel}</strong>
                          <p className="muted small">
                            {customerName} - {r.location || "Location"}
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
                        <button
                          className="icon-btn danger"
                          aria-label="Decline"
                          disabled={!canDecline}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestAction(r, "DECLINED");
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                        <button
                          className="icon-btn"
                          aria-label={canConfirm ? "Confirm" : "Accept"}
                          disabled={!(canConfirm || canAccept)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestAction(r, canConfirm ? "CONFIRMED" : "ACCEPTED");
                          }}
                        >
                          <i className={`fas ${canConfirm ? "fa-stamp" : "fa-check"}`}></i>
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </section>
      )}

      {isVisible("requests") && reservedCashRequests.length > 0 && (
        <section className="panel card list-board" id="payment-confirmations">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Payments</p>
              <h4>Cash on hand confirmations</h4>
            </div>
          </div>
          <div className="board-items">
            {reservedCashRequests.map((r) => {
              const serviceLabel = r.serviceType || r.service || "Service request";
              const timeLabel = r.startDate || r.preferredTime || "";
              const customerName = r.householderName || r.customer || "Customer";
              return (
                <div key={r.id} className="board-row reserved">
                  <div className="row-main">
                    <div className="avatar-pill alt">
                      {String(customerName || "??").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong>{serviceLabel}</strong>
                      <p className="muted small">
                        {customerName} - {r.location || "Location"}
                      </p>
                      {timeLabel && <p className="tiny muted">{timeLabel}</p>}
                    </div>
                  </div>
                  <div className="row-meta actions">
                    <span className="pill soft amber">Cash on hand</span>
                    <button
                      className="btn pill primary"
                      type="button"
                      onClick={() => handleCashPaymentReceived?.(r)}
                    >
                      Mark payment received
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isVisible("tasks") && (
        <section className="panel card list-board" id="tasks">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Tasks</p>
              <h4>Today & Upcoming</h4>
            </div>
          </div>
          <div className="board-items">
            {tasks.length === 0 ? (
              <div className="empty-state">Accepted requests will appear here after staff action.</div>
            ) : (
              tasks.map((t) => {
                const relatedRequest = (requests || []).find((r) => String(r.id) === String(t.id));
                return (
                <div
                  key={t.id}
                  className={`board-row ${t.status}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => relatedRequest && openRequestModal(relatedRequest)}
                  onKeyDown={(e) => {
                    if (!relatedRequest) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openRequestModal(relatedRequest);
                    }
                  }}
                >
                  <div className="row-main">
                    <div className="avatar-pill">{String(t.id).slice(-2)}</div>
                    <div>
                      <strong>{t.title}</strong>
                      <p className="muted small">{t.time}</p>
                    </div>
                  </div>
                  <div className="row-meta">
                    <span className={`chip ${t.status}`}>{t.status}</span>
                    <button className="icon-btn" aria-label="Open task">
                      <i className="fas fa-pen"></i>
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {isVisible("tasks") && (
        <section className="panel card list-board" id="completed-tasks">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Completed</p>
              <h4>Finished tasks</h4>
            </div>
          </div>
          <div className="board-items">
            {completedTasks.length === 0 ? (
              <div className="empty-state">No completed tasks yet.</div>
            ) : (
              completedTasks.map((t) => {
                const relatedRequest = (requests || []).find((r) => String(r.id) === String(t.id));
                return (
                  <div
                    key={t.id}
                    className={`board-row completed`}
                    role="button"
                    tabIndex={0}
                    onClick={() => relatedRequest && openRequestModal(relatedRequest)}
                    onKeyDown={(e) => {
                      if (!relatedRequest) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openRequestModal(relatedRequest);
                      }
                    }}
                  >
                    <div className="row-main">
                      <div className="avatar-pill">{String(t.id).slice(-2)}</div>
                      <div>
                        <strong>{t.title}</strong>
                        <p className="muted small">{t.time}</p>
                      </div>
                    </div>
                    <div className="row-meta">
                      <span className="chip completed">completed</span>
                      <button className="icon-btn" aria-label="Open task">
                        <i className="fas fa-pen"></i>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      

      {isVisible("schedule") && (
        <section className="panel card calendar-card" id="calendar">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Schedule & Attendance</p>
              <h4>{monthLabel}</h4>
            </div>
            <button className="btn pill ghost">Add event</button>
          </div>
          <div className="calendar-body">
            <div className="attendance-calendar">
              <div className="calendar-head">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="calendar-grid">
                {calendarCells.map((day, idx) => {
                  if (!day) return <span key={`empty-${idx}`} className="calendar-cell empty"></span>;
                  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasAttendance = Boolean(attendanceByDate[dateKey]?.length);
                  return (
                    <span key={dateKey} className={`calendar-cell ${hasAttendance ? "has-attendance" : ""}`}>
                      <span className="day-number">{day}</span>
                      {hasAttendance && <span className="attendance-dot" aria-hidden="true"></span>}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {isVisible("history") && (
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
      )}

      {isVisible("notifications") && (
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
      )}

      {showRequestModal && activeRequest && (
        <div className="staff-request-modal" role="dialog" aria-modal="true" aria-label="Request details">
          <div className="staff-request-modal__backdrop" onClick={closeRequestModal} />
          <div className="staff-request-modal__panel staff-track-modal staff-track-modal--details">
            <div className="staff-track-modal__hero">
              <div className="staff-track-modal__icon">
                <i className="fas fa-receipt"></i>
              </div>
              <h3>Request details</h3>
              <div className={`staff-track-status-pill status-${String(activeRequest.status || "PENDING").toLowerCase()}`}>
                {String(activeRequest.status || "PENDING").toUpperCase()}
              </div>
            </div>
            <div className="staff-request-modal__header">
              <button className="icon-btn" type="button" onClick={closeRequestModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="staff-request-modal__body">

              <div className="staff-request-grid">
                <div>
                  <small>Request ID</small>
                  <strong>{activeRequest.requestId || activeRequest.id || "--"}</strong>
                </div>
                <div>
                  <small>Status</small>
                  <strong>{String(activeRequest.status || "PENDING").toUpperCase()}</strong>
                </div>
                <div>
                  <small>Customer</small>
                  <strong>{activeRequest.householderName || activeRequest.customer || "Customer"}</strong>
                </div>
                <div>
                  <small>Email</small>
                  <strong>{activeRequest.customerEmail || "--"}</strong>
                </div>
                <div>
                  <small>Schedule</small>
                  <strong>{formatSchedule(activeRequest)}</strong>
                </div>
                <div>
                  <small>Address</small>
                  <strong>{activeRequest.location || activeRequest.address || "--"}</strong>
                </div>
                <div>
                  <small>Payment</small>
                  <strong>{formatPaymentMethodLabel(activeRequest.paymentMethod || activeRequest.paidVia)}</strong>
                </div>
                <div>
                  <small>Payment status</small>
                  <strong>{activeRequest.paymentStatus || "--"}</strong>
                </div>
                <div>
                  <small>Total</small>
                  <strong>
                    {typeof activeRequest.totalPrice === "number"
                      ? `PHP ${Math.round(activeRequest.totalPrice).toLocaleString()}`
                      : activeRequest.payout || "--"}
                  </strong>
                </div>
                <div className="full">
                  <small>Services</small>
                  <strong>
                    {Array.isArray(activeRequest.serviceTypes) && activeRequest.serviceTypes.length > 0
                      ? activeRequest.serviceTypes.join(", ")
                      : activeRequest.serviceType || "--"}
                  </strong>
                </div>
              </div>
              {activeRequest.notes && (
                <div className="staff-request-notes">
                  <small>Notes</small>
                  <p>{activeRequest.notes}</p>
                </div>
              )}
              {Array.isArray(activeRequest.photos) && activeRequest.photos.length > 0 && (
                <div className="staff-request-photos">
                  {activeRequest.photos.slice(0, 6).map((src) => (
                    <img key={src} src={src} alt="Request" loading="lazy" />
                  ))}
                </div>
              )}
            </div>
            <div className="staff-request-modal__footer">
              <button className="btn ghost" type="button" onClick={closeRequestModal}>
                Close
              </button>
              {String(activeRequest.status || "").toLowerCase() === "reserved" &&
                String(activeRequest.paymentMethod || activeRequest.paidVia || "").toUpperCase() === "CASH_ON_HAND" && (
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => {
                      if (typeof handleCashPaymentReceived === "function") {
                        Promise.resolve(handleCashPaymentReceived(activeRequest)).then(() => {
                          setCompletionToast("Cash payment received. Booking confirmed.");
                        });
                      }
                      closeRequestModal();
                    }}
                  >
                    Mark payment received
                  </button>
                )}
              {String(activeRequest.status || "").toLowerCase() === "accepted" && (
                <button
                  className="btn primary"
                  type="button"
                  onClick={openCompleteConfirm}
                  disabled={
                    !(
                      paymentMethodByRequestId?.[activeRequest.id] ||
                      activeRequest.paymentMethod
                    )
                  }
                >
                  Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCompleteConfirm && activeRequest && (
        <div className="staff-request-modal" role="dialog" aria-modal="true" aria-label="Complete service">
          <div className="staff-request-modal__backdrop" onClick={closeCompleteConfirm} />
          <div className="staff-request-modal__panel">
            <div className="staff-request-modal__body">
              <h3>Done the service?</h3>
              <p className="muted small">
                Confirming will complete the request and send a rating and feedback to the customer.
              </p>
            </div>
            <div className="staff-request-modal__footer">
              <button className="btn ghost" type="button" onClick={closeCompleteConfirm}>
                Cancel
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  closeCompleteConfirm();
                  if (typeof handleComplete === "function") {
                    Promise.resolve(handleComplete(activeRequest)).then(() => {
                      setCompletionToast("Task completed. Customer has been asked for feedback.");
                    });
                  }
                  closeRequestModal();
                }}
              >
                Yes, complete
              </button>
            </div>
          </div>
        </div>
      )}

      {isVisible("settings") && (
        <section className="panel card settings-card" id="staff-settings">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Account & Security</p>
              <h4>Profile</h4>
            </div>
          </div>
          {showProfilePrompt && (
            <div className="settings-banner">
              <h4>Welcome! Please complete your staff profile.</h4>
              <p>
                This information will be saved to your account and shown to customers when they book and select staff.
                Fields marked * are required.
              </p>
            </div>
          )}
          <div className="settings-grid-lite">
            <div className="full avatar-uploader">
              <p className="mini-label">Choose an avatar</p>
              <div className="avatar-preview">
                {avatarPreview ? <img src={avatarPreview} alt="Avatar" /> : <span>Avatar</span>}
              </div>
              <div className="avatar-presets">
                {avatarPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`avatar-chip ${profileForm.avatarSeed === preset.id ? "active" : ""}`}
                    onClick={() => updateField("avatarSeed", preset.id)}
                    aria-label={preset.label}
                    title={preset.label}
                  >
                    <img
                      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preset.svg)}`}
                      alt=""
                      className="avatar-thumb"
                    />
                  </button>
                ))}
              </div>
              <span className="muted tiny">Pick a style. It updates everywhere in your account.</span>
            </div>
            <label>
              First name *
              <input
                type="text"
                value={profileForm.firstName || ""}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="Maria"
              />
              {staffProfileErrors.firstName && <span className="form-error">{staffProfileErrors.firstName}</span>}
            </label>
            <label>
              Last name *
              <input
                type="text"
                value={profileForm.lastName || ""}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="Santos"
              />
              {staffProfileErrors.lastName && <span className="form-error">{staffProfileErrors.lastName}</span>}
            </label>
            <label>
              Email *
              <input
                type="email"
                value={profileForm.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="maria@example.com"
              />
              {staffProfileErrors.email && <span className="form-error">{staffProfileErrors.email}</span>}
            </label>
            <label>
              Contact number *
                <input
                  type="text"
                  value={profileForm.contact || ""}
                  onChange={(e) => updateField("contact", e.target.value)}
                  placeholder="09XXXXXXXXX"
                />
              {staffProfileErrors.contact && <span className="form-error">{staffProfileErrors.contact}</span>}
            </label>
            <label className="full">
              Address *
              <input
                type="text"
                value={profileForm.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Dagupan City"
              />
              {staffProfileErrors.address && <span className="form-error">{staffProfileErrors.address}</span>}
            </label>

            <div className="full">
              <p className="form-label">Service capability *</p>
              <div className="skill-grid">
                {(staffServiceOptions || []).map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    className={`skill-pill ${Array.isArray(profileForm.skills) && profileForm.skills.includes(skill) ? "selected" : ""}`}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {staffProfileErrors.skills && <span className="form-error">{staffProfileErrors.skills}</span>}
            </div>

            <div className="full">
              <p className="form-label">Availability *</p>
              <div className="schedule-grid">
                <div className="day-grid">
                  {(weekdayOptions || []).map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={`day-pill ${Array.isArray(profileForm.availabilityDays) && profileForm.availabilityDays.includes(day) ? "selected" : ""}`}
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <div className="time-range">
                  <label>
                    Start
                    <input
                      type="time"
                      value={profileForm.availabilityStart || ""}
                      onChange={(e) => updateField("availabilityStart", e.target.value)}
                    />
                  </label>
                  <label>
                    End
                    <input
                      type="time"
                      value={profileForm.availabilityEnd || ""}
                      onChange={(e) => updateField("availabilityEnd", e.target.value)}
                    />
                  </label>
                </div>
              </div>
              {staffProfileErrors.availability && <span className="form-error">{staffProfileErrors.availability}</span>}
            </div>

            <label>
              Experience (years) *
              <input
                type="number"
                min="1"
                max="50"
                value={profileForm.experienceYears || ""}
                onChange={(e) => updateField("experienceYears", e.target.value)}
                placeholder="5"
              />
              {staffProfileErrors.experienceYears && (
                <span className="form-error">{staffProfileErrors.experienceYears}</span>
              )}
            </label>
            <label>
              Preferred workload (jobs/day) *
              <input
                type="number"
                min="1"
                max="10"
                value={profileForm.preferredWorkload || ""}
                onChange={(e) => updateField("preferredWorkload", e.target.value)}
                placeholder="3"
              />
              {staffProfileErrors.preferredWorkload && (
                <span className="form-error">{staffProfileErrors.preferredWorkload}</span>
              )}
            </label>
            <label className="full">
              Experience details (optional)
              <textarea
                rows={3}
                value={profileForm.experienceNotes || ""}
                onChange={(e) => updateField("experienceNotes", e.target.value)}
                placeholder="Brief description of your experience..."
              />
            </label>
            <label>
              Rating
              <input type="text" value={`Rating ${Number(profileForm.rating || 0).toFixed(1)}`} readOnly />
            </label>
          </div>
          <div className="settings-actions">
            <button
              className="btn pill ghost"
              type="button"
              onClick={handleStaffProfileReset}
              disabled={staffProfileSaving}
            >
              Reset
            </button>
            <button
              className="btn pill primary"
              type="button"
              onClick={handleStaffProfileSave}
              disabled={staffProfileSaving}
            >
              {staffProfileSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default StaffMain;
