import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { useCustomerServiceRequests } from "./customerData";
import BookingWizardModal from "./BookingWizardModal";
import { rtdb } from "../../firebase";
import {
  runTransaction,
  push,
  ref as rtdbRef,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate
} from "firebase/database";

function normalizeStatus(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "ACCEPTED") return "ACCEPTED";
  if (value === "CONFIRMED") return "ACCEPTED";
  if (value === "COMPLETED") return "COMPLETED";
  return "PENDING";
}

function StatusTracker({ status }) {
  const current = normalizeStatus(status);
  const label =
    current === "COMPLETED" ? "Completed" : current === "ACCEPTED" ? "In-Progress" : "Pending";

  return (
    <div
      className={`status-tracker status-tracker--single status-${current.toLowerCase()}`}
      aria-label={`Request status: ${current}`}
    >
      <div className="status-icon" aria-hidden="true">
        {current === "PENDING" && (
          <span className="status-spinner" aria-hidden="true"></span>
        )}
        {current === "ACCEPTED" && (
          <span className="status-progress">
            <span className="progress-center"></span>
            <span className="progress-arm"></span>
            <span className="progress-arm"></span>
            <span className="progress-arm"></span>
          </span>
        )}
        {current === "COMPLETED" && <i className="fas fa-check"></i>}
      </div>
      <span className="status-label">{label}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const current = normalizeStatus(status);
  return (
    <div className={`status-pill status-${current.toLowerCase()}`}>
      {current}
    </div>
  );
}

function formatPaymentMethodLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  if (key === "STATIC_QR") return "Static QR";
  if (key === "CASH_ON_HAND") return "Cash on Hand";
  return value ? String(value) : "--";
}

function CustomerRequests() {
  const [successId, setSuccessId] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [pendingFeedbackId, setPendingFeedbackId] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const shouldOpen = Boolean(location?.state?.openBooking);
    if (!shouldOpen) return;
    setBookingOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location?.pathname, location?.state, navigate]);

  useEffect(() => {
    const requestId = String(location?.state?.openFeedbackFor || "").trim();
    if (!requestId) return;
    setPendingFeedbackId(requestId);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location?.pathname, location?.state, navigate]);

  return (
    <CustomerChrome>
      <CustomerRequestsInner
        successId={successId}
        setSuccessId={setSuccessId}
        bookingOpen={bookingOpen}
        setBookingOpen={setBookingOpen}
        clearSuccess={() => setSuccessId("")}
        toastMessage={toastMessage}
        setToastMessage={setToastMessage}
        showSubmittedModal={showSubmittedModal}
        setShowSubmittedModal={setShowSubmittedModal}
        pendingFeedbackId={pendingFeedbackId}
        clearPendingFeedback={() => setPendingFeedbackId("")}
        openTrackFor={String(location?.state?.openTrackFor || "").trim()}
        clearRouteState={() => navigate(location.pathname, { replace: true, state: {} })}
      />
    </CustomerChrome>
  );
}

export default CustomerRequests;

