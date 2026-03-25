import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { useCustomerNotifications, useCustomerServiceRequests } from "./customerData";
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
  if (value === "CANCELLED" || value === "DECLINED" || value.includes("DECLIN")) return "CANCELLED";
  if (value === "REJECTED" || value.includes("REJECT")) return "CANCELLED";
  if (value === "ACCEPTED") return "ACCEPTED";
  if (value === "COMPLETED") return "COMPLETED";
  return "PENDING";
}

function StatusTracker({ status }) {
  const current = normalizeStatus(status);
  const label =
    current === "COMPLETED"
      ? "Completed"
      : current === "ACCEPTED"
        ? "In-Progress"
        : current === "CANCELLED"
          ? "Cancelled"
          : "Pending";

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
        {current === "CANCELLED" && <i className="fas fa-times"></i>}
      </div>
      <span className="status-label">{label}</span>
    </div>
  );
}

function DetailedStatusTracker({ request }) {
  const status = normalizeStatus(request?.status);
  const paymentStatus = String(request?.paymentStatus || "").toUpperCase();
  const paymentMethod = String(request?.paymentMethod || request?.paidVia || "").toUpperCase();
  const hasPaymentMethod = Boolean(paymentMethod);
  const paymentReceived = paymentStatus === "PAID" || Boolean(request?.paidAt);

  const steps =
    status === "CANCELLED"
      ? [
          { key: "requested", label: "Requested", done: true },
          { key: "cancelled", label: "Cancelled", done: true }
        ]
      : (() => {
          const baseSteps = [
            { key: "requested", label: "Requested", ready: true },
            {
              key: "payment_set",
              label: paymentMethod === "CASH_ON_HAND" ? "Cash on hand reserved" : "Payment method set",
              ready: hasPaymentMethod
            },
            {
              key: "accepted",
              label: "Staff accepted",
              ready: status !== "PENDING"
            },
            {
              key: "payment_paid",
              label: paymentMethod === "CASH_ON_HAND" ? "Payment received" : "Payment confirmed",
              ready: paymentReceived
            },
            { key: "completed", label: "Service completed", ready: status === "COMPLETED" }
          ];
          let reached = true;
          return baseSteps.map((step) => {
            const done = reached && step.ready;
            if (!done) reached = false;
            return { key: step.key, label: step.label, done };
          });
        })();

  const completedSteps = steps.filter((s) => s.done).length;
  const progress =
    steps.length <= 1 ? 100 : Math.max(0, ((completedSteps - 1) / (steps.length - 1)) * 100);
  const percentLabel = `${Math.round(progress)}%`;

  return (
    <div
      className={`status-tracker status-tracker--line status-${status.toLowerCase()}`}
      aria-label={`Request tracker: ${status}`}
      style={{ "--progress": progress }}
    >
      <div className="status-line" aria-hidden="true">
        <span className="status-line__bg"></span>
        <span className="status-line__fill"></span>
      </div>
      <div className="status-line__percent" aria-hidden="true">
        {percentLabel}
      </div>
      <div className="status-line__steps">
        {steps.map((step) => (
          <div key={step.key} className={`status-step ${step.done ? "on" : ""}`}>
            <span className="status-dot" aria-hidden="true"></span>
            <span className="status-label">{step.label}</span>
          </div>
        ))}
      </div>
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
  const pathname = String(location?.pathname || "");
  const isRequestsRoute = pathname.includes("/requests");
  const storedOpenTrackFor = (() => {
    try {
      return String(sessionStorage.getItem("hc_customer_open_track_for") || "").trim();
    } catch (_) {
      return "";
    }
  })();
  const storedAutoOpenTrackModal = (() => {
    try {
      return sessionStorage.getItem("hc_customer_open_track_modal") === "1";
    } catch (_) {
      return false;
    }
  })();

  useEffect(() => {
    if (!isRequestsRoute) return;
    const shouldOpen = Boolean(location?.state?.openBooking);
    if (!shouldOpen) return;
    setBookingOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [isRequestsRoute, location?.pathname, location?.state, navigate]);

  useEffect(() => {
    if (!isRequestsRoute) return;
    const requestId = String(location?.state?.openFeedbackFor || "").trim();
    if (!requestId) return;
    setPendingFeedbackId(requestId);
    navigate(location.pathname, { replace: true, state: {} });
  }, [isRequestsRoute, location?.pathname, location?.state, navigate]);

  if (!isRequestsRoute) {
    return null;
  }

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
        openTrackFor={String(location?.state?.openTrackFor || storedOpenTrackFor || "").trim()}
        autoOpenTrackModal={Boolean(location?.state?.openTrackModal) || storedAutoOpenTrackModal}
        clearRouteState={() => {
          try {
            sessionStorage.removeItem("hc_customer_open_track_for");
            sessionStorage.removeItem("hc_customer_open_track_modal");
          } catch (_) {
            // Ignore storage cleanup issues.
          }
          navigate(location.pathname, { replace: true, state: {} });
        }}
        isActiveRoute={isRequestsRoute}
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
  autoOpenTrackModal = false,
  clearRouteState,
  isActiveRoute = true
}) {
  const location = useLocation();
  const ctx = useCustomerChrome();
  const { requests, loading } = useCustomerServiceRequests(ctx.authUser?.uid);
  const { notifications } = useCustomerNotifications(ctx.authUser?.uid, { limit: 80 });
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [queuedTrackRequest, setQueuedTrackRequest] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRequest, setFeedbackRequest] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [arrivalTarget, setArrivalTarget] = useState(null);
  const [arrivalSubmitting, setArrivalSubmitting] = useState(false);
  const arrivalHandledRef = React.useRef(new Set());

  React.useEffect(() => {
    return () => {
      setShowTrackModal(false);
      setActiveRequest(null);
      setQueuedTrackRequest(null);
      setShowFeedbackModal(false);
      setFeedbackRequest(null);
      setShowRefundModal(false);
      setRefundTarget(null);
      setShowCancelModal(false);
      setCancelTarget(null);
      setShowArrivalModal(false);
      setArrivalTarget(null);
    };
  }, []);

  React.useEffect(() => {
    setShowTrackModal(false);
    setActiveRequest(null);
    setQueuedTrackRequest(null);
    setShowFeedbackModal(false);
    setFeedbackRequest(null);
    setShowRefundModal(false);
    setRefundTarget(null);
    setShowCancelModal(false);
    setCancelTarget(null);
    setShowArrivalModal(false);
    setArrivalTarget(null);
  }, [location.pathname]);
  const markArrivalNotificationRead = async (notifId) => {
    const uid = ctx.authUser?.uid;
    if (!uid || !notifId) return;
    try {
      await rtdbUpdate(rtdbRef(rtdb, `UserNotifications/${uid}/${notifId}`), {
        read: true,
        readAt: rtdbServerTimestamp()
      });
    } catch (_) {
      // ignore
    }
  };

  const startBooking = () => {
    clearSuccess();
    setBookingOpen(true);
  };

  const addressLine = [
    ctx.profile?.street || ctx.profile?.address,
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

  const formatBookedAt = (req) => {
    const raw =
      req?.createdAt ??
      req?.timestamp ??
      req?.requestedAt ??
      req?.requestCreatedAt ??
      req?.created_at ??
      "";
    if (!raw) return "--";
    if (typeof raw?.toDate === "function") {
      const dateObj = raw.toDate();
      const dateLabel = dateObj.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      const timeLabel = dateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${dateLabel} • ${timeLabel}`;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return String(raw);
    const dateLabel = parsed.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const timeLabel = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dateLabel} • ${timeLabel}`;
  };

  const canCancelRequest = (req) => {
    const status = String(req?.status || "").toUpperCase();
    if (["COMPLETED", "DECLINED", "CANCELLED"].includes(status)) return false;
    const paymentMethod = String(req?.paymentMethod || req?.paidVia || "").toUpperCase();
    const paymentStatus = String(req?.paymentStatus || "").toUpperCase();
    const paid = paymentStatus === "PAID" || Boolean(req?.paidAt);
    const staffConfirmed = Boolean(req?.customerArrivalConfirmed);
    if (paymentMethod === "CASH_ON_HAND") {
      return !paid && !["COMPLETED", "DECLINED", "CANCELLED"].includes(status);
    }
    if (staffConfirmed) return false;
    return ["PENDING", "PENDING_PAYMENT", "ACCEPTED", "CONFIRMED"].includes(status);
  };

  const canRequestRefund = (req) => {
    const status = String(req?.status || "").toUpperCase();
    if (status === "COMPLETED") return false;
    const paymentMethod = String(req?.paymentMethod || req?.paidVia || "").toUpperCase();
    if (paymentMethod !== "STATIC_QR") return false;
    const paymentStatus = String(req?.paymentStatus || "").toUpperCase();
    const paid = paymentStatus === "PAID" || Boolean(req?.paidAt);
    const refundStatus = String(req?.refundStatus || "").toUpperCase();
    if (!paid) return false;
    return !["REQUESTED", "APPROVED", "DENIED", "REFUNDED"].includes(refundStatus);
  };

  const openRefundModal = (req) => {
    if (!req) return;
    setRefundTarget(req);
    setRefundReason("");
    setRefundError("");
    setShowRefundModal(true);
  };

  const openCancelModal = (req) => {
    if (!req) return;
    setCancelTarget(req);
    setShowCancelModal(true);
  };

  const handleSubmitRefund = async () => {
    if (!refundTarget || !ctx.authUser?.uid) return;
    const reason = String(refundReason || "").trim();
    if (!reason) {
      setRefundError("Please provide a reason for the refund request.");
      return;
    }
    try {
      setRefundSubmitting(true);
      const refundListRef = rtdbRef(rtdb, "RefundRequests");
      const refundRef = push(refundListRef);
      const refundId = refundRef.key;
      const requestId = String(refundTarget.requestId || refundTarget.id || "").trim();
      const payload = {
        refundId,
        requestId,
        customerId: ctx.authUser.uid,
        customerName: String(ctx.displayName || ctx.authUser?.email || "Customer").trim(),
        reason,
        status: "PENDING",
        serviceType: refundTarget.serviceType || refundTarget.service || "",
        paymentMethod: String(refundTarget.paymentMethod || refundTarget.paidVia || ""),
        paymentStatus: String(refundTarget.paymentStatus || ""),
        paidAt: refundTarget.paidAt || "",
        totalPrice: refundTarget.totalPrice || 0,
        createdAt: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp()
      };
      await rtdbSet(refundRef, payload);
      const adminNotifRef = push(rtdbRef(rtdb, "AdminNotifications"));
      await rtdbSet(adminNotifRef, {
        title: "Refund request",
        message: `${payload.customerName} requested a refund for ${payload.serviceType || "a service"}.`,
        type: "system",
        status: "unread",
        requestId,
        refundRequestId: refundId,
        customerId: payload.customerId,
        reason,
        createdAt: rtdbServerTimestamp()
      });
      if (requestId) {
        await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${requestId}`), {
          refundStatus: "REQUESTED",
          refundReason: reason,
          refundRequestId: refundId,
          refundRequestedAt: rtdbServerTimestamp(),
          updatedAt: rtdbServerTimestamp()
        });
      }
      setShowRefundModal(false);
      setRefundTarget(null);
      setRefundReason("");
      setRefundError("");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget || !ctx.authUser?.uid) return;
    const requestId = String(cancelTarget.requestId || cancelTarget.id || "").trim();
    if (!requestId) return;
    try {
      setCancelSubmitting(true);
      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${requestId}`), {
        status: "CANCELLED",
        cancelledAt: rtdbServerTimestamp(),
        cancelledById: ctx.authUser.uid,
        cancelledByName: String(ctx.displayName || ctx.authUser?.email || "Customer").trim(),
        updatedAt: rtdbServerTimestamp()
      });
      setShowCancelModal(false);
      setCancelTarget(null);
    } finally {
      setCancelSubmitting(false);
    }
  };

  const openArrivalModal = (req) => {
    if (!req) return;
    if (showTrackModal) {
      setQueuedTrackRequest(activeRequest || req);
      setShowTrackModal(false);
      setActiveRequest(null);
    }
    setArrivalTarget(req);
    setShowArrivalModal(true);
  };

  const handleConfirmArrival = async () => {
    if (!arrivalTarget || !ctx.authUser?.uid) return;
    const requestId = String(arrivalTarget.requestId || arrivalTarget.id || "").trim();
    if (!requestId) return;
    try {
      setArrivalSubmitting(true);
      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${requestId}`), {
        customerArrivalConfirmed: true,
        customerArrivalConfirmedAt: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp()
      });
      const handledKey = `${requestId}_${String(arrivalTarget?.staffArrivedAt || "")}`;
      const storageKey = `hc_arrival_handled_${ctx.authUser?.uid || "guest"}_${handledKey}`;
      arrivalHandledRef.current.add(handledKey);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, "1");
      }
      setShowArrivalModal(false);
      setArrivalTarget(null);
      if (queuedTrackRequest) {
        setActiveRequest(queuedTrackRequest);
        setShowTrackModal(true);
        setQueuedTrackRequest(null);
      }
    } finally {
      setArrivalSubmitting(false);
    }
  };

  const openTrackModal = (req) => {
    if (!req) return;
    if (showArrivalModal) {
      setQueuedTrackRequest(req);
      return;
    }
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
    if (!isActiveRoute) return;
    if (!pendingFeedbackId) return;
    if (!requests || requests.length === 0) return;
    const match =
      requests.find((r) => String(r.id || "") === pendingFeedbackId) ||
      requests.find((r) => String(r.requestId || "") === pendingFeedbackId);
    if (!match) return;
    openTrackModal(match);
    openFeedbackModal(match);
    if (typeof clearPendingFeedback === "function") clearPendingFeedback();
  }, [pendingFeedbackId, requests, clearPendingFeedback, isActiveRoute]);

  React.useEffect(() => {
    if (!isActiveRoute) return;
    if (!openTrackFor) return;
    if (!requests || requests.length === 0) return;
    const match =
      requests.find((r) => String(r.id || "") === openTrackFor) ||
      requests.find((r) => String(r.requestId || "") === openTrackFor);
    if (match) {
      if (autoOpenTrackModal) {
        openTrackModal(match);
      } else {
        if (typeof setSuccessId === "function") setSuccessId(openTrackFor);
        document.getElementById("customer-requests-tracker")?.scrollIntoView({
          behavior: "smooth"
        });
      }
    }
    if (typeof clearRouteState === "function") clearRouteState();
  }, [openTrackFor, requests, clearRouteState, setSuccessId, autoOpenTrackModal, isActiveRoute]);

  React.useEffect(() => {
    if (!isActiveRoute) return;
    if (!notifications || notifications.length === 0) return;
    if (!requests || requests.length === 0) return;
    if (showArrivalModal) return;
    if (showTrackModal || showRefundModal || showCancelModal || showFeedbackModal) return;
    const nextArrival = notifications.find((n) => {
      const title = String(n.title || "").toLowerCase();
      const body = String(n.body || "").toLowerCase();
      const isArrival = title.includes("arrived") || body.includes("arrived");
      if (!isArrival) return false;
      const requestId = String(n.requestId || "").trim();
      if (!requestId) return false;
      const match =
        requests.find((r) => String(r.id || "") === requestId) ||
        requests.find((r) => String(r.requestId || "") === requestId);
      if (!match || match.customerArrivalConfirmed || match.customerArrivalConfirmedAt) {
        if (n.id) markArrivalNotificationRead(n.id);
        return false;
      }
      const handledKey = `${requestId}_${String(match.staffArrivedAt || "")}`;
      const storageKey = `hc_arrival_handled_${ctx.authUser?.uid || "guest"}_${handledKey}`;
      if (arrivalHandledRef.current.has(handledKey)) return false;
      if (typeof window !== "undefined" && localStorage.getItem(storageKey)) return false;
      return true;
    });
    if (!nextArrival) return;
    const requestId = String(nextArrival.requestId || "").trim();
    const match =
      requests.find((r) => String(r.id || "") === requestId) ||
      requests.find((r) => String(r.requestId || "") === requestId);
    if (!match) return;
    const handledKey = `${requestId}_${String(match.staffArrivedAt || "")}`;
    const storageKey = `hc_arrival_handled_${ctx.authUser?.uid || "guest"}_${handledKey}`;
    arrivalHandledRef.current.add(handledKey);
    if (typeof window !== "undefined") localStorage.setItem(storageKey, "1");
    if (nextArrival.id) markArrivalNotificationRead(nextArrival.id);
    openArrivalModal(match);
  }, [
    notifications,
    requests,
    ctx.authUser?.uid,
    showArrivalModal,
    showTrackModal,
    showRefundModal,
    showCancelModal,
    showFeedbackModal,
    isActiveRoute
  ]);

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
            "Your request has been submitted. Please wait for a housekeeper to be accepted the request. " +
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

        <div className="request-tabs" role="tablist" aria-label="Request status">
          {(() => {
            const term = String(searchTerm || "").trim().toLowerCase();
            const baseFiltered = (requests || []).filter((r) => {
              if (!term) return true;
              const haystack = [
                r.serviceType,
                r.service,
                r.housekeeperName,
                r.requestId,
                r.id,
                r.location,
                r.street,
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
              COMPLETED: [],
              CANCELLED: []
            };
            baseFiltered.forEach((r) => {
              const bucket = normalizeStatus(r.status);
              if (!grouped[bucket]) grouped.PENDING.push(r);
              else grouped[bucket].push(r);
            });

            const tabs = [
              { key: "PENDING", label: "Pending" },
              { key: "ACCEPTED", label: "Accepted / In-Progress" },
              { key: "COMPLETED", label: "Completed" },
              { key: "CANCELLED", label: "Cancelled" }
            ];

            return tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.key}
                className={`request-tab ${statusFilter === tab.key ? "active" : ""}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="tab-count">{grouped[tab.key]?.length || 0}</span>
              </button>
            ));
          })()}
        </div>

        {loading ? (
          <div className="muted small">Loading your requests...</div>
        ) : requests.length === 0 ? (
          <div className="muted small">No requests yet. Create one above.</div>
        ) : (
          (() => {
            const sortByLatest = (a, b) => {
              const aTime =
                Number(
                  a.updatedAt ||
                    a.completedAt ||
                    a.acceptedAt ||
                    a.confirmedAt ||
                    a.createdAt ||
                    a.timestamp ||
                    0
                ) || 0;
              const bTime =
                Number(
                  b.updatedAt ||
                    b.completedAt ||
                    b.acceptedAt ||
                    b.confirmedAt ||
                    b.createdAt ||
                    b.timestamp ||
                    0
                ) || 0;
              return bTime - aTime;
            };
            const term = String(searchTerm || "").trim().toLowerCase();
            const filtered = (requests || []).filter((r) => {
              const status = normalizeStatus(r.status);
              if (status !== statusFilter) return false;
              if (!term) return true;
              const haystack = [
                r.serviceType,
                r.service,
                r.housekeeperName,
                r.requestId,
                r.id,
                r.location,
                r.street,
                r.address
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return haystack.includes(term);
            });

            filtered.sort(sortByLatest);

            if (filtered.length === 0) {
              return <div className="muted small">No requests in this status.</div>;
            }

            return (
              <div className="request-list">
                {filtered.map((r) => {
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
                        {(() => {
                          const rawStatus = String(r.status || "").toUpperCase();
                          const isDeclined =
                            rawStatus === "DECLINED" || rawStatus.includes("DECLIN") || rawStatus.includes("REJECT");
                          if (!isDeclined) return null;
                          return <span className="muted small">Declined by staff</span>;
                        })()}
                        {r.housekeeperName && (
                          <span className="muted small">Housekeeper: {r.housekeeperName}</span>
                        )}
                      </div>

                      <div className="request-status">
                        <DetailedStatusTracker request={r} />
                      </div>
                    </div>
                  );
                })}
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
                <strong>
                  {Array.isArray(activeRequest.serviceTypes) && activeRequest.serviceTypes.length > 0
                    ? activeRequest.serviceTypes.join(", ")
                    : activeRequest.serviceType || activeRequest.service || "--"}
                </strong>
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
                <small>Booked at</small>
                <strong>{formatBookedAt(activeRequest)}</strong>
              </div>
              <div>
                <small>Address</small>
                <strong>{activeRequest.location || activeRequest.street || activeRequest.address || addressLine || "--"}</strong>
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
            {activeRequest?.staffArrived && (
              <div className="track-modal__notes">
                <small>Arrival</small>
                <p>
                  {activeRequest.customerArrivalConfirmed
                    ? "Staff arrival confirmed."
                    : "Staff has marked arrival. Please confirm."}
                </p>
              </div>
            )}
            <div className="customer-modal__actions">
              {canRequestRefund(activeRequest) && (
                <button
                  type="button"
                  className="btn pill ghost"
                  onClick={() => openRefundModal(activeRequest)}
                >
                  Request refund
                </button>
              )}
              {activeRequest?.staffArrived && !activeRequest?.customerArrivalConfirmed && (
                <button
                  type="button"
                  className="btn pill ghost"
                  onClick={() => openArrivalModal(activeRequest)}
                >
                  Confirm staff arrival
                </button>
              )}
              {canCancelRequest(activeRequest) && (
                <button
                  type="button"
                  className="btn pill ghost"
                  onClick={() => openCancelModal(activeRequest)}
                >
                  Cancel request
                </button>
              )}
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

      {showRefundModal && refundTarget && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={() => setShowRefundModal(false)} />
          <div className="customer-modal__panel" role="dialog" aria-modal="true" aria-label="Request refund">
            <div className="customer-modal__icon alt">
              <i className="fas fa-rotate-left"></i>
            </div>
            <h4>Request a refund</h4>
            <p className="muted small">Tell us why you are requesting a refund.</p>
            <label className="feedback-label">
              Reason
              <textarea
                rows={4}
                value={refundReason}
                onChange={(e) => {
                  setRefundReason(e.target.value);
                  if (refundError) setRefundError("");
                }}
              
              />
            </label>
            {refundError && <div className="feedback-error">{refundError}</div>}
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill ghost"
                onClick={() => setShowRefundModal(false)}
                disabled={refundSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn pill primary"
                onClick={handleSubmitRefund}
                disabled={refundSubmitting}
              >
                {refundSubmitting ? "Submitting..." : "Submit refund request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && cancelTarget && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={() => setShowCancelModal(false)} />
          <div className="customer-modal__panel" role="dialog" aria-modal="true" aria-label="Cancel request">
            <div className="customer-modal__icon alt">
              <i className="fas fa-ban"></i>
            </div>
            <h4>Cancel this request?</h4>
            <p className="muted small">
              You can cancel while the request isn't completed. This action cannot be undone.
            </p>
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill ghost"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelSubmitting}
              >
                Keep request
              </button>
              <button
                type="button"
                className="btn pill primary"
                onClick={handleConfirmCancel}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? "Cancelling..." : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showArrivalModal && arrivalTarget && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={() => setShowArrivalModal(false)} />
          <div className="customer-modal__panel" role="dialog" aria-modal="true" aria-label="Confirm staff arrival">
            <div className="customer-modal__icon alt">
              <i className="fas fa-user-check"></i>
            </div>
            <h4>Confirm staff arrival</h4>
            <p className="muted small">
              Please confirm the staff has arrived at your location before payment or service begins.
            </p>
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill ghost"
                onClick={async () => {
                  if (!arrivalTarget?.id && !arrivalTarget?.requestId) {
                    setShowArrivalModal(false);
                    setArrivalTarget(null);
                    return;
                  }
                  try {
                    setArrivalSubmitting(true);
                    const requestId = String(arrivalTarget.requestId || arrivalTarget.id || "").trim();
                    if (requestId) {
                      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${requestId}`), {
                        staffArrived: false,
                        staffArrivedAt: "",
                        staffArrivedById: "",
                        staffArrivedByName: "",
                        customerArrivalConfirmed: false,
                        customerArrivalDeclinedAt: rtdbServerTimestamp(),
                        updatedAt: rtdbServerTimestamp()
                      });
                    }
                  } finally {
                    setArrivalSubmitting(false);
                    setShowArrivalModal(false);
                    setArrivalTarget(null);
                    if (queuedTrackRequest) {
                      setActiveRequest(queuedTrackRequest);
                      setShowTrackModal(true);
                      setQueuedTrackRequest(null);
                    }
                  }
                }}
                disabled={arrivalSubmitting}
              >
                Not yet
              </button>
              <button
                type="button"
                className="btn pill primary"
                onClick={handleConfirmArrival}
                disabled={arrivalSubmitting}
              >
                {arrivalSubmitting ? "Confirming..." : "Yes, staff arrived"}
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
