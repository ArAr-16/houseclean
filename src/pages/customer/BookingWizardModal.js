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
import serviceHousecleaning from "../../assets/services/Housecleaning.png";
import serviceKitchen from "../../assets/services/Kitchen.png";
import serviceBathroom from "../../assets/services/Bathroom.png";
import serviceBedroom from "../../assets/services/Bedroom.png";
import serviceDeep from "../../assets/services/Deep.png";
import serviceOutdoor from "../../assets/services/Outdoor.png";
import serviceAppliance from "../../assets/services/Appliance.png";

const DEFAULT_SERVICE_OPTIONS = [
  {
    name: "General Housecleaning",
    imageKey: "mop",
    imageUrl: serviceHousecleaning,
    minPrice: 500,
    maxPrice: 1500,
    note: "Covers sweeping, mopping, dusting, basic tidying. Usually 2–3 hours for small homes/condos."
  },
  {
    name: "Kitchen Cleaning",
    imageKey: "spray",
    imageUrl: serviceKitchen,
    minPrice: 800,
    maxPrice: 2000,
    note: "Includes grease removal, appliance wipe-down, sink scrubbing. Higher if deep cleaning ovens/fridges."
  },
  {
    name: "Bathroom Cleaning",
    imageKey: "bucket",
    imageUrl: serviceBathroom,
    minPrice: 700,
    maxPrice: 1500,
    note: "Focus on tiles, toilet, shower, mirrors. Mold removal may add cost."
  },
  {
    name: "Bedroom Cleaning",
    imageKey: "broom",
    imageUrl: serviceBedroom,
    minPrice: 500,
    maxPrice: 1200,
    note: "Dusting, vacuuming, bed changing. Price depends on number of rooms."
  },
  {
    name: "Deep Cleaning",
    imageKey: "vacuum",
    imageUrl: serviceDeep,
    minPrice: 2000,
    maxPrice: 5000,
    note: "Intensive cleaning of entire property, including hidden areas, appliances, and disinfecting."
  },
  {
    name: "Outdoor Cleaning",
    imageKey: "sparkle_home",
    imageUrl: serviceOutdoor,
    minPrice: 1000,
    maxPrice: 3000,
    note: "Garden sweeping, garage cleaning, exterior walls."
  },
  {
    name: "Appliance Cleaning",
    imageKey: "gloves",
    imageUrl: serviceAppliance,
    minPrice: 500,
    maxPrice: 1500,
    note: "Fridge, oven, aircon. Price depends on size and dirt level."
  }
];

const AVATAR_PRESETS = {
  mop:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0F2FE\" stroke=\"#0EA5E9\" stroke-width=\"2\"/><rect x=\"45\" y=\"18\" width=\"6\" height=\"42\" rx=\"3\" fill=\"#0EA5E9\"/><rect x=\"34\" y=\"54\" width=\"28\" height=\"8\" rx=\"4\" fill=\"#38BDF8\"/><path d=\"M28 62c6 10 34 10 40 0\" fill=\"none\" stroke=\"#0EA5E9\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>",
  broom:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FEF3C7\" stroke=\"#F59E0B\" stroke-width=\"2\"/><rect x=\"46\" y=\"16\" width=\"4\" height=\"46\" rx=\"2\" fill=\"#B45309\"/><path d=\"M32 60h32l-6 16H38l-6-16z\" fill=\"#F59E0B\"/><path d=\"M38 60l2 8M44 60l2 8M50 60l2 8M56 60l2 8\" stroke=\"#B45309\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>",
  vacuum:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#EDE9FE\" stroke=\"#8B5CF6\" stroke-width=\"2\"/><rect x=\"30\" y=\"48\" width=\"28\" height=\"18\" rx=\"9\" fill=\"#8B5CF6\"/><circle cx=\"62\" cy=\"58\" r=\"8\" fill=\"#C4B5FD\"/><path d=\"M58 36h12\" stroke=\"#8B5CF6\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M70 36v18\" stroke=\"#8B5CF6\" stroke-width=\"4\" stroke-linecap=\"round\"/></svg>",
  spray:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DCFCE7\" stroke=\"#22C55E\" stroke-width=\"2\"/><rect x=\"40\" y=\"34\" width=\"16\" height=\"8\" rx=\"3\" fill=\"#22C55E\"/><rect x=\"36\" y=\"42\" width=\"24\" height=\"34\" rx=\"8\" fill=\"#4ADE80\"/><path d=\"M56 30h10\" stroke=\"#16A34A\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"72\" cy=\"34\" r=\"3\" fill=\"#22C55E\"/></svg>",
  bucket:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DBEAFE\" stroke=\"#3B82F6\" stroke-width=\"2\"/><path d=\"M30 36h36l-4 36H34l-4-36z\" fill=\"#60A5FA\"/><path d=\"M36 32c0-6 24-6 24 0\" fill=\"none\" stroke=\"#3B82F6\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M38 54c6 6 14 6 20 0\" stroke=\"#3B82F6\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>",
  apron:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FFE4E6\" stroke=\"#F43F5E\" stroke-width=\"2\"/><path d=\"M34 28c8 10 20 10 28 0\" fill=\"none\" stroke=\"#F43F5E\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M30 36h36l-4 36H34l-4-36z\" fill=\"#FB7185\"/><rect x=\"40\" y=\"48\" width=\"16\" height=\"10\" rx=\"4\" fill=\"#FFE4E6\"/></svg>",
  gloves:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FEE2E2\" stroke=\"#EF4444\" stroke-width=\"2\"/><path d=\"M30 54c0-10 6-14 10-14s6 4 6 8v20H36c-4 0-6-4-6-14z\" fill=\"#F87171\"/><path d=\"M60 50c0-8 6-12 10-12s6 4 6 8v18H66c-4 0-6-4-6-14z\" fill=\"#FB7185\"/></svg>",
  housekeeper:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0E7FF\" stroke=\"#6366F1\" stroke-width=\"2\"/><circle cx=\"48\" cy=\"38\" r=\"12\" fill=\"#A5B4FC\"/><path d=\"M28 74c4-16 36-16 40 0\" fill=\"#818CF8\"/><path d=\"M38 36c6 4 14 4 20 0\" stroke=\"#6366F1\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>",
  sparkle_home:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#ECFCCB\" stroke=\"#65A30D\" stroke-width=\"2\"/><path d=\"M26 50l22-18 22 18v22H26V50z\" fill=\"#84CC16\"/><path d=\"M44 72V56h8v16\" fill=\"#D9F99D\"/><path d=\"M70 30l4 4m0-4l-4 4\" stroke=\"#65A30D\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>",
  bubbles:
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0F2FE\" stroke=\"#0EA5E9\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"52\" r=\"12\" fill=\"#BAE6FD\"/><circle cx=\"58\" cy=\"42\" r=\"10\" fill=\"#7DD3FC\"/><circle cx=\"58\" cy=\"64\" r=\"8\" fill=\"#38BDF8\"/></svg>"
};

