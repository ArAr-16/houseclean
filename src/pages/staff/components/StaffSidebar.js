import React from "react";
import { Link, useLocation } from "react-router-dom";

function StaffSidebar() {
  const location = useLocation();
  const pathname = String(location?.pathname || "");

  const normalizePath = (value) => String(value || "").replace(/\/+$/, "") || "/";

  const isActive = (to, exact = false) => {
    const target = normalizePath(to);
    const current = normalizePath(pathname);
    if (exact) return current === target;
    return current === target || current.startsWith(`${target}/`);
  };

  return (
    <aside className="staff-sidebar">
      <nav>
        <Link className={isActive("/staff", true) ? "active" : ""} to="/staff">
          <i className="fas fa-house"></i> Dashboard
        </Link>
        <Link className={isActive("/staff/requests") ? "active" : ""} to="/staff/requests">
          <i className="fas fa-clipboard-list"></i> Requests
        </Link>
        <Link className={isActive("/staff/schedule") ? "active" : ""} to="/staff/schedule">
          <i className="fas fa-calendar-alt"></i> Attendance
        </Link>
        <Link className={isActive("/staff/history") ? "active" : ""} to="/staff/history">
          <i className="fas fa-clock"></i> History
        </Link>
        <Link className={isActive("/staff/settings") ? "active" : ""} to="/staff/settings">
          <i className="fas fa-gear"></i> Settings
        </Link>
      </nav>
    </aside>
  );
}

export default StaffSidebar;
