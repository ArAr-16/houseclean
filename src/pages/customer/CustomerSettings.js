import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CustomerChrome, { useCustomerChrome } from "./CustomerChrome";
import { ref as rtdbRef, update as rtdbUpdate } from "firebase/database";
import { rtdb } from "../../firebase";

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
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    location: "",
    address: "",
    barangay: "",
    municipality: "",
    province: "",
    landmark: ""
  });
  const [avatarSeed, setAvatarSeed] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const avatarPresets = useMemo(
    () => [
      {
        id: "mop",
        label: "Mop",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0F2FE\" stroke=\"#0EA5E9\" stroke-width=\"2\"/><rect x=\"45\" y=\"18\" width=\"6\" height=\"42\" rx=\"3\" fill=\"#0EA5E9\"/><rect x=\"34\" y=\"54\" width=\"28\" height=\"8\" rx=\"4\" fill=\"#38BDF8\"/><path d=\"M28 62c6 10 34 10 40 0\" fill=\"none\" stroke=\"#0EA5E9\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>"
      },
      {
        id: "broom",
        label: "Broom",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FEF3C7\" stroke=\"#F59E0B\" stroke-width=\"2\"/><rect x=\"46\" y=\"16\" width=\"4\" height=\"46\" rx=\"2\" fill=\"#B45309\"/><path d=\"M32 60h32l-6 16H38l-6-16z\" fill=\"#F59E0B\"/><path d=\"M38 60l2 8M44 60l2 8M50 60l2 8M56 60l2 8\" stroke=\"#B45309\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>"
      },
      {
        id: "vacuum",
        label: "Vacuum",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#EDE9FE\" stroke=\"#8B5CF6\" stroke-width=\"2\"/><rect x=\"30\" y=\"48\" width=\"28\" height=\"18\" rx=\"9\" fill=\"#8B5CF6\"/><circle cx=\"62\" cy=\"58\" r=\"8\" fill=\"#C4B5FD\"/><path d=\"M58 36h12\" stroke=\"#8B5CF6\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M70 36v18\" stroke=\"#8B5CF6\" stroke-width=\"4\" stroke-linecap=\"round\"/></svg>"
      },
      {
        id: "spray",
        label: "Spray Bottle",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DCFCE7\" stroke=\"#22C55E\" stroke-width=\"2\"/><rect x=\"40\" y=\"34\" width=\"16\" height=\"8\" rx=\"3\" fill=\"#22C55E\"/><rect x=\"36\" y=\"42\" width=\"24\" height=\"34\" rx=\"8\" fill=\"#4ADE80\"/><path d=\"M56 30h10\" stroke=\"#16A34A\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"72\" cy=\"34\" r=\"3\" fill=\"#22C55E\"/></svg>"
      },
      {
        id: "bucket",
        label: "Bucket",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DBEAFE\" stroke=\"#3B82F6\" stroke-width=\"2\"/><path d=\"M30 36h36l-4 36H34l-4-36z\" fill=\"#60A5FA\"/><path d=\"M36 32c0-6 24-6 24 0\" fill=\"none\" stroke=\"#3B82F6\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M38 54c6 6 14 6 20 0\" stroke=\"#3B82F6\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>"
      },
      {
        id: "apron",
        label: "Apron",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FFE4E6\" stroke=\"#F43F5E\" stroke-width=\"2\"/><path d=\"M34 28c8 10 20 10 28 0\" fill=\"none\" stroke=\"#F43F5E\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M30 36h36l-4 36H34l-4-36z\" fill=\"#FB7185\"/><rect x=\"40\" y=\"48\" width=\"16\" height=\"10\" rx=\"4\" fill=\"#FFE4E6\"/></svg>"
      },
      {
        id: "gloves",
        label: "Gloves",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FEE2E2\" stroke=\"#EF4444\" stroke-width=\"2\"/><path d=\"M30 54c0-10 6-14 10-14s6 4 6 8v20H36c-4 0-6-4-6-14z\" fill=\"#F87171\"/><path d=\"M60 50c0-8 6-12 10-12s6 4 6 8v18H66c-4 0-6-4-6-14z\" fill=\"#FB7185\"/></svg>"
      },
      {
        id: "housekeeper",
        label: "Housekeeper",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0E7FF\" stroke=\"#6366F1\" stroke-width=\"2\"/><circle cx=\"48\" cy=\"38\" r=\"12\" fill=\"#A5B4FC\"/><path d=\"M28 74c4-16 36-16 40 0\" fill=\"#818CF8\"/><path d=\"M38 36c6 4 14 4 20 0\" stroke=\"#6366F1\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>"
      },
      {
        id: "sparkle_home",
        label: "Sparkling Home",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#ECFCCB\" stroke=\"#65A30D\" stroke-width=\"2\"/><path d=\"M26 50l22-18 22 18v22H26V50z\" fill=\"#84CC16\"/><path d=\"M44 72V56h8v16\" fill=\"#D9F99D\"/><path d=\"M70 30l4 4m0-4l-4 4\" stroke=\"#65A30D\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>"
      },
      {
        id: "bubbles",
        label: "Bubbles",
        svg:
          "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0F2FE\" stroke=\"#0EA5E9\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"52\" r=\"12\" fill=\"#BAE6FD\"/><circle cx=\"58\" cy=\"42\" r=\"10\" fill=\"#7DD3FC\"/><circle cx=\"58\" cy=\"64\" r=\"8\" fill=\"#38BDF8\"/></svg>"
      }
    ],
    []
  );

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

  useEffect(() => {
    if (!ctx.profile && !ctx.authUser) return;
    const rawFull =
      String(ctx.profile?.fullName || ctx.profile?.name || ctx.displayName || "").trim();
    const parts = rawFull.split(/\s+/).filter(Boolean);
    const fallbackFirst = parts[0] || "";
    const fallbackLast = parts.length > 1 ? parts.slice(1).join(" ") : "";
    setForm({
      firstName: String(ctx.profile?.firstName || "").trim() || fallbackFirst,
      lastName: String(ctx.profile?.lastName || "").trim() || fallbackLast,
      phone: String(ctx.profile?.phone || ctx.profile?.contact || ""),
      location: String(ctx.profile?.location || ""),
      address: String(ctx.profile?.address || ""),
      barangay: String(ctx.profile?.barangay || ""),
      municipality: String(ctx.profile?.municipality || ""),
      province: String(ctx.profile?.province || ""),
      landmark: String(ctx.profile?.landmark || "")
    });
    setAvatarSeed(
      String(ctx.profile?.avatarSeed || ctx.profile?.id || ctx.authUser?.uid || ctx.displayName || "HU")
    );
  }, [ctx.authUser, ctx.displayName, ctx.profile]);

  const avatarUrl = useMemo(() => {
    const preset = avatarPresets.find((p) => p.id === avatarSeed) || avatarPresets[0];
    const svg = preset?.svg || "";
    return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";
  }, [avatarPresets, avatarSeed]);

  const handleSave = async () => {
    if (!ctx.authUser?.uid) {
      setError("Please sign in to update your profile.");
      return;
    }
    if (saving) return;
    setError("");
    setSuccess("");
    setSaving(true);

    const payload = {
      firstName: String(form.firstName || "").trim(),
      lastName: String(form.lastName || "").trim(),
      fullName: `${String(form.firstName || "").trim()} ${String(form.lastName || "").trim()}`.trim(),
      phone: String(form.phone || "").trim(),
      location: String(form.location || "").trim(),
      address: String(form.address || "").trim(),
      barangay: String(form.barangay || "").trim(),
      municipality: String(form.municipality || "").trim(),
      province: String(form.province || "").trim(),
      landmark: String(form.landmark || "").trim(),
      avatarSeed: String(avatarSeed || "").trim()
    };

    try {
      const updatePromise = rtdbUpdate(rtdbRef(rtdb, `Users/${ctx.authUser.uid}`), payload);
      await Promise.race([
        updatePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Save timed out.")), 15000))
      ]);
      try {
        const key = `hc_profile_${ctx.authUser.uid}`;
        const cached = ctx.profile ? { ...ctx.profile, ...payload } : payload;
        localStorage.setItem(key, JSON.stringify(cached));
      } catch (_) {
        // Ignore storage errors.
      }
      setSuccess("Profile updated.");
    } catch (err) {
      const msg = String(err?.message || err?.code || "Could not update profile.").trim();
      setError(msg || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="panel card profile-card" id="profile">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Profile Account Management</p>
          </div>
        </div>
        <div className="profile-form">
          <div className="avatar-uploader">
            <p className="mini-label">Choose an avatar</p>
            <div className="avatar-preview">
              <img src={avatarUrl} alt="Avatar" />
            </div>
            <div className="avatar-actions">
              
              <div className="avatar-presets">
                {avatarPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`avatar-chip ${avatarSeed === preset.id ? "active" : ""}`}
                    onClick={() => setAvatarSeed(preset.id)}
                    aria-label={preset.label}
                    title={preset.label}
                  >
                    <img
                      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preset.svg)}`}
                      alt=""
                      className="avatar-thumb"
                    />
                  </button>
                ))}
              </div>
              <span className="muted tiny">Pick a style. It updates everywhere in your account.</span>
            </div>
          </div>
          <div className="account-form">
            <div className="form-stack">
              <label className="form-field">
                First name
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </label>
              <label className="form-field">
                Last name
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </label>
              <label className="form-field">
                Email
                <input type="email" value={ctx.profile?.email || ctx.authUser?.email || ""} readOnly />
              </label>
              <label className="form-field">
                Phone
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="09xx xxx xxxx"
                />
              </label>
                            <label className="form-field">
                Barangay
                <input
                  type="text"
                  value={form.barangay}
                  onChange={(e) => setForm((prev) => ({ ...prev, barangay: e.target.value }))}
                  placeholder="Barangay"
                />
              </label>
                            <label className="form-field">
                Municipality
                <input
                  type="text"
                  value={form.municipality}
                  onChange={(e) => setForm((prev) => ({ ...prev, municipality: e.target.value }))}
                  placeholder="Municipality"
                />
              </label>
              <label className="form-field">
                House No. & Street
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="House number and street"
                />
              </label>


              {/* <label className="form-field">
                Province
                <input
                  type="text"
                  value={form.province}
                  onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                  placeholder="Province"
                />
              </label> */}
              <label className="form-field">
                Landmark
                <input
                  type="text"
                  value={form.landmark}
                  onChange={(e) => setForm((prev) => ({ ...prev, landmark: e.target.value }))}
                  placeholder="Nearby reference"
                />
              </label>
              <label className="form-field">
                Current password
                <div className="input-icon">
                  <input type={showCurrent ? "text" : "password"} placeholder="Current password" disabled />
                  <button type="button" className="icon-btn ghost" onClick={() => setShowCurrent((v) => !v)}>
                    <i className={`fas ${showCurrent ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>

              </label>
              <label className="form-field">
                New password
                <div className="input-icon">
                  <input type={showNew ? "text" : "password"} placeholder="New password" disabled />
                  <button type="button" className="icon-btn ghost" onClick={() => setShowNew((v) => !v)}>
                    <i className={`fas ${showNew ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>

              </label>
              <label className="form-field">
                Confirm password
                <div className="input-icon">
                  <input type={showConfirm ? "text" : "password"} placeholder="Confirm password" disabled />
                  <button type="button" className="icon-btn ghost" onClick={() => setShowConfirm((v) => !v)}>
                    <i className={`fas ${showConfirm ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </label>
            </div>
            <div className="form-actions">
              <button className="btn pill primary" type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
              {error && <span className="error-note">{error}</span>}
              {success && <span className="success-note">{success}</span>}
            </div>
          </div>
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
