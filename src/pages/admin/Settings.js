import React, { useEffect, useState } from "react";
import "../../components/Admin.css";
import { auth, rtdb } from "../../firebase";
import {
  onAuthStateChanged,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { ref, onValue, update as rtdbUpdate } from "firebase/database";

const defaultPrefs = {
  theme: "system",
  language: "en",
  currency: "USD",
};

function Settings() {
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    newPassword: "",
    confirmPassword: "",
    currentPassword: "",
  });
  const [showPwd, setShowPwd] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [status, setStatus] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const applyTheme = (value) => {
    const root = document.documentElement;
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = value === "dark" || (value === "system" && prefersDark);
    root.classList.toggle("dark-mode", isDark);
    localStorage.setItem("theme", value);
  };

  // load auth + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      if (!user) return;
      setForm((prev) => ({
        ...prev,
        fullName: user.displayName || "",
        email: user.email || "",
      }));

      const userRef = ref(rtdb, `Users/${user.uid}`);
      onValue(
        userRef,
        (snap) => {
          const val = snap.val() || {};
          setForm((prev) => ({
            ...prev,
            fullName: val.fullName || val.name || prev.fullName,
            email: val.email || prev.email,
          }));
          const nextPrefs = {
            theme: val.theme || localStorage.getItem("theme") || defaultPrefs.theme,
            language: val.language || localStorage.getItem("language") || defaultPrefs.language,
            currency: val.currency || localStorage.getItem("currency") || defaultPrefs.currency,
          };
          setPrefs(nextPrefs);
          applyTheme(nextPrefs.theme);
        },
        { onlyOnce: true }
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const persistPrefs = async (next) => {
    setPrefs(next);
    localStorage.setItem("language", next.language);
    localStorage.setItem("currency", next.currency);
    applyTheme(next.theme);
    if (currentUser) {
      await rtdbUpdate(ref(rtdb, `Users/${currentUser.uid}`), {
        theme: next.theme,
        language: next.language,
        currency: next.currency,
      }).catch(() => {});
    }
  };

  const handleProfileSave = async () => {
    if (!currentUser) return;
    setStatus("Saving...");
    try {
      const tasks = [];
      const trimmedName = form.fullName.trim();
      const trimmedEmail = form.email.trim();
      const wantsEmailChange = trimmedEmail && trimmedEmail !== currentUser.email;
      const wantsPasswordChange = Boolean(form.newPassword);
      if (/\s/.test(form.currentPassword) || /\s/.test(form.newPassword) || /\s/.test(form.confirmPassword)) {
        setStatus("Password cannot contain spaces");
        return;
      }

      // Require reauth for sensitive ops
      if (wantsEmailChange || wantsPasswordChange) {
        if (!form.currentPassword) {
          setStatus("Enter current password to update email/password");
          return;
        }
        const cred = EmailAuthProvider.credential(
          currentUser.email || trimmedEmail,
          form.currentPassword
        );
        await reauthenticateWithCredential(currentUser, cred);
      }

      if (trimmedName && trimmedName !== currentUser.displayName) {
        tasks.push(updateProfile(currentUser, { displayName: trimmedName }));
      }
      if (wantsEmailChange) {
        // Sends a verification link to the new email; change applies after click
        tasks.push(verifyBeforeUpdateEmail(currentUser, trimmedEmail));
      }
      if (form.newPassword) {
        if (form.newPassword !== form.confirmPassword) {
          setStatus("Passwords do not match");
          return;
        }
        tasks.push(updatePassword(currentUser, form.newPassword));
      }
      if (tasks.length) await Promise.all(tasks);
      await rtdbUpdate(ref(rtdb, `Users/${currentUser.uid}`), {
        fullName: trimmedName || currentUser.displayName || "",
        email: trimmedEmail || currentUser.email || "",
        role: "Admin",
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
      setStatus(
        wantsEmailChange
          ? "Verification email sent. Please confirm to finalize change."
          : "Saved"
      );
      setForm((prev) => ({
        ...prev,
        newPassword: "",
        confirmPassword: "",
        currentPassword: "",
      }));
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      setStatus(err.message || "Failed to save");
    }
  };

  return (
    <div className="admin-page neo-admin">
      <div className="settings-shell">
        <header className="settings-header">
          <div>
            <p className="eyebrow">Control Center</p>
            <h2>Settings</h2>
            <p className="muted">
              Configure your admin experience and safeguard the workspace.
            </p>
          </div>
        </header>

        <div className="settings-grid">
          <section className="panel card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Profile Management</p>
                <h4>Account</h4>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Full name
                <input
                  type="text"
                  placeholder="Admin Name"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  placeholder="admin@email.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </label>
              <label>
                Current password
                <div className="password-field">
                  <input
                    type={showPwd.current ? "text" : "password"}
                    placeholder="current password"
                    value={form.currentPassword}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value.replace(/\s/g, ""),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="toggle-eye"
                    onClick={() =>
                      setShowPwd((prev) => ({ ...prev, current: !prev.current }))
                    }
                    aria-label={showPwd.current ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPwd.current ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>

              </label>
              <label>
                New password
                <div className="password-field">
                  <input
                    type={showPwd.new ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.newPassword}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, newPassword: e.target.value.replace(/\s/g, "") }))
                    }
                  />
                  <button
                    type="button"
                    className="toggle-eye"
                    onClick={() =>
                      setShowPwd((prev) => ({ ...prev, new: !prev.new }))
                    }
                    aria-label={showPwd.new ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPwd.new ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>

              </label>
              <label>
                Confirm password
                <div className="password-field">
                  <input
                    type={showPwd.confirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value.replace(/\s/g, ""),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="toggle-eye"
                    onClick={() =>
                      setShowPwd((prev) => ({
                        ...prev,
                        confirm: !prev.confirm,
                      }))
                    }
                    aria-label={showPwd.confirm ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPwd.confirm ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
 
              </label>
            </div>
            <div className="settings-actions">
              <button className="btn primary" type="button" onClick={handleProfileSave}>
                Save changes
              </button>
              {status && (
                <span className="muted" style={{ marginLeft: 12 }}>
                  {status}
                </span>
              )}
            </div>
          </section>

          <section className="panel card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Theme / Appearance</p>
                <h4>Look & Feel</h4>
              </div>
            </div>
            <div className="settings-list">
              <label className="pill-select-row">
                Theme
                <select
                  value={prefs.theme}
                  onChange={(e) =>
                    persistPrefs({ ...prefs, theme: e.target.value })
                  }
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <div className="hint">
                Switch colors or layout presets for the admin panel.
              </div>
            </div>
          </section>

          <section className="panel card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Language & Localization</p>
                <h4>Locale</h4>
              </div>
            </div>
            <div className="settings-list">
              <label className="pill-select-row">
                Display language
                <select
                  value={prefs.language}
                  onChange={(e) =>
                    persistPrefs({ ...prefs, language: e.target.value })
                  }
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fil">Filipino</option>
                </select>
              </label>
              <label className="pill-select-row">
                Currency
                <select
                  value={prefs.currency}
                  onChange={(e) =>
                    persistPrefs({ ...prefs, currency: e.target.value })
                  }
                >
                  <option value="USD">USD</option>
                  <option value="PHP">PHP</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>
              <div className="hint">
                Choose how prices, dates, and numbers are displayed.
              </div>
            </div>
          </section>

          <section className="panel card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Backup & Restore</p>
                <h4>Data Safety</h4>
              </div>
            </div>
            <div className="settings-actions">
              <button className="btn ghost" type="button">
                <i className="fas fa-cloud-download-alt"></i> Backup now
              </button>
              <button className="btn ghost" type="button">
                <i className="fas fa-upload"></i> Restore
              </button>
            </div>
            <div className="hint">
              Download encrypted backups or restore previous snapshots.
            </div>
          </section>

          <section className="panel card" id="security-rules">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Security Rules</p>
                <h4>Protection</h4>
              </div>
            </div>
            <div className="settings-list">
              <div className="rule-item">
                <strong>Role-based access</strong>
                <span>Only Admins can manage users, payments, and settings.</span>
              </div>
              <div className="rule-item">
                <strong>Protected data</strong>
                <span>Personal details are visible only to authorized roles.</span>
              </div>
              <div className="rule-item">
                <strong>Audit logging</strong>
                <span>All critical actions are recorded in the Audit log.</span>
              </div>
              <div className="rule-item">
                <strong>Session safety</strong>
                <span>Idle sessions should be logged out after a set time.</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
