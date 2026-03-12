import React, { useMemo, useState } from "react";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { useCustomerServiceRequests } from "./customerData";

function statusLabel(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "COMPLETED") return "COMPLETED";
  if (value === "ACCEPTED") return "ACCEPTED";
  return "PENDING";
}

function normalizeDateString(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const match = s.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function CustomerHistoryPage() {
  const [serviceType, setServiceType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  return (
    <CustomerChrome>
      <CustomerHistoryInner
        serviceType={serviceType}
        setServiceType={setServiceType}
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
      />
    </CustomerChrome>
  );
}

export default CustomerHistoryPage;

function CustomerHistoryInner({ serviceType, setServiceType, fromDate, setFromDate, toDate, setToDate }) {
  const ctx = useCustomerChrome();
  const { requests, loading } = useCustomerServiceRequests(ctx.authUser?.uid);

  const serviceOptions = useMemo(() => {
    const set = new Set();
    (requests || []).forEach((r) => {
      const s = String(r.serviceType || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const filtered = useMemo(() => {
    const from = fromDate || "";
    const to = toDate || "";
    return (requests || []).filter((r) => {
      const rService = String(r.serviceType || "").trim();
      if (serviceType && rService !== serviceType) return false;

      const rDate = normalizeDateString(r.date) || normalizeDateString(r.startDate);
      if (from && rDate && rDate < from) return false;
      if (to && rDate && rDate > to) return false;
      return true;
    });
  }, [fromDate, requests, serviceType, toDate]);

  return (
    <>
      <section className="panel card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">History</p>
            <h3>Past cleaning requests</h3>
          </div>
        </div>

        <div className="filters">
          <label>
            Service type
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
              <option value="">All</option>
              {serviceOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
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
            <button className="btn pill ghost" type="button" onClick={() => { setServiceType(""); setFromDate(""); setToDate(""); }}>
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <div className="muted small">Loading history...</div>
        ) : filtered.length === 0 ? (
          <div className="muted small">No matching requests.</div>
        ) : (
          <div className="history-list">
            {filtered.slice(0, 30).map((r) => (
              <div key={r.requestId || r.id} className="history-row-lite">
                <div className="history-meta">
                  <strong>{r.serviceType || "Service"}</strong>
                  <span className="muted small">
                    {String(r.startDate || `${r.date || ""} ${r.time || ""}`).trim() || "—"}
                    {r.housekeeperName ? ` • Staff: ${r.housekeeperName}` : " • Staff: Unassigned"}
                  </span>
                </div>
                <div className="history-badges">
                  <span className={`chip ${statusLabel(r.status).toLowerCase()}`}>{statusLabel(r.status)}</span>
                  <span className="pill stat">{typeof r.totalPrice === "number" ? `PHP ${Math.round(r.totalPrice).toLocaleString()}` : "PHP --"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
