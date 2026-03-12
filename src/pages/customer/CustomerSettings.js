import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";

function CustomerSettings() {
  return (
    <CustomerChrome>
      <CustomerSettingsInner />
    </CustomerChrome>
  );
}

export default CustomerSettings;

function CustomerSettingsInner() {
  const ctx = useCustomerChrome();
  const contactLine = String(ctx.profile?.phone || ctx.profile?.contact || "").trim();
  const [theme, setTheme] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("theme") || "" : ""));

  const applyTheme = (next) => {
    const value = String(next || "").toLowerCase();
    const root = document.documentElement;
    if (value === "dark") root.classList.add("dark-mode");
    else root.classList.remove("dark-mode");
    localStorage.setItem("theme", value);
    setTheme(value);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme") || "";
    const root = document.documentElement;
    const inferred = root.classList.contains("dark-mode") ? "dark" : "light";
    setTheme(saved || inferred);
  }, []);

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
      <section className="panel card profile-card" id="profile">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Profile</p>
            <h3>Householder</h3>
          </div>
          <span className="pill stat">Role-verified</span>
        </div>
        <div className="profile-meta-grid">
          <div>
            <p className="mini-label">Name</p>
            <strong>{ctx.profileLoading ? "Loading..." : (ctx.displayName || "—")}</strong>
          </div>
          <div>
            <p className="mini-label">Address</p>
            <strong>{ctx.profileLoading ? "Loading..." : (addressLine || ctx.profile?.location || "—")}</strong>
          </div>
          <div>
            <p className="mini-label">Contact</p>
            <strong>{ctx.profileLoading ? "Loading..." : (contactLine || "—")}</strong>
          </div>
          <div>
            <p className="mini-label">Email</p>
            <strong>{ctx.profileLoading ? "Loading..." : (ctx.profile?.email || ctx.authUser?.email || "—")}</strong>
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn pill ghost" type="button" disabled>Edit profile</button>
          <button className="btn pill primary" type="button" disabled>Account security</button>
        </div>
      </section>

      <section className="panel card settings-card" id="security">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h3>Account security</h3>
          </div>
          <span className="pill soft green">Protected</span>
        </div>
        <div className="settings-grid-lite">
          <label>
            Email
            <input type="email" value={ctx.profile?.email || ctx.authUser?.email || ""} readOnly />
          </label>
          <label>
            Phone
            <input type="text" value={contactLine || ""} readOnly />
          </label>
          <label className="full">
            Password
            <input type="password" placeholder="••••••••••••" readOnly />
          </label>
          <label className="full">
            Two-factor authentication
            <div className="switch-row">
              <span>Enable OTP</span>
              <input type="checkbox" disabled />
            </div>
          </label>
        </div>
        <div className="settings-actions">
          <Link className="btn pill ghost" to={ctx.basePath}>Back to home</Link>
        </div>
      </section>

      <section className="panel card settings-card" id="appearance">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Theme</p>
            <h3>Appearance</h3>
          </div>
          <span className="pill stat">{(theme || "light").toUpperCase()}</span>
        </div>
        <div className="settings-grid-lite">
          <label className="full">
            Mode
            <div className="theme-toggle-row">
              <button
                className={`btn pill ${theme === "light" ? "primary" : "ghost"}`}
                type="button"
                onClick={() => applyTheme("light")}
              >
                Light
              </button>
              <button
                className={`btn pill ${theme === "dark" ? "primary" : "ghost"}`}
                type="button"
                onClick={() => applyTheme("dark")}
              >
                Dark
              </button>
            </div>
          </label>
        </div>
      </section>
    </>
  );
}
