import React from "react";
import Staff from "./Staff";
import { STAFF_REQUESTS_SECTIONS } from "./staffVisibleSections";

function StaffRequests() {
  return (
    <Staff
      visibleSections={STAFF_REQUESTS_SECTIONS}
      renderRequestsSection={(ctx) => <StaffRequestsContent ctx={ctx} />}
    />
  );
}

function StaffRequestsContent({ ctx }) {
  const query = ctx.normalizeSearch(ctx.requestSearch);

  return (
    <section className="panel card list-board" id="requests">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Requests</p>
        </div>
      </div>
      <div className="board-items">
        {ctx.requestsLoading ? (
          <div className="empty-state">Loading requests...</div>
        ) : (
          <div className="staff-requests-table">
            <div className="staff-requests-tabs">
              <button
                type="button"
                className={`btn pill ${ctx.requestTab === "request" ? "primary" : "ghost"} staff-requests-tab`}
                onClick={() => ctx.setRequestTab("request")}
              >
                Request
                {ctx.incomingRequests.length > 0 && (
                  <span className="staff-requests-tab__count">{ctx.incomingRequests.length}</span>
                )}
              </button>
              <button
                type="button"
                className={`btn pill ${ctx.requestTab === "pending" ? "primary" : "ghost"} staff-requests-tab`}
                onClick={() => ctx.setRequestTab("pending")}
              >
                Pending
                {ctx.attendanceRequests.length + ctx.cashConfirmationRequests.length > 0 && (
                  <span className="staff-requests-tab__count">
                    {ctx.attendanceRequests.length + ctx.cashConfirmationRequests.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`btn pill ${ctx.requestTab === "ongoing" ? "primary" : "ghost"} staff-requests-tab`}
                onClick={() => ctx.setRequestTab("ongoing")}
              >
                Ongoing
                {ctx.ongoingRequests.length > 0 && (
                  <span className="staff-requests-tab__count">{ctx.ongoingRequests.length}</span>
                )}
              </button>
              <button
                type="button"
                className={`btn pill ${ctx.requestTab === "completed" ? "primary" : "ghost"} staff-requests-tab`}
                onClick={() => ctx.setRequestTab("completed")}
              >
                Completed
              </button>
            </div>

            <div className="staff-requests-controls">
              <input
                type="text"
                placeholder="Search"
                value={ctx.requestSearch}
                onChange={(e) => ctx.setRequestSearch(e.target.value)}
              />
            </div>

            {ctx.requestTab === "request" && (
              <div className="staff-requests-list">
                {ctx.incomingRequests.filter((item) => ctx.matchesSearch(item, query)).length === 0 ? (
                  <div className="staff-requests-empty">No incoming requests.</div>
                ) : (
                  <div className="staff-requests-table-grid staff-requests-table-grid--3col">
                    <div className="staff-requests-list-head">
                      <span>Name/Services</span>
                      <span>Payment Status</span>
                      <span>Action</span>
                    </div>
                    {ctx.incomingRequests
                      .filter((item) => ctx.matchesSearch(item, query))
                      .map((item) => {
                        const statusClass = ctx.getStatusLower(item);
                        const isPending = statusClass === "pending";
                        const isPendingPayment = statusClass === "pending_payment";
                        const isConfirmed = statusClass === "confirmed";
                        const isReserved = statusClass === "reserved";
                        const customerName = item.householderName || item.customer || "Customer";
                        const customerAvatar = ctx.getCustomerAvatar(item);
                        const serviceLabel = ctx.getServiceSummary(item);
                        const timeLabel = ctx.formatSchedule(item);
                        const assignedId = String(item.housekeeperId || "").trim();
                        const paymentStatusKey = ctx.getPaymentStatusKey(item);
                        const paymentMethodKey = ctx.getPaymentMethodKey(item);
                        const paymentLabel = (() => {
                          if (ctx.isPaid(item)) return "Paid";
                          if (ctx.isCashReserved(item)) return "Reserved";
                          if (paymentStatusKey) {
                            return paymentStatusKey
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (match) => match.toUpperCase());
                          }
                          if (paymentMethodKey) return "Pending";
                          return "Unpaid";
                        })();
                        const paymentTone = (() => {
                          if (ctx.isPaid(item)) return "green";
                          if (ctx.isCashReserved(item)) return "amber";
                          if (paymentStatusKey || paymentMethodKey) return "blue";
                          return "amber";
                        })();
                        const canActOnThis =
                          !assignedId || (Boolean(ctx.currentUserId) && assignedId === ctx.currentUserId);
                        const canConfirm = ctx.isStaffManager && isPending;
                        const paymentMethod = ctx.getPaymentMethodKey(item);
                        const isStaticQrPayment = paymentMethod === "STATIC_QR";
                        const isPaymentPaid = ctx.isPaid(item);
                        const canAcceptIfNotStaticQr =
                          ((ctx.isStaffManager &&
                            (isPending || isPendingPayment || isConfirmed || isReserved)) ||
                            (ctx.isHousekeeper &&
                              (isPending || isPendingPayment || isConfirmed || isReserved))) &&
                          canActOnThis;
                        const isAccepted = statusClass === "accepted";
                        const canDecline =
                          ((ctx.isStaffManager &&
                            (isPending || isPendingPayment || isConfirmed || isReserved)) ||
                            (ctx.isHousekeeper &&
                              (isPending ||
                                isPendingPayment ||
                                isConfirmed ||
                                isReserved ||
                                isAccepted))) &&
                          canActOnThis;

                        return (
                          <div
                            key={item.id}
                            className="staff-requests-rowline staff-requests-rowline--request is-clickable"
                            role="button"
                            tabIndex={0}
                            onClick={() => ctx.openRequestModal(item)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                ctx.openRequestModal(item);
                              }
                            }}
                          >
                            <div className="row-main">
                              <div className="avatar-pill alt">
                                {customerAvatar.url ? (
                                  <img src={customerAvatar.url} alt={customerAvatar.name} />
                                ) : (
                                  customerAvatar.initials
                                )}
                              </div>
                              <div>
                                <strong>{serviceLabel}</strong>
                                <p className="muted small">
                                  {customerName}
                                </p>
                                {timeLabel && <p className="tiny muted">{timeLabel}</p>}
                              </div>
                            </div>
                            <div className="row-meta">
                              <span className={`pill soft ${paymentTone}`}>{paymentLabel}</span>
                            </div>
                            <div className="row-meta actions">
                              <button
                                className="btn ghost"
                                type="button"
                                disabled={!canDecline}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  ctx.runWithConfirm("Decline this request?", () => {
                                    ctx.handleRequestAction(item, "DECLINED");
                                  });
                                }}
                              >
                                Decline
                              </button>
                              <button
                                className="btn primary"
                                type="button"
                                disabled={!(canConfirm || canAcceptIfNotStaticQr)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isStaticQrPayment && !isPaymentPaid) {
                                    ctx.openPaymentRequiredModal(item);
                                  } else {
                                    ctx.runWithConfirm(
                                      canConfirm ? "Confirm this request?" : "Accept this request?",
                                      () =>
                                        ctx.handleRequestAction(
                                          item,
                                          canConfirm ? "CONFIRMED" : "ACCEPTED"
                                        )
                                    );
                                  }
                                }}
                              >
                                {canConfirm ? "Confirm" : "Accept"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {ctx.requestTab === "pending" && (
              <div className="staff-requests-list">
                {[...ctx.attendanceRequests, ...ctx.cashConfirmationRequests].filter((item) =>
                  ctx.matchesSearch(item, query)
                ).length === 0 ? (
                  <div className="staff-requests-empty">No pending requests.</div>
                ) : (
                  <div className="staff-requests-table-grid staff-requests-table-grid--3col">
                    <div className="staff-requests-list-head">
                      <span>Name/Services</span>
                      <span>Status</span>
                      <span>Action</span>
                    </div>
                    {[...ctx.attendanceRequests, ...ctx.cashConfirmationRequests]
                      .filter((item) => ctx.matchesSearch(item, query))
                      .map((item) => {
                        const customerName = item.householderName || item.customer || "Customer";
                        const customerAvatar = ctx.getCustomerAvatar(item);
                        const serviceLabel = ctx.getServiceSummary(item);
                        const timeLabel = ctx.formatSchedule(item);
                        const staffArrived = Boolean(item.staffArrived);
                        const awaitingCustomer = staffArrived && !item.customerArrivalConfirmed;
                        const canMarkArrived =
                          String(item.status || "").toLowerCase() === "accepted" && !staffArrived;

                        return (
                          <div
                            key={item.id}
                            className="staff-requests-rowline is-clickable"
                            role="button"
                            tabIndex={0}
                            onClick={() => ctx.openRequestModal(item)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                ctx.openRequestModal(item);
                              }
                            }}
                          >
                            <div className="row-main">
                              <div className="avatar-pill alt">
                                {customerAvatar.url ? (
                                  <img src={customerAvatar.url} alt={customerAvatar.name} />
                                ) : (
                                  customerAvatar.initials
                                )}
                              </div>
                              <div>
                                <strong>{serviceLabel}</strong>
                                <p className="muted small">{customerName}</p>
                                {timeLabel && <p className="tiny muted">{timeLabel}</p>}
                              </div>
                            </div>
                            <div className="row-meta">
                              <span className={`pill soft ${awaitingCustomer ? "amber" : "blue"}`}>
                                {awaitingCustomer ? "Awaiting customer confirmation" : "Accepted"}
                              </span>
                            </div>
                            <div className="row-meta actions">
                              {canMarkArrived && (
                                <button
                                  className="btn ghost mark-arrived-btn"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    ctx.runWithConfirm("Mark staff arrival for this request?", () => {
                                      ctx.triggerArrivedClick(item);
                                      ctx.handleStaffArrived?.(item);
                                    });
                                  }}
                                >
                                  Mark arrived
                                </button>
                              )}
                              {ctx.isCashReserved(item) && staffArrived && (
                                <button
                                  className="btn ghost"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    ctx.openCashConfirm(item);
                                  }}
                                >
                                  Mark payment
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {ctx.requestTab === "ongoing" && (
              <div className="staff-requests-list">
                {ctx.ongoingRequests.filter((item) => ctx.matchesSearch(item, query)).length === 0 ? (
                  <div className="staff-requests-empty">No ongoing tasks.</div>
                ) : (
                  <div className="staff-requests-table-grid staff-requests-table-grid--3col">
                    <div className="staff-requests-list-head">
                      <span>Name/Services</span>
                      <span>Status</span>
                      <span>Action</span>
                    </div>
                    {ctx.ongoingRequests
                      .filter((item) => ctx.matchesSearch(item, query))
                      .map((item) => {
                        const customerName = item.householderName || item.customer || "Customer";
                        const customerAvatar = ctx.getCustomerAvatar(item);
                        const serviceLabel = ctx.getServiceSummary(item);
                        const timeLabel = ctx.formatSchedule(item);
                        const hasPaymentMethod = Boolean(
                          ctx.paymentMethodByRequestId?.[item.id] || item.paymentMethod
                        );
                        const canComplete = hasPaymentMethod && Boolean(item.customerArrivalConfirmed);

                        return (
                          <div
                            key={item.id}
                            className="staff-requests-rowline is-clickable"
                            role="button"
                            tabIndex={0}
                            onClick={() => ctx.openRequestModal(item)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                ctx.openRequestModal(item);
                              }
                            }}
                          >
                            <div className="row-main">
                              <div className="avatar-pill alt">
                                {customerAvatar.url ? (
                                  <img src={customerAvatar.url} alt={customerAvatar.name} />
                                ) : (
                                  customerAvatar.initials
                                )}
                              </div>
                              <div>
                                <strong>{serviceLabel}</strong>
                                <p className="muted small">{customerName}</p>
                                {timeLabel && <p className="tiny muted">{timeLabel}</p>}
                              </div>
                            </div>
                            <div className="row-meta">
                              <span className="pill soft blue">In progress</span>
                            </div>
                            <div className="row-meta actions">
                              <button
                                className="btn primary"
                                type="button"
                                disabled={!canComplete}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  ctx.setActiveRequest(item);
                                  ctx.openCompleteConfirm();
                                }}
                              >
                                Complete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {ctx.requestTab === "completed" && (
              <div className="staff-requests-list">
                {ctx.activeHistoryList.length === 0 ? (
                  <div className="staff-requests-empty">No completed services yet.</div>
                ) : (
                  <div className="staff-requests-table-grid staff-requests-table-grid--2col">
                    <div className="staff-requests-list-head staff-requests-list-head--two">
                      <span>Name/Services</span>
                      <span>Action</span>
                    </div>
                    {ctx.completedPaged.map((item) => {
                      const relatedRequest = (ctx.requests || []).find(
                        (request) => String(request?.id || "") === String(item.id || "")
                      );
                      const canOpen = Boolean(relatedRequest);

                      return (
                        <div
                          key={item.id}
                          className={`staff-requests-rowline staff-requests-rowline--two ${
                            canOpen ? "is-clickable" : ""
                          }`}
                          role={canOpen ? "button" : undefined}
                          tabIndex={canOpen ? 0 : undefined}
                          onClick={() => {
                            if (relatedRequest) ctx.openRequestModal(relatedRequest);
                          }}
                          onKeyDown={(e) => {
                            if (!relatedRequest) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              ctx.openRequestModal(relatedRequest);
                            }
                          }}
                        >
                          <div>
                            <strong>{item.job}</strong>
                            <p className="muted small">{item.date}</p>
                            <p className="tiny muted">{item.payout}</p>
                            <p className="tiny muted">{item.payment}</p>
                          </div>
                          <div className="row-meta actions">
                            <button
                              className="btn ghost"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                ctx.runWithConfirm("Archive this completed request?", () => {
                                  ctx.archiveHistoryItem(item);
                                });
                              }}
                            >
                              Archive
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {ctx.completedTotalPages > 1 && (
                      <div className="staff-requests-pagination">
                        <button
                          className="btn pill ghost"
                          type="button"
                          disabled={ctx.completedCurrentPage <= 1}
                          onClick={() => ctx.setCompletedPage((value) => Math.max(1, value - 1))}
                        >
                          Prev
                        </button>
                        <span className="muted small">
                          Page {ctx.completedCurrentPage} of {ctx.completedTotalPages}
                        </span>
                        <button
                          className="btn pill ghost"
                          type="button"
                          disabled={ctx.completedCurrentPage >= ctx.completedTotalPages}
                          onClick={() =>
                            ctx.setCompletedPage((value) => Math.min(ctx.completedTotalPages, value + 1))
                          }
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default StaffRequests;