const createAvatarDataUri = (presetId) => {
  const key = String(presetId || "mop");
  const svg = AVATAR_PRESETS[key] || AVATAR_PRESETS.mop;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const formatPaymentMethodLabel = (value) => {
  const key = String(value || "").trim().toUpperCase();
  if (key === "STATIC_QR") return "Static QR";
  if (key === "CASH_ON_HAND") return "Cash on Hand";
  return value ? String(value) : "--";
};

function BookingWizardModal({
  open,
  onClose,
  authUser,
  profile,
  displayName,
  addressLine,
  preferredStaffId = "",
  preferredStaffName = "",
  preferredStaffRole = "",
  serviceOptions = DEFAULT_SERVICE_OPTIONS,
  onSubmitted
}) {
  const [bookingStep, setBookingStep] = useState(1);
  const [booking, setBooking] = useState({
    serviceTypes: [],
    durationHours: 1,
    startAt: "",
    housekeeperId: "",
    housekeeperName: "",
    housekeeperRole: "",
    paymentMethod: "",
    notes: ""
  });
  const [preferredHousekeeperId, setPreferredHousekeeperId] = useState("");
  const [preferredHousekeeperName, setPreferredHousekeeperName] = useState("");
  const [preferredHousekeeperRole, setPreferredHousekeeperRole] = useState("");
  const [preferredHousekeeperNote, setPreferredHousekeeperNote] = useState("");
  const [housekeepers, setHousekeepers] = useState([]);
  const [housekeepersLoading, setHousekeepersLoading] = useState(true);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [photosInputKey, setPhotosInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [cashConfirmOpen, setCashConfirmOpen] = useState(false);
  const [cashConfirmAgreed, setCashConfirmAgreed] = useState(false);
  const [error, setError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [minDateTime, setMinDateTime] = useState("");
  const [maxDateTime, setMaxDateTime] = useState("");
  const [timeError, setTimeError] = useState("");
  const [step2Attempted, setStep2Attempted] = useState(false);
  const [minStartMinutes, setMinStartMinutes] = useState(0);
  const [step1Attempted, setStep1Attempted] = useState(false);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [availabilityResults, setAvailabilityResults] = useState([]);
  const [availableHousekeepers, setAvailableHousekeepers] = useState([]);
  const [availabilitySummary, setAvailabilitySummary] = useState({ total: 0, available: 0, unavailable: 0 });
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [shakeSchedule, setShakeSchedule] = useState(false);
  const [autoAssigned, setAutoAssigned] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [activeProfileContext, setActiveProfileContext] = useState("");
  const [skillsPopoverId, setSkillsPopoverId] = useState("");

  const normalizedServiceOptions = useMemo(() => {
    return (serviceOptions || []).map((opt) => {
      if (typeof opt === "string") {
        const match = DEFAULT_SERVICE_OPTIONS.find(
          (entry) => entry.name.toLowerCase() === opt.toLowerCase()
        );
        const fallback = match || { name: opt, minPrice: 0, maxPrice: 0, note: "", imageKey: "mop" };
        return {
          ...fallback,
          imageUrl: createAvatarDataUri(fallback.imageKey || "mop")
        };
      }
      const imageKey = opt.imageKey || "mop";
      return {
        ...opt,
        imageUrl: opt.imageUrl || createAvatarDataUri(imageKey)
      };
    });
  }, [serviceOptions]);

  const priceRange = useMemo(() => {
    const selected = Array.isArray(booking.serviceTypes) ? booking.serviceTypes : [];
    const lookup = new Map(normalizedServiceOptions.map((opt) => [String(opt.name), opt]));
    const totals = selected.reduce(
      (acc, name) => {
        const item = lookup.get(String(name)) || {};
        const min = Number(item.minPrice || 0) || 0;
        const max = Number(item.maxPrice || 0) || 0;
        return { min: acc.min + min, max: acc.max + max };
      },
      { min: 0, max: 0 }
    );
    return totals;
  }, [booking.serviceTypes, normalizedServiceOptions]);

  const totalPrice = useMemo(() => {
    if (!priceRange.max && !priceRange.min) return 0;
    return Math.round((priceRange.min + priceRange.max) / 2);
  }, [priceRange.max, priceRange.min]);
  const uid = authUser?.uid || "";

  const clampHours = (value) => {
    const hours = Number(value);
    if (!Number.isFinite(hours)) return 1;
    return Math.min(8, Math.max(1, Math.round(hours)));
  };

  const setBookingFields = (patch) => {
    const next = { ...(patch || {}) };
    if (Object.prototype.hasOwnProperty.call(next, "durationHours")) {
      next.durationHours = clampHours(next.durationHours);
    }
    setBooking((prev) => ({ ...prev, ...next }));
  };

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
    if (!open) return undefined;
    const handleClick = (e) => {
      if (!skillsPopoverId) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".hk-popover")) return;
      if (target.closest("[data-skill-toggle]")) return;
      setSkillsPopoverId("");
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [open, skillsPopoverId]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setTimeError("");
    setBookingStep(1);
    setBooking({
      serviceTypes: [],
      durationHours: 1,
      startAt: "",
      housekeeperId: "",
      housekeeperName: "",
      housekeeperRole: "",
      paymentMethod: "",
      notes: ""
    });
    setPreferredHousekeeperId(String(preferredStaffId || "").trim());
    setPreferredHousekeeperName(String(preferredStaffName || "").trim());
    setPreferredHousekeeperRole(String(preferredStaffRole || "").trim());
    setPreferredHousekeeperNote("");
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setPhotosInputKey((k) => k + 1);
    setStep2Attempted(false);
    setStep1Attempted(false);
    setAvailabilityChecked(false);
    setAvailabilityResults([]);
    setAvailableHousekeepers([]);
    setAvailabilitySummary({ total: 0, available: 0, unavailable: 0 });
    setAvailabilityError("");
    setAutoAssigned(false);
    setActiveProfile(null);
    setActiveProfileContext("");
    setSkillsPopoverId("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTimeError("");
    const pad = (value) => String(value).padStart(2, "0");
    const formatLocal = (date) => {
      const yyyy = date.getFullYear();
      const mm = pad(date.getMonth() + 1);
      const dd = pad(date.getDate());
      const hh = pad(date.getHours());
      const min = pad(date.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };
    const now = new Date();
    const nowPlus3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const max = new Date(now.getTime());
    max.setMonth(max.getMonth() + 1);
    const minValue = formatLocal(nowPlus3);
    const maxValue = formatLocal(max);
    setMinDateTime(minValue);
    setMaxDateTime(maxValue);
    setMinStartMinutes(nowPlus3.getHours() * 60 + nowPlus3.getMinutes());
    setBookingFields((prev) => {
      if (!prev?.startAt) return prev;
      if (prev.startAt < minValue) return { ...prev, startAt: "" };
      if (prev.startAt > maxValue) return { ...prev, startAt: "" };
      return prev;
    });
  }, [open]);

  const isWithinBusinessHours = (value, hours, minStartMinutesValue) => {
    if (!value) return false;
    const parts = String(value).split("T");
    if (parts.length < 2) return false;
    const datePart = parts[0];
    const time = parts[1];
    const [hh, mm] = time.split(":").map((v) => Number(v));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
    const minutes = hh * 60 + mm;
    const minParts = String(minDateTime || "").split("T");
    const minDatePart = minParts[0] || "";
    const needsGap = Boolean(minDatePart) && datePart === minDatePart;
    const start = Math.max(9 * 60, needsGap ? Number(minStartMinutesValue) || 0 : 0);
    const lastCustomerStart = 17 * 60;
    const staffCutoff = 18 * 60;
    const durationMins = Math.max(1, Number(hours) || 1) * 60;
    const endTime = minutes + durationMins;
    if (minutes < start || minutes > lastCustomerStart) return false;
    return endTime <= staffCutoff;
  };

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const parseDateTimeLocal = (value) => {
    if (!value) return null;
    const [datePart, timePart] = String(value).split("T");
    if (!datePart || !timePart) return null;
    const [hhRaw, mmRaw] = timePart.split(":");
    const hh = Number(hhRaw);
    const mm = Number(mmRaw);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return { datePart, minutes: hh * 60 + mm };
  };

  const formatLocalDateTime = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const pad = (value) => String(value).padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const dayIndexMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  const parseTimeToMinutes = (value) => {
    if (!value) return null;
    const [hhRaw, mmRaw] = String(value).split(":");
    const hh = Number(hhRaw);
    const mm = Number(mmRaw);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  };

  const formatAvailabilityDisplay = (hk) => {
    if (!hk) return "";
    if (hk.availability) return hk.availability;
    const days = Array.isArray(hk.availabilityDays) ? hk.availabilityDays : [];
    const start = hk.availabilityStart;
    const end = hk.availabilityEnd;
    if (!days.length || !start || !end) return "";
    return `${days.join(", ")} ${start}-${end}`;
  };

  const renderStarRating = (value) => {
    const rating = Number(value) || 0;
    const full = Math.min(5, Math.max(0, Math.round(rating)));
    const empty = 5 - full;
    return `${"★".repeat(full)}${"☆".repeat(empty)}`;
  };

  const sendNotification = async ({ toUserId, title, body, requestId }) => {
    if (!toUserId) return;
    const listRef = rtdbRef(rtdb, `UserNotifications/${String(toUserId)}`);
    const notifRef = push(listRef);
    await rtdbSet(notifRef, {
      title: String(title || "Update"),
      body: String(body || ""),
      requestId: String(requestId || ""),
      createdAt: rtdbServerTimestamp(),
      read: false,
      source: "web"
    });
  };

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
            return isStaff && isActive;
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
              area: String(u.area || u.location || "").trim(),
              contact: String(
                u.contact ||
                  u.contactNumber ||
                  u.contact_number ||
                  u.phone ||
                  u.mobile ||
                  ""
              ).trim(),
              avatarSeed: String(u.avatarSeed || "mop").trim(),
              availability: String(u.availability || "").trim(),
              availabilityDays: Array.isArray(u.availabilityDays) ? u.availabilityDays : [],
              availabilityStart: String(u.availabilityStart || "").trim(),
              availabilityEnd: String(u.availabilityEnd || "").trim(),
              preferredService: String(u.preferredService || "").trim(),
              skills: Array.isArray(u.skills) ? u.skills : [],
              serviceAreas: Array.isArray(u.serviceAreas) ? u.serviceAreas : [],
              preferredWorkload: Number(u.preferredWorkload || 0) || 0,
              rating: Number(u.rating || u.averageRating || u.stars || 0) || 0,
              experienceYears: Number(u.experienceYears || u.yearsExperience || u.experience || u.years || 0) || 0,
              experienceNotes: String(u.experienceNotes || "").trim(),
              avatarUrl: createAvatarDataUri(u.avatarSeed || "mop")
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

  useEffect(() => {
    if (!open) return undefined;
    const requestsRef = rtdbRef(rtdb, "ServiceRequests");
    const stop = onValue(
      requestsRef,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, data]) => ({ id, ...(data || {}) }));
        setServiceRequests(list);
      },
      () => setServiceRequests([])
    );
    return () => stop();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setAvailabilityChecked(false);
    setAvailabilityResults([]);
    setAvailableHousekeepers([]);
    setAvailabilitySummary({ total: 0, available: 0, unavailable: 0 });
    setAvailabilityError("");
    setAutoAssigned(false);
    setPreferredHousekeeperNote("");
    setShowUnavailable(false);
    const parsed = parseDateTimeLocal(booking.startAt);
    setScheduleDate(parsed?.datePart || "");
    if (parsed && Number.isFinite(parsed.minutes)) {
      const hh = Math.floor(parsed.minutes / 60);
      const mm = String(parsed.minutes % 60).padStart(2, "0");
      setScheduleTime(`${String(hh).padStart(2, "0")}:${mm}`);
    } else {
      setScheduleTime("");
    }
  }, [booking.startAt, booking.durationHours, booking.serviceTypes, open]);

  useEffect(() => {
    if (!open) return;
    setAvailabilityChecked(false);
    setAvailabilityResults([]);
    setAvailableHousekeepers([]);
    setAvailabilitySummary({ total: 0, available: 0, unavailable: 0 });
    setAvailabilityError("");
    setAutoAssigned(false);
    setPreferredHousekeeperNote("");
    setShowUnavailable(false);
    if (!booking.startAt) {
      setScheduleDate("");
      setScheduleTime("");
    }
  }, [preferredHousekeeperId, open]);

  const validateStep1 = () => {
    setError("");
    if (!Array.isArray(booking.serviceTypes) || booking.serviceTypes.length === 0) {
      setError("Please choose at least one service type.");
      return false;
    }
    if (booking.durationHours < 1 || booking.durationHours > 8) {
      setError("Cleaning hours must be between 1 and 8 hours.");
      return false;
    }
    if (!booking.paymentMethod) {
      setError("Please choose a payment method.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setError("");
    setTimeError("");
    setAvailabilityError("");
    if (!booking.startAt) {
      setError("Please choose a schedule.");
      return false;
    }
    if (minDateTime && booking.startAt < minDateTime) {
      setError("Please choose a schedule at least 3 hours from now.");
      return false;
    }
    if (maxDateTime && booking.startAt > maxDateTime) {
      setError("Please choose a schedule within the next 30 days.");
      return false;
    }
    if (!isWithinBusinessHours(booking.startAt, booking.durationHours)) {
      setTimeError("You can start between 9:00 AM and 5:00 PM; services must finish by 6:00 PM.");
      return false;
    }
    if (!availabilityChecked) {
      setAvailabilityError("Please click Find available staff to continue.");
      return false;
    }
    if (!booking.housekeeperId) {
      setError("Please select an available housekeeper.");
      return false;
    }
    return true;
  };

  const formatStartAtDisplay = (value) => {
    if (!value) return { date: "—", time: "" };
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return { date: String(value), time: "" };
    const date = parsed.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
    const time = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return { date, time };
  };

  const goToStep2 = () => {
    setStep1Attempted(true);
    if (!validateStep1()) return;
    setBookingStep(2);
  };

  const goToStep3 = () => {
    setStep2Attempted(true);
    if (!validateStep1()) return;
    if (!validateStep2()) return;
    setBookingStep(3);
  };

  const step1Ready =
    Array.isArray(booking.serviceTypes) &&
    booking.serviceTypes.length > 0 &&
    booking.durationHours >= 1 &&
    booking.durationHours <= 8 &&
    Boolean(booking.paymentMethod);

  const step2Ready =
    step1Ready &&
    Boolean(booking.startAt) &&
    (!minDateTime || booking.startAt >= minDateTime) &&
    (!maxDateTime || booking.startAt <= maxDateTime) &&
    isWithinBusinessHours(booking.startAt, booking.durationHours, minStartMinutes) &&
    availabilityChecked &&
    Boolean(booking.housekeeperId);

  useEffect(() => {
    if (!booking.startAt) {
      setTimeError("");
      return;
    }
    if (minDateTime && booking.startAt < minDateTime) {
      setTimeError("Please choose a schedule at least 3 hours from now.");
      return;
    }
    if (maxDateTime && booking.startAt > maxDateTime) {
      setTimeError("Please choose a schedule within the next 30 days.");
      return;
    }
    if (!isWithinBusinessHours(booking.startAt, booking.durationHours, minStartMinutes)) {
      setTimeError("You can start between 9:00 AM and 5:00 PM; services must finish by 6:00 PM.");
      return;
    }
    setTimeError("");
  }, [booking.startAt, booking.durationHours, minDateTime, maxDateTime, minStartMinutes]);

  const computeAvailability = () => {
    setAvailabilityError("");
    if (!booking.startAt) {
      setAvailabilityError("Please choose a schedule before searching.");
      return null;
    }
    if (timeError) {
      setAvailabilityError("Please fix the schedule timing before searching.");
      return null;
    }
    const target = parseDateTimeLocal(booking.startAt);
    if (!target) {
      setAvailabilityError("Please choose a valid schedule.");
      return null;
    }
    const durationHours = clampHours(booking.durationHours);
    const serviceKeys = Array.isArray(booking.serviceTypes)
      ? booking.serviceTypes.map((s) => normalizeText(s)).filter(Boolean)
      : [];
    const targetEnd = target.minutes + durationHours * 60;
    const isActiveStatus = (status) => ["pending", "confirmed", "accepted"].includes(normalizeText(status));

    const targetDate = new Date(booking.startAt);
    const targetDayIndex = Number.isFinite(targetDate.getTime()) ? targetDate.getDay() : null;

    const results = (housekeepers || []).map((hk) => {
      const skills = Array.isArray(hk.skills) ? hk.skills : [];
      const preferredService = normalizeText(hk.preferredService);
      const skillsMatch =
        serviceKeys.length === 0
          ? true
          : skills.length === 0
            ? true
            : skills.some((s) => serviceKeys.some((key) => normalizeText(s).includes(key) || key.includes(normalizeText(s))));
      const preferredMatch =
        serviceKeys.length === 0 || !preferredService
          ? true
          : serviceKeys.some((key) => preferredService.includes(key) || key.includes(preferredService));
      const matchesService = skillsMatch || preferredMatch;

      const requestsToday = (serviceRequests || []).filter((req) => {
        const reqStaffId = String(req.housekeeperId || "").trim();
        if (!reqStaffId || reqStaffId !== hk.id) return false;
        if (!isActiveStatus(req.status)) return false;
        const startRaw =
          req.startDate ||
          req.startAt ||
          (req.date && req.time ? `${req.date}T${req.time}` : "") ||
          "";
        const parsed = parseDateTimeLocal(startRaw);
        if (!parsed || parsed.datePart !== target.datePart) return false;
        return true;
      });

      const hasOverlap = requestsToday.some((req) => {
        const startRaw =
          req.startDate ||
          req.startAt ||
          (req.date && req.time ? `${req.date}T${req.time}` : "") ||
          "";
        const parsed = parseDateTimeLocal(startRaw);
        if (!parsed) return false;
        const reqDuration = clampHours(req.durationHours || req.hours || req.duration || 1);
        const reqEnd = parsed.minutes + reqDuration * 60;
        return parsed.minutes < targetEnd && reqEnd > target.minutes;
      });

      const availableDays = Array.isArray(hk.availabilityDays) ? hk.availabilityDays : [];
      const allowedDays =
        availableDays.length > 0 ? availableDays.map((d) => dayIndexMap[d]).filter((d) => d != null) : null;
      const dayOk =
        targetDayIndex == null || !Array.isArray(allowedDays) || allowedDays.length === 0
          ? true
          : allowedDays.includes(targetDayIndex);
      const staffStart = parseTimeToMinutes(hk.availabilityStart);
      const staffEnd = parseTimeToMinutes(hk.availabilityEnd);
      const timeOk =
        staffStart == null || staffEnd == null ? true : target.minutes >= staffStart && targetEnd <= staffEnd;
      const matchesAvailability = dayOk && timeOk;

      const available = matchesService && matchesAvailability && !hasOverlap;
      return {
        ...hk,
        available,
        matchesService,
        matchesAvailability,
        hasOverlap,
        bookingsToday: requestsToday.length
      };
    });

    const availableList = results.filter((r) => r.available);
    setAvailabilityResults(results);
    setAvailableHousekeepers(availableList);
    setAvailabilitySummary({
      total: results.length,
      available: availableList.length,
      unavailable: Math.max(0, results.length - availableList.length)
    });
    if (preferredHousekeeperId) {
      const preferred = availableList.find((hk) => hk.id === preferredHousekeeperId);
      if (preferred) {
        setBookingFields({
          housekeeperId: preferred.id,
          housekeeperName: preferred.name,
          housekeeperRole: preferred.role
        });
        setAutoAssigned(false);
        setPreferredHousekeeperNote("Preferred staff is available for this time.");
      } else {
        setPreferredHousekeeperNote("Preferred staff is not available for this time.");
      }
    }
    if (booking.housekeeperId && !availableList.some((hk) => hk.id === booking.housekeeperId)) {
      setBookingFields({ housekeeperId: "", housekeeperName: "", housekeeperRole: "" });
      setAutoAssigned(false);
    }
    setAvailabilityChecked(true);
    return { results, availableList };
  };

  const getNextAvailableStartForStaff = (hk) => {
    if (!hk) return "";
    const durationHours = clampHours(booking.durationHours);
    const minValue = minDateTime || "";
    const maxValue = maxDateTime || "";
    const minDate = minValue ? new Date(minValue) : new Date();
    const maxDate = maxValue ? new Date(maxValue) : null;
    if (Number.isNaN(minDate.getTime())) return "";

    const availableDays = Array.isArray(hk.availabilityDays) ? hk.availabilityDays : [];
    const allowedDays =
      availableDays.length > 0 ? availableDays.map((d) => dayIndexMap[d]).filter((d) => d != null) : null;
    const startMins = parseTimeToMinutes(hk.availabilityStart);
    const endMins = parseTimeToMinutes(hk.availabilityEnd);

    for (let offset = 0; offset <= 30; offset += 1) {
      const candidate = new Date(minDate.getTime());
      candidate.setDate(candidate.getDate() + offset);
      if (maxDate && candidate > maxDate) break;
      const dayIndex = candidate.getDay();
      if (Array.isArray(allowedDays) && allowedDays.length > 0 && !allowedDays.includes(dayIndex)) {
        continue;
      }
      const earliest = offset === 0 ? minDate.getHours() * 60 + minDate.getMinutes() : 0;
      const businessStart = 9 * 60;
      const businessEnd = 18 * 60;
      const staffStart = startMins ?? businessStart;
      const staffEnd = endMins ?? businessEnd;
      const start = Math.max(earliest, businessStart, staffStart);
      const end = start + durationHours * 60;
      if (end <= staffEnd && end <= businessEnd) {
        const pick = new Date(candidate.getTime());
        pick.setHours(Math.floor(start / 60), start % 60, 0, 0);
        return formatLocalDateTime(pick);
      }
    }
    return "";
  };

  const clearPreferredStaffSelection = () => {
    setPreferredHousekeeperId("");
    setPreferredHousekeeperName("");
    setPreferredHousekeeperRole("");
    setPreferredHousekeeperNote("");
  };

  const applyPreferredStaffSelection = (hk) => {
    if (!hk) return;
    setPreferredHousekeeperId(hk.id);
    setPreferredHousekeeperName(hk.name);
    setPreferredHousekeeperRole(hk.role);
    const nextStart = getNextAvailableStartForStaff(hk);
    if (nextStart) {
      setBookingFields({ startAt: nextStart });
      setPreferredHousekeeperNote("Suggested time was selected based on staff availability.");
    } else {
      setPreferredHousekeeperNote("We could not suggest a time. Please choose a schedule manually.");
    }
  };

  const togglePreferredStaffSelection = (hk) => {
    if (!hk) return;
    if (preferredHousekeeperId === hk.id) {
      clearPreferredStaffSelection();
      return;
    }
    applyPreferredStaffSelection(hk);
  };

  const isScheduleInvalid = !booking.startAt || Boolean(timeError);

  const triggerScheduleShake = () => {
    setShakeSchedule(true);
    setTimeout(() => setShakeSchedule(false), 600);
  };

  const handleFindAvailability = () => {
    if (!booking.startAt || timeError) {
      setAvailabilityError("Please choose a schedule first.");
      triggerScheduleShake();
      return;
    }
    computeAvailability();
    setShowUnavailable(false);
  };

  const minDatePart = minDateTime ? String(minDateTime).split("T")[0] : "";
  const maxDatePart = maxDateTime ? String(maxDateTime).split("T")[0] : "";

  const applyScheduleParts = (nextDate, nextTime) => {
    setScheduleDate(nextDate);
    setScheduleTime(nextTime);
    if (nextDate && nextTime) {
      setBookingFields({ startAt: `${nextDate}T${nextTime}` });
    } else {
      setBookingFields({ startAt: "" });
    }
  };

  const getQuickTimeOptions = () => {
    if (!scheduleDate) return [];
    const [year, month, day] = scheduleDate.split("-").map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return [];
    const candidate = new Date(year, month - 1, day);
    const isSameDay = candidate.toDateString() === new Date().toDateString();
    const minStart = Math.max(9 * 60, isSameDay ? minStartMinutes : 0);
    const maxStart = 17 * 60;
    const durationMins = clampHours(booking.durationHours) * 60;

    const options = [];
    for (let mins = minStart; mins <= maxStart; mins += 60) {
      if (mins + durationMins > 18 * 60) continue;
      const hh = Math.floor(mins / 60);
      const mm = String(mins % 60).padStart(2, "0");
      options.push(`${String(hh).padStart(2, "0")}:${mm}`);
    }
    return options;
  };

  const handleQuickBook = () => {
    if (!booking.startAt || timeError) {
      setAvailabilityError("Please choose a schedule first.");
      triggerScheduleShake();
      return;
    }
    const result = computeAvailability();
    if (!result || !result.availableList) return;
    if (result.availableList.length === 0) {
      setAvailabilityError("No available staff match your schedule and service. Please adjust and try again.");
      return;
    }
    const sorted = [...result.availableList].sort((a, b) => {
      if (a.bookingsToday !== b.bookingsToday) return a.bookingsToday - b.bookingsToday;
      return a.name.localeCompare(b.name);
    });
    const pick =
      preferredHousekeeperId
        ? sorted.find((hk) => hk.id === preferredHousekeeperId) || sorted[0]
        : sorted[0];
    setBookingFields({
      housekeeperId: pick.id,
      housekeeperName: pick.name,
      housekeeperRole: pick.role
    });
    setAutoAssigned(true);
    setBookingStep(3);
  };

  const validateBooking = () => {
    if (!uid) {
      setError("Please sign in to submit a request.");
      return false;
    }
    if (!Array.isArray(booking.serviceTypes) || booking.serviceTypes.length === 0) {
      setError("Please choose at least one service type.");
      return false;
    }
    if (booking.durationHours < 1 || booking.durationHours > 8) {
      setError("Cleaning hours must be between 1 and 8 hours.");
      return false;
    }
    if (!booking.paymentMethod) {
      setError("Please choose a payment method.");
      return false;
    }
    if (minDateTime && booking.startAt < minDateTime) {
      setError("Please choose a schedule at least 3 hours from now.");
      return false;
    }
    if (maxDateTime && booking.startAt > maxDateTime) {
      setError("Please choose a schedule within the next 30 days.");
      return false;
    }
    if (!isWithinBusinessHours(booking.startAt, booking.durationHours)) {
      setError("You can start between 9:00 AM and 5:00 PM; services must finish by 6:00 PM.");
      return false;
    }
    if (!booking.housekeeperId) {
      setError("Please choose a staff member or use Quick Book.");
      return false;
    }
    return true;
  };

  const submitRequest = async () => {
    if (!validateBooking()) return;
    setError("");
    try {
      setSubmitting(true);
      const requestListRef = rtdbRef(rtdb, "ServiceRequests");
      const requestRef = push(requestListRef);
      const requestId = requestRef.key;

      const durationHours = Number(booking.durationHours) || 1;
      const primaryService = String(booking.serviceTypes[0] || "").trim();
      const paymentMethod = String(booking.paymentMethod || "").trim();
      const isCash = paymentMethod.toUpperCase() === "CASH_ON_HAND";
      const initialStatus = paymentMethod ? (isCash ? "RESERVED" : "PENDING_PAYMENT") : "PENDING";

      const payload = {
        requestId,
        householderId: uid,
        householderName: String(displayName || authUser?.email || "Householder").trim(),
        housekeeperId: String(booking.housekeeperId || ""),
        housekeeperName: String(booking.housekeeperName || ""),
        housekeeperRole: String(booking.housekeeperRole || ""),
        serviceType: primaryService,
        serviceTypes: booking.serviceTypes.map((s) => String(s).trim()).filter(Boolean),
        durationHours,
        startDate: String(booking.startAt || "").trim(),
        paymentMethod,
        paymentStatus: isCash ? "RESERVED" : "PENDING",
        paidVia: "",
        paidAt: "",
        paymentTransactionId: "",
        cashOnHandConfirmed: isCash,
        status: initialStatus,
        createdAt: rtdbServerTimestamp(),
        timestamp: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp(),
        totalPrice,
        priceRange: {
          min: priceRange.min,
          max: priceRange.max
        },
        location: String(addressLine || profile?.location || "").trim(),
        notes: String(booking.notes || "").trim(),
        assignmentMode: autoAssigned ? "auto" : "customer",
        autoAssigned,
        photos: [],
        photosUploadStatus: (photoFiles || []).length > 0 ? "PENDING" : "NONE",
        customerEmail: authUser?.email || profile?.email || "",
        source: "web"
      };

      await rtdbSet(requestRef, payload);

      const staffId = String(booking.housekeeperId || "").trim();
      const serviceLabel = String(primaryService || "Service request").trim();
      const timeLabel = String(booking.startAt || "").trim();
      if (staffId) {
        await sendNotification({
          toUserId: staffId,
          requestId,
          title: "New booking request",
          body: `${serviceLabel}${timeLabel ? ` - ${timeLabel}` : ""}${
            autoAssigned ? " (Auto-assigned)" : ""
          }`
        });
      }

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
      setCashConfirmAgreed(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validateBooking()) return;
    const methodKey = String(booking.paymentMethod || "").trim().toUpperCase();
    if (methodKey === "CASH_ON_HAND" && !cashConfirmAgreed) {
      setCashConfirmOpen(true);
      return;
    }
    await submitRequest();
  };

  useEffect(() => {
    setCashConfirmAgreed(false);
    setCashConfirmOpen(false);
  }, [booking.paymentMethod]);

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
            className="icon-btn"
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
              onClick={() => {
                if (bookingStep === 1) goToStep2();
                else if (bookingStep === 3) setBookingStep(2);
                else goToStep2();
              }}
              disabled={
                !Array.isArray(booking.serviceTypes) ||
                booking.serviceTypes.length === 0 ||
                booking.durationHours < 1 ||
                booking.durationHours > 8 ||
                !booking.paymentMethod
              }
            >
              2. Schedule &amp; Housekeeper
            </button>
            <button
              type="button"
              className={`step-pill ${bookingStep === 3 ? "active" : ""}`}
              onClick={() => goToStep3()}
              disabled={!step2Ready}
            >
              3. Review
            </button>
          </div>

          {bookingStep === 1 && (
            <div className="wizard-step">
              <label className="">
                  Choose services
                </label>
              <div className="service-grid">
                
                {normalizedServiceOptions.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    className={`service-card1 ${
                      Array.isArray(booking.serviceTypes) && booking.serviceTypes.includes(opt.name) ? "selected" : ""
                    }`}
                    onClick={() => {
                      const current = Array.isArray(booking.serviceTypes) ? booking.serviceTypes : [];
                      const next = current.includes(opt.name)
                        ? current.filter((s) => s !== opt.name)
                        : current.concat(opt.name);
                      setBookingFields({ serviceTypes: next });
                    }}
                  >
                    <div className="service-card__media">
                      {opt.imageUrl ? (
                        <img src={opt.imageUrl} alt={opt.name} />
                      ) : (
                        <span>{String(opt.name || "").slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="service-card__body">
                      <div className="service-card__title">{opt.name}</div>
                      <div className="service-card__price">
                        ₱{Number(opt.minPrice || 0).toLocaleString()} – ₱{Number(opt.maxPrice || 0).toLocaleString()}
                      </div>
                      {opt.note && (
                        <button
                          type="button"
                          className="service-card__link"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveProfile({
                              name: opt.name,
                              note: opt.note,
                              minPrice: opt.minPrice,
                              maxPrice: opt.maxPrice,
                              kind: "service"
                            });
                          }}
                        >
                          View details
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {step1Attempted && (!Array.isArray(booking.serviceTypes) || booking.serviceTypes.length === 0) && (
                <p className="error-note">Please choose at least one service type.</p>
              )}

              <div className="price-box">
                <p className="mini-label">Estimated price range</p>
                <h3>
                  {priceRange.min || priceRange.max
                    ? `PHP ${priceRange.min.toLocaleString()} – ${priceRange.max.toLocaleString()}`
                    : "Select services"}
                </h3>
                <p className="muted tiny">Final price may vary by location, property size, and scope.</p>
              </div>

              <div className="payment-block">
                <p className="mini-label">Payment method</p>
                <div className="payment-options">
                  {[
                    { key: "STATIC_QR", label: "Static QR", icon: "fas fa-qrcode" },
                    { key: "CASH_ON_HAND", label: "Cash on Hand", icon: "fas fa-hand-holding-usd" }
                  ].map((method) => (
                    <button
                      key={method.key}
                      type="button"
                      className={`payment-option ${booking.paymentMethod === method.key ? "selected" : ""}`}
                      onClick={() => setBookingFields({ paymentMethod: method.key })}
                    >
                      <i className={`payment-option__icon ${method.icon}`} aria-hidden="true"></i>
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
              {step1Attempted && !booking.paymentMethod && (
                <p className="error-note">Please choose a payment method.</p>
              )}

              <label className="full">
                Notes (optional)
                <textarea
                  value={booking.notes}
                  onChange={(e) => setBookingFields({ notes: e.target.value })}
                  placeholder="Gate code, parking, pets, surfaces to avoid..."
                  rows={3}
                />
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
              <div className={`schedule-picker full ${shakeSchedule ? "shake" : ""}`}>
                <div className="schedule-header">
                  <p className="mini-label">When will they start?</p>
                  <p className="muted tiny">Pick a date and time that works for you.</p>
                </div>
                <div className="schedule-inputs">
                  <label className="schedule-field">
                    <span className="schedule-field__label">Date</span>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => applyScheduleParts(e.target.value, scheduleTime)}
                      min={minDatePart || undefined}
                      max={maxDatePart || undefined}
                    />
                  </label>
                  <label className="schedule-field">
                    <span className="schedule-field__label">Time</span>
                    <input
                      type="time"
                      step={900}
                      value={scheduleTime}
                      onChange={(e) => applyScheduleParts(scheduleDate, e.target.value)}
                    />
                  </label>
                </div>
                <div className="schedule-chips">
                  {getQuickTimeOptions().length === 0 ? (
                    <span className="muted small">Pick a date to see time options.</span>
                  ) : (
                    getQuickTimeOptions().map((time) => {
                      const [hhRaw, mmRaw] = time.split(":");
                      const hh = Number(hhRaw);
                      const suffix = hh >= 12 ? "PM" : "AM";
                      const hour = ((hh + 11) % 12) + 1;
                      return (
                        <button
                          key={time}
                          className={`pill ${scheduleTime === time ? "selected" : ""}`}
                          type="button"
                          onClick={() => applyScheduleParts(scheduleDate, time)}
                        >
                          {hour}:{mmRaw} {suffix}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              {step2Attempted && !booking.startAt && (
                <p className="error-note">Please choose a schedule.</p>
              )}
              {timeError && <p className="error-note">{timeError}</p>}

              <div className="schedule-callout" role="status">
                <span className="schedule-callout__icon" aria-hidden="true">
                  <i className="fas fa-info-circle"></i>
                </span>
                <div className="schedule-callout__text">
                  <strong>Choose your schedule first</strong>
                  <span>Select a date and time before searching for available staff.</span>
                </div>
              </div>

              <div className="availability-actions">
                <button
                  className="btn pill ghost"
                  type="button"
                  onClick={handleFindAvailability}
                  disabled={housekeepersLoading}
                >
                  Find available staff
                </button>
                <button
                  className="btn pill primary"
                  type="button"
                  onClick={handleQuickBook}
                  disabled={housekeepersLoading}
                >
                  Quick Book
                </button>
                <p className="muted tiny">
                  Quick Book auto-assigns the least busy staff who match your schedule.
                </p>
              </div>
              {availabilityError && <p className="error-note">{availabilityError}</p>}

              {availabilityChecked && availabilityResults.length > 0 && (
                <div className="availability-summary">
                  <span className="pill soft green">Available {availabilitySummary.available}</span>
                  <span className="pill soft amber">Unavailable {availabilitySummary.unavailable}</span>
                  <span className="pill">Total {availabilitySummary.total}</span>
                </div>
              )}

              <div className="housekeeper-block">
                <p className="mini-label">Choose available housekeeper / staff</p>
                {housekeepersLoading ? (
                  <p className="muted small">Loading available housekeepers...</p>
                ) : (
                  <div className="housekeeper-list">
                    {!availabilityChecked && (
                      <p className="muted small">Click Find available staff to see the best matches.</p>
                    )}
                    {availabilityChecked && availableHousekeepers.length === 0 && (
                      <p className="muted small">No available staff match your schedule right now.</p>
                    )}
                    {availabilityChecked && availableHousekeepers.length > 0 && (
                      <div className="hk-grid">
                        {availableHousekeepers.map((hk) => (
                          <label
                            key={hk.id}
                            className={`preferred-card hk-card ${booking.housekeeperId === hk.id ? "selected" : ""}`}
                          >
                            <input
                              type="radio"
                              name="housekeeper"
                              checked={booking.housekeeperId === hk.id}
                              onChange={() => {
                                setAutoAssigned(false);
                                setBookingFields({
                                  housekeeperId: hk.id,
                                  housekeeperName: hk.name,
                                  housekeeperRole: hk.role
                                });
                              }}
                            />
                            <div className="preferred-card__top centered">
                              <span className="hk-avatar">
                                {hk.avatarUrl ? <img src={hk.avatarUrl} alt="" /> : hk.initials}
                              </span>
                              <div className="hk-meta">
                                <strong>{hk.name}</strong>
                                <span className="muted tiny">
                                  {hk.contact ? `Contact: ${hk.contact}` : "Contact: --"}
                                </span>
                                {hk.experienceYears > 0 && (
                                  <span className="muted tiny">{hk.experienceYears} yrs experience</span>
                                )}
                              </div>
                            </div>
                            {hk.rating > 0 ? (
                              <div className="preferred-card__stars">
                                <span className="star-row">
                                  {renderStarRating(hk.rating)} ({hk.rating.toFixed(1)} rating)
                                </span>
                              </div>
                            ) : (
                              <div className="preferred-card__stars">
                                <span className="muted tiny">No ratings yet</span>
                              </div>
                            )}
                            <div className="preferred-card__actions hk-actions">
                              {hk.preferredWorkload > 0 && (
                                <span className="pill soft amber">{hk.preferredWorkload} jobs/day</span>
                              )}
                              <span className="pill soft amber">
                                {hk.bookingsToday} booking{hk.bookingsToday === 1 ? "" : "s"} today
                              </span>
                              <button
                                className="btn pill ghost"
                                type="button"
                                onClick={() => {
                                  setActiveProfile(hk);
                                  setActiveProfileContext("available");
                                }}
                              >
                                Profile details
                              </button>
                            </div>
                            <div className="hk-status">
                              <span className="dot green"></span>Available for your slot
                            </div>

                          </label>
                        ))}
                      </div>
                    )}
                    {availabilityChecked && availabilityResults.length > 0 && (
                      <div className="unavailable-block">
                        <button
                          className="btn pill ghost toggle-unavailable"
                          type="button"
                          onClick={() => setShowUnavailable((prev) => !prev)}
                        >
                          {showUnavailable ? "Hide unavailable" : "Show unavailable"}
                        </button>
                        {showUnavailable && (
                          <>
                            <p className="mini-label">Unavailable staff</p>
                            {availabilityResults.filter((hk) => !hk.available).length === 0 ? (
                              <p className="muted small">All staff are available for your slot.</p>
                            ) : (
                              <div className="hk-grid">
                                {availabilityResults
                                  .filter((hk) => !hk.available)
                                  .map((hk) => {
                                const reason = !hk.matchesAvailability
                                  ? "Availability mismatch"
                                  : !hk.matchesService
                                    ? "Service mismatch"
                                    : hk.hasOverlap
                                      ? "Booked during this time"
                                      : "Unavailable";
                                    return (
                                      <div key={hk.id} className="preferred-card hk-card unavailable">
                                    <div className="preferred-card__top centered">
                                      <span className="hk-avatar">
                                        {hk.avatarUrl ? <img src={hk.avatarUrl} alt="" /> : hk.initials}
                                      </span>
                                      <div className="hk-meta">
                                        <strong>{hk.name}</strong>
                                        <span className="muted tiny">
                                          {hk.contact ? `Contact: ${hk.contact}` : "Contact: --"}
                                        </span>
                                            {hk.experienceYears > 0 && (
                                              <span className="muted tiny">{hk.experienceYears} yrs experience</span>
                                            )}
                                          </div>
                                        </div>
                                        {hk.rating > 0 ? (
                                          <div className="preferred-card__stars">
                                            <span className="star-row">
                                              {renderStarRating(hk.rating)} ({hk.rating.toFixed(1)} rating)
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="preferred-card__stars">
                                            <span className="muted tiny">No ratings yet</span>
                                          </div>
                                        )}
                                        <div className="preferred-card__actions hk-actions">
                                          <button
                                            className="btn pill ghost"
                                            type="button"
                                            onClick={() => {
                                              setActiveProfile(hk);
                                              setActiveProfileContext("available");
                                            }}
                                          >
                                            Profile details
                                          </button>
                                        </div>
                                        <div className="hk-status unavailable">
                                          <span className="dot gray"></span>{reason}
                                        </div>
                                        {hk.availability && (
                                          <div className="hk-availability">Availability: {hk.availability}</div>
                                        )}
                                        {hk.area && <div className="hk-availability">Location: {hk.area}</div>}
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {step2Attempted && !booking.housekeeperId && (
                <p className="error-note">Please select an available housekeeper.</p>
              )}

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
              {(() => {
                const schedule = formatStartAtDisplay(booking.startAt);
                return (

              <div className="review-grid">
                <div className="review-item">
                  <p className="mini-label">Service</p>
                  <strong>
                    {Array.isArray(booking.serviceTypes) && booking.serviceTypes.length > 0
                      ? booking.serviceTypes.join(", ")
                      : "—"}
                  </strong>
                </div>
                <div className="review-item">
                  <p className="mini-label">Total</p>
                  <strong>PHP {totalPrice.toLocaleString()}</strong>
                </div>
                <div className="review-item">
                  <p className="mini-label">Payment</p>
                  <strong>{formatPaymentMethodLabel(booking.paymentMethod)}</strong>
                </div>
                <div className="review-item">
                  <p className="mini-label">Start</p>
                  <div className="review-schedule">
                    <span className="review-date">{schedule.date}</span>
                    {schedule.time && <span className="review-time">{schedule.time}</span>}
                  </div>
                </div>
                <div className="review-item full">
                  <p className="mini-label">Housekeeper</p>
                  <div className="review-housekeeper">
                    <strong>
                      {booking.housekeeperName
                        ? `${booking.housekeeperName}${booking.housekeeperRole ? ` (${booking.housekeeperRole})` : ""}`
                        : "Auto-assigned"}
                    </strong>
                    {autoAssigned && <span className="pill soft blue">Auto-assigned</span>}
                  </div>
                </div>
                <div className="review-item full">
                  <p className="mini-label">Notes</p>
                  <strong>{String(booking.notes || "").trim() || "—"}</strong>
                </div>
              </div>
                );
              })()}

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

        </div>
      </div>
      {cashConfirmOpen && (
        <div className="customer-modal">
          <div
            className="customer-modal__backdrop"
            onClick={() => {
              if (submitting) return;
              setCashConfirmOpen(false);
            }}
          />
          <div className="customer-modal__panel" role="dialog" aria-modal="true" aria-label="Confirm cash on hand">
            <div className="customer-modal__icon alt">
              <i className="fas fa-hand-holding-usd"></i>
            </div>
            <h4>Confirm Cash on Hand</h4>
            <p>Confirm that you will pay in cash when the staff arrives.</p>
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill ghost"
                onClick={() => setCashConfirmOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn pill primary"
                onClick={() => {
                  setCashConfirmAgreed(true);
                  setCashConfirmOpen(false);
                  submitRequest();
                }}
                disabled={submitting}
              >
                Yes, confirm cash payment
              </button>
            </div>
          </div>
        </div>
      )}
      {activeProfile && (
        <div className="staff-profile-modal" role="dialog" aria-modal="true" aria-label="Staff profile">
          <div
            className="staff-profile-modal__backdrop"
            onClick={() => {
              setActiveProfile(null);
              setActiveProfileContext("");
            }}
          />
          <div className="staff-profile-modal__panel">
            <div className="staff-profile-modal__header">
              <div className="staff-profile-modal__title">
                {activeProfile.avatarUrl && activeProfile.kind !== "service" && (
                  <span className="staff-profile-avatar">
                    <img src={activeProfile.avatarUrl} alt="" />
                  </span>
                )}
                <p className="eyebrow">{activeProfile.kind === "service" ? "Service details" : "Staff profile"}</p>
                <h4>{activeProfile.name}</h4>
                {activeProfile.kind !== "service" && (
                  <p className="muted small">{activeProfile.role || "Housekeeper"}</p>
                )}
              </div>
              <button
                className="icon-btn"
                type="button"
                onClick={() => {
                  setActiveProfile(null);
                  setActiveProfileContext("");
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="staff-profile-modal__body">
              {activeProfile.kind === "service" && (
                <div className="profile-notes">
                  <p className="mini-label">Typical price range</p>
                  <p className="muted small">
                    ₱{Number(activeProfile.minPrice || 0).toLocaleString()} – ₱
                    {Number(activeProfile.maxPrice || 0).toLocaleString()}
                  </p>
                  <p className="mini-label">Notes</p>
                  <p className="muted small">{activeProfile.note || "—"}</p>
                </div>
              )}
              {activeProfile.kind !== "service" && (
                <>
                  <div className="profile-chip-row">
                    {activeProfile.rating > 0 && (
                      <span className="pill soft blue">Rating {activeProfile.rating.toFixed(1)}</span>
                    )}
                    {activeProfile.experienceYears > 0 && (
                      <span className="pill soft green">{activeProfile.experienceYears} yrs experience</span>
                    )}
                    {activeProfile.preferredWorkload > 0 && (
                      <span className="pill soft amber">{activeProfile.preferredWorkload} jobs/day</span>
                    )}
                  </div>
                  <div className="profile-grid">
                    <div>
                      <small>Availability</small>
                      <strong>{formatAvailabilityDisplay(activeProfile) || "—"}</strong>
                    </div>
                    <div>
                      <small>Location</small>
                      <strong>{activeProfile.area || "—"}</strong>
                    </div>
                  </div>
                  {Array.isArray(activeProfile.skills) && activeProfile.skills.length > 0 && (
                    <div className="profile-skills">
                      <p className="mini-label">Service capability</p>
                      <div className="hk-skill-row">
                        {activeProfile.skills.map((skill) => (
                          <span key={skill} className="pill">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeProfile.experienceNotes && (
                    <div className="profile-notes">
                      <p className="mini-label">Experience details</p>
                      <p className="muted small">{activeProfile.experienceNotes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="staff-profile-modal__footer">
              {activeProfile.kind !== "service" && (
              <button
                className="btn pill primary"
                type="button"
                onClick={() => {
                  setAutoAssigned(false);
                  if (activeProfileContext === "preferred") {
                    applyPreferredStaffSelection(activeProfile);
                  } else {
                    setBookingFields({
                      housekeeperId: activeProfile.id,
                      housekeeperName: activeProfile.name,
                      housekeeperRole: activeProfile.role
                    });
                  }
                  setActiveProfile(null);
                  setActiveProfileContext("");
                }}
              >
                Select staff
              </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingWizardModal;








