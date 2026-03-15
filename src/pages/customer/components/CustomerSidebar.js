import React from "react";
import { Link, useLocation } from "react-router-dom";

function CustomerSidebar({ open = false, items = [] }) {
  const location = useLocation();
  const pathname = String(location?.pathname || "");
  const hash = String(location?.hash || "");

  const normalizePath = (value) => String(value || "").replace(/\/+$/, "") || "/";

  const isItemActive = (item) => {
    if (typeof item?.active === "boolean") return item.active;

    if (item?.to) {
      const toRaw = String(item.to || "");
      const [toPath, toHash = ""] = toRaw.split("#");
      const toPathNorm = normalizePath(toPath);
      const pathNorm = normalizePath(pathname);
      const hashNorm = hash || "";
      const wantHash = toHash ? `#${toHash}` : "";

      if (toHash) return pathNorm === toPathNorm && hashNorm === wantHash;
      if (item?.exact) return pathNorm === toPathNorm;
      return pathNorm === toPathNorm || pathNorm.startsWith(`${toPathNorm}/`);
    }

    if (item?.href && String(item.href).startsWith("#")) {
      const href = String(item.href);
      if (hash) return hash === href;
      return href === "#dashboard";
    }

    return false;
  };

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <nav>
        {items.map((item) => {
          const className = isItemActive(item) ? "active" : "";
          const icon = item.icon ? <i className={item.icon}></i> : null;
          const content = (
            <>
              {icon} {item.label}
            </>
          );

          if (item.to) {
            return (
              <Link key={item.key || item.to} to={item.to} className={className}>
                {content}
              </Link>
            );
          }

          return (
            <a key={item.key || item.href || item.label} href={item.href || "#"} className={className}>
              {content}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

export default CustomerSidebar;
