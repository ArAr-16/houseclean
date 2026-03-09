import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "fas fa-th-large" },
  { key: "users", label: "Users", icon: "fas fa-users" },
  { key: "history", label: "History", icon: "fas fa-history" },
];

function AdminSidebar({ active, onNavigate }) {
  const navigate = useNavigate?.();
  const location = useLocation?.();
  const currentPath = location?.pathname || "";
  const derivedActive = (() => {
    if (currentPath.includes("/admin/settings")) return "";
    if (active) return active;
    if (currentPath.includes("/admin/history")) return "history";
    if (currentPath.includes("/admin/users")) return "users";
    return "dashboard";
  })();
  const go = (key) => {
    if (onNavigate) {
      onNavigate(key);
      return;
    }
    if (key === "logout") {
      signOut(auth)
        .catch(() => {})
        .finally(() => {
          if (navigate) navigate("/login");
          else window.location.href = "/login";
        });
      return;
    }
    if (key === "settings") {
      if (navigate) navigate("/admin/settings");
      else window.location.href = "/admin/settings";
      return;
    }
    const path = `/admin/${key === "dashboard" ? "dashboard" : key}`;
    if (navigate) navigate(path);
    else window.location.href = path;
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextIsDark = !root.classList.contains("dark-mode");
    if (nextIsDark) root.classList.add("dark-mode");
    else root.classList.remove("dark-mode");
    localStorage.setItem("theme", nextIsDark ? "dark" : "light");
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("dark-mode");
  }, []);

  return (
    <aside className="dash-sidebar">
      <div className="brand-block">
        <div className="brand-logo">HC</div>
        <div className="brand-text">
          <p className="eyebrow">HOUSECLEAN ADMIN</p>
          <h3>Admin</h3>
        </div>
      </div>
      <nav className="nav-list">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${derivedActive === item.key ? "active" : ""}`}
            onClick={() => go(item.key)}
            type="button"
          >
            <i className={item.icon} /> {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-actions stacked">
        <button
          className="btn pill ghost"
          type="button"
          onClick={() => go("settings")}
          title="Settings"
        >
          <i className="fas fa-cog"></i> Settings
        </button>
         <button
          className="btn pill ghost danger"
          type="button"
          onClick={() => go("logout")}
          title="Log out"
        >
          <i className="fas fa-sign-out-alt"></i> Log out
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