function CustomerRequestsInner({
  successId,
  setSuccessId,
  bookingOpen,
  setBookingOpen,
  clearSuccess,
  toastMessage,
  setToastMessage,
  showSubmittedModal,
  setShowSubmittedModal,
  pendingFeedbackId,
  clearPendingFeedback,
  openTrackFor,
  clearRouteState
}) {
  const ctx = useCustomerChrome();
  const { requests, loading } = useCustomerServiceRequests(ctx.authUser?.uid);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRequest, setFeedbackRequest] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const startBooking = () => {
    clearSuccess();
    setBookingOpen(true);
  };

  const addressLine = [
    ctx.profile?.address,
    ctx.profile?.barangay,
    ctx.profile?.municipality,
    ctx.profile?.province
  ]
    .filter(Boolean)
    .join(", ")
    .trim();

  const formatSchedule = (req) => {
    const startDate = req?.startDate || "";
    const datePart = req?.date || "";
    const timePart = req?.time || "";
    const combined = `${datePart} ${timePart}`.trim();
    const raw = startDate || combined || "";
    if (!raw) return "--";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    const dateLabel = parsed.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
    const timeLabel = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dateLabel} • ${timeLabel}`;
  };

  const openTrackModal = (req) => {
    if (!req) return;
    setActiveRequest(req);
    setShowTrackModal(true);
  };

  const openFeedbackModal = (req) => {
    if (!req) return;
    setFeedbackRequest(req);
    setFeedbackRating(Number(req.feedbackRating || 0));
    setFeedbackComment(String(req.feedbackComment || ""));
    setFeedbackError("");
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setFeedbackRequest(null);
    setFeedbackError("");
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

  const updateStaffRating = async (staffId, rating, comment) => {
    if (!staffId || !rating) return;
    const staffRef = rtdbRef(rtdb, `Users/${staffId}`);
    await runTransaction(staffRef, (current) => {
      const data = current || {};
      const count = Number(data.ratingCount || 0) || 0;
      const sum = Number(data.ratingSum || 0) || 0;
      const nextCount = count + 1;
      const nextSum = sum + Number(rating || 0);
      const avg = nextSum / nextCount;
      return {
        ...data,
        ratingCount: nextCount,
        ratingSum: nextSum,
        ratingAverage: Number(avg.toFixed(2)),
        rating: Number(avg.toFixed(1)),
        latestReview: comment || data.latestReview || "",
        latestReviewAt: Date.now()
      };
    });
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackRequest) return;
    const id = feedbackRequest.id;
    if (!id) return;
    if (feedbackRequest.feedbackPending === false) {
      setFeedbackError("Feedback has already been submitted for this request.");
      return;
    }
    if (!feedbackRating || feedbackRating < 1) {
      setFeedbackError("Please select a rating before submitting.");
      return;
    }
    try {
      setFeedbackSaving(true);
      const payload = {
        feedbackRating: Number(feedbackRating),
        feedbackComment: String(feedbackComment || "").trim(),
        feedbackById: String(ctx.authUser?.uid || ""),
        feedbackByName: String(
          ctx.displayName || ctx.profile?.fullName || ctx.profile?.name || ""
        ),
        feedbackAt: rtdbServerTimestamp(),
        feedbackPending: false,
        updatedAt: rtdbServerTimestamp()
      };
      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), payload);

      const staffId = String(feedbackRequest.housekeeperId || "").trim();
      await updateStaffRating(staffId, feedbackRating, payload.feedbackComment);
      if (staffId) {
        await sendNotification({
          toUserId: staffId,
          requestId: id,
          title: "Customer feedback received",
          body: "A customer left feedback on a completed request."
        });
      }
      closeFeedbackModal();
    } finally {
      setFeedbackSaving(false);
    }
  };

  React.useEffect(() => {
    if (!pendingFeedbackId) return;
    if (!requests || requests.length === 0) return;
    const match =
      requests.find((r) => String(r.id || "") === pendingFeedbackId) ||
      requests.find((r) => String(r.requestId || "") === pendingFeedbackId);
    if (!match) return;
    openTrackModal(match);
    openFeedbackModal(match);
    if (typeof clearPendingFeedback === "function") clearPendingFeedback();
  }, [pendingFeedbackId, requests, clearPendingFeedback]);

  React.useEffect(() => {
    if (!openTrackFor) return;
    if (!requests || requests.length === 0) return;
    const match =
      requests.find((r) => String(r.id || "") === openTrackFor) ||
      requests.find((r) => String(r.requestId || "") === openTrackFor);
    if (match) {
      openTrackModal(match);
      if (typeof setSuccessId === "function") setSuccessId(openTrackFor);
    }
    if (typeof clearRouteState === "function") clearRouteState();
  }, [openTrackFor, requests, clearRouteState, setSuccessId]);

  return (
    <>
      <section className="panel card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Cleaning Requests</p>
            <h3>Create a booking</h3>
          </div>
        </div>
        <p className="muted small">
          Request cleaning service by choosing a service type and preferred schedule.
        </p>
        <div className="settings-actions">
          <button className="btn pill primary" type="button" onClick={startBooking}>
            Start booking
          </button>
        </div>
      </section>

      <BookingWizardModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        authUser={ctx.authUser}
        profile={ctx.profile}
        displayName={ctx.displayName}
        addressLine={addressLine || ctx.profile?.location || ""}
        preferredStaffId={ctx.profile?.preferredStaffId || ctx.profile?.preferredHousekeeperId || ""}
        preferredStaffName={ctx.profile?.preferredStaffName || ctx.profile?.preferredHousekeeperName || ""}
        preferredStaffRole={ctx.profile?.preferredStaffRole || ctx.profile?.preferredHousekeeperRole || ""}
        onSubmitted={(requestId) => {
          setSuccessId(String(requestId || ""));
          setBookingOpen(false);
          setToastMessage(
            "Your request has been submitted. Please wait for a householder staff to confirm. " +
              "You can track the status in the request list."
          );
          setShowSubmittedModal(true);
        }}
      />

      <section className="panel card" id="customer-requests-tracker">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Tracker</p>
            <h3>Your requests</h3>
          </div>
        </div>

        <div className="filters filters--compact">
          <div className="filter-search">
            <i className="fas fa-search" aria-hidden="true"></i>
            <input
              type="text"
              placeholder="Search service, staff, or request ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search requests"
            />
          </div>
          <div className="filter-selects">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="ALL">All status</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted small">Loading your requests...</div>
        ) : requests.length === 0 ? (
          <div className="muted small">No requests yet. Create one above.</div>
        ) : (
  (() => {
    const sortByLatest = (a, b) => {
      const aTime =
        Number(a.updatedAt || a.completedAt || a.acceptedAt || a.confirmedAt || a.createdAt || a.timestamp || 0) || 0;
      const bTime =
        Number(b.updatedAt || b.completedAt || b.acceptedAt || b.confirmedAt || b.createdAt || b.timestamp || 0) || 0;
      return bTime - aTime;
    };
    const term = String(searchTerm || "").trim().toLowerCase();
    const filtered = (requests || []).filter((r) => {
      const status = normalizeStatus(r.status);
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!term) return true;
      const haystack = [
        r.serviceType,
        r.service,
        r.housekeeperName,
        r.requestId,
        r.id,
        r.location,
        r.address
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    const grouped = {
      PENDING: [],
      ACCEPTED: [],
      COMPLETED: []
    };
    filtered.forEach((r) => {
      const bucket = normalizeStatus(r.status);
      if (!grouped[bucket]) grouped.PENDING.push(r);
      else grouped[bucket].push(r);
    });
    Object.keys(grouped).forEach((key) => grouped[key].sort(sortByLatest));

    const renderGroup = (title, list) => (
      <div className="request-group" key={title}>
        <div className="request-group__header">
          <h4>{title}</h4>
          <span className="muted small">{list.length} request{list.length === 1 ? "" : "s"}</span>
        </div>
        {list.length === 0 ? (
          <div className="muted small">No requests in this status.</div>
        ) : (
          <div className="request-list">
            {list.map((r) => {
              const rowId = String(r.requestId || r.id || "");
              const highlight = successId && rowId && rowId === successId;
              return (
                <div
                  key={rowId || r.id}
                  className={`request-row ${highlight ? "highlight" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openTrackModal(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openTrackModal(r);
                    }
                  }}
                >
                  <div className="request-meta">
                    <strong>{r.serviceType || "Service"}</strong>
                    <div className="schedule-pill">
                      <span className="schedule-label">Schedule</span>
                      <span className="schedule-value">{formatSchedule(r)}</span>
                    </div>
                    {r.housekeeperName && (
                      <span className="muted small">Housekeeper: {r.housekeeperName}</span>
                    )}
                  </div>

                  <div className="request-status">
                    <StatusTracker status={r.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

    if (filtered.length === 0) {
      return <div className="muted small">No matching requests.</div>;
    }

    return (
      <div className="request-groups">
        {renderGroup("Pending", grouped.PENDING)}
        {renderGroup("Accepted / In-Progress", grouped.ACCEPTED)}
        {renderGroup("Completed", grouped.COMPLETED)}
      </div>
    );
  })()
)}
</section>

      {showSubmittedModal && (
        <div className="customer-modal">
          <div
            className="customer-modal__backdrop"
            onClick={() => setShowSubmittedModal(false)}
          />
          <div className="customer-modal__panel" role="dialog" aria-modal="true">
            <div className="customer-modal__icon">
              <i className="fas fa-check"></i>
            </div>
            <h4>Request submitted</h4>
            <p>{toastMessage}</p>
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill ghost"
                onClick={() => setShowSubmittedModal(false)}
              >
                Okay
              </button>
              <button
                type="button"
                className="btn pill primary"
                onClick={() => {
                  setShowSubmittedModal(false);
                  const latest =
                    requests.find(
                      (r) => String(r.requestId || r.id || "") === String(successId || "")
                    ) || requests[0];
                  document.getElementById("customer-requests-tracker")?.scrollIntoView({
                    behavior: "smooth"
                  });
                  openTrackModal(latest);
                }}
              >
                Track request
              </button>
            </div>
          </div>
        </div>
      )}
    
      {showTrackModal && activeRequest && (
        <div className="customer-modal">
          <div
            className="customer-modal__backdrop"
            onClick={() => setShowTrackModal(false)}
          />
          <div className="customer-modal__panel track-modal" role="dialog" aria-modal="true">
            <div className="customer-modal__icon alt">
              <i className="fas fa-receipt"></i>
            </div>
            <h4>Request details</h4>
            <StatusBadge status={activeRequest.status} />
            <div className="track-modal__grid">
              <div>
                <small>Request ID</small>
                <strong>{activeRequest.requestId || activeRequest.id || "--"}</strong>
              </div>
              <div>
                <small>Service</small>
                <strong>{activeRequest.serviceType || activeRequest.service || "--"}</strong>
              </div>
                <div>
                  <small>Payment</small>
                  <strong>{formatPaymentMethodLabel(activeRequest.paymentMethod)}</strong>
                </div>
              <div>
                <small>Schedule</small>
                <strong>{formatSchedule(activeRequest)}</strong>
              </div>
              <div>
                <small>Address</small>
                <strong>{activeRequest.location || activeRequest.address || addressLine || "--"}</strong>
              </div>
              <div>
                <small>Staff</small>
                <strong>{activeRequest.housekeeperName || "Pending assignment"}</strong>
              </div>
              <div>
                <small>Status</small>
                <strong>{normalizeStatus(activeRequest.status)}</strong>
              </div>
              <div>
                <small>Total</small>
                <strong>
                  {typeof activeRequest.totalPrice === "number"
                    ? `PHP ${Math.round(activeRequest.totalPrice).toLocaleString()}`
                    : activeRequest.payout || "--"}
                </strong>
              </div>
            </div>
            {activeRequest.notes && (
              <div className="track-modal__notes">
                <small>Notes</small>
                <p>{activeRequest.notes}</p>
              </div>
            )}
            {String(activeRequest.status || "").toUpperCase() === "COMPLETED" && (
              <div className="track-modal__notes">
                {activeRequest.feedbackPending ? (
                  <>
                    <small>Feedback</small>
                    <p>Please leave a rating and feedback for your staff.</p>
                    <div className="track-modal__actions">
                      <button
                        type="button"
                        className="btn pill ghost"
                        onClick={() => openFeedbackModal(activeRequest)}
                      >
                        Leave feedback
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <small>Feedback</small>
                    <p>
                      Rating:{" "}
                      {activeRequest.feedbackRating
                        ? `${Number(activeRequest.feedbackRating).toFixed(1)} / 5`
                        : "Submitted"}
                    </p>
                    {activeRequest.feedbackComment && (
                      <p className="feedback-comment">"{activeRequest.feedbackComment}"</p>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill primary"
                onClick={() => setShowTrackModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && feedbackRequest && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={closeFeedbackModal} />
          <div className="customer-modal__panel feedback-modal" role="dialog" aria-modal="true">
            <div className="customer-modal__icon alt">
              <i className="fas fa-star"></i>
            </div>
            <h4>Leave feedback</h4>
            <p>Rate your staff and add a short note about the service.</p>
            <div className="feedback-form">
              <div className="star-picker">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`star-btn ${feedbackRating >= value ? "on" : ""}`}
                    onClick={() => {
                      setFeedbackRating(value);
                      if (feedbackError) setFeedbackError("");
                    }}
                    aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                  >
                    <i className="fas fa-star"></i>
                  </button>
                ))}
                <span className="star-label">
                  {feedbackRating ? `${feedbackRating}.0 / 5` : "Tap to rate"}
                </span>
              </div>
              <label className="feedback-label">
                Notes (optional)
                <textarea
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Share what went well or what could improve..."
                />
              </label>
              {feedbackError && <div className="feedback-error">{feedbackError}</div>}
            </div>
            <div className="customer-modal__actions">
              <button className="btn pill ghost" type="button" onClick={closeFeedbackModal}>
                Cancel
              </button>
              <button
                className="btn pill primary"
                type="button"
                onClick={handleSubmitFeedback}
                disabled={feedbackSaving}
              >
                {feedbackSaving ? "Submitting..." : "Submit feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



