import React from "react";
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
          Email *
          <input
            type="email"
            value={ctx.profileForm.email || ""}
            onChange={(e) => ctx.updateField("email", e.target.value)}
            placeholder="maria@example.com"
          />
          {ctx.staffProfileErrors.email && <span className="form-error">{ctx.staffProfileErrors.email}</span>}
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
        </div>

        <label>
          Experience (years) *
          <input
            type="number"
            min="1"
            max="50"
            value={ctx.profileForm.experienceYears || ""}
            onChange={(e) => ctx.updateField("experienceYears", e.target.value)}
            placeholder="5"
          />
          {ctx.staffProfileErrors.experienceYears && (
            <span className="form-error">{ctx.staffProfileErrors.experienceYears}</span>
          )}
        </label>
        <label>
          Preferred workload (jobs/day) *
          <input
            type="number"
            min="1"
            max="10"
            value={ctx.profileForm.preferredWorkload || ""}
            onChange={(e) => ctx.updateField("preferredWorkload", e.target.value)}
            placeholder="3"
          />
          {ctx.staffProfileErrors.preferredWorkload && (
            <span className="form-error">{ctx.staffProfileErrors.preferredWorkload}</span>
          )}
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
        <label>
          Rating
          <input type="text" value={`Rating ${Number(ctx.profileForm.rating || 0).toFixed(1)}`} readOnly />
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
          onClick={ctx.handleStaffProfileSave}
          disabled={ctx.staffProfileSaving}
        >
          {ctx.staffProfileSaving ? "Saving..." : "Save changes"}
        </button>
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
