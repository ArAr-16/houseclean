import React, { useMemo, useState } from "react";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { useCustomerNotifications, useCustomerServiceRequests } from "./customerData";
import { rtdb } from "../../firebase";
import {
  onValue,
  ref as rtdbRef,
  remove as rtdbRemove,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet
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
    return `${dateLabel} â€¢ ${timeLabel}`;
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
  return `${dateLabel} â€¢ ${timeLabel}`;
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
    return `${dateLabel} â€¢ ${timeLabel}`;
  });
}

function normalizeDateString(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const match = s.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function toMs(value) {
  if (value == null) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(num) && num > 0) return num;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function inferType(item) {
  const text = `${item?.title || ""} ${item?.body || ""}`.toLowerCase();
  if (text.includes("rate") || text.includes("feedback")) return "feedback";
  if (text.includes("payment") || text.includes("invoice") || text.includes("receipt")) return "payment";
  if (text.includes("schedule") || text.includes("tomorrow") || text.includes("today") || text.includes("upcoming")) return "schedule";
  if (text.includes("request") || text.includes("accepted") || text.includes("completed") || text.includes("pending")) return "request";
  return "general";
}

function CustomerHistoryPage() {
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
      const raw = localStorage.getItem("hc_customer_history_filters");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const defaults = getDefaultRange();
  const stored = loadFilters();

  const [serviceType, setServiceType] = useState(stored?.serviceType || "");
  const [fromDate, setFromDate] = useState(stored?.fromDate || defaults.from);
  const [toDate, setToDate] = useState(stored?.toDate || defaults.to);
  const [filterType, setFilterType] = useState(stored?.filterType || "all");
  const [historyTab, setHistoryTab] = useState("active");
  const [page, setPage] = useState(1);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      serviceType,
      fromDate,
      toDate,
      filterType
    };
    localStorage.setItem("hc_customer_history_filters", JSON.stringify(payload));
  }, [serviceType, fromDate, toDate, filterType]);

  return (
    <CustomerChrome>
      <CustomerHistoryInner
        serviceType={serviceType}
        setServiceType={setServiceType}
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        filterType={filterType}
        setFilterType={setFilterType}
        historyTab={historyTab}
        setHistoryTab={setHistoryTab}
        page={page}
        setPage={setPage}
      />
    </CustomerChrome>
  );
}

export default CustomerHistoryPage;

