import React, { useEffect, useMemo, useState } from "react";
import {
  onValue,
  push,
  ref as rtdbRef,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate
} from "firebase/database";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { rtdb, storage } from "../../firebase";

const DEFAULT_SERVICE_OPTIONS = [
  "General housecleaning",
  "Kitchen cleaning",
  "Bathroom cleaning",
  "Bedroom cleaning",
  "Deep cleaning",
  "Outdoor cleaning",
  "Appliance cleaning"
];

function BookingWizardModal({
  open,
  onClose,
  authUser,
  profile,
  displayName,
  addressLine,
  serviceOptions = DEFAULT_SERVICE_OPTIONS,
  hourlyRate = 150,
  onSubmitted
}) {
  const [bookingStep, setBookingStep] = useState(1);
  const [booking, setBooking] = useState({
    serviceType: "",
    durationHours: 1,
    startAt: "",
    housekeeperId: "",
    housekeeperName: "",
    housekeeperRole: "",
    notes: ""
  });
  const [housekeepers, setHousekeepers] = useState([]);
  const [housekeepersLoading, setHousekeepersLoading] = useState(true);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [photosInputKey, setPhotosInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPrice = useMemo(() => Math.round((Number(booking.durationHours) || 1) * (Number(hourlyRate) || 0)), [booking.durationHours, hourlyRate]);
  const uid = authUser?.uid || "";

  const setBookingFields = (patch) => setBooking((prev) => ({ ...prev, ...(patch || {}) }));

  const handlePhotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(files.slice(0, 6));
  };

  useEffect(() => {
    const urls = (photoFiles || []).map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photoFiles]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        if (typeof onClose === "function") onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, submitting]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBookingStep(1);
    setBooking({
      serviceType: "",
      durationHours: 1,
      startAt: "",
      housekeeperId: "",
      housekeeperName: "",
      housekeeperRole: "",
      notes: ""
    });
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setPhotosInputKey((k) => k + 1);
  }, [open]);

  // Available housekeepers / staff list (RTDB Users)
  useEffect(() => {
    setHousekeepersLoading(true);
    const usersRef = rtdbRef(rtdb, "Users");
    const stop = onValue(
      usersRef,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val)
          .map(([id, data]) => ({ id, ...(data || {}) }))
          .filter((u) => {
            const role = String(u.role || "").trim().toLowerCase();
            const status = String(u.status || "active").trim().toLowerCase();
            const isStaff = ["housekeeper", "staff"].includes(role);
            const isActive = status === "active";
            const clockedInRaw = u.clockedIn ?? u.clockIn ?? u.isClockedIn ?? u.clocked_in ?? null;
            const clockedInFlag =
              clockedInRaw === true ||
              clockedInRaw === "true" ||
              clockedInRaw === 1 ||
              clockedInRaw === "1";
            const timeIn = u.timeIn ?? u.time_in ?? u.clockInAt ?? null;
            const timeOut = u.timeOut ?? u.time_out ?? u.clockOutAt ?? null;
            const hasTimeIn = timeIn != null && String(timeIn).trim() !== "";
            const hasTimeOut = timeOut != null && String(timeOut).trim() !== "";
            const clockedIn = clockedInFlag || (hasTimeIn && !hasTimeOut);
            return isStaff && isActive && clockedIn;
          })
          .map((u) => {
            const name =
              String(u.fullName || "").trim() ||
              `${String(u.firstName || "").trim()} ${String(u.lastName || "").trim()}`.replace(/\s+/g, " ").trim() ||
              String(u.email || "Housekeeper").trim();
            const words = String(name || "")
              .replace(/[^A-Za-z0-9 ]/g, " ")
              .trim()
              .split(/\s+/)
              .filter(Boolean);
            const initials =
              words.length >= 2
                ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
                : (words.join("") || "HK").slice(0, 2).toUpperCase();

            return {
              id: u.id,
              name,
              initials,
              role: String(u.role || "").trim(),
              area: String(u.area || u.location || "").trim()
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        setHousekeepers(list);
        setHousekeepersLoading(false);
      },
      () => setHousekeepersLoading(false)
    );

    return () => stop();
  }, []);

  const goToStep2 = () => {
    if (!booking.serviceType) return;
    setBookingStep(2);
  };

  const goToStep3 = () => {
    if (!booking.startAt) return;
    setBookingStep(3);
  };

  const handleSubmit = async () => {
    if (!uid) {
      setError("Please sign in to submit a request.");
      return;
    }
    if (submitting) return;
    if (!booking.serviceType) return setError("Please choose a service type.");
    if (!booking.startAt) return setError("Please choose a schedule.");

    setError("");
    try {
      setSubmitting(true);
      const requestListRef = rtdbRef(rtdb, "ServiceRequests");
      const requestRef = push(requestListRef);
      const requestId = requestRef.key;

      const durationHours = Number(booking.durationHours) || 1;
      const payload = {
        requestId,
        householderId: uid,
        householderName: String(displayName || authUser?.email || "Householder").trim(),
        housekeeperId: String(booking.housekeeperId || ""),
        housekeeperName: String(booking.housekeeperName || ""),
        housekeeperRole: String(booking.housekeeperRole || ""),
        serviceType: String(booking.serviceType || "").trim(),
        durationHours,
        startDate: String(booking.startAt || "").trim(),
        status: "PENDING",
        createdAt: rtdbServerTimestamp(),
        timestamp: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp(),
        totalPrice,
        location: String(addressLine || profile?.location || "").trim(),
        notes: String(booking.notes || "").trim(),
        photos: [],
        photosUploadStatus: (photoFiles || []).length > 0 ? "PENDING" : "NONE",
        customerEmail: authUser?.email || profile?.email || "",
        source: "web"
      };

      await rtdbSet(requestRef, payload);

      if ((photoFiles || []).length > 0) {
        try {
          const photoUrls = await Promise.all(
            (photoFiles || []).map(async (file, idx) => {
              const safeName = String(file.name || "photo.jpg")
                .replace(/[^a-zA-Z0-9._-]/g, "_")
                .slice(-80);
              const path = `serviceRequests/${uid}/${requestId}/${idx}_${safeName}`;
              const fileRef = storageRef(storage, path);
              await uploadBytes(fileRef, file);
              return getDownloadURL(fileRef);
            })
          );

          try {
            await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${requestId}`), {
              photos: photoUrls,
              photosUploadStatus: "DONE",
              updatedAt: rtdbServerTimestamp()
            });
          } catch (_) {
            // Ignore post-submit photo status update errors to avoid blocking the request itself.
          }
        } catch (photoErr) {
          try {
            await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${requestId}`), {
              photosUploadStatus: "FAILED",
              photosUploadError: String(photoErr?.code || photoErr?.message || "upload_failed").slice(0, 180),
              updatedAt: rtdbServerTimestamp()
            });
          } catch (_) {
            // Ignore post-submit photo status update errors to avoid blocking the request itself.
          }
        }
      }

      if (typeof onSubmitted === "function") onSubmitted(requestId);
    } catch (err) {
      const code = String(err?.code || "").trim();
      const msg = String(err?.message || "").trim();
      setError(code || msg ? `Could not submit request: ${code || msg}` : "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          if (typeof onClose === "function") onClose();
        }
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Booking wizard">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Booking / Request</p>
            <h3>Request cleaning service</h3>
          </div>
          <button
            className="icon-btn ghost"
            type="button"
            aria-label="Close"
            onClick={() => !submitting && typeof onClose === "function" && onClose()}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body booking-steps">
          <div className="stepper" role="tablist" aria-label="Booking steps">
            <button
              type="button"
              className={`step-pill ${bookingStep === 1 ? "active" : ""}`}
              onClick={() => setBookingStep(1)}
            >
              1. Make a plan
            </button>
            <button
              type="button"
              className={`step-pill ${bookingStep === 2 ? "active" : ""}`}
              onClick={() => booking.serviceType && setBookingStep(2)}
              disabled={!booking.serviceType}
            >
              2. Schedule &amp; Housekeeper
            </button>
            <button
              type="button"
              className={`step-pill ${bookingStep === 3 ? "active" : ""}`}
              onClick={() => booking.startAt && setBookingStep(3)}
              disabled={!booking.startAt}
            >
              3. Review
            </button>
          </div>

          {bookingStep === 1 && (
            <div className="wizard-step">
              <p className="muted small">Step 1: Make a plan</p>

              <div className="service-grid">
                {serviceOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`service-card ${booking.serviceType === opt ? "selected" : ""}`}
                    onClick={() => setBookingFields({ serviceType: opt })}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <div className="hours-price">
                <label className="hours-field">
                  How many hours?
                  <select
                    value={String(booking.durationHours)}
                    onChange={(e) => setBookingFields({ durationHours: Number(e.target.value) })}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h} hour{h > 1 ? "s" : ""} (PHP {(h * hourlyRate).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="price-box">
                  <p className="mini-label">Total price</p>
                  <h3>PHP {totalPrice.toLocaleString()}</h3>
                  <p className="muted tiny">PHP {hourlyRate}/hour</p>
                </div>
              </div>

              <label className="full">
                Notes (optional)
                <textarea
                  value={booking.notes}
                  onChange={(e) => setBookingFields({ notes: e.target.value })}
                  placeholder="Gate code, parking, pets, surfaces to avoid..."
                  rows={3}
                />
              </label>

              <label className="full">
                Photos (optional)
                <input
                  key={photosInputKey}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotosChange}
                />
                {photoPreviews.length > 0 && (
                  <div className="photo-preview-grid">
                    {photoPreviews.map((src, idx) => (
                      <div key={src} className="photo-preview">
                        <img src={src} alt={`Upload ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
                <p className="muted tiny">Up to 6 photos. These sync to the staff view.</p>
              </label>

              <div className="wizard-actions">
                <button className="btn pill primary" type="button" onClick={goToStep2}>
                  Next
                </button>
              </div>
            </div>
          )}

          {bookingStep === 2 && (
            <div className="wizard-step">
              <p className="muted small">Step 2: Choose a Schedule &amp; Housekeeper</p>

              <label className="full">
                When will they start?
                <input
                  type="datetime-local"
                  value={booking.startAt}
                  onChange={(e) => setBookingFields({ startAt: e.target.value })}
                />
              </label>

              <div className="housekeeper-block">
                <p className="mini-label">Choose available housekeeper / staff</p>
                {housekeepersLoading ? (
                  <p className="muted small">Loading available housekeepers...</p>
                ) : (
                  <div className="housekeeper-list">
                    <label className={`hk-option ${!booking.housekeeperId ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="housekeeper"
                        checked={!booking.housekeeperId}
                        onChange={() => setBookingFields({ housekeeperId: "", housekeeperName: "", housekeeperRole: "" })}
                      />
                      <span className="hk-avatar any">ANY</span>
                      <span className="hk-meta">
                        <strong>Any available</strong>
                        <span className="muted tiny">Staff will assign the best match</span>
                      </span>
                    </label>

                    {housekeepers.length === 0 ? (
                      <p className="muted small">No clocked-in housekeepers found right now.</p>
                    ) : (
                      housekeepers.map((hk) => (
                        <label key={hk.id} className={`hk-option ${booking.housekeeperId === hk.id ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name="housekeeper"
                            checked={booking.housekeeperId === hk.id}
                            onChange={() =>
                              setBookingFields({
                                housekeeperId: hk.id,
                                housekeeperName: hk.name,
                                housekeeperRole: hk.role
                              })
                            }
                          />
                          <span className="hk-avatar">{hk.initials}</span>
                          <span className="hk-meta">
                            <strong>{hk.name}</strong>
                            <span className="muted tiny">
                              {hk.role}
                              {hk.area ? ` • ${hk.area}` : ""}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="wizard-actions">
                <button className="btn pill ghost" type="button" onClick={() => setBookingStep(1)}>
                  Back
                </button>
                <button className="btn pill primary" type="button" onClick={goToStep3}>
                  Next
                </button>
              </div>
            </div>
          )}

          {bookingStep === 3 && (
            <div className="wizard-step">
              <p className="muted small">Step 3: Review to Confirm</p>

              <div className="review-grid">
                <div className="review-item">
                  <p className="mini-label">Service</p>
                  <strong>{booking.serviceType || "—"}</strong>
                </div>
                <div className="review-item">
                  <p className="mini-label">Hours</p>
                  <strong>{booking.durationHours}</strong>
                </div>
                <div className="review-item">
                  <p className="mini-label">Total</p>
                  <strong>PHP {totalPrice.toLocaleString()}</strong>
                </div>
                <div className="review-item">
                  <p className="mini-label">Start</p>
                  <strong>{booking.startAt || "—"}</strong>
                </div>
                <div className="review-item full">
                  <p className="mini-label">Housekeeper</p>
                  <strong>
                    {booking.housekeeperName
                      ? `${booking.housekeeperName}${booking.housekeeperRole ? ` (${booking.housekeeperRole})` : ""}`
                      : "Any available"}
                  </strong>
                </div>
                <div className="review-item full">
                  <p className="mini-label">Notes</p>
                  <strong>{String(booking.notes || "").trim() || "—"}</strong>
                </div>
              </div>

              {photoPreviews.length > 0 && (
                <div className="review-item full">
                  <p className="mini-label">Photos</p>
                  <div className="photo-preview-grid">
                    {photoPreviews.map((src, idx) => (
                      <div key={src} className="photo-preview">
                        <img src={src} alt={`Upload ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="wizard-actions">
                <button className="btn pill ghost" type="button" onClick={() => setBookingStep(2)}>
                  Back
                </button>
                <button className="btn pill primary" type="button" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Sending..." : "Submit request"}
                </button>
              </div>
            </div>
          )}

          {error && <p className="error-note">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default BookingWizardModal;
