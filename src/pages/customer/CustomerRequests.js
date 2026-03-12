import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { useCustomerServiceRequests } from "./customerData";
import BookingWizardModal from "./BookingWizardModal";

function normalizeStatus(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "ACCEPTED") return "ACCEPTED";
  if (value === "COMPLETED") return "COMPLETED";
  return "PENDING";
}

function StatusTracker({ status }) {
  const current = normalizeStatus(status);
  const steps = ["PENDING", "ACCEPTED", "COMPLETED"];
  const activeIndex = Math.max(0, steps.indexOf(current));

  return (
    <div className="status-tracker" aria-label={`Request status: ${current}`}>
      {steps.map((s, idx) => (
        <div key={s} className={`tracker-step ${idx <= activeIndex ? "on" : ""}`}>
          <span className="dot" aria-hidden="true" />
          <span className="label">{s}</span>
        </div>
      ))}
    </div>
  );
}

function CustomerRequests() {
  const [successId, setSuccessId] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const shouldOpen = Boolean(location?.state?.openBooking);
    if (!shouldOpen) return;
    setBookingOpen(true);
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
  clearSuccess
}) {
  const ctx = useCustomerChrome();
  const { requests, loading } = useCustomerServiceRequests(ctx.authUser?.uid);

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
          {successId && <span className="success-note">Sent! Request ID {successId.slice(-6)}.</span>}
        </div>
      </section>

      <BookingWizardModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        authUser={ctx.authUser}
        profile={ctx.profile}
        displayName={ctx.displayName}
        addressLine={addressLine || ctx.profile?.location || ""}
        onSubmitted={(requestId) => {
          setSuccessId(String(requestId || ""));
          setBookingOpen(false);
        }}
      />

      <section className="panel card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Tracker</p>
            <h3>Your requests</h3>
          </div>
        </div>

        {loading ? (
          <div className="muted small">Loading your requests...</div>
        ) : requests.length === 0 ? (
          <div className="muted small">No requests yet. Create one above.</div>
        ) : (
          <div className="request-list">
            {requests.slice(0, 20).map((r) => (
              <div key={r.requestId || r.id} className="request-row">
                <div className="request-meta">
                  <strong>{r.serviceType || "Service"}</strong>
                  <span className="muted small">
                    {(r.startDate || `${r.date || ""} ${r.time || ""}` || "").trim() || "—"}
                    {r.housekeeperName ? ` • Staff: ${r.housekeeperName}` : ""}
                  </span>
                </div>
                <div className="request-status">
                  <span className={`chip ${normalizeStatus(r.status).toLowerCase()}`}>{normalizeStatus(r.status)}</span>
                  <StatusTracker status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
