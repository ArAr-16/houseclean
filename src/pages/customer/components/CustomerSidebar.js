import React from "react";
import { Link, useLocation } from "react-router-dom";

function CustomerSidebar({ open = false, items = [] }) {
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
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <nav>
        {items.map((item) => {
          const className = item?.to ? (isActive(item.to, item.exact) ? "active" : "") : "";
          const icon = item.icon ? <i className={item.icon}></i> : null;
          const content = (
            <>
              {icon} {item.label}
            </>
          );

          if (item.to) {
            return (
              <a
                key={item.key || item.to}
                href={item.to}
                className={className}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = item.to;
                }}
              >
                {content}
              </a>
            );
          }

          return (
            <span key={item.key || item.label} className={className}>
              {content}
            </span>
          );
        })}
      </nav>
    </aside>
  );
}

export default CustomerSidebar;
