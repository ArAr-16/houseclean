import React from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "firebase/auth";
import { auth } from "../../firebase";
import Staff from "./Staff";
import { STAFF_SETTINGS_SECTIONS } from "./staffVisibleSections";

function StaffSettings() {
  return (
    <Staff
      visibleSections={STAFF_SETTINGS_SECTIONS}
      renderSettingsSection={(ctx) => <StaffSettingsContent ctx={ctx} />}
    />
  );
}

function StaffSettingsContent({ ctx }) {
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState("");
  const [passwordSuccess, setPasswordSuccess] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handlePasswordFieldChange = (field, value) => {
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordForm((prev) => ({ ...prev, [field]: value.replace(/\s/g, "") }));
  };

  const handlePasswordChange = async () => {
    const currentUser = auth.currentUser;
    const email = String(currentUser?.email || ctx.profileForm?.email || "").trim();
    const currentPassword = String(passwordForm.currentPassword || "");
    const newPassword = String(passwordForm.newPassword || "");
    const confirmPassword = String(passwordForm.confirmPassword || "");

    if (!currentUser || !email) {
      setPasswordError("Please sign in again before changing your password.");
      return;
    }
    if (passwordSaving) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Fill in your current password, new password, and confirmation.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("Choose a new password that is different from your current password.");
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setPasswordSuccess("Password updated successfully.");
    } catch (err) {
      const code = String(err?.code || "").trim();
      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/user-mismatch"
      ) {
        setPasswordError("Your current password is incorrect.");
      } else if (code === "auth/weak-password") {
        setPasswordError("Choose a stronger password with at least 6 characters.");
      } else if (code === "auth/too-many-requests") {
        setPasswordError("Too many attempts. Please wait a moment and try again.");
      } else if (code === "auth/requires-recent-login") {
        setPasswordError("For security, please sign out and sign back in before changing your password.");
      } else {
        setPasswordError("Unable to change password right now. Please try again.");
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveAllChanges = async () => {
    if (typeof ctx.handleStaffProfileSave === "function") {
      await Promise.resolve(ctx.handleStaffProfileSave());
    }
    if (
      passwordForm.currentPassword ||
      passwordForm.newPassword ||
      passwordForm.confirmPassword
    ) {
      await handlePasswordChange();
    }
  };

  return (
    <section className="panel card settings-card" id="staff-settings">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Account & Security</p>
          <h4>Profile</h4>
        </div>
      </div>
      {ctx.showProfilePrompt && (
        <div className="settings-banner">
          <h4>Welcome! Please complete your staff profile.</h4>
          <p>
            This information will be saved to your account and shown to customers when they book and select staff.
            Fields marked * are required.
          </p>
        </div>
      )}
      <div className="settings-grid-lite">
        <div className="full avatar-uploader">
          <p className="mini-label">Choose an avatar</p>
          <div className="avatar-preview">
            {ctx.avatarPreview ? <img src={ctx.avatarPreview} alt="Avatar" /> : <span>Avatar</span>}
          </div>
          <div className="avatar-presets">
            {ctx.avatarPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`avatar-chip ${ctx.profileForm.avatarSeed === preset.id ? "active" : ""}`}
                onClick={() => ctx.updateField("avatarSeed", preset.id)}
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
        <label>
          First name *
          <input
            type="text"
            value={ctx.profileForm.firstName || ""}
            onChange={(e) => ctx.updateField("firstName", e.target.value)}
            placeholder="Maria"
          />
          {ctx.staffProfileErrors.firstName && <span className="form-error">{ctx.staffProfileErrors.firstName}</span>}
        </label>
        <label>
          Last name *
          <input
            type="text"
            value={ctx.profileForm.lastName || ""}
            onChange={(e) => ctx.updateField("lastName", e.target.value)}
            placeholder="Santos"
          />
          {ctx.staffProfileErrors.lastName && <span className="form-error">{ctx.staffProfileErrors.lastName}</span>}
        </label>
                <label>
          Contact number *
          <input
            type="text"
            value={ctx.profileForm.contact || ""}
            onChange={(e) => ctx.updateField("contact", e.target.value)}
            placeholder="09XXXXXXXXX"
          />
          {ctx.staffProfileErrors.contact && <span className="form-error">{ctx.staffProfileErrors.contact}</span>}
        </label>
        <label>
          Email *
          <input
            type="email"
            value={ctx.profileForm.email || ""}
            readOnly
          />
          {ctx.staffProfileErrors.email && <span className="form-error">{ctx.staffProfileErrors.email}</span>}
        </label>
        <label>
          Current password
          <div className="staff-password-field">
            <input
              type={showCurrent ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={(e) => handlePasswordFieldChange("currentPassword", e.target.value)}
              placeholder="Current password"
            />
            <button
              type="button"
              className="staff-password-toggle"
              onClick={() => setShowCurrent((prev) => !prev)}
            >
              <i className={`fas ${showCurrent ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>
        </label>

        <label>
          New password
          <div className="staff-password-field">
            <input
              type={showNew ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={(e) => handlePasswordFieldChange("newPassword", e.target.value)}
              placeholder="New password"
            />
            <button
              type="button"
              className="staff-password-toggle"
              onClick={() => setShowNew((prev) => !prev)}
            >
              <i className={`fas ${showNew ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>
        </label>
        <label className="staff-password-field">
          Confirm new password
          <div className="staff-password-field">
            <input
              type={showConfirm ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={(e) => handlePasswordFieldChange("confirmPassword", e.target.value)}
              placeholder="Confirm new password"
            />
            <button
              type="button"
              className="staff-password-toggle"
              onClick={() => setShowConfirm((prev) => !prev)}
            >
              <i className={`fas ${showConfirm ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>
        </label>
        <label className="full">
          House Number/Street *
          <input
            type="text"
            value={ctx.profileForm.address || ""}
            onChange={(e) => ctx.updateField("address", e.target.value)}
            placeholder="Enter house number and street"
          />
          {ctx.staffProfileErrors.address && <span className="form-error">{ctx.staffProfileErrors.address}</span>}
        </label>
        <label>
          Barangay *
          <input
            type="text"
            value={ctx.profileForm.barangay || ""}
            onChange={(e) => ctx.updateField("barangay", e.target.value)}
            placeholder="Enter barangay"
          />
          {ctx.staffProfileErrors.barangay && <span className="form-error">{ctx.staffProfileErrors.barangay}</span>}
        </label>
        <label>
          Landmark *
          <input
            type="text"
            value={ctx.profileForm.landmark || ""}
            onChange={(e) => ctx.updateField("landmark", e.target.value)}
            placeholder="Enter nearby landmark"
          />
          {ctx.staffProfileErrors.landmark && <span className="form-error">{ctx.staffProfileErrors.landmark}</span>}
        </label>
        <label>
          Dagupan City (Default)
          <input type="text" value="Dagupan City" readOnly />
        </label>
        <label>
          Philippines (Default)
          <input type="text" value="Philippines" readOnly />
        </label>

        <div className="full">
          <p className="form-label">Service capability *</p>
          <div className="skill-grid">
            {(ctx.staffServiceOptions || []).map((skill) => (
              <button
                key={skill}
                type="button"
                className={`skill-pill ${
                  Array.isArray(ctx.profileForm.skills) && ctx.profileForm.skills.includes(skill) ? "selected" : ""
                }`}
                onClick={() => ctx.toggleSkill(skill)}
              >
                {skill}
              </button>
            ))}
          </div>
          {ctx.staffProfileErrors.skills && <span className="form-error">{ctx.staffProfileErrors.skills}</span>}
        </div>

        <div className="full">
          <p className="form-label">Availability *</p>
          <div className="schedule-grid">
            <div className="day-grid">
              {(ctx.weekdayOptions || []).map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`day-pill ${
                    Array.isArray(ctx.profileForm.availabilityDays) &&
                    ctx.profileForm.availabilityDays.includes(day)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => ctx.toggleDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="time-range">
              <label>
                Start
                <input
                  type="time"
                  value={ctx.profileForm.availabilityStart || ""}
                  onChange={(e) => ctx.updateField("availabilityStart", e.target.value)}
                />
              </label>
              <label>
                End
                <input
                  type="time"
                  value={ctx.profileForm.availabilityEnd || ""}
                  onChange={(e) => ctx.updateField("availabilityEnd", e.target.value)}
                />
              </label>
            </div>
          </div>
          {ctx.staffProfileErrors.availability && (
            <span className="form-error">{ctx.staffProfileErrors.availability}</span>
          )}
          <span className="muted tiny">Default availability is 9:00 AM to 5:00 PM. You can adjust it if needed.</span>
        </div>

        <label>
          Previous position (optional)
          <input
            type="text"
            value={ctx.profileForm.previousPosition || ""}
            onChange={(e) => ctx.updateField("previousPosition", e.target.value)}
            placeholder="Example: Hotel Housekeeping Attendant"
          />
        </label>
        <label className="full">
          Experience details (optional)
          <textarea
            rows={3}
            value={ctx.profileForm.experienceNotes || ""}
            onChange={(e) => ctx.updateField("experienceNotes", e.target.value)}
            placeholder="Brief description of your experience..."
          />
        </label>
      </div>
      <div className="settings-actions">
        <button
          className="btn pill ghost"
          type="button"
          onClick={ctx.handleStaffProfileReset}
          disabled={ctx.staffProfileSaving}
        >
          Reset
        </button>
        <button
          className="btn pill primary"
          type="button"
          onClick={handleSaveAllChanges}
          disabled={ctx.staffProfileSaving || passwordSaving}
        >
          {ctx.staffProfileSaving || passwordSaving ? "Saving..." : "Save changes"}
        </button>
        {passwordError && <span className="form-error">{passwordError}</span>}
        {passwordSuccess && <span className="success-note">{passwordSuccess}</span>}
      </div>

      <div className="theme-card">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Theme</p>
            <h4>Appearance</h4>
          </div>
          <span className="pill soft">{ctx.themeMode === "dark" ? "Dark" : "Light"}</span>
        </div>
        <div className="theme-actions">
          <button
            className={`btn pill ${ctx.themeMode === "light" ? "primary" : "ghost"}`}
            type="button"
            onClick={() => ctx.setThemeMode("light")}
          >
            Light
          </button>
          <button
            className={`btn pill ${ctx.themeMode === "dark" ? "primary" : "ghost"}`}
            type="button"
            onClick={() => ctx.setThemeMode("dark")}
          >
            Dark
          </button>
        </div>
        <p className="muted small">Choose a theme to personalize your staff workspace.</p>
      </div>
    </section>
  );
}

export default StaffSettings;
