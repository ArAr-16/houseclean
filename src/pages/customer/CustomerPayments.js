﻿﻿﻿﻿import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { useCustomerServiceRequests } from "./customerData";
import {
  push,
  ref as rtdbRef,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate
} from "firebase/database";
import { rtdb } from "../../firebase";

function moneyLabel(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "PHP --";
  return `PHP ${Math.round(n).toLocaleString()}`;
}

function normalizeStatus(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "CANCELLED" || value === "DECLINED") return "CANCELLED";
  if (value === "ACCEPTED") return "ACCEPTED";
  if (value === "CONFIRMED") return "ACCEPTED";
  if (value === "COMPLETED") return "COMPLETED";
  return "PENDING";
}

function DetailedStatusTracker({ request }) {
  const status = normalizeStatus(request?.status);
  const paymentStatus = String(request?.paymentStatus || "").toUpperCase();
  const paymentMethod = String(request?.paymentMethod || request?.paidVia || "").toUpperCase();
  const hasPaymentMethod = Boolean(paymentMethod);
  const paymentReceived = paymentStatus === "PAID" || Boolean(request?.paidAt);

  const steps = (() => {
    const baseSteps = [
      { key: "requested", label: "Requested", ready: true },
      {
        key: "payment_set",
        label: paymentMethod === "CASH_ON_HAND" ? "Cash on hand reserved" : "Payment method set",
        ready: hasPaymentMethod
      },
      { key: "accepted", label: "Staff accepted", ready: status !== "PENDING" },
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
      aria-label={`Payment tracker: ${status}`}
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

function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

function buildInvoice(request, ctx) {
  const id = String(request?.requestId || request?.id || "").trim() || "INV";
  const service = String(request?.serviceType || "Service");
  const when = String(request?.startDate || `${request?.date || ""} ${request?.time || ""}`).trim();
  const staff = String(request?.housekeeperName || "Unassigned");
  const total = moneyLabel(request?.totalPrice);
  const customer = String(ctx?.displayName || ctx?.authUser?.email || "Customer");
  const email = String(ctx?.authUser?.email || ctx?.profile?.email || "");
  const location = String(ctx?.profile?.location || request?.location || "");

  return [
    "HOUSECLEAN INVOICE",
    "",
    `Invoice: ${id}`,
    `Customer: ${customer}`,
    email ? `Email: ${email}` : null,
    location ? `Location: ${location}` : null,
    "",
    `Service: ${service}`,
    `Schedule: ${when || "â€”"}`,
    `Assigned staff: ${staff}`,
    "",
    `Total: ${total}`,
    "",
    `Status: ${String(request?.status || "PENDING").toUpperCase()}`,
    "",
    `Generated: ${new Date().toLocaleString()}`
  ]
    .filter(Boolean)
    .join("\n");
}

function buildReceipt(request, ctx) {
  const id = String(request?.requestId || request?.id || "").trim() || "RCT";
  const total = moneyLabel(request?.totalPrice);
  const paidViaRaw = String(request?.paidVia || "N/A");
  const paidViaKey = paidViaRaw.trim().toUpperCase();
  const paidVia =
    paidViaKey === "STATIC_QR"
      ? "Static QR"
      : paidViaKey === "CASH_ON_HAND"
        ? "Cash on Hand"
        : paidViaRaw;
  const paidAt = request?.paidAt ? new Date(Number(request.paidAt)).toLocaleString() : "N/A";
  const customer = String(ctx?.displayName || ctx?.authUser?.email || "Customer");

  return [
    "HOUSECLEAN RECEIPT",
    "",
    `Receipt: ${id}`,
    `Customer: ${customer}`,
    "",
    `Amount: ${total}`,
    `Paid via: ${paidVia}`,
    `Paid at: ${paidAt}`,
    "",
    `Generated: ${new Date().toLocaleString()}`
  ].join("\n");
}

function formatDateTimeLabel(value, fallbackDate, fallbackTime) {
  const raw = String(value || "").trim();
  const combined = String(`${fallbackDate || ""} ${fallbackTime || ""}`).trim();
  const candidate = raw || combined;
  if (!candidate) return "--";
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return candidate;
  const date = parsed.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
  const time = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${date} • ${time}`;
}

function formatPaymentMethodLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  if (key === "STATIC_QR") return "Static QR";
  if (key === "CASH_ON_HAND") return "Cash on Hand";
  return value ? String(value) : "--";
}

function CustomerPayments() {
  const paymentMethods = useMemo(
    () => [
      { key: "STATIC_QR", label: "Static QR", icon: "fas fa-qrcode", hint: "Scan & pay to the official QR" },
      { key: "CASH_ON_HAND", label: "Cash on Hand", icon: "fas fa-hand-holding-usd", hint: "Pay the staff in person" }
    ],
    []
  );

  const [selectedMethod, setSelectedMethod] = useState("STATIC_QR");

  return (
    <CustomerChrome>
      <CustomerPaymentsInner
        paymentMethods={paymentMethods}
        selectedMethod={selectedMethod}
        setSelectedMethod={setSelectedMethod}
      />
    </CustomerChrome>
  );
}

export default CustomerPayments;

function CustomerPaymentsInner({ paymentMethods, selectedMethod, setSelectedMethod }) {
  const ctx = useCustomerChrome();
  const location = useLocation();
  const navigate = useNavigate();
  const { requests, loading } = useCustomerServiceRequests(ctx.authUser?.uid);
  const payable = (requests || []).filter((r) => {
    const status = String(r.status || "").toUpperCase();
    if (["PENDING_PAYMENT", "RESERVED", "CONFIRMED", "ACCEPTED"].includes(status)) return true;
    if (status === "PENDING" && String(r.paymentMethod || "").trim()) return true;
    return false;
  });
  const completed = (requests || []).filter((r) => String(r.status || "").toUpperCase() === "COMPLETED");
  const [txnByRequest, setTxnByRequest] = useState({});
  const [savingId, setSavingId] = useState("");
  const [activePayment, setActivePayment] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const activeStatus = activePayment ? String(activePayment.status || "").toUpperCase() : "";
  const activeIsPendingPayment = activeStatus === "PENDING_PAYMENT";
  const activePaymentStatus = activePayment ? String(activePayment.paymentStatus || "").toUpperCase() : "";
  const activeMethod = activePayment ? String(activePayment.paymentMethod || activePayment.paidVia || "").toUpperCase() : "";
  const canConfirmCash =
    activeMethod === "CASH_ON_HAND" &&
    !["RESERVED", "PAID"].includes(activePaymentStatus) &&
    activeStatus !== "COMPLETED";

  useEffect(() => {
    const targetId = String(location?.state?.openPaymentFor || "").trim();
    if (!targetId) return;
    const match = (requests || []).find(
      (r) => String(r.id || r.requestId || "").trim() === targetId
    );
    if (match) {
      setActivePayment(match);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location?.state?.openPaymentFor, requests, navigate, location?.pathname]);

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

  const handleSubmitQr = async (req) => {
    const id = String(req?.id || req?.requestId || "").trim();
    if (!id) return;
    const txn = String(txnByRequest[id] || "").trim();
    if (!txn) return;
    try {
      setSavingId(id);
      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paidVia: "STATIC_QR",
        paidAt: rtdbServerTimestamp(),
        paymentTransactionId: txn,
        updatedAt: rtdbServerTimestamp()
      });
      const staffId = String(req?.housekeeperId || "").trim();
      if (staffId) {
        await sendNotification({
          toUserId: staffId,
          requestId: id,
          title: "Booking confirmed (Paid)",
          body: `${req?.serviceType || "Service"} has been paid via QR. Please review the job.`
        });
      }
    } finally {
      setSavingId("");
    }
  };

  const handleConfirmCash = async (req) => {
    const id = String(req?.id || req?.requestId || "").trim();
    if (!id) return;
    try {
      setSavingId(id);
      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), {
        status: "RESERVED",
        paymentStatus: "RESERVED",
        paidVia: "CASH_ON_HAND",
        cashOnHandConfirmed: true,
        cashConfirmedAt: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp()
      });
      const staffId = String(req?.housekeeperId || "").trim();
      if (staffId) {
        await sendNotification({
          toUserId: staffId,
          requestId: id,
          title: "Cash on Hand reserved",
          body: `${req?.serviceType || "Service"} is reserved for cash payment on arrival.`
        });
      }
    } finally {
      setSavingId("");
    }
  };

  return (
    <>
      <section className="panel card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Payments</p>
            <h3>Secure payment options</h3>
          </div>
        </div>

        <div className="payment-methods">
          {paymentMethods.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`pay-method ${selectedMethod === m.key ? "active" : ""}`}
              onClick={() => setSelectedMethod(m.key)}
            >
              <i className={m.icon}></i>
              <div>
                <strong>{m.label}</strong>
                <p className="muted small">{m.hint}</p>
              </div>
            </button>
          ))}
        </div>

        {selectedMethod === "STATIC_QR" && (
          <div className="pay-instructions">
            <div>
              <p className="eyebrow">How to pay</p>
              <h4>Scan the official HOUSECLEAN QR</h4>
              <p className="muted small">
                Use your e-wallet/banking app to scan the Static QR from staff or at the cashier/office. Enter the exact invoice total and
                include your request ID in the notes.
              </p>
            </div>
            <div className="pay-steps">
              <span>1. Open your GCash/Maya app.</span>
              <span>2. Scan the QR code.</span>
              <span>3. Enter the invoice amount.</span>
              <span>4. Input the transaction ID on payment page.</span>
            </div>
          </div>
        )}
        {selectedMethod === "CASH_ON_HAND" && (
          <div className="pay-instructions">
            <div>
              <p className="eyebrow">Cash on Hand</p>
              <h4>Pay when the staff arrives</h4>
              <p className="muted small">
                Confirm that you will pay the staff in person. Your booking will be reserved until the staff marks the
                payment as received on-site.
              </p>
            </div>
            <div className="pay-steps">
              <span>1. Choose Cash on Hand at checkout.</span>
              <span>2. Confirm the cash option below.</span>
              <span>3. Pay the staff on arrival.</span>
              <span>4. Staff confirms payment to start work.</span>
            </div>
          </div>
        )}
      </section>

      <section className="panel card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Invoices</p>
            <h3>Download receipts & invoices</h3>
          </div>
        </div>

        {loading ? (
          <div className="muted small">Loading billing...</div>
        ) : requests.length === 0 ? (
          <div className="muted small">No requests found.</div>
        ) : (
          <>
            <div className="muted small">Pay pending requests below to confirm your booking.</div>

            <div className="billing-list">
              {payable.slice(0, 12).map((r) => {
                const status = String(r.status || "").toUpperCase();

                const isPendingPayment = status === "PENDING_PAYMENT";
                const isReserved = status === "RESERVED";
                const isConfirmed = status === "CONFIRMED" || status === "ACCEPTED";
                const statusLabel = isPendingPayment
                  ? "Pending payment"
                  : isReserved
                    ? "Reserved"
                    : isConfirmed
                      ? "Paid"
                      : "—";
                const statusDetail = isPendingPayment
                  ? "Complete payment to confirm your booking."
                  : isReserved
                    ? "Pay on arrival. Staff will confirm payment."
                    : isConfirmed
                      ? "Payment confirmed. Staff will proceed with the service."
                      : "";

                return (
                  <div
                    key={r.requestId || r.id}
                    className="billing-row clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => setActivePayment(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActivePayment(r);
                      }
                    }}
                  >
                    <div className="billing-meta">
                      <strong>{r.serviceType || "Service"}</strong>
                      <span className="muted small">
                        {formatDateTimeLabel(r.startDate, r.date, r.time)}
                      </span>
                    </div>
                    <div className="billing-actions">
                    </div>
                    <div className="billing-status">
                      <span className={`pill soft ${isPendingPayment ? "amber" : isReserved ? "blue" : isConfirmed ? "green" : ""}`}>
                        {statusLabel}
                      </span>
                      {statusDetail && <span className="muted small">{statusDetail}</span>}
                    </div>
                  </div>
                );
              })}
              {completed.slice(0, 8).map((r) => (
                <div
                  key={r.requestId || r.id}
                  className="billing-row done clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => setActivePayment(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActivePayment(r);
                    }
                  }}
                >
                  <div className="billing-meta">
                    <strong>{r.serviceType || "Service"} (Completed)</strong>
                    <span className="muted small">
                      {formatDateTimeLabel(r.startDate, r.date, r.time)}
                    </span>
                  </div>
                  <div className="billing-actions">

                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {activePayment && (
        <div className="share-modal payment-modal">
          <div className="share-modal__backdrop" onClick={() => setActivePayment(null)} />
          <div className="share-modal__panel payment-modal__panel" role="dialog" aria-modal="true" aria-label="Request details">
            <div className="share-modal__header">
              <h4>Request details</h4>
              <button
                className="icon-btn share-close"
                type="button"
                onClick={() => setActivePayment(null)}
                aria-label="Close details"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="share-modal__body">
              <div className="payment-modal__meta">
                <strong>{activePayment.serviceType || "Service"}</strong>
                <span className="muted small">
                  {formatDateTimeLabel(activePayment.startDate, activePayment.date, activePayment.time)}
                </span>
                <span className="pill stat">{moneyLabel(activePayment.totalPrice)}</span>
              </div>
              <div className="payment-modal__details">
                <div>
                  <span className="muted tiny">Request ID</span>
                  <strong>{activePayment.requestId || activePayment.id || "--"}</strong>
                </div>
                <div>
                  <span className="muted tiny">Status</span>
                  <strong>{String(activePayment.status || "PENDING").toUpperCase()}</strong>
                </div>
                <div>
                  <span className="muted tiny">Payment</span>
                  <strong>{formatPaymentMethodLabel(activePayment.paymentMethod || activePayment.paidVia)}</strong>
                </div>
                <div>
                  <span className="muted tiny">Assigned staff</span>
                  <strong>{activePayment.housekeeperName || "Unassigned"}</strong>
                </div>
              </div>
              <div className="payment-modal__actions">
                <button
                  className="btn pill ghost"
                  type="button"
                  onClick={() =>
                    downloadFile(
                      `invoice_${String(activePayment.requestId || activePayment.id).slice(-8)}.txt`,
                      buildInvoice(activePayment, ctx)
                    )
                  }
                >
                  Download invoice
                </button>
                {String(activePayment.status || "").toUpperCase() === "COMPLETED" && (
                  <button
                    className="btn pill ghost"
                    type="button"
                    onClick={() =>
                      downloadFile(
                        `receipt_${String(activePayment.requestId || activePayment.id).slice(-8)}.txt`,
                        buildReceipt(activePayment, ctx)
                      )
                    }
                  >
                    Receipt
                  </button>
                )}
                {canRequestRefund(activePayment) && (
                  <button
                    className="btn pill ghost"
                    type="button"
                    onClick={() => openRefundModal(activePayment)}
                  >
                    Request refund
                  </button>
                )}
              </div>
              {activeIsPendingPayment && String(activePayment.paymentMethod || "").toUpperCase() === "STATIC_QR" && (
                <div className="payment-inline">
                  <p className="muted small">Enter the transaction ID from your QR payment.</p>
                  <input
                    type="text"
                    placeholder="Transaction ID"
                    value={txnByRequest[String(activePayment.id || activePayment.requestId || "")] || ""}
                    onChange={(e) =>
                      setTxnByRequest((prev) => ({
                        ...prev,
                        [String(activePayment.id || activePayment.requestId || "")]: e.target.value
                      }))
                    }
                  />
                  <button
                    className="btn pill primary"
                    type="button"
                    disabled={!String(txnByRequest[String(activePayment.id || activePayment.requestId || "")] || "").trim() || savingId === String(activePayment.id || activePayment.requestId || "")}
                    onClick={() => {
                      handleSubmitQr(activePayment);
                      setActivePayment(null);
                    }}
                  >
                    {savingId === String(activePayment.id || activePayment.requestId || "") ? "Saving..." : "Submit QR Payment"}
                  </button>
                </div>
              )}
              {canConfirmCash && (
                <div className="payment-inline">
                  <p className="muted small">Confirm that you will pay in cash when the staff arrives.</p>
                  <button
                    className="btn pill primary"
                    type="button"
                    disabled={savingId === String(activePayment.id || activePayment.requestId || "")}
                    onClick={() => {
                      handleConfirmCash(activePayment);
                      setActivePayment(null);
                    }}
                  >
                    {savingId === String(activePayment.id || activePayment.requestId || "") ? "Saving..." : "Confirm Cash on Hand"}
                  </button>
                </div>
              )}
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
    </>
  );
}
