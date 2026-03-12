import React, { useMemo, useState } from "react";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { useCustomerNotifications, useCustomerServiceRequests } from "./customerData";

function formatWhen(value) {
  if (value == null) return "";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString();
  const ms = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return "";
  return new Date(ms).toLocaleString();
}

function inferType(n) {
  const text = `${n?.title || ""} ${n?.body || ""}`.toLowerCase();
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
    const fromDb = (notifications || []).map((n) => ({ ...n, type: inferType(n) }));
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

  return (
    <>
      <section className="panel card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Notifications</p>
            <h3>Alerts & updates</h3>
          </div>
          <span className="pill stat">{visible.length}</span>
        </div>

        <div className="filters">
          <label>
            Category
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="schedule">Upcoming schedules</option>
              <option value="payment">Payment reminders</option>
              <option value="request">Request updates</option>
              <option value="general">General</option>
            </select>
          </label>
        </div>

        {loading && notifications.length === 0 ? (
          <div className="muted small">Loading notifications...</div>
        ) : visible.length === 0 ? (
          <div className="muted small">No alerts yet.</div>
        ) : (
          <div className="notification-feed">
            {visible.slice(0, 40).map((n) => (
              <div key={n.id} className={`notif-item ${String(n.type || "general")}`}>
                <div className="notif-top">
                  <strong>{n.title || "Update"}</strong>
                  <span className="muted tiny">{formatWhen(n.createdAt) || "—"}</span>
                </div>
                <p className="muted small">{n.body || ""}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
