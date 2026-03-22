import React from "react";
import Staff from "./Staff";
import { STAFF_NOTIFICATIONS_SECTIONS } from "./staffVisibleSections";

function StaffNotifications() {
  return (
    <Staff
      visibleSections={STAFF_NOTIFICATIONS_SECTIONS}
      renderNotificationsSection={(ctx) => <StaffNotificationsContent ctx={ctx} />}
    />
  );
}

function StaffNotificationsContent({ ctx }) {
  return (
    <section className="panel card notifications" id="staff-notifications">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Notifications</p>
          <h4>Latest</h4>
        </div>
        <div className="notification-actions">
          <button
            className={`btn pill ${ctx.notificationFilter === "unread" ? "primary" : "ghost"}`}
            type="button"
            onClick={() => ctx.setNotificationFilter("unread")}
          >
            Unread
          </button>
          <button
            className={`btn pill ${ctx.notificationFilter === "all" ? "primary" : "ghost"}`}
            type="button"
            onClick={() => ctx.setNotificationFilter("all")}
          >
            All
          </button>
          <button
            className="btn pill ghost"
            type="button"
            disabled={ctx.notificationsLoading || ctx.notifications.length === 0}
            onClick={ctx.markAllRead}
          >
            Mark all read
          </button>
        </div>
      </div>
      <div className="notification-list">
        {ctx.notificationsLoading ? (
          <div className="notification-item">
            <p className="muted small">Loading notifications...</p>
          </div>
        ) : ctx.notifications.length === 0 ? (
          <div className="notification-item">
            <p className="muted small">No notifications yet.</p>
          </div>
        ) : (
          ctx.notifications
            .filter((item) => (ctx.notificationFilter === "all" ? true : item.read !== true))
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-item ${item.read === true ? "read" : "unread"} fade-in`}
                onClick={() => {
                  if (typeof ctx.markNotificationRead === "function") ctx.markNotificationRead(item.id);
                  ctx.openNotificationModal(item);
                }}
              >
                <div className="notification-top">
                  <span className="notification-title">{item.title || "Update"}</span>
                  <span className="notification-time">{ctx.formatNotificationWhen(item.createdAt)}</span>
                </div>
                <p className="notification-body">{ctx.formatNotificationBody(item.body || "")}</p>
              </button>
            ))
        )}
      </div>
    </section>
  );
}

export default StaffNotifications;
