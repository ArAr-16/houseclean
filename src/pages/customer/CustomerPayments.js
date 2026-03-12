import React, { useMemo, useState } from "react";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { useCustomerServiceRequests } from "./customerData";

function moneyLabel(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "PHP --";
  return `PHP ${Math.round(n).toLocaleString()}`;
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
    `Schedule: ${when || "—"}`,
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
  const paidVia = String(request?.paidVia || "N/A");
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

function CustomerPayments() {
  const paymentMethods = useMemo(
    () => [
      { key: "gcash", label: "GCash", icon: "fas fa-mobile-alt", hint: "Fast local payments" },
      { key: "paypal", label: "PayPal", icon: "fab fa-paypal", hint: "Pay with PayPal balance/cards" },
      { key: "card", label: "Card", icon: "fas fa-credit-card", hint: "Visa / Mastercard" }
    ],
    []
  );

  const [selectedMethod, setSelectedMethod] = useState("gcash");

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
  const { requests, loading } = useCustomerServiceRequests(ctx.authUser?.uid);
  const payable = (requests || []).filter((r) => String(r.status || "").toUpperCase() !== "COMPLETED");
  const completed = (requests || []).filter((r) => String(r.status || "").toUpperCase() === "COMPLETED");

  return (
    <>
      <section className="panel card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Payments</p>
            <h3>Secure payment options</h3>
          </div>
          <span className="pill soft amber">Demo</span>
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

        <div className="settings-actions">
          <button className="btn pill primary" type="button" disabled>
            Pay now (coming soon)
          </button>
          <span className="muted small">Selected: {paymentMethods.find((m) => m.key === selectedMethod)?.label}</span>
        </div>
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
            <div className="muted small">Invoices can be generated anytime. Receipts appear after payment integration.</div>

            <div className="billing-list">
              {payable.slice(0, 12).map((r) => (
                <div key={r.requestId || r.id} className="billing-row">
                  <div className="billing-meta">
                    <strong>{r.serviceType || "Service"}</strong>
                    <span className="muted small">{String(r.startDate || `${r.date || ""} ${r.time || ""}`).trim() || "—"}</span>
                  </div>
                  <div className="billing-actions">
                    <span className="pill stat">{moneyLabel(r.totalPrice)}</span>
                    <button
                      className="btn pill ghost"
                      type="button"
                      onClick={() =>
                        downloadFile(`invoice_${String(r.requestId || r.id).slice(-8)}.txt`, buildInvoice(r, ctx))
                      }
                    >
                      Download invoice
                    </button>
                  </div>
                </div>
              ))}

              {completed.slice(0, 8).map((r) => (
                <div key={r.requestId || r.id} className="billing-row done">
                  <div className="billing-meta">
                    <strong>{r.serviceType || "Service"} (Completed)</strong>
                    <span className="muted small">{String(r.startDate || `${r.date || ""} ${r.time || ""}`).trim() || "—"}</span>
                  </div>
                  <div className="billing-actions">
                    <span className="pill soft green">{moneyLabel(r.totalPrice)}</span>
                    <button
                      className="btn pill ghost"
                      type="button"
                      onClick={() =>
                        downloadFile(`invoice_${String(r.requestId || r.id).slice(-8)}.txt`, buildInvoice(r, ctx))
                      }
                    >
                      Invoice
                    </button>
                    <button
                      className="btn pill ghost"
                      type="button"
                      onClick={() =>
                        downloadFile(`receipt_${String(r.requestId || r.id).slice(-8)}.txt`, buildReceipt(r, ctx))
                      }
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
