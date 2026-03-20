import React, { useMemo, useState } from "react";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { useCustomerNotifications, useCustomerServiceRequests } from "./customerData";
import { rtdb } from "../../firebase";
import {
  push,
  ref as rtdbRef,
  runTransaction,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate
} from "firebase/database";

function formatWhen(value) {
  if (value == null) return "";
  if (typeof value?.toDate === "function") {
    const dateObj = value.toDate();
    const dateLabel = dateObj.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const timeLabel = dateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dateLabel} • ${timeLabel}`;
  }
  const ms = typeof value === "number" ? value : Number(value);
  let dateObj = null;
  if (Number.isFinite(ms) && ms > 0) {
    dateObj = new Date(ms);
  } else {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) dateObj = parsed;
  }
  if (!dateObj) return "";
  const dateLabel = dateObj.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const timeLabel = dateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${dateLabel} • ${timeLabel}`;
}

function formatNotificationBody(text) {
  if (!text) return "";
  const raw = String(text);
  return raw.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/g, (match) => {
    const parsed = new Date(match);
    if (Number.isNaN(parsed.getTime())) return match;
    const dateLabel = parsed.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const timeLabel = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dateLabel} • ${timeLabel}`;
  });
}

function inferType(n) {
  const text = `${n?.title || ""} ${n?.body || ""}`.toLowerCase();
  if (text.includes("rate") || text.includes("feedback")) return "feedback";
  if (text.includes("payment") || text.includes("invoice") || text.includes("receipt")) return "payment";
  if (text.includes("schedule") || text.includes("tomorrow") || text.includes("today") || text.includes("upcoming")) return "schedule";
  if (text.includes("request") || text.includes("accepted") || text.includes("completed") || text.includes("pending")) return "request";
  return "general";
}

function CustomerNotificationsPage() {
  const [filter, setFilter] = useState("all");

  return (
    <CustomerChrome>
      <CustomerNotificationsInner filter={filter} setFilter={setFilter} />
    </CustomerChrome>
  );
}

export default CustomerNotificationsPage;

function CustomerNotificationsInner({ filter, setFilter }) {
  const ctx = useCustomerChrome();
  const { notifications, loading } = useCustomerNotifications(ctx.authUser?.uid, { limit: 80 });
  const { requests } = useCustomerServiceRequests(ctx.authUser?.uid);
  const [activeNotif, setActiveNotif] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRequest, setFeedbackRequest] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  const derivedAlerts = useMemo(() => {
    const list = [];
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    (requests || []).slice(0, 10).forEach((r) => {
      const status = String(r.status || "PENDING").toUpperCase();
      const rDate = String(r.date || "").trim() || String(r.startDate || "").trim().slice(0, 10);
      const hasFutureDate = rDate && /^\d{4}-\d{2}-\d{2}/.test(rDate) && rDate >= todayIso;
      const total = typeof r.totalPrice === "number" ? r.totalPrice : Number(r.totalPrice);
      const hasTotal = Number.isFinite(total) && total > 0;
      const unpaid = !r.paidAt && !r.paidVia && !r.paymentId;
      const feedbackPending = r.feedbackPending === true;

      if (hasFutureDate) {
        list.push({
          id: `sched_${r.requestId || r.id}`,
          title: "Upcoming schedule",
          body: `${r.serviceType || "Service"} is scheduled for ${String(r.startDate || `${r.date || ""} ${r.time || ""}`).trim() || rDate}.`,
          createdAt: r.updatedAt || r.createdAt || 0,
          type: "schedule"
        });
      }

      if (hasTotal && unpaid && (status === "ACCEPTED" || status === "COMPLETED")) {
        list.push({
          id: `pay_${r.requestId || r.id}`,
          title: "Payment reminder",
          body: `Payment is due for ${r.serviceType || "Service"} (${Math.round(total).toLocaleString()} PHP).`,
          createdAt: r.updatedAt || r.createdAt || 0,
          type: "payment"
        });
      }

      if (status === "COMPLETED" && feedbackPending) {
        list.push({
          id: `feedback_${r.requestId || r.id}`,
          title: "Rate your service",
          body: `Please rate ${r.housekeeperName || "your staff"} for ${r.serviceType || "this service"}.`,
          createdAt: r.updatedAt || r.completedAt || r.createdAt || 0,
          type: "feedback",
          requestId: r.id || r.requestId
        });
      }

      if (status === "PENDING") {
        list.push({
          id: `req_${r.requestId || r.id}`,
          title: "Request pending",
          body: `${r.serviceType || "Service"} is awaiting staff acceptance.`,
          createdAt: r.updatedAt || r.createdAt || 0,
          type: "request"
        });
      } else if (status === "ACCEPTED") {
        list.push({
          id: `req_${r.requestId || r.id}`,
          title: "Request accepted",
          body: `${r.serviceType || "Service"} has been accepted${r.housekeeperName ? ` by ${r.housekeeperName}` : ""}.`,
          createdAt: r.updatedAt || r.createdAt || 0,
          type: "request"
        });
      } else if (status === "COMPLETED") {
        list.push({
          id: `req_${r.requestId || r.id}`,
          title: "Service completed",
          body: `${r.serviceType || "Service"} is marked as completed.`,
          createdAt: r.updatedAt || r.createdAt || 0,
          type: "request"
        });
      }
    });
    return list
      .filter((a) => a.createdAt)
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
      .slice(0, 25);
  }, [requests]);

  const combined = useMemo(() => {
    const fromDb = (notifications || []).map((n) => ({ ...n, type: inferType(n), _source: "db" }));
    const merged = [...fromDb, ...derivedAlerts];
    const byId = new Map();
    merged.forEach((n) => {
      if (!n?.id) return;
      if (!byId.has(n.id)) byId.set(n.id, n);
    });
    return Array.from(byId.values()).sort((a, b) => (Number(b.createdAt || 0) || 0) - (Number(a.createdAt || 0) || 0));
  }, [derivedAlerts, notifications]);

  const visible = useMemo(() => {
    if (filter === "all") return combined;
    return combined.filter((n) => String(n.type || "general") === filter);
  }, [combined, filter]);

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

  const markRead = async (notif) => {
    if (!notif || notif._source !== "db") return;
    const uid = ctx.authUser?.uid;
    if (!uid || !notif.id) return;
    try {
      await rtdbUpdate(rtdbRef(rtdb, `UserNotifications/${uid}/${notif.id}`), {
        read: true,
        readAt: rtdbServerTimestamp()
      });
    } catch (_) {
      // ignore
    }
  };

  const markUnread = async (notif) => {
    if (!notif || notif._source !== "db") return;
    const uid = ctx.authUser?.uid;
    if (!uid || !notif.id) return;
    try {
      await rtdbUpdate(rtdbRef(rtdb, `UserNotifications/${uid}/${notif.id}`), {
        read: false,
        readAt: ""
      });
    } catch (_) {
      // ignore
    }
  };

  const markAllRead = () => {
    (notifications || [])
      .filter((n) => !n.read)
      .forEach((n) => markRead({ ...n, _source: "db" }));
  };

  const openNotif = (notif) => {
    if (!notif) return;
    if (notif._source === "db" && !notif.read) {
      markRead(notif);
      setActiveNotif({ ...notif, read: true });
      return;
    }
    setActiveNotif(notif);
  };

  const closeNotif = () => setActiveNotif(null);

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
    const id = feedbackRequest.id || feedbackRequest.requestId;
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

  return (
    <>
      <section className="panel card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Notifications</p>
            <h3>Alerts & updates</h3>
          </div>
          <div className="notif-toolbar">
            <span className="pill stat">{visible.length}</span>
            <button className="btn pill ghost" type="button" onClick={markAllRead}>
              Mark all read
            </button>
            <select
              className="pill-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter notifications"
            >
              <option value="all">All</option>
              <option value="schedule">Upcoming schedules</option>
              <option value="payment">Payment reminders</option>
              <option value="request">Request updates</option>
              <option value="feedback">Feedback</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
        {loading && notifications.length === 0 ? (
          <div className="muted small">Loading notifications...</div>
        ) : visible.length === 0 ? (
          <div className="muted small">No alerts yet.</div>
        ) : (
          <div className="notification-list">
            {visible.slice(0, 40).map((n) => {
              const canRate =
                String(n.type || "") === "feedback" &&
                String(n.requestId || n.requestID || n.request_id || "").trim();
              const isUnread = n._source === "db" ? !n.read : false;
              return (
                <div
                  key={n.id}
                  className={`notification-item ${isUnread ? "unread" : "read"}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openNotif(n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openNotif(n);
                    }
                  }}
                >
                  <div className="notification-top">
                    <span className="notification-title">{n.title || "Update"}</span>
                    <span className="notification-time">{formatWhen(n.createdAt) || "--"}</span>
                  </div>
                  <p className="notification-body">
                    {formatNotificationBody(n.body || n.message || "")}
                  </p>
                  {canRate && (
                    <div className="notif-actions">
                      <button
                        className="btn pill small primary"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const requestId = String(n.requestId || n.requestID || n.request_id || "").trim();
                          if (!requestId) return;
                          const match =
                            requests.find((r) => String(r.id || "") === requestId) ||
                            requests.find((r) => String(r.requestId || "") === requestId);
                          if (match) openFeedbackModal(match);
                        }}
                      >
                        Rate now
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {activeNotif && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={closeNotif} />
          <div className="customer-modal__panel" role="dialog" aria-modal="true">
            <div className="customer-modal__icon alt">
              <i className="fas fa-bell"></i>
            </div>
            <h4>{activeNotif.title || "Notification"}</h4>
            <p className="notification-time modal-time">{formatWhen(activeNotif.createdAt) || "--"}</p>
            <p>{formatNotificationBody(activeNotif.body || activeNotif.message || "--")}</p>
            <div className="customer-modal__actions">
              {activeNotif._source === "db" && activeNotif.read && (
                <button
                  className="btn pill ghost"
                  type="button"
                  onClick={() => {
                    markUnread(activeNotif);
                    closeNotif();
                  }}
                >
                  Mark unread
                </button>
              )}
              <button className="btn pill primary" type="button" onClick={closeNotif}>
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










