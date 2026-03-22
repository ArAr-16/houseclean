import React from "react";
import Staff from "./Staff";
import { STAFF_DASHBOARD_SECTIONS } from "./staffVisibleSections";

function StaffDashboard() {
  return (
    <Staff
      visibleSections={STAFF_DASHBOARD_SECTIONS}
      renderDashboardSection={(ctx) => <StaffDashboardContent ctx={ctx} />}
    />
  );
}

function StaffDashboardContent({ ctx }) {
  return (
    <>
      <section className="panel card staff-dashboard" id="dashboard">
        <div className="dashboard-banner">
          <div>
            <p className="mini-label">Houseclean Staff</p>
            <h2>
              Welcome back
              {ctx.showGuest ? "" : `, ${ctx.profile?.fullName || ctx.profile?.name || ctx.profile?.email || "Staff"}`}
            </h2>
            <p className="muted small">{ctx.todayLabel}</p>
          </div>
        </div>

        <div className="dashboard-reminders">
          <div className="dashboard-reminders__header">
            <div>
              <p className="eyebrow">Reminders</p>
              <h4>What needs attention</h4>
            </div>
            <button
              className="btn pill ghost"
              type="button"
              onClick={() => {
                if (typeof ctx.onGoToRequests === "function") ctx.onGoToRequests();
              }}
            >
              View requests
            </button>
          </div>
          <div className="dashboard-reminders__list">
            {ctx.dashboardReminders.length === 0 ? (
              <div className="dashboard-reminder empty">You are all caught up.</div>
            ) : (
              ctx.dashboardReminders.map((item) => (
                <div key={item.key} className={`dashboard-reminder ${item.tone}`}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-chart">
          <div className="dashboard-chart__header">
            <div>
              <p className="eyebrow">Overview</p>
              <h4>Performance summary</h4>
            </div>
          </div>
          <div className="dashboard-chart__body">
            <div className="overview-cards">
              {ctx.overviewCards.map((item) => (
                <div key={item.label} className="overview-card">
                  <span className="muted small">{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="overview-feedback">
              <div className="overview-rating">
                <span className="muted small">Ratings</span>
                <div className="overview-stars" aria-label={`Rating ${ctx.ratingDisplay} out of 5`}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <i
                      key={value}
                      className={`fas fa-star ${Number(ctx.ratingDisplay) >= value ? "on" : ""}`}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="rating-value">{ctx.ratingDisplay} / 5</span>
                </div>
              </div>
              <div className="feedback-list">
                {ctx.feedbackItems.length === 0 ? (
                  <div className="feedback-empty">No feedback yet.</div>
                ) : (
                  ctx.feedbackItems.map((item) => (
                    <div key={item.id} className="feedback-item">
                      <div className="feedback-meta">
                        <div className="feedback-profile">
                          <span className="feedback-avatar">
                            {item.avatar?.url ? (
                              <img src={item.avatar.url} alt={item.avatar.name} />
                            ) : (
                              item.avatar?.seed || item.avatar?.initials || "CU"
                            )}
                          </span>
                          <strong>{item.name}</strong>
                        </div>
                        <span className="muted tiny">
                          {item.rating ? `${item.rating.toFixed(1)} / 5` : "No rating"}
                        </span>
                      </div>
                      <p>{item.comment}</p>
                      <div className="muted tiny">
                        {item.service} • {item.when ? ctx.formatNotificationWhen(item.when) : "--"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="staff-analytics-grid">
        <section className="panel card staff-analytics-card" id="analytics">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Analytics</p>
              <h3>Performance</h3>
            </div>
            <button
              className="btn pill ghost"
              type="button"
              onClick={() => ctx.setStatsRangeDays((prev) => (prev === 30 ? 7 : 30))}
            >
              {ctx.statsRangeDays === 30 ? "Last 7 days" : "Last 30 days"}
            </button>
          </div>
          <svg className="staff-linechart" viewBox="0 0 280 140" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#5b7cfa"
              strokeWidth="3"
              points={ctx.staffRequestSeries
                .map((value, index) => `${(index / (ctx.staffRequestSeries.length - 1)) * 280},${140 - value * 3}`)
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="#67c1f7"
              strokeWidth="3"
              points={ctx.staffRevenueSeries
                .map((value, index) => `${(index / (ctx.staffRevenueSeries.length - 1)) * 280},${140 - value * 3}`)
                .join(" ")}
            />
          </svg>
          <div className="staff-legend">
            <span><i className="dot primary"></i> Requests</span>
            <span><i className="dot alt"></i> Revenue</span>
          </div>
          <div className="staff-sparkline-labels">
            {ctx.analytics.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>

        <section className="panel card staff-stats-card" id="weekly">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Statistics</p>
              <h3>{ctx.statsRangeDays === 30 ? "Last 30 days" : "Weekly"}</h3>
            </div>
          </div>
          <div className="staff-bars">
            {ctx.staffBars.map((bar) => (
              <div key={bar.label} className="staff-bar">
                <span>{bar.label}</span>
                <div className="staff-bar__track">
                  <div className="staff-bar__fill" style={{ width: `${bar.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export default StaffDashboard;