function CustomerHistoryInner({
  serviceType,
  setServiceType,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  filterType,
  setFilterType,
  historyTab,
  setHistoryTab,
  page,
  setPage
}) {
  const ctx = useCustomerChrome();
  const { requests, loading } = useCustomerServiceRequests(ctx.authUser?.uid);
  const { notifications, loading: notificationsLoading } = useCustomerNotifications(
    ctx.authUser?.uid,
    { limit: 150 }
  );
  const [activeItem, setActiveItem] = useState(null);
  const [archivedMap, setArchivedMap] = useState({});
  const pageSize = 10;

  React.useEffect(() => {
    const uid = ctx.authUser?.uid;
    if (!uid) {
      setArchivedMap({});
      return undefined;
    }
    const archiveRef = rtdbRef(rtdb, `CustomerHistoryArchive/${uid}`);
    const stop = onValue(archiveRef, (snap) => {
      setArchivedMap(snap.val() || {});
    });
    return () => stop();
  }, [ctx.authUser?.uid]);

  const serviceOptions = useMemo(() => {
    const set = new Set();
    (requests || []).forEach((r) => {
      const s = String(r.serviceType || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const requestIndex = useMemo(() => {
    const map = new Map();
    (requests || []).forEach((r) => {
      const id = String(r.requestId || r.id || "").trim();
      if (id) map.set(id, r);
    });
    return map;
  }, [requests]);

  const activities = useMemo(() => {
    const list = [];
    const pushEvent = (event) => {
      if (!event?.id) return;
      if (!event?.when) return;
      list.push(event);
    };

    (requests || []).forEach((r) => {
      const requestId = String(r.requestId || r.id || "").trim();
      const service = String(r.serviceType || r.service || "Service").trim();
      const staffName = String(r.housekeeperName || "").trim() || "Staff";
      const createdAt = toMs(r.createdAt ?? r.timestamp);
      const acceptedAt = toMs(
        r.acceptedAt ?? (String(r.status || "").toUpperCase() === "ACCEPTED" ? r.updatedAt : 0)
      );
      const confirmedAt = toMs(
        r.confirmedAt ?? (String(r.status || "").toUpperCase() === "CONFIRMED" ? r.updatedAt : 0)
      );
      const completedAt = toMs(
        r.completedAt ?? (String(r.status || "").toUpperCase() === "COMPLETED" ? r.updatedAt : 0)
      );
      const paidAt = toMs(r.paidAt);
      const cashReservedAt = toMs(r.cashConfirmedAt ?? (r.cashOnHandConfirmed ? r.updatedAt : 0));
      const feedbackAt = toMs(r.feedbackAt);

      if (createdAt) {
        pushEvent({
          id: `req_${requestId}_created`,
          type: "request",
          action: `Requested ${service}`,
          actor: "Customer",
          when: createdAt,
          requestId,
          serviceType: service,
          detail: String(r.startDate || `${r.date || ""} ${r.time || ""}`).trim()
        });
      }

      if (acceptedAt) {
        pushEvent({
          id: `req_${requestId}_accepted`,
          type: "request",
          action: "Request accepted",
          actor: staffName,
          when: acceptedAt,
          requestId,
          serviceType: service,
          detail: staffName ? `Assigned to ${staffName}` : ""
        });
      }

      if (confirmedAt) {
        pushEvent({
          id: `req_${requestId}_confirmed`,
          type: "request",
          action: "Booking confirmed",
          actor: "Staff",
          when: confirmedAt,
          requestId,
          serviceType: service
        });
      }

      if (paidAt) {
        const method = String(r.paidVia || r.paymentMethod || "").trim().toUpperCase();
        const methodLabel =
          method === "STATIC_QR"
            ? "Static QR"
            : method === "CASH_ON_HAND"
              ? "Cash on Hand"
              : method || "Payment";
        pushEvent({
          id: `req_${requestId}_paid`,
          type: "payment",
          action: "Payment received",
          actor: "Customer",
          when: paidAt,
          requestId,
          serviceType: service,
          detail: `Paid via ${methodLabel}`
        });
      }

      if (cashReservedAt) {
        pushEvent({
          id: `req_${requestId}_cash_reserved`,
          type: "payment",
          action: "Cash on Hand reserved",
          actor: "Customer",
          when: cashReservedAt,
          requestId,
          serviceType: service,
          detail: "Pay on arrival"
        });
      }

      if (completedAt) {
        pushEvent({
          id: `req_${requestId}_completed`,
          type: "cleaning",
          action: "Service completed",
          actor: staffName,
          when: completedAt,
          requestId,
          serviceType: service
        });
      }

      if (feedbackAt) {
        const rating = r.feedbackRating != null ? Number(r.feedbackRating).toFixed(1) : "";
        pushEvent({
          id: `req_${requestId}_feedback`,
          type: "feedback",
          action: "Feedback submitted",
          actor: "Customer",
          when: feedbackAt,
          requestId,
          serviceType: service,
          detail: rating ? `Rating ${rating} / 5` : ""
        });
      }
    });

    (notifications || []).forEach((n) => {
      const when = toMs(n.createdAt);
      const type = inferType(n);
      const requestId = String(n.requestId || "").trim();
      const linked = requestId ? requestIndex.get(requestId) : null;
      const serviceType = linked?.serviceType || linked?.service || "";
      const staffName = String(linked?.housekeeperName || "").trim();
      const actor =
        n.actorName ||
        n.actor ||
        (["request", "payment", "feedback"].includes(type) && staffName ? staffName : "Staff/Admin");
      pushEvent({
        id: `notif_${n.id}`,
        type,
        action: n.title || "Update",
        actor,
        when,
        requestId,
        serviceType: String(serviceType || "").trim(),
        detail: n.body || ""
      });
    });

    const unique = new Map();
    list.forEach((item) => {
      if (!unique.has(item.id)) unique.set(item.id, item);
    });
    return Array.from(unique.values()).sort(
      (a, b) => (Number(b.when) || 0) - (Number(a.when) || 0)
    );
  }, [notifications, requestIndex, requests]);

  const filtered = useMemo(() => {
    const from = fromDate || "";
    const to = toDate || "";
    return (activities || []).filter((item) => {
      if (filterType !== "all" && String(item.type || "general") !== filterType) return false;
      if (serviceType && String(item.serviceType || "").trim() !== serviceType) return false;
      const rDate = normalizeDateString(
        item.when ? new Date(item.when).toISOString().slice(0, 10) : ""
      );
      if (from && rDate && rDate < from) return false;
      if (to && rDate && rDate > to) return false;
      return true;
    });
  }, [activities, filterType, fromDate, serviceType, toDate]);

  const archivedList = useMemo(() => {
    return Object.entries(archivedMap || {})
      .map(([id, data]) => ({ id, ...(data || {}) }))
      .sort((a, b) => (Number(b.archivedAt || b.when || 0) || 0) - (Number(a.archivedAt || a.when || 0) || 0));
  }, [archivedMap]);

  const archivedIds = useMemo(() => new Set(archivedList.map((a) => a.id)), [archivedList]);

  const activeList = useMemo(() => {
    return (filtered || []).filter((item) => !archivedIds.has(item.id));
  }, [filtered, archivedIds]);

  const visibleList = historyTab === "archived" ? archivedList : activeList;
  const totalPages = Math.max(1, Math.ceil(visibleList.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = visibleList.slice(start, start + pageSize);

  const archiveItem = async (item) => {
    const uid = ctx.authUser?.uid;
    if (!uid || !item?.id) return;
    const payload = {
      ...item,
      status: "ARCHIVED",
      archivedAt: rtdbServerTimestamp(),
      archivedById: uid,
      archivedByName: ctx.displayName || ctx.profile?.fullName || ctx.profile?.name || "Customer"
    };
    await rtdbSet(rtdbRef(rtdb, `CustomerHistoryArchive/${uid}/${item.id}`), payload);
  };

  const deleteArchived = async (item) => {
    const uid = ctx.authUser?.uid;
    if (!uid || !item?.id) return;
    await rtdbRemove(rtdbRef(rtdb, `CustomerHistoryArchive/${uid}/${item.id}`));
  };

  return (
    <>
      <section className="panel card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Customer History</p>
            <h3>Account activity & timeline</h3>
          </div>
        </div>

        <div className="filters">
          <label>
            Category
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All</option>
              <option value="request">Requests</option>
              <option value="cleaning">Cleaning</option>
              <option value="payment">Payments</option>
              <option value="feedback">Ratings</option>
              <option value="schedule">Schedules</option>
              <option value="general">Other</option>
            </select>
          </label>
          <label>
            Service type
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
              <option value="">All</option>
              {serviceOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <div className="filter-actions">
            <button
              className="btn pill ghost"
              type="button"
              onClick={() => {
                setServiceType("");
                setFromDate("");
                setToDate("");
                setFilterType("all");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {loading || notificationsLoading ? (
          <div className="muted small">Loading history...</div>
        ) : visibleList.length === 0 ? (
          <div className="muted small">No matching activity.</div>
        ) : (
          <div className="history-table">
            <div className="history-head">
              <span>Action</span>
              <span>Request</span>
              <span>By</span>
              <span>When</span>
              <span>Type</span>
              <span>Actions</span>
            </div>
            {paged.map((item) => (
              <div
                key={item.id}
                className="history-row clickable"
                role="button"
                tabIndex={0}
                onClick={() => setActiveItem(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveItem(item);
                  }
                }}
              >
                <div className="job-cell">
                  <strong className="job-title">{item.action}</strong>
                  {item.detail ? (
                    <span className="muted small">{formatNotificationBody(item.detail)}</span>
                  ) : null}
                  {item.requestId ? (
                    <span className="muted tiny">ID: {String(item.requestId).slice(-8)}</span>
                  ) : null}
                </div>
                <div className="muted small">
                  <strong>{item.serviceType || " â€¢ "}</strong>
                </div>
                <span className="muted small">{item.actor || " â€¢ "}</span>
                <span className="muted small">{formatWhen(item.when) || " â€¢ "}</span>
                <span className="pill soft">{String(item.type || "general")}</span>
                <div className="history-actions">
                  {historyTab === "archived" ? (
                    <button
                      className="btn pill ghost"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteArchived(item);
                      }}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      className="btn pill ghost"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveItem(item);
                      }}
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="table-footer">
          <div className="tab-row">
            <button
              className={`btn pill ghost ${historyTab === "active" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setHistoryTab("active");
                setPage(1);
              }}
            >
              Active
            </button>
            <button
              className={`btn pill ghost ${historyTab === "archived" ? "active" : ""}`}
              type="button"
              onClick={() => {
                setHistoryTab("archived");
                setPage(1);
              }}
            >
              Archived
            </button>
          </div>
          <div className="table-pagination">
            <button
              className="btn pill ghost"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {activeItem && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={() => setActiveItem(null)} />
          <div className="customer-modal__panel track-modal" role="dialog" aria-modal="true" aria-label="History details">
            <div className="customer-modal__icon alt">
              <i className="fas fa-clock"></i>
            </div>
            <h4>History details</h4>
            <div className="track-modal__grid">
              <div>
                <small>Action</small>
                <strong>{activeItem.action}</strong>
              </div>
              <div>
                <small>Type</small>
                <strong>{String(activeItem.type || "general")}</strong>
              </div>
              <div>
                <small>By</small>
                <strong>{activeItem.actor || "—"}</strong>
              </div>
              <div>
                <small>When</small>
                <strong>{formatWhen(activeItem.when) || "—"}</strong>
              </div>
              <div>
                <small>Service</small>
                <strong>{activeItem.serviceType || "—"}</strong>
              </div>
              <div>
                <small>Request ID</small>
                <strong>{activeItem.requestId || "—"}</strong>
              </div>
            </div>
            {activeItem.detail && (
              <div className="track-modal__notes">
                <small>Details</small>
                <p>{formatNotificationBody(activeItem.detail)}</p>
              </div>
            )}
            <div className="customer-modal__actions">
              <button className="btn pill ghost" type="button" onClick={() => setActiveItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}    </>
  );
}


