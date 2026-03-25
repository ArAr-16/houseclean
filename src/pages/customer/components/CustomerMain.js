import React from "react";
import { Link } from "react-router-dom";

function CustomerMain({
  basePath,
  onRequestCleaning,
  onOpenLatestRequestDetails,
  todayLabel,
  history,
  myRequestsLoading,
  latestRequest,
  formatWhen,
  preferredStaffId,
  onSelectPreferredStaff,
  promoCode,
  promoCredits,
  onOpenPaymentModal,
  onOpenRefundModal,
  canRequestRefund,
  staffDirectory = [],
  staffDirectoryLoading = false
}) {
  const normalizeStatus = (raw) => {
    const value = String(raw || "").trim().toUpperCase();
    if (value === "ACCEPTED") return "ACCEPTED";
    if (value === "COMPLETED") return "COMPLETED";
    return "PENDING";
  };
  const latestStatus = normalizeStatus(latestRequest?.status);
  const statusSteps = ["PENDING", "ACCEPTED", "COMPLETED"];
  const statusIndex = Math.max(0, statusSteps.indexOf(latestStatus));
  const progressPercent = (() => {
    if (statusIndex >= statusSteps.length - 1) return 100;
    if (statusSteps.length <= 1) return 100;
    return ((statusIndex * 2 + 1) / (statusSteps.length * 2)) * 100;
  })();
  const latestUpdateLabel =
    typeof formatWhen === "function" && latestRequest?.lastUpdatedAt
      ? formatWhen(latestRequest.lastUpdatedAt)
      : "";
  const serviceLabel = (() => {
    const serviceList = Array.isArray(latestRequest?.serviceTypes)
      ? latestRequest.serviceTypes
      : String(latestRequest?.serviceType || latestRequest?.service || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
    const baseServiceLabel = serviceList[0] || "Latest request";
    return serviceList.length > 1 ? `${baseServiceLabel} etc...` : baseServiceLabel;
  })();
  const paymentInfo = (() => {
    if (!latestRequest) return null;
    const status = String(latestRequest?.status || "").trim().toUpperCase();
    const paymentStatus = String(latestRequest?.paymentStatus || "").trim().toUpperCase();
    const paidVia = String(latestRequest?.paidVia || latestRequest?.paymentMethod || "").trim();
    if (status === "PENDING_PAYMENT") {
      return {
        label: "Pending payment",
        detail: "Complete payment to confirm your booking.",
        tone: "amber",
        action: "Pay now"
      };
    }
    if (status === "RESERVED" || paymentStatus === "RESERVED") {
      return {
        label: "Reserved",
        detail: "Cash on hand selected. Pay the staff on arrival.",
        tone: "blue",
        action: "View details"
      };
    }
    if (paymentStatus === "PAID" || ["CONFIRMED", "ACCEPTED", "COMPLETED"].includes(status)) {
      return {
        label: "Paid",
        detail: paidVia ? `Paid via ${paidVia.replace(/_/g, " ")}` : "Payment confirmed.",
        tone: "green",
        action: "View receipt"
      };
    }
    return {
      label: "Awaiting update",
      detail: "We will notify you once payment is confirmed.",
      tone: "gray",
      action: "View details"
    };
  })();
  const [copyStatus, setCopyStatus] = React.useState("");
  const [copyLinkStatus, setCopyLinkStatus] = React.useState("");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [staffModalOpen, setStaffModalOpen] = React.useState(false);
  const [activeStaff, setActiveStaff] = React.useState(null);
  const shareUrl = (() => {
    if (typeof window === "undefined") return "";
    const code = String(promoCode || "HC-000000").trim();
    const base = window.location.origin || "";
    return code ? `${base}/register?ref=${encodeURIComponent(code)}` : base;
  })();
  const shareText = "Get a cleaning credit when you book with my code.";
  const totalRequests = Array.isArray(history) ? history.length : 0;
  const statusCounts = (history || []).reduce(
    (acc, item) => {
      const status = String(item?.status || "").toUpperCase();
      if (status === "COMPLETED") acc.completed += 1;
      else if (status === "ACCEPTED" || status === "CONFIRMED" || status === "RESERVED") acc.active += 1;
      else acc.pending += 1;
      return acc;
    },
    { completed: 0, active: 0, pending: 0 }
  );
  const totalSpent = (history || []).reduce((sum, item) => {
    const value = String(item?.payout || "").replace(/[^\d.]/g, "");
    const num = Number(value);
    return sum + (Number.isFinite(num) ? num : 0);
  }, 0);
  const avgRating = (() => {
    const ratings = (history || [])
      .map((item) => Number(item?.feedbackRating || 0))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!ratings.length) return 0;
    const sum = ratings.reduce((a, b) => a + b, 0);
    return sum / ratings.length;
  })();
  const maxStatus = Math.max(1, statusCounts.completed, statusCounts.active, statusCounts.pending);
  const dayMs = 24 * 60 * 60 * 1000;
  const [statsRangeDays, setStatsRangeDays] = React.useState(7);

  const toMs = (value) => {
    if (value == null) return 0;
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(num) && num > 0) return num;
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const analytics = React.useMemo(() => {
    const now = Date.now();
    const rangeMs = statsRangeDays * dayMs;
    const bucketCount = 7;
    const bucketMs = rangeMs / bucketCount;
    const buckets = Array.from({ length: bucketCount }, () => ({ requests: 0, completed: 0, spent: 0 }));
    let rangeCompleted = 0;
    let rangeTotal = 0;
    let rangeSpent = 0;

    (history || []).forEach((item) => {
      const status = String(item?.status || "").toUpperCase();
      const createdAt = toMs(item?.when || item?.createdAt || item?.date || item?.startDate);
      if (!createdAt || createdAt < now - rangeMs) return;
      const index = Math.min(bucketCount - 1, Math.floor((createdAt - (now - rangeMs)) / bucketMs));
      if (index < 0 || index >= bucketCount) return;
      buckets[index].requests += 1;
      rangeTotal += 1;
      if (status === "COMPLETED") buckets[index].completed += 1;
      if (status === "COMPLETED") rangeCompleted += 1;
      const spentValue = Number(String(item?.payout || item?.totalPrice || 0).replace(/[^\d.]/g, ""));
      if (Number.isFinite(spentValue)) {
        buckets[index].spent += spentValue;
        rangeSpent += spentValue;
      }
    });

    const labels = Array.from({ length: bucketCount }, (_, idx) => {
      const end = new Date(now - rangeMs + (idx + 1) * bucketMs);
      return end.toLocaleDateString("default", { month: "short", day: "numeric" });
    });

    const completionRate = rangeTotal ? rangeCompleted / rangeTotal : 0;
    return { buckets, labels, rangeSpent, completionRate };
  }, [history, statsRangeDays]);

  const requestSeries = analytics.buckets.map((b) => Math.min(40, b.requests * 6 + 6));
  const spentSeries = analytics.buckets.map((b) => Math.min(40, Math.round(b.spent / 1000) * 4 + 4));
  const statsBars = analytics.buckets.map((b, idx) => ({
    label: analytics.labels[idx] || `Day ${idx + 1}`,
    value: Math.min(100, b.requests * 15 + 20)
  }));

  const handleCopyLink = async () => {
    const text = String(shareUrl || "").trim();
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.setAttribute("readonly", "");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopyLinkStatus("Copied!");
    } catch {
      setCopyLinkStatus("Copy failed");
    } finally {
      setTimeout(() => setCopyLinkStatus(""), 1800);
    }
  };

  const handleCopyCode = async () => {
    const text = String(promoCode || "HC-000000").trim();
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.setAttribute("readonly", "");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopyStatus("Copied!");
    } catch {
      setCopyStatus("Copy failed");
    } finally {
      setTimeout(() => setCopyStatus(""), 1800);
    }
  };

  const openStaffModal = (staff) => {
    if (!staff) return;
    setActiveStaff(staff);
    setStaffModalOpen(true);
  };

  return (
    <main className="main">
      <section className="panel card" id="dashboard">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2>Stay Organized with HOUSECLEAN</h2>
          <p className="muted small">{todayLabel}</p>
          <p className="muted">
            Choose your service, set the time, and we&apos;ll handle the rest.
          </p>
          
          <div className="quick-actions">
            <button className="btn primary" type="button" onClick={onRequestCleaning}>
              <i className="fas fa-plus-circle"></i> Request Cleaning
            </button>
            <Link className="btn ghost" to={`${basePath}/payments`}>
              <i className="fas fa-wallet"></i> Pay Cleaning
            </Link>
            <Link className="btn ghost" to={`${basePath}/requests`}>
              <i className="fas fa-list-check"></i> View All Requests
            </Link>
          </div>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel card status-card" id="status">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Live Status</p>
              <h3>Latest request</h3>
            </div>
            <Link className="btn pill ghost" to={`${basePath}/requests`}>
              Open tracker
            </Link>
          </div>
          {latestRequest ? (
            <div className="status-card__body">
              <div className="status-card__meta">
                <strong>{serviceLabel}</strong>
                <span className="muted small">
                  {latestUpdateLabel ? `Updated ${latestUpdateLabel}` : "Updated recently"}
                </span>
              </div>
              <div className="status-card__actions">
                <button
                  className="btn pill ghost"
                  type="button"
                  onClick={() => onOpenLatestRequestDetails?.(latestRequest)}
                >
                  View details
                </button>
              </div>
              <div
                className={`status-tracker status-tracker--line status-${latestStatus.toLowerCase()}`}
                aria-label={`Request status: ${latestStatus}`}
                style={{
                  "--progress": progressPercent
                }}
              >
                <div className="status-line" aria-hidden="true">
                  <span className="status-line__bg"></span>
                  <span className="status-line__fill"></span>
                </div>
                <div className="status-line__labels" aria-hidden="true">
                  <span className={statusIndex >= 0 ? "on" : ""}>Pending</span>
                  <span className={statusIndex >= 1 ? "on" : ""}>Accepted</span>
                  <span className={statusIndex >= 2 ? "on" : ""}>Completed</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="muted small">No requests yet. Create one to track status.</div>
          )}
        </section>

        <section className="panel card payment-card" id="payment">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Payment</p>
              <h3>Booking payment status</h3>
            </div>
            <Link className="btn pill ghost" to={`${basePath}/payments`}>
              Manage
            </Link>
          </div>
          {latestRequest && paymentInfo ? (
            <div className="payment-card__body">
              <div className={`payment-pill ${paymentInfo.tone}`}>{paymentInfo.label}</div>
              <p className="muted small">{paymentInfo.detail}</p>
              <button
                className="btn pill primary"
                type="button"
                onClick={() => {
                  if (typeof onOpenPaymentModal === "function") {
                    onOpenPaymentModal(latestRequest);
                  }
                }}
              >
                {paymentInfo.action}
              </button>

            </div>
          ) : (
            <div className="muted small">No payments yet. Book a service to get started.</div>
          )}
        </section>

        <section className="panel card promo-card" id="promo">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Promo</p>
              <h3>Referral rewards</h3>
            </div>
            <button
              className="btn pill ghost"
              type="button"
              onClick={() => setShareOpen(true)}
            >
              <i className="fas fa-share-alt"></i> Share
            </button>
          </div>
          <div className="promo-body">
            <span className="promo-label">Your code</span>
            <div className="promo-code-row">
              <div className="promo-code">{promoCode || "HC-000000"}</div>
              <button
                className="icon-btn promo-copy-btn"
                type="button"
                onClick={handleCopyCode}
                aria-label="Copy referral code"
                title="Copy code"
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>
            {copyStatus && <span className="promo-toast">{copyStatus}</span>}
            <p className="muted small">
              Invite friends and earn credits when they complete their first cleaning.
            </p>
            <div className="promo-meta">
              <span className="pill soft">
                Credits: PHP {Number(promoCredits || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </section>
      </div>

      

      <section className="panel card stats-card" id="statistics">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Statistics</p>
            <h3>Cleaning overview</h3>
          </div>
          <Link className="btn pill ghost" to={`${basePath}/history`}>
            Open history
          </Link>
        </div>
        {myRequestsLoading ? (
          <div className="history-empty muted small">Loading statistics...</div>
        ) : totalRequests === 0 ? (
          <div className="history-empty muted small">
            No requests yet. Book a service to see your stats.
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-tile">
                <span className="muted tiny">Total requests</span>
                <strong>{totalRequests}</strong>
              </div>
              <div className="stat-tile">
                <span className="muted tiny">Completed</span>
                <strong>{statusCounts.completed}</strong>
              </div>
              <div className="stat-tile">
                <span className="muted tiny">Active</span>
                <strong>{statusCounts.active}</strong>
              </div>
              <div className="stat-tile">
                <span className="muted tiny">Pending</span>
                <strong>{statusCounts.pending}</strong>
              </div>
              <div className="stat-tile">
                <span className="muted tiny">Total spent</span>
                <strong>PHP {Math.round(totalSpent).toLocaleString()}</strong>
              </div>
              <div className="stat-tile">
                <span className="muted tiny">Avg rating</span>
                <strong>{avgRating ? avgRating.toFixed(1) : "—"}</strong>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="customer-analytics-grid">
        <section className="panel card customer-analytics-card" id="analytics">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Analytics</p>
              <h3>Performance</h3>
            </div>
            <button
              className="btn pill ghost"
              type="button"
              onClick={() => setStatsRangeDays((prev) => (prev === 30 ? 7 : 30))}
            >
              {statsRangeDays === 30 ? "Last 7 days" : "Last 30 days"}
            </button>
          </div>
          <div className="customer-analytics-metrics">
            <div className="customer-metric">
              <span className="muted tiny">
                Total spent ({statsRangeDays === 30 ? "30d" : "7d"})
              </span>
              <strong>PHP {Math.round(analytics.rangeSpent).toLocaleString()}</strong>
            </div>
            <div className="customer-metric">
              <span className="muted tiny">
                Completion rate ({statsRangeDays === 30 ? "30d" : "7d"})
              </span>
              <strong>{Math.round(analytics.completionRate * 100)}%</strong>
            </div>
          </div>
          <svg className="customer-linechart" viewBox="0 0 280 140" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#5b7cfa"
              strokeWidth="3"
              points={requestSeries
                .map((v, i) => `${(i / (requestSeries.length - 1)) * 280},${140 - v * 3}`)
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="#67c1f7"
              strokeWidth="3"
              points={spentSeries
                .map((v, i) => `${(i / (spentSeries.length - 1)) * 280},${140 - v * 3}`)
                .join(" ")}
            />
          </svg>
          <div className="customer-legend">
            <span><i className="dot primary"></i> Requests</span>
            <span><i className="dot alt"></i> Spend</span>
          </div>
          <div className="customer-sparkline-labels">
            {analytics.labels.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </section>

        <section className="panel card customer-stats-card" id="weekly">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Statistics</p>
              <h3>{statsRangeDays === 30 ? "Last 30 days" : "Weekly"}</h3>
            </div>
          </div>
          <div className="customer-bars">
            {statsBars.map((bar) => (
              <div key={bar.label} className="customer-bar">
                <span>{bar.label}</span>
                <div className="customer-bar__track">
                  <div className="customer-bar__fill" style={{ width: `${bar.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {shareOpen && (
        <div className="share-modal">
          <div className="share-modal__backdrop" onClick={() => setShareOpen(false)} />
          <div className="share-modal__panel" role="dialog" aria-modal="true" aria-label="Share referral link">
            <div className="share-modal__header">
              <h4>Share with friends</h4>
              <button
                className="icon-btn share-close"
                type="button"
                onClick={() => setShareOpen(false)}
                aria-label="Close share"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="share-modal__body">
              <p className="muted small">Share this link via</p>
              <div className="share-modal__icons">
                <a
                  className="share-icon facebook"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Share on Facebook"
                >
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a
                  className="share-icon twitter"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    shareText
                  )}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Share on Twitter"
                >
                  <i className="fab fa-twitter"></i>
                </a>
                <a
                  className="share-icon instagram"
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open Instagram"
                >
                  <i className="fab fa-instagram"></i>
                </a>
                <a
                  className="share-icon whatsapp"
                  href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Share on WhatsApp"
                >
                  <i className="fab fa-whatsapp"></i>
                </a>
                <a
                  className="share-icon telegram"
                  href={`https://t.me/share/url?url=${encodeURIComponent(
                    shareUrl
                  )}&text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Share on Telegram"
                >
                  <i className="fab fa-telegram-plane"></i>
                </a>
              </div>
              <div className="share-modal__copy">
                <span className="muted small">Or copy link</span>
                <div className="share-modal__copy-row">
                  <div className="share-modal__link">
                    <i className="fas fa-link"></i>
                    <span>{shareUrl || "Link unavailable"}</span>
                  </div>
                  <button className="btn pill primary" type="button" onClick={handleCopyLink}>
                    Copy
                  </button>
                </div>
                {copyLinkStatus && <span className="share-toast">{copyLinkStatus}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {staffModalOpen && activeStaff && (
        <div className="customer-modal">
          <div
            className="customer-modal__backdrop"
            onClick={() => setStaffModalOpen(false)}
          />
          <div className="customer-modal__panel staff-modal" role="dialog" aria-modal="true">
            <div className="staff-modal__head">
              <div className="staff-modal__title">
                <i className="fas fa-user-circle"></i>
                <h4>Staff profile</h4>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close staff profile"
                onClick={() => setStaffModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="staff-modal__header">
              <span className="hk-avatar large">
                {activeStaff.avatarUrl ? (
                  <img src={activeStaff.avatarUrl} alt="" />
                ) : (
                  activeStaff.initials || "HK"
                )}
              </span>
              <div className="staff-modal__meta">
                <strong>{activeStaff.name}</strong>
                <span className="muted small">{activeStaff.role}</span>
                <span className="muted tiny">{activeStaff.area}</span>
                {activeStaff.rating ? (
                  <span className="muted tiny">
                    Rating: {Number(activeStaff.rating).toFixed(1)} / 5
                  </span>
                ) : (
                  <span className="muted tiny">No ratings yet</span>
                )}
              </div>
            </div>
            <div className="staff-modal__grid">
              <div>
                <span className="muted tiny">Contact</span>
                <strong>{activeStaff.contact || "—"}</strong>
              </div>
              <div>
                <span className="muted tiny">Email</span>
                <strong>{activeStaff.email || "—"}</strong>
              </div>
              <div>
                <span className="muted tiny">Availability</span>
                <strong>{activeStaff.availability || "—"}</strong>
              </div>
              <div>
                <span className="muted tiny">Experience</span>
                <strong>{activeStaff.previousPosition || activeStaff.experienceNotes || "—"}</strong>
              </div>
              {activeStaff.experienceNotes && (
                <div className="staff-modal__full">
                  <span className="muted tiny">Experience notes</span>
                  <strong>{activeStaff.experienceNotes}</strong>
                </div>
              )}
              <div>
                <span className="muted tiny">Certification</span>
                <strong>{activeStaff.certification || "—"}</strong>
              </div>
              <div>
                <span className="muted tiny">Barangay clearance</span>
                <strong>{activeStaff.barangayClearance || "—"}</strong>
              </div>
              <div>
                <span className="muted tiny">Phone model</span>
                <strong>{activeStaff.phoneModel || "—"}</strong>
              </div>
            </div>
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill primary"
                onClick={() => setStaffModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default CustomerMain;

