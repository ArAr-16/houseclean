import React, { useMemo, useState } from "react";
import Staff from "./Staff";
import { STAFF_HISTORY_SECTIONS } from "./staffVisibleSections";

function StaffHistory() {
  return (
    <Staff
      visibleSections={STAFF_HISTORY_SECTIONS}
      renderHistorySection={(props) => <StaffHistoryContent {...props} />}
    />
  );
}

function StaffHistoryContent({
  requests,
  requestsLoading,
  notifications,
  currentUserId,
  isHousekeeper,
  staffServiceOptions,
  formatNotificationWhen,
  formatNotificationBody,
  openRequestModal,
  openNotificationModal
}) {
  const getDefaultRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { from: fmt(start), to: fmt(end) };
  };

  const loadFilters = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("hc_staff_history_filters");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const stored = loadFilters();
  const defaults = getDefaultRange();
  const [filterType, setFilterType] = useState(stored?.filterType || "all");
  const [serviceType, setServiceType] = useState(stored?.serviceType || "");
  const [fromDate, setFromDate] = useState(stored?.fromDate || defaults.from);
  const [toDate, setToDate] = useState(stored?.toDate || defaults.to);
  const [page, setPage] = useState(1);
  const [activeItem, setActiveItem] = useState(null);
  const pageSize = 8;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "hc_staff_history_filters",
      JSON.stringify({ filterType, serviceType, fromDate, toDate })
    );
  }, [filterType, serviceType, fromDate, toDate]);

  const formatPaymentMethodLabel = (value) => {
    const key = String(value || "").trim().toUpperCase();
    if (key === "STATIC_QR") return "Static QR";
    if (key === "CASH_ON_HAND") return "Cash on Hand";
    return value ? String(value) : "--";
  };

  const timelineEvents = useMemo(() => {
    const entries = [];
    const visibleRequests = (requests || []).filter((req) => {
      if (!isHousekeeper) return true;
      const assignedId = String(req?.housekeeperId || "").trim();
      return Boolean(currentUserId) && assignedId === currentUserId;
    });

    visibleRequests.forEach((req) => {
      const id = String(req?.id || req?.requestId || "");
      const serviceLabel = req?.serviceType || req?.service || "Service";
      const location = req?.location || req?.address || "";
      const job = location ? `${serviceLabel} • ${location}` : serviceLabel;

      const createdAt = Number(req?.createdAt || req?.timestamp || 0) || 0;
      if (createdAt) {
        entries.push({
          id: `${id}_created`,
          requestId: id,
          when: createdAt,
          title: "Request created",
          detail: job,
          type: "request",
          serviceType: serviceLabel
        });
      }

      const acceptedAt = Number(req?.acceptedAt || req?.confirmedAt || 0) || 0;
      if (acceptedAt) {
        entries.push({
          id: `${id}_accepted`,
          requestId: id,
          when: acceptedAt,
          title: "Request accepted",
          detail: job,
          type: "request",
          serviceType: serviceLabel
        });
      }

      const declinedAt = Number(req?.declinedAt || 0) || 0;
      const statusLower = String(req?.status || "").toLowerCase();
      if (declinedAt || statusLower.includes("declin")) {
        const when = declinedAt || Number(req?.updatedAt || 0) || 0;
        if (when) {
          entries.push({
            id: `${id}_declined`,
            requestId: id,
            when,
            title: "Request declined",
            detail: job,
            type: "request",
            serviceType: serviceLabel
          });
        }
      }

      const arrivedAt = Number(req?.staffArrivedAt || 0) || 0;
      if (arrivedAt) {
        entries.push({
          id: `${id}_arrived`,
          requestId: id,
          when: arrivedAt,
          title: "Staff arrived",
          detail: job,
          type: "attendance",
          serviceType: serviceLabel
        });
      }

      const customerConfirmedAt = Number(req?.customerArrivalConfirmedAt || 0) || 0;
      if (customerConfirmedAt) {
        entries.push({
          id: `${id}_confirmed`,
          requestId: id,
          when: customerConfirmedAt,
          title: "Customer confirmed arrival",
          detail: job,
          type: "attendance",
          serviceType: serviceLabel
        });
      }

      const cashReceivedAt = Number(req?.cashReceivedAt || 0) || 0;
      const paidAt = Number(req?.paidAt || 0) || 0;
      const paymentAt = cashReceivedAt || paidAt;
      if (paymentAt) {
        const method = formatPaymentMethodLabel(req?.paymentMethod || req?.paidVia || "");
        entries.push({
          id: `${id}_paid`,
          requestId: id,
          when: paymentAt,
          title: "Payment received",
          detail: `${job} • ${method}`,
          type: "payment",
          serviceType: serviceLabel
        });
      }

      const completedAt = Number(req?.completedAt || 0) || 0;
      if (completedAt) {
        entries.push({
          id: `${id}_completed`,
          requestId: id,
          when: completedAt,
          title: "Service completed",
          detail: job,
          type: "completion",
          serviceType: serviceLabel
        });
      }
    });

    (notifications || []).forEach((item) => {
      const createdAt = Number(item?.createdAt || 0) || 0;
      if (!createdAt) return;
      entries.push({
        id: `notif_${item.id}`,
        notificationId: item.id,
        when: createdAt,
        title: item.title || "Notification",
        detail: item.body || "",
        type: "notification",
        serviceType: ""
      });
    });

    const seen = new Set();
    return entries
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => (Number(b.when || 0) || 0) - (Number(a.when || 0) || 0));
  }, [requests, notifications, isHousekeeper, currentUserId]);

  const filteredTimeline = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    const toEnd = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999) : null;

    return timelineEvents.filter((entry) => {
      if (filterType !== "all" && entry.type !== filterType) return false;
      if (serviceType && String(entry.serviceType || "").toLowerCase() !== serviceType.toLowerCase()) return false;
      if (from && Number(entry.when || 0) < from.getTime()) return false;
      if (toEnd && Number(entry.when || 0) > toEnd.getTime()) return false;
      return true;
    });
  }, [timelineEvents, filterType, serviceType, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredTimeline.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedTimeline = filteredTimeline.slice(startIndex, startIndex + pageSize);

  return (
    <>
      <section className="panel card" id="history">
        <div className="panel-header">
          <div>
            <p className="eyebrow">History</p>
            <h4>Account activity</h4>
          </div>
        </div>

        <div className="staff-history-filters">
          <label>
            Category
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="request">Requests</option>
              <option value="attendance">Attendance</option>
              <option value="payment">Payments</option>
              <option value="completion">Completion</option>
              <option value="notification">Notifications</option>
            </select>
          </label>

          <label>
            Service type
            <select
              value={serviceType}
              onChange={(e) => {
                setServiceType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {(staffServiceOptions || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label>
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <div className="filter-actions">
            <button
              className="btn pill ghost"
              type="button"
              onClick={() => {
                setFilterType("all");
                setServiceType("");
                setFromDate("");
                setToDate("");
                setPage(1);
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {requestsLoading ? (
          <div className="empty-state">Loading account activity...</div>
        ) : filteredTimeline.length === 0 ? (
          <div className="empty-state">No activity yet.</div>
        ) : (
          <div className="history-timeline">
            {pagedTimeline.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="timeline-row"
                onClick={() => setActiveItem(entry)}
              >
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="timeline-header">
                    <strong>{entry.title}</strong>
                    <span className="muted tiny">
                      {entry.when ? formatNotificationWhen(entry.when) : "--"}
                    </span>
                  </div>
                  <p className="timeline-body">{formatNotificationBody(entry.detail || "—")}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="table-footer">
          <div className="table-pagination">
            <button
              className="btn pill ghost"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Prev
            </button>
            <span className="muted small">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn pill ghost"
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {activeItem && (
        <div className="staff-request-modal" role="dialog" aria-modal="true" aria-label="Activity details">
          <div className="staff-request-modal__backdrop" onClick={() => setActiveItem(null)} />
          <div className="staff-request-modal__panel staff-track-modal staff-track-modal--details">
            <div className="staff-track-modal__hero">
              <div className="staff-track-modal__icon">
                <i className="fas fa-clock"></i>
              </div>
              <h3>Activity details</h3>
            </div>
            <div className="staff-request-modal__header">
              <button className="icon-btn" type="button" onClick={() => setActiveItem(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="staff-request-modal__body">
              <div className="staff-request-grid">
                <div>
                  <small>Title</small>
                  <strong>{activeItem.title}</strong>
                </div>
                <div>
                  <small>Time</small>
                  <strong>{activeItem.when ? formatNotificationWhen(activeItem.when) : "--"}</strong>
                </div>
                {activeItem.detail && (
                  <div className="full">
                    <small>Details</small>
                    <strong>{formatNotificationBody(activeItem.detail)}</strong>
                  </div>
                )}
              </div>
            </div>
            <div className="staff-request-modal__footer">
              {activeItem.requestId && (
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => {
                    const target = (requests || []).find(
                      (req) => String(req?.id || "") === String(activeItem.requestId)
                    );
                    if (target && typeof openRequestModal === "function") {
                      setActiveItem(null);
                      openRequestModal(target);
                    }
                  }}
                >
                  View request
                </button>
              )}
              {activeItem.notificationId && (
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => {
                    const target = (notifications || []).find(
                      (item) => String(item?.id || "") === String(activeItem.notificationId)
                    );
                    if (target && typeof openNotificationModal === "function") {
                      setActiveItem(null);
                      openNotificationModal(target);
                    }
                  }}
                >
                  View notification
                </button>
              )}
              <button className="btn ghost" type="button" onClick={() => setActiveItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StaffHistory;
