import React from "react";
import { rtdb } from "../../../firebase";
import {
  onValue,
  ref as rtdbRef,
  remove as rtdbRemove,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet
} from "firebase/database";

function StaffMain({
  showGuest,
  isStaffRole,
  assignedTodayCount,
  nextJobLabel,
  pendingPaymentsCount,
  notificationsLoading,
  notifications,
  ratingDisplay,
  tasks,
  completedTasks = [],
  requests,
  requestsLoading,
  isHousekeeper,
  isStaffManager,
  profile,
  currentUserId,
  paymentMethodByRequestId,
  setPaymentMethodByRequestId,
  customerAvatarSeeds = {},
  handleRequestAction,
  handleComplete,
  handleCashPaymentReceived,
  handleStaffArrived,
  markNotificationRead,
  markAllRead,
  formatWhenShort,
  visibleSections = {},
  onGoToRequests,
  onGoToNotifications,
  onGoToSettings,
  staffServiceOptions = [],
  weekdayOptions = [],
  staffProfileForm,
  setStaffProfileForm,
  staffProfileErrors = {},
  setStaffProfileErrors,
  staffProfileSaving,
  handleStaffProfileSave,
  handleStaffProfileReset,
  showProfilePrompt,
  profileToast,
  onDismissProfileToast,
  renderDashboardSection,
  renderRequestsSection,
  renderNotificationsSection,
  renderScheduleSection,
  renderSettingsSection,
  renderHistorySection,
  attendanceEntries = [],
  attendanceLoading = false
}) {
  const hasVisibilityConfig = visibleSections && Object.keys(visibleSections).length > 0;
  const isVisible = (key) => {
    if (hasVisibilityConfig) return visibleSections[key] === true;
    return true;
  };
  const [nowTime, setNowTime] = React.useState(new Date());
  const [activeRequest, setActiveRequest] = React.useState(null);
  const [showRequestModal, setShowRequestModal] = React.useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = React.useState(false);
  const [showCashConfirm, setShowCashConfirm] = React.useState(false);
  const [cashConfirmTarget, setCashConfirmTarget] = React.useState(null);
  const [completionToast, setCompletionToast] = React.useState("");
  const [arrivedClickId, setArrivedClickId] = React.useState("");
  const arrivedClickTimer = React.useRef(null);
  const [archivedHistoryMap, setArchivedHistoryMap] = React.useState({});
  const [requestTab, setRequestTab] = React.useState("request");
  const [requestSearch, setRequestSearch] = React.useState("");
  const [completedPage, setCompletedPage] = React.useState(1);
  const [notificationFilter, setNotificationFilter] = React.useState("all");
  const [activeNotification, setActiveNotification] = React.useState(null);
  const [showNotificationModal, setShowNotificationModal] = React.useState(false);
  const [confirmState, setConfirmState] = React.useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null
  });
  const [attendanceMonth, setAttendanceMonth] = React.useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [attendanceSelectedKey, setAttendanceSelectedKey] = React.useState("");
  const [themeMode, setThemeMode] = React.useState(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("theme");
    return saved === "dark" ? "dark" : "light";
  });
  const createAvatarDataUri = (presetId) => {
    const base = "data:image/svg+xml;charset=utf-8,";
    const preset = String(presetId || "mop");
    const map = {
      mop: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0F2FE\" stroke=\"#0EA5E9\" stroke-width=\"2\"/><rect x=\"45\" y=\"18\" width=\"6\" height=\"42\" rx=\"3\" fill=\"#0EA5E9\"/><rect x=\"34\" y=\"54\" width=\"28\" height=\"8\" rx=\"4\" fill=\"#38BDF8\"/><path d=\"M28 62c6 10 34 10 40 0\" fill=\"none\" stroke=\"#0EA5E9\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>",
      broom: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FEF3C7\" stroke=\"#F59E0B\" stroke-width=\"2\"/><rect x=\"46\" y=\"16\" width=\"4\" height=\"46\" rx=\"2\" fill=\"#B45309\"/><path d=\"M32 60h32l-6 16H38l-6-16z\" fill=\"#F59E0B\"/><path d=\"M38 60l2 8M44 60l2 8M50 60l2 8M56 60l2 8\" stroke=\"#B45309\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>",
      vacuum: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#EDE9FE\" stroke=\"#8B5CF6\" stroke-width=\"2\"/><rect x=\"30\" y=\"48\" width=\"28\" height=\"18\" rx=\"9\" fill=\"#8B5CF6\"/><circle cx=\"62\" cy=\"58\" r=\"8\" fill=\"#C4B5FD\"/><path d=\"M58 36h12\" stroke=\"#8B5CF6\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M70 36v18\" stroke=\"#8B5CF6\" stroke-width=\"4\" stroke-linecap=\"round\"/></svg>",
      spray: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DCFCE7\" stroke=\"#22C55E\" stroke-width=\"2\"/><rect x=\"40\" y=\"34\" width=\"16\" height=\"8\" rx=\"3\" fill=\"#22C55E\"/><rect x=\"36\" y=\"42\" width=\"24\" height=\"34\" rx=\"8\" fill=\"#4ADE80\"/><path d=\"M56 30h10\" stroke=\"#16A34A\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"72\" cy=\"34\" r=\"3\" fill=\"#22C55E\"/></svg>",
      bucket: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DBEAFE\" stroke=\"#3B82F6\" stroke-width=\"2\"/><path d=\"M30 36h36l-4 36H34l-4-36z\" fill=\"#60A5FA\"/><path d=\"M36 32c0-6 24-6 24 0\" fill=\"none\" stroke=\"#3B82F6\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M38 54c6 6 14 6 20 0\" stroke=\"#3B82F6\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>",
      apron: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FFE4E6\" stroke=\"#F43F5E\" stroke-width=\"2\"/><path d=\"M34 28c8 10 20 10 28 0\" fill=\"none\" stroke=\"#F43F5E\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M30 36h36l-4 36H34l-4-36z\" fill=\"#FB7185\"/><rect x=\"40\" y=\"48\" width=\"16\" height=\"10\" rx=\"4\" fill=\"#FFE4E6\"/></svg>",
      gloves: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#FEE2E2\" stroke=\"#EF4444\" stroke-width=\"2\"/><path d=\"M30 54c0-10 6-14 10-14s6 4 6 8v20H36c-4 0-6-4-6-14z\" fill=\"#F87171\"/><path d=\"M60 50c0-8 6-12 10-12s6 4 6 8v18H66c-4 0-6-4-6-14z\" fill=\"#FB7185\"/></svg>",
      housekeeper: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0E7FF\" stroke=\"#6366F1\" stroke-width=\"2\"/><circle cx=\"48\" cy=\"38\" r=\"12\" fill=\"#A5B4FC\"/><path d=\"M28 74c4-16 36-16 40 0\" fill=\"#818CF8\"/><path d=\"M38 36c6 4 14 4 20 0\" stroke=\"#6366F1\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/></svg>",
      sparkle_home: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#ECFCCB\" stroke=\"#65A30D\" stroke-width=\"2\"/><path d=\"M26 50l22-18 22 18v22H26V50z\" fill=\"#84CC16\"/><path d=\"M44 72V56h8v16\" fill=\"#D9F99D\"/><path d=\"M70 30l4 4m0-4l-4 4\" stroke=\"#65A30D\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>",
      bubbles: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0F2FE\" stroke=\"#0EA5E9\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"52\" r=\"12\" fill=\"#BAE6FD\"/><circle cx=\"58\" cy=\"42\" r=\"10\" fill=\"#7DD3FC\"/><circle cx=\"58\" cy=\"64\" r=\"8\" fill=\"#38BDF8\"/></svg>"
    };
    const svg = map[preset] || map.mop;
    return `${base}${encodeURIComponent(svg)}`;
  };
  const getInitials = (name) => {
    const words = String(name || "")
      .replace(/[^A-Za-z0-9 ]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
    return (words.join("") || "CU").slice(0, 2).toUpperCase();
  };
  const getCustomerAvatar = (req) => {
    const name = req?.householderName || req?.customer || "Customer";
    const customerId = String(req?.householderId || req?.customerId || "").trim();
    const seed = String(
      customerAvatarSeeds?.[customerId] ||
        req?.householderAvatarSeed ||
        req?.customerAvatarSeed ||
        req?.customerAvatar ||
        req?.avatarSeed ||
        ""
    ).trim();
    const url = seed ? createAvatarDataUri(seed) : "";
    return { name, initials: getInitials(name), url, seed };
  };
  const profileForm = staffProfileForm || {};
  const avatarPresets = [
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
  ];
  const currentPreset = avatarPresets.find((preset) => preset.id === profileForm.avatarSeed) || avatarPresets[0];
  const avatarPreview = currentPreset?.svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(currentPreset.svg)}`
    : "";

  const updateField = (field, value) => {
    if (typeof setStaffProfileForm !== "function") return;
    const nextValue = field === "contact" ? String(value || "").replace(/\D/g, "") : value;
    setStaffProfileForm((prev) => ({ ...(prev || {}), [field]: nextValue }));
    if (typeof setStaffProfileErrors === "function") {
      setStaffProfileErrors((prev) => {
        if (!prev || !prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleSkill = (skill) => {
    const list = Array.isArray(profileForm.skills) ? profileForm.skills : [];
    const next = list.includes(skill) ? list.filter((s) => s !== skill) : list.concat(skill);
    updateField("skills", next);
  };

  const toggleDay = (day) => {
    const list = Array.isArray(profileForm.availabilityDays) ? profileForm.availabilityDays : [];
    const next = list.includes(day) ? list.filter((d) => d !== day) : list.concat(day);
    updateField("availabilityDays", next);
  };

  const runWithConfirm = (message, action, title = "Confirm action") => {
    if (typeof action !== "function") return;
    setConfirmState({
      open: true,
      title,
      message: message || "Are you sure you want to proceed?",
      onConfirm: action
    });
  };

  const closeConfirmModal = () => {
    setConfirmState((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  React.useEffect(() => {
    const id = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (themeMode === "dark") root.classList.add("dark-mode");
    else root.classList.remove("dark-mode");
    localStorage.setItem("theme", themeMode);
  }, [themeMode]);

  React.useEffect(() => {
    if (!completionToast) return undefined;
    const timer = setTimeout(() => setCompletionToast(""), 3000);
    return () => clearTimeout(timer);
  }, [completionToast]);
  const todayLabel = nowTime.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const formatSchedule = (req) => {
    const startDate = req?.startDate || "";
    const combined = `${req?.date || ""} ${req?.time || ""}`.trim();
    const raw = String(startDate || combined || "").trim();
    if (!raw) return "--";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    const dateLabel = parsed.toLocaleDateString([], {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
    const timeLabel = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dateLabel} • ${timeLabel}`;
  };

  const formatBookedAt = (req) => {
    const raw =
      req?.createdAt ??
      req?.timestamp ??
      req?.requestedAt ??
      req?.requestCreatedAt ??
      req?.created_at ??
      "";
    if (!raw) return "--";
    if (typeof raw?.toDate === "function") {
      const dateObj = raw.toDate();
      const dateLabel = dateObj.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      const timeLabel = dateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${dateLabel} • ${timeLabel}`;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return String(raw);
    const dateLabel = parsed.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const timeLabel = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dateLabel} • ${timeLabel}`;
  };

  const formatNotificationWhen = (value) => {
    if (!value) return "--";
    let dateObj = value;
    if (typeof value?.toDate === "function") dateObj = value.toDate();
    if (!(dateObj instanceof Date)) {
      const parsed = new Date(dateObj);
      if (Number.isNaN(parsed.getTime())) return String(value);
      dateObj = parsed;
    }
    const dateLabel = dateObj.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const timeLabel = dateObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dateLabel} • ${timeLabel}`;
  };

  const formatNotificationBody = (text) => {
    if (!text) return "";
    const raw = String(text);
    return raw.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/g, (match) => {
      const parsed = new Date(match);
      if (Number.isNaN(parsed.getTime())) return match;
      const dateLabel = parsed.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      const timeLabel = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${dateLabel} • ${timeLabel}`;
    });
  };

  const formatPaymentMethodLabel = (value) => {
    const key = String(value || "").trim().toUpperCase();
    if (key === "STATIC_QR") return "Static QR";
    if (key === "CASH_ON_HAND") return "Cash on Hand";
    return value ? String(value) : "--";
  };
  const normalizeSearch = (value) => String(value || "").toLowerCase().trim();
  const matchesSearch = (req, query) => {
    if (!query) return true;
    const haystack = [
      req?.serviceType,
      req?.service,
      req?.householderName,
      req?.customer,
      req?.location,
      req?.address,
      req?.requestId,
      req?.id
    ]
      .map((v) => normalizeSearch(v))
      .join(" ");
    return haystack.includes(query);
  };

  React.useEffect(() => {
    const uid = String(currentUserId || "").trim();
    if (!uid) {
      setArchivedHistoryMap({});
      return undefined;
    }
    const archiveRef = rtdbRef(rtdb, `StaffHistoryArchive/${uid}`);
    const stop = onValue(archiveRef, (snap) => {
      setArchivedHistoryMap(snap.val() || {});
    });
    return () => stop();
  }, [currentUserId]);

  const staffHistory = React.useMemo(() => {
    const list = (requests || [])
      .filter((r) => {
        const status = String(r.status || "").toLowerCase();
        return status === "completed" || Boolean(r.completedAt);
      })
      .map((r) => {
        const completedAt = r.completedAt || r.updatedAt || r.createdAt || "";
        const serviceLabel = r.serviceType || r.service || "Service";
        const location = r.location || r.address || "";
        const job = location ? `${serviceLabel} - ${location}` : serviceLabel;
        const total =
          typeof r.totalPrice === "number" && Number.isFinite(r.totalPrice) && r.totalPrice > 0
            ? `PHP ${Math.round(r.totalPrice).toLocaleString()}`
            : r.payout || "PHP --";
        const method = formatPaymentMethodLabel(r.paymentMethod || r.paidVia);
          return {
            id: r.requestId || r.id,
            job,
            date: completedAt ? formatWhenShort(completedAt) : "--",
            payout: total,
            status: String(r.status || "completed").toLowerCase(),
            payment: method,
            completedAt: completedAt ? Number(completedAt) || 0 : 0
          };
      });
    return list.sort((a, b) => (Number(b.completedAt || 0) || 0) - (Number(a.completedAt || 0) || 0));
  }, [requests, formatWhenShort]);

  const archivedHistoryList = React.useMemo(() => {
    return Object.entries(archivedHistoryMap || {})
      .map(([id, data]) => ({ id, ...(data || {}) }))
      .sort((a, b) => (Number(b.archivedAt || b.completedAt || 0) || 0) - (Number(a.archivedAt || a.completedAt || 0) || 0));
  }, [archivedHistoryMap]);

  const archivedHistoryIds = React.useMemo(
    () => new Set(archivedHistoryList.map((h) => h.id)),
    [archivedHistoryList]
  );

  const activeHistoryList = React.useMemo(
    () => staffHistory.filter((h) => !archivedHistoryIds.has(h.id)),
    [staffHistory, archivedHistoryIds]
  );

  const overviewCards = React.useMemo(() => {
    let revenue = 0;
    let completed = 0;
    let cancelled = 0;
    (requests || []).forEach((req) => {
      const status = String(req?.status || "").toLowerCase();
      const total = Number(req?.totalPrice || 0);
      const hasMethod = Boolean(String(req?.paymentMethod || req?.paidVia || "").trim());
      if (status === "completed" || req?.completedAt) {
        completed += 1;
        if (hasMethod && Number.isFinite(total)) revenue += total;
      }
      if (status.includes("cancel") || status.includes("declin") || status.includes("reject")) {
        cancelled += 1;
      }
    });
    return [
      { label: "Revenue", value: `PHP ${Math.round(revenue).toLocaleString()}` },
      { label: "Tasks completed", value: completed },
      { label: "Tasks cancelled", value: cancelled }
    ];
  }, [requests]);

  const feedbackItems = React.useMemo(() => {
    return (requests || [])
      .filter((req) => String(req?.feedbackComment || "").trim().length > 0)
      .map((req) => ({
        id: req.id || req.requestId || `${req.customer || "customer"}_${req.feedbackAt || req.updatedAt || ""}`,
        name: req.householderName || req.customer || "Customer",
        avatar: getCustomerAvatar(req),
        service: req.serviceType || req.service || "Service",
        rating: Number(req.feedbackRating || 0) || 0,
        comment: String(req.feedbackComment || "").trim(),
        when: req.feedbackAt || req.updatedAt || req.completedAt || req.createdAt
      }))
      .sort((a, b) => (Number(b.when || 0) || 0) - (Number(a.when || 0) || 0))
      .slice(0, 8);
  }, [requests]);

  const [statsRangeDays, setStatsRangeDays] = React.useState(7);
  const dayMs = 24 * 60 * 60 * 1000;
  const analytics = React.useMemo(() => {
    const now = Date.now();
    const rangeMs = statsRangeDays * dayMs;
    const bucketCount = 7;
    const bucketMs = rangeMs / bucketCount;
    const buckets = Array.from({ length: bucketCount }, () => ({ requests: 0, revenue: 0 }));

    (requests || []).forEach((req) => {
      const createdAt = Number(req?.createdAt || req?.timestamp || 0) || 0;
      if (!createdAt || createdAt < now - rangeMs) return;
      const index = Math.min(bucketCount - 1, Math.floor((createdAt - (now - rangeMs)) / bucketMs));
      if (index < 0 || index >= bucketCount) return;
      buckets[index].requests += 1;

      const status = String(req?.status || "").toLowerCase();
      const total = Number(req?.totalPrice || 0);
      const hasMethod = Boolean(String(req?.paymentMethod || req?.paidVia || "").trim());
      if ((status === "completed" || req?.completedAt) && hasMethod && Number.isFinite(total)) {
        buckets[index].revenue += total;
      }
    });

    const labels = Array.from({ length: bucketCount }, (_, idx) => {
      const end = new Date(now - rangeMs + (idx + 1) * bucketMs);
      return end.toLocaleDateString("default", { month: "short", day: "numeric" });
    });

    return { buckets, labels };
  }, [requests, statsRangeDays]);

  const staffRequestSeries = analytics.buckets.map((b) => Math.min(40, b.requests * 6 + 6));
  const staffRevenueSeries = analytics.buckets.map((b) => Math.min(40, Math.round(b.revenue / 1000) * 4 + 4));
  const staffBars = analytics.buckets.map((b, idx) => ({
    label: analytics.labels[idx] || `Day ${idx + 1}`,
    value: Math.min(100, b.requests * 15 + 20)
  }));

  const dashboardReminders = React.useMemo(() => {
    const list = [];
    const visibleRequests = (requests || []).filter((req) => {
      if (!isHousekeeper) return true;
      const assignedId = String(req?.housekeeperId || "").trim();
      return Boolean(currentUserId) && assignedId === currentUserId;
    });
    const accepted = visibleRequests.filter(
      (req) => String(req?.status || "").toLowerCase() === "accepted"
    );
    const notArrived = accepted.filter((req) => !req?.staffArrived);
    const awaitingConfirm = accepted.filter((req) => req?.staffArrived && !req?.customerArrivalConfirmed);
    const cashPending = accepted.filter((req) => {
      const method = String(req?.paymentMethod || req?.paidVia || "").toUpperCase();
      const paymentStatus = String(req?.paymentStatus || "").toUpperCase();
      return method === "CASH_ON_HAND" && paymentStatus === "RESERVED" && req?.staffArrived;
    });
    const ongoing = accepted.filter((req) => {
      const paymentStatus = String(req?.paymentStatus || "").toUpperCase();
      const method = String(req?.paymentMethod || req?.paidVia || "").toUpperCase();
      const cashReserved = method === "CASH_ON_HAND" && paymentStatus === "RESERVED";
      return Boolean(req?.customerArrivalConfirmed) && !cashReserved;
    });
    const pending = visibleRequests.filter((req) => {
      const status = String(req?.status || "").toLowerCase();
      return ["pending", "confirmed", "reserved", "pending_payment"].includes(status);
    });

    if (pending.length) {
      list.push({
        key: "pending",
        label: "Requests waiting for accept/decline",
        count: pending.length,
        tone: "amber"
      });
    }
    if (notArrived.length) {
      list.push({
        key: "arrival",
        label: "Accepted jobs need arrival confirmation",
        count: notArrived.length,
        tone: "blue"
      });
    }
    if (awaitingConfirm.length) {
      list.push({
        key: "confirm",
        label: "Awaiting customer arrival confirmation",
        count: awaitingConfirm.length,
        tone: "amber"
      });
    }
    if (cashPending.length) {
      list.push({
        key: "cash",
        label: "Cash payments to confirm",
        count: cashPending.length,
        tone: "amber"
      });
    }
    if (ongoing.length) {
      list.push({
        key: "ongoing",
        label: "Jobs ready to complete",
        count: ongoing.length,
        tone: "green"
      });
    }

    return list.slice(0, 5);
  }, [requests, isHousekeeper, currentUserId]);

  const getStatusLower = (req) => String(req?.status || "PENDING").toLowerCase();
  const getPaymentMethodKey = (req) => String(req?.paymentMethod || req?.paidVia || "").toUpperCase();
  const getPaymentStatusKey = (req) => String(req?.paymentStatus || "").toUpperCase();
  const isCashOnHand = (req) => getPaymentMethodKey(req) === "CASH_ON_HAND";
  const isCashReserved = (req) => isCashOnHand(req) && getPaymentStatusKey(req) === "RESERVED";
  const isPaid = (req) => getPaymentStatusKey(req) === "PAID" || Boolean(req?.paidAt);
  const canSeeRequest = (req) => {
    if (!isHousekeeper) return true;
    const assignedId = String(req?.housekeeperId || "").trim();
    return Boolean(currentUserId) && assignedId === currentUserId;
  };

  const incomingRequests = (requests || []).filter((req) => {
    if (!canSeeRequest(req)) return false;
    const statusLower = getStatusLower(req);
    return ["pending", "confirmed", "reserved", "pending_payment"].includes(statusLower);
  });

  const attendanceRequests = (requests || []).filter((req) => {
    if (!canSeeRequest(req)) return false;
    const statusLower = getStatusLower(req);
    if (statusLower !== "accepted") return false;
    const staffArrived = Boolean(req?.staffArrived);
    const customerConfirmed = Boolean(req?.customerArrivalConfirmed);
    return !staffArrived || (staffArrived && !customerConfirmed);
  });

  const cashConfirmationRequests = (requests || []).filter((req) => {
    if (!canSeeRequest(req)) return false;
    const statusLower = getStatusLower(req);
    if (statusLower !== "accepted") return false;
    if (!req?.staffArrived) return false;
    return isCashReserved(req);
  });

  const ongoingRequests = (requests || []).filter((req) => {
    if (!canSeeRequest(req)) return false;
    const statusLower = getStatusLower(req);
    if (statusLower !== "accepted") return false;
    if (!req?.customerArrivalConfirmed) return false;
    if (isCashOnHand(req) && !isPaid(req)) return false;
    return true;
  });

  const attendanceCalendar = React.useMemo(() => {
    const { year, month } = attendanceMonth;
    const monthLabel = new Date(year, month, 1).toLocaleDateString([], {
      month: "long",
      year: "numeric"
    });
    const startDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekLabels = ["S", "M", "T", "W", "T", "F", "S"];
    const toDateKey = (date) => {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const todayKey = toDateKey(new Date());
    const attendanceKeys = new Set(
      (attendanceEntries || [])
        .filter((entry) => Number(entry?.at || 0) > 0)
        .map((entry) => toDateKey(entry.at))
    );
    const calendarCells = [];
    for (let i = 0; i < startDay; i += 1) {
      calendarCells.push({ empty: true, key: `empty-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toDateKey(new Date(year, month, day));
      calendarCells.push({
        day,
        key,
        hasAttendance: attendanceKeys.has(key),
        isToday: key === todayKey
      });
    }
    const attendanceList = (attendanceEntries || [])
      .filter((entry) => Number(entry?.at || 0) > 0)
      .slice(0, 8)
      .map((entry) => {
        const when = new Date(entry.at);
        const dateLabel = when.toLocaleDateString([], { month: "short", day: "2-digit" });
        const timeLabel = when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        return {
          id: entry.id,
          date: dateLabel,
          dateKey: toDateKey(entry.at),
          time: timeLabel,
          service: entry.service || "Service"
        };
      });
    return { monthLabel, weekLabels, calendarCells, attendanceList, todayKey };
  }, [attendanceEntries, attendanceMonth]);

  const completedPageSize = 10;
  const completedTotalPages = Math.max(1, Math.ceil(activeHistoryList.length / completedPageSize));
  const completedCurrentPage = Math.min(completedPage, completedTotalPages);
  const completedStart = (completedCurrentPage - 1) * completedPageSize;
  const completedPaged = activeHistoryList.slice(completedStart, completedStart + completedPageSize);

  const archiveHistoryItem = async (item) => {
    const uid = String(currentUserId || "").trim();
    if (!uid || !item?.id) return;
    const payload = {
      ...item,
      status: "ARCHIVED",
      archivedAt: rtdbServerTimestamp(),
      archivedById: uid
    };
    await rtdbSet(rtdbRef(rtdb, `StaffHistoryArchive/${uid}/${item.id}`), payload);
  };

  const deleteHistoryItem = async (item) => {
    const uid = String(currentUserId || "").trim();
    if (!uid || !item?.id) return;
    await rtdbRemove(rtdbRef(rtdb, `StaffHistoryArchive/${uid}/${item.id}`));
  };

  const openRequestModal = (req) => {
    if (!req) return;
    setActiveRequest(req);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setActiveRequest(null);
    setShowRequestModal(false);
  };

  const triggerArrivedClick = (req) => {
    const id = String(req?.id || req?.requestId || "").trim();
    if (!id) return;
    setArrivedClickId(id);
    if (arrivedClickTimer.current) {
      clearTimeout(arrivedClickTimer.current);
    }
    arrivedClickTimer.current = setTimeout(() => {
      setArrivedClickId("");
      arrivedClickTimer.current = null;
    }, 900);
  };

  const openCompleteConfirm = () => {
    setShowCompleteConfirm(true);
  };

  const closeCompleteConfirm = () => {
    setShowCompleteConfirm(false);
  };

  const openNotificationModal = (notif) => {
    if (!notif) return;
    setActiveNotification(notif);
    setShowNotificationModal(true);
  };

  const closeNotificationModal = () => {
    setActiveNotification(null);
    setShowNotificationModal(false);
  };

  const openCashConfirm = (req) => {
    if (!req) return;
    setCashConfirmTarget(req);
    setShowCashConfirm(true);
  };

  const closeCashConfirm = () => {
    setShowCashConfirm(false);
    setCashConfirmTarget(null);
  };

  const sectionContext = {
    showGuest,
    profile,
    todayLabel,
    dashboardReminders,
    onGoToRequests,
    overviewCards,
    ratingDisplay,
    feedbackItems,
    formatNotificationWhen,
    statsRangeDays,
    setStatsRangeDays,
    staffRequestSeries,
    staffRevenueSeries,
    analytics,
    staffBars,
    requestsLoading,
    requestTab,
    setRequestTab,
    incomingRequests,
    attendanceRequests,
    cashConfirmationRequests,
    ongoingRequests,
    activeHistoryList,
    completedPaged,
    completedCurrentPage,
    completedTotalPages,
    setCompletedPage,
    requestSearch,
    setRequestSearch,
    matchesSearch,
    normalizeSearch,
    getStatusLower,
    getCustomerAvatar,
    formatSchedule,
    getPaymentStatusKey,
    getPaymentMethodKey,
    isPaid,
    isCashReserved,
    currentUserId,
    isStaffManager,
    isHousekeeper,
    openRequestModal,
    runWithConfirm,
    handleRequestAction,
    paymentMethodByRequestId,
    setActiveRequest,
    openCompleteConfirm,
    triggerArrivedClick,
    handleStaffArrived,
    openCashConfirm,
    archiveHistoryItem,
    requests,
    notificationFilter,
    setNotificationFilter,
    notificationsLoading,
    notifications,
    markAllRead,
    markNotificationRead,
    openNotificationModal,
    formatNotificationBody,
    attendanceCalendar,
    attendanceSelectedKey,
    setAttendanceSelectedKey,
    attendanceLoading,
    setAttendanceMonth,
    showProfilePrompt,
    avatarPreview,
    avatarPresets,
    profileForm,
    updateField,
    staffProfileErrors,
    staffServiceOptions,
    toggleSkill,
    weekdayOptions,
    toggleDay,
    handleStaffProfileReset,
    staffProfileSaving,
    handleStaffProfileSave,
    themeMode,
    setThemeMode
  };

  return (
    <main className="staff-main">
      {completionToast && (
        <div className="staff-toast success" role="status">
          <span>{completionToast}</span>
          <button
            type="button"
            className="staff-toast__close"
            onClick={() => setCompletionToast("")}
            aria-label="Dismiss"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      {profileToast && (
        <div className="staff-toast success" role="status">
          <span>{profileToast}</span>
          <button
            type="button"
            className="staff-toast__close"
            onClick={() => {
              if (typeof onDismissProfileToast === "function") onDismissProfileToast();
            }}
            aria-label="Dismiss"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      {showProfilePrompt && (
        <div className="staff-blocking-modal" role="dialog" aria-modal="true" aria-label="Complete staff profile">
          <div className="staff-blocking-modal__backdrop" />
          <div className="staff-blocking-modal__panel">
            <h3>Complete Your Staff Profile</h3>
            <p>
              Welcome! Please complete your staff profile. This information will be saved to your account and shown to
              customers when they book and select staff. Fields marked * are required.
            </p>
            <div className="avatar-uploader">
              <p className="mini-label">Choose an avatar</p>
              <div className="avatar-preview">
                {avatarPreview ? <img src={avatarPreview} alt="Avatar" /> : <span>Avatar</span>}
              </div>
              <div className="avatar-presets">
                {avatarPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`avatar-chip ${profileForm.avatarSeed === preset.id ? "active" : ""}`}
                    onClick={() => updateField("avatarSeed", preset.id)}
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
            <div className="staff-modal-form">
              <label>
                First name *
                <input
                  type="text"
                  value={profileForm.firstName || ""}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="Maria"
                />
                {staffProfileErrors.firstName && <span className="form-error">{staffProfileErrors.firstName}</span>}
              </label>
              <label>
                Last name *
                <input
                  type="text"
                  value={profileForm.lastName || ""}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="Santos"
                />
                {staffProfileErrors.lastName && <span className="form-error">{staffProfileErrors.lastName}</span>}
              </label>
              <label>
                Email *
                <input
                  type="email"
                  value={profileForm.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="maria@example.com"
                />
                {staffProfileErrors.email && <span className="form-error">{staffProfileErrors.email}</span>}
              </label>
              <label>
                Contact number *
                <input
                  type="text"
                  value={profileForm.contact || ""}
                  onChange={(e) => updateField("contact", e.target.value)}
                  placeholder="09XXXXXXXXX"
                />
                {staffProfileErrors.contact && <span className="form-error">{staffProfileErrors.contact}</span>}
              </label>
              <label className="full">
                House Number/Street *
                <input
                  type="text"
                  value={profileForm.address || ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Enter house number and street"
                />
                {staffProfileErrors.address && <span className="form-error">{staffProfileErrors.address}</span>}
              </label>
              <label>
                Barangay *
                <input
                  type="text"
                  value={profileForm.barangay || ""}
                  onChange={(e) => updateField("barangay", e.target.value)}
                  placeholder="Enter barangay"
                />
                {staffProfileErrors.barangay && <span className="form-error">{staffProfileErrors.barangay}</span>}
              </label>
              <label>
                Landmark *
                <input
                  type="text"
                  value={profileForm.landmark || ""}
                  onChange={(e) => updateField("landmark", e.target.value)}
                  placeholder="Enter nearby landmark"
                />
                {staffProfileErrors.landmark && <span className="form-error">{staffProfileErrors.landmark}</span>}
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
                  {(staffServiceOptions || []).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      className={`skill-pill ${
                        Array.isArray(profileForm.skills) && profileForm.skills.includes(skill) ? "selected" : ""
                      }`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                {staffProfileErrors.skills && <span className="form-error">{staffProfileErrors.skills}</span>}
              </div>
              <div className="full">
                <p className="form-label">Availability *</p>
                <div className="schedule-grid">
                  <div className="day-grid">
                    {(weekdayOptions || []).map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`day-pill ${
                          Array.isArray(profileForm.availabilityDays) &&
                          profileForm.availabilityDays.includes(day)
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => toggleDay(day)}
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
                        value={profileForm.availabilityStart || ""}
                        onChange={(e) => updateField("availabilityStart", e.target.value)}
                      />
                    </label>
                    <label>
                      End
                      <input
                        type="time"
                        value={profileForm.availabilityEnd || ""}
                        onChange={(e) => updateField("availabilityEnd", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
                {staffProfileErrors.availability && <span className="form-error">{staffProfileErrors.availability}</span>}
              </div>
              <label>
                Experience (years) *
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={profileForm.experienceYears || ""}
                  onChange={(e) => updateField("experienceYears", e.target.value)}
                  placeholder="5"
                />
                {staffProfileErrors.experienceYears && (
                  <span className="form-error">{staffProfileErrors.experienceYears}</span>
                )}
              </label>
              <label>
                Preferred workload (jobs/day) *
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={profileForm.preferredWorkload || ""}
                  onChange={(e) => updateField("preferredWorkload", e.target.value)}
                  placeholder="3"
                />
                {staffProfileErrors.preferredWorkload && (
                  <span className="form-error">{staffProfileErrors.preferredWorkload}</span>
                )}
              </label>
              <label className="full">
                Experience details (optional)
                <textarea
                  rows={3}
                  value={profileForm.experienceNotes || ""}
                  onChange={(e) => updateField("experienceNotes", e.target.value)}
                  placeholder="Brief description of your experience..."
                />
              </label>
            </div>
            <div className="staff-blocking-modal__actions">
              <button
                className="btn primary"
                type="button"
                onClick={handleStaffProfileSave}
                disabled={staffProfileSaving}
              >
                {staffProfileSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isVisible("dashboard") &&
        (typeof renderDashboardSection === "function" ? renderDashboardSection(sectionContext) : null)}

        {isVisible("requests") &&
          (typeof renderRequestsSection === "function" ? renderRequestsSection(sectionContext) : (
          <section className="panel card list-board" id="requests">
            <div className="panel-header">
            <div>
              <p className="eyebrow">Requests</p>
            </div>
          </div>
          <div className="board-items">
            {requestsLoading ? (
              <div className="empty-state">Loading requests...</div>
            ) : (
              <div className="staff-requests-table">
                <div className="staff-requests-tabs">
                  <button
                    type="button"
                    className={`btn pill ${requestTab === "request" ? "primary" : "ghost"} staff-requests-tab`}
                    onClick={() => setRequestTab("request")}
                  >
                    Request
                    {incomingRequests.length > 0 && (
                      <span className="staff-requests-tab__count">{incomingRequests.length}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`btn pill ${requestTab === "pending" ? "primary" : "ghost"} staff-requests-tab`}
                    onClick={() => setRequestTab("pending")}
                  >
                    Pending
                    {attendanceRequests.length + cashConfirmationRequests.length > 0 && (
                      <span className="staff-requests-tab__count">
                        {attendanceRequests.length + cashConfirmationRequests.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`btn pill ${requestTab === "ongoing" ? "primary" : "ghost"} staff-requests-tab`}
                    onClick={() => setRequestTab("ongoing")}
                  >
                    Ongoing
                    {ongoingRequests.length > 0 && (
                      <span className="staff-requests-tab__count">{ongoingRequests.length}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`btn pill ${requestTab === "completed" ? "primary" : "ghost"} staff-requests-tab`}
                    onClick={() => setRequestTab("completed")}
                  >
                    Completed
                  </button>
                </div>
                <div className="staff-requests-controls">
                  <input
                    type="text"
                    placeholder="Search"
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                  />
                </div>
                {requestTab === "request" && (
                  <div className="staff-requests-list">
                    {incomingRequests.filter((r) => matchesSearch(r, normalizeSearch(requestSearch))).length === 0 ? (
                      <div className="staff-requests-empty">No incoming requests.</div>
                    ) : (
                      <div className="staff-requests-table-grid staff-requests-table-grid--3col">
                        <div className="staff-requests-list-head">
                          <span>Name/Services</span>
                          <span>Payment Status</span>
                          <span>Action</span>
                        </div>
                        {incomingRequests
                          .filter((r) => matchesSearch(r, normalizeSearch(requestSearch)))
                          .map((r) => {
                          const statusClass = getStatusLower(r);
                          const isPending = statusClass === "pending";
                          const isConfirmed = statusClass === "confirmed";
                          const isReserved = statusClass === "reserved";
                          const customerName = r.householderName || r.customer || "Customer";
                          const customerAvatar = getCustomerAvatar(r);
                          const serviceList = Array.isArray(r.serviceTypes)
                            ? r.serviceTypes
                            : String(r.serviceType || r.service || "")
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean);
                          const baseServiceLabel = serviceList[0] || "Service request";
                          const serviceLabel = serviceList.length > 1 ? `${baseServiceLabel} etc..` : baseServiceLabel;
                          const timeLabel = formatSchedule(r);
                          const assignedId = String(r.housekeeperId || "").trim();
                          const assignedName = String(r.housekeeperName || "").trim();
                          const assignedRole = String(r.housekeeperRole || "").trim();
                          const paymentStatusKey = getPaymentStatusKey(r);
                          const paymentMethodKey = getPaymentMethodKey(r);
                          const paymentLabel = (() => {
                            if (isPaid(r)) return "Paid";
                            if (isCashReserved(r)) return "Reserved";
                            if (paymentStatusKey) return paymentStatusKey.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
                            if (paymentMethodKey) return "Pending";
                            return "Unpaid";
                          })();
                          const paymentTone = (() => {
                            if (isPaid(r)) return "green";
                            if (isCashReserved(r)) return "amber";
                            if (paymentStatusKey) return "blue";
                            if (paymentMethodKey) return "blue";
                            return "amber";
                          })();
                          const canActOnThis = !assignedId || (Boolean(currentUserId) && assignedId === currentUserId);
                          const canConfirm = isStaffManager && isPending;
                          const canAccept =
                            ((isStaffManager && (isPending || isConfirmed || isReserved)) ||
                              (isHousekeeper && (isPending || isConfirmed || isReserved))) &&
                            canActOnThis;
                          const canDecline =
                            ((isStaffManager && (isPending || isConfirmed || isReserved)) ||
                              (isHousekeeper && (isPending || isConfirmed || isReserved))) &&
                            canActOnThis;

                          return (
                            <div
                              key={r.id}
                              className="staff-requests-rowline staff-requests-rowline--request is-clickable"
                              role="button"
                              tabIndex={0}
                              onClick={() => openRequestModal(r)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openRequestModal(r);
                                }
                              }}
                            >
                              <div className="row-main">
                                <div className="avatar-pill alt">
                                  {customerAvatar.url ? (
                                    <img src={customerAvatar.url} alt={customerAvatar.name} />
                                  ) : (
                                    customerAvatar.initials
                                  )}
                                </div>
                                <div>
                                  <strong>{serviceLabel}</strong>
                                  <p className="muted small">
                                    {customerName} - {r.location || "Location"}
                                  </p>
                                  {timeLabel && <p className="tiny muted">{timeLabel}</p>}
                                </div>
                              </div>
                              <div className="row-meta">
                                <span
                                  className={`pill soft ${paymentTone}`}
                                >
                                  {paymentLabel}
                                </span>
                              </div>
                              <div className="row-meta actions">
                                <button
                                  className="btn ghost"
                                  type="button"
                                  disabled={!canDecline}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    runWithConfirm("Decline this request?", () => {
                                      handleRequestAction(r, "DECLINED");
                                    });
                                  }}
                                >
                                  Decline
                                </button>
                                <button
                                  className="btn primary"
                                  type="button"
                                  disabled={!(canConfirm || canAccept)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    runWithConfirm(
                                      canConfirm ? "Confirm this request?" : "Accept this request?",
                                      () => handleRequestAction(r, canConfirm ? "CONFIRMED" : "ACCEPTED")
                                    );
                                  }}
                                >
                                  {canConfirm ? "Confirm" : "Accept"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {requestTab === "pending" && (
                  <div className="staff-requests-list">
                    {[...attendanceRequests, ...cashConfirmationRequests]
                      .filter((r) => matchesSearch(r, normalizeSearch(requestSearch))).length === 0 ? (
                      <div className="staff-requests-empty">No pending requests.</div>
                    ) : (
                      <div className="staff-requests-table-grid staff-requests-table-grid--3col">
                        <div className="staff-requests-list-head">
                          <span>Name/Services</span>
                          <span>Status</span>
                          <span>Action</span>
                        </div>
                        {[...attendanceRequests, ...cashConfirmationRequests]
                          .filter((r) => matchesSearch(r, normalizeSearch(requestSearch)))
                          .map((r) => {
                            const customerName = r.householderName || r.customer || "Customer";
                            const customerAvatar = getCustomerAvatar(r);
                            const serviceList = Array.isArray(r.serviceTypes)
                              ? r.serviceTypes
                              : String(r.serviceType || r.service || "")
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean);
                            const baseServiceLabel = serviceList[0] || "Service request";
                            const serviceLabel =
                              serviceList.length > 1 ? `${baseServiceLabel} etc..` : baseServiceLabel;
                            const timeLabel = formatSchedule(r);
                            const staffArrived = Boolean(r.staffArrived);
                            const customerConfirmed = Boolean(r.customerArrivalConfirmed);

                            return (
                              <div
                                key={r.id}
                                className="staff-requests-rowline is-clickable"
                                role="button"
                              tabIndex={0}
                              onClick={() => openRequestModal(r)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openRequestModal(r);
                                }
                              }}
                            >
                              <div className="row-main">
                                <div className="avatar-pill alt">
                                  {customerAvatar.url ? (
                                    <img src={customerAvatar.url} alt={customerAvatar.name} />
                                  ) : (
                                    customerAvatar.initials
                                  )}
                                </div>
                                <div>
                                  <strong>{serviceLabel}</strong>
                                  <p className="muted small">{customerName}</p>
                                  {timeLabel && <p className="tiny muted">{timeLabel}</p>}
                                </div>
                              </div>
                              <div className="row-meta">
                                {staffArrived ? (
                                  <span className={`pill soft ${customerConfirmed ? "green" : "amber"}`}>
                                    {customerConfirmed ? "Customer confirmed" : "Awaiting confirmation"}
                                  </span>
                                ) : (
                                  <span className="pill soft amber">Not arrived</span>
                                )}
                              </div>
                              <div className="row-meta actions">
                                {!staffArrived && (
                                  <button
                                    className="btn ghost"
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      runWithConfirm("Mark staff arrival for this request?", () => {
                                        triggerArrivedClick(r);
                                        handleStaffArrived?.(r);
                                      });
                                    }}
                                  >
                                    Mark arrived
                                  </button>
                                )}
                                {isCashReserved(r) && staffArrived && (
                                  <button
                                    className="btn ghost"
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCashConfirm(r);
                                    }}
                                  >
                                    Mark payment
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {requestTab === "ongoing" && (
                  <div className="staff-requests-list">
                    {ongoingRequests.filter((r) => matchesSearch(r, normalizeSearch(requestSearch))).length === 0 ? (
                      <div className="staff-requests-empty">No ongoing tasks.</div>
                    ) : (
                      <div className="staff-requests-table-grid staff-requests-table-grid--3col">
                        <div className="staff-requests-list-head">
                          <span>Name/Services</span>
                          <span>Status</span>
                          <span>Action</span>
                        </div>
                        {ongoingRequests
                          .filter((r) => matchesSearch(r, normalizeSearch(requestSearch)))
                          .map((r) => {
                            const customerName = r.householderName || r.customer || "Customer";
                            const customerAvatar = getCustomerAvatar(r);
                            const serviceList = Array.isArray(r.serviceTypes)
                              ? r.serviceTypes
                              : String(r.serviceType || r.service || "")
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean);
                            const baseServiceLabel = serviceList[0] || "Service request";
                            const serviceLabel =
                              serviceList.length > 1 ? `${baseServiceLabel} etc..` : baseServiceLabel;
                            const timeLabel = formatSchedule(r);
                            const hasPaymentMethod = Boolean(paymentMethodByRequestId?.[r.id] || r.paymentMethod);
                            const canComplete = hasPaymentMethod && Boolean(r.customerArrivalConfirmed);
                            return (
                              <div
                                key={r.id}
                                className="staff-requests-rowline is-clickable"
                                role="button"
                                tabIndex={0}
                                onClick={() => openRequestModal(r)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openRequestModal(r);
                                  }
                                }}
                              >
                                <div className="row-main">
                                  <div className="avatar-pill alt">
                                    {customerAvatar.url ? (
                                      <img src={customerAvatar.url} alt={customerAvatar.name} />
                                    ) : (
                                      customerAvatar.initials
                                    )}
                                  </div>
                                  <div>
                                    <strong>{serviceLabel}</strong>
                                    <p className="muted small">{customerName}</p>
                                    {timeLabel && <p className="tiny muted">{timeLabel}</p>}
                                  </div>
                                </div>
                                <div className="row-meta">
                                  <span className="pill soft blue">In progress</span>
                                </div>
                                <div className="row-meta actions">
                                  <button
                                    className="btn primary"
                                    type="button"
                                    disabled={!canComplete}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveRequest(r);
                                      openCompleteConfirm();
                                    }}
                                  >
                                    Complete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
                {requestTab === "completed" && (
                  <div className="staff-requests-list">
                    {activeHistoryList.length === 0 ? (
                      <div className="staff-requests-empty">No completed services yet.</div>
                    ) : (
                      <div className="staff-requests-table-grid staff-requests-table-grid--2col">
                        <div className="staff-requests-list-head staff-requests-list-head--two">
                          <span>Name/Services</span>
                          <span>Action</span>
                        </div>
                        {completedPaged.map((h) => {
                          const relatedRequest = (requests || []).find(
                            (req) => String(req?.id || "") === String(h.id || "")
                          );
                          const canOpen = Boolean(relatedRequest);
                          return (
                        <div
                          key={h.id}
                          className={`staff-requests-rowline staff-requests-rowline--two ${
                            canOpen ? "is-clickable" : ""
                          }`}
                          role={canOpen ? "button" : undefined}
                          tabIndex={canOpen ? 0 : undefined}
                          onClick={() => {
                            if (relatedRequest) openRequestModal(relatedRequest);
                          }}
                          onKeyDown={(e) => {
                            if (!relatedRequest) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openRequestModal(relatedRequest);
                            }
                          }}
                        >
                          <div>
                            <strong>{h.job}</strong>
                            <p className="muted small">{h.date}</p>
                            <p className="tiny muted">{h.payout}</p>
                            <p className="tiny muted">{h.payment}</p>
                          </div>
                          <div className="row-meta actions">
                            <button
                              className="btn ghost"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                runWithConfirm("Archive this completed request?", () => {
                                  archiveHistoryItem(h);
                                });
                              }}
                            >
                              Archive
                            </button>
                          </div>
                        </div>
                          );
                        })}
                        {completedTotalPages > 1 && (
                          <div className="staff-requests-pagination">
                            <button
                              className="btn pill ghost"
                              type="button"
                              disabled={completedCurrentPage <= 1}
                              onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                            >
                              Prev
                            </button>
                            <span className="muted small">
                              Page {completedCurrentPage} of {completedTotalPages}
                            </span>
                            <button
                              className="btn pill ghost"
                              type="button"
                              disabled={completedCurrentPage >= completedTotalPages}
                              onClick={() => setCompletedPage((p) => Math.min(completedTotalPages, p + 1))}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      ))}
      

      {isVisible("notifications") &&
        (typeof renderNotificationsSection === "function"
          ? renderNotificationsSection(sectionContext)
          : null)}

      {showRequestModal && activeRequest && (
        <div className="staff-request-modal" role="dialog" aria-modal="true" aria-label="Request details">
          <div className="staff-request-modal__backdrop" onClick={closeRequestModal} />
          <div className="staff-request-modal__panel staff-track-modal staff-track-modal--details">
            <div className="staff-track-modal__hero">
              <div className="staff-track-modal__icon">
                <i className="fas fa-receipt"></i>
              </div>
              <h3>Request details</h3>
            </div>
            <div className="staff-request-modal__header">
              <button className="icon-btn" type="button" onClick={closeRequestModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="staff-request-modal__body">

              <div className="staff-request-grid">
                <div>
                  <small>Request ID</small>
                  <strong>{activeRequest.requestId || activeRequest.id || "--"}</strong>
                </div>
                <div>
                  <small>Customer</small>
                  <strong>{activeRequest.householderName || activeRequest.customer || "Customer"}</strong>
                </div>
                <div>
                  <small>Email</small>
                  <strong>{activeRequest.customerEmail || "--"}</strong>
                </div>
                <div>
                  <small>Schedule</small>
                  <strong>{formatSchedule(activeRequest)}</strong>
                </div>
                <div>
                  <small>Booked at</small>
                  <strong>{formatBookedAt(activeRequest)}</strong>
                </div>
                <div>
                  <small>Address</small>
                  <strong>{activeRequest.location || activeRequest.address || "--"}</strong>
                </div>
                <div>
                  <small>Payment</small>
                  <strong>{formatPaymentMethodLabel(activeRequest.paymentMethod || activeRequest.paidVia)}</strong>
                </div>
                {requestTab !== "completed" && (
                  <div>
                    <small>Payment status</small>
                    <strong>
                      {activeRequest.paymentStatus ||
                        (activeRequest.paidAt || activeRequest.cashReceivedAt ? "PAID" : "--")}
                    </strong>
                  </div>
                )}
                {activeRequest?.staffArrived && (
                  <div>
                    <small>Arrival</small>
                    <strong>
                      <span className="pill soft green arrived-pill arrived-pill--pulse">
                        <i className="fas fa-check-circle" aria-hidden="true"></i>{" "}
                        {activeRequest.customerArrivalConfirmed
                          ? "Confirmed by customer"
                          : "Awaiting customer confirmation"}
                      </span>
                    </strong>
                  </div>
                )}
                <div>
                  <small>Total</small>
                  <strong>
                    {typeof activeRequest.totalPrice === "number"
                      ? `PHP ${Math.round(activeRequest.totalPrice).toLocaleString()}`
                      : activeRequest.payout || "--"}
                  </strong>
                </div>
                <div className="full">
                  <small>Services</small>
                  <strong>
                    {Array.isArray(activeRequest.serviceTypes) && activeRequest.serviceTypes.length > 0
                      ? activeRequest.serviceTypes.join(", ")
                      : activeRequest.serviceType || "--"}
                  </strong>
                </div>
              </div>
              {activeRequest.notes && (
                <div className="staff-request-notes">
                  <small>Notes</small>
                  <p>{activeRequest.notes}</p>
                </div>
              )}
              {Array.isArray(activeRequest.photos) && activeRequest.photos.length > 0 && (
                <div className="staff-request-photos">
                  {activeRequest.photos.slice(0, 6).map((src) => (
                    <img key={src} src={src} alt="Request" loading="lazy" />
                  ))}
                </div>
              )}
            </div>
            <div className="staff-request-modal__footer">
              <button className="btn ghost" type="button" onClick={closeRequestModal}>
                Close
              </button>
              {(() => {
                const hasPaymentMethod = Boolean(
                  paymentMethodByRequestId?.[activeRequest.id] || activeRequest.paymentMethod
                );
                const isArrivalConfirmed = Boolean(activeRequest.customerArrivalConfirmed);
                const statusLower = String(activeRequest.status || "").toLowerCase();
                const paymentStatus = String(activeRequest.paymentStatus || "").toUpperCase();
                const paymentMethod = String(
                  activeRequest.paymentMethod || activeRequest.paidVia || ""
                ).toUpperCase();
                const cashReserved = paymentMethod === "CASH_ON_HAND" && paymentStatus === "RESERVED";
                const canComplete =
                  statusLower === "accepted" && hasPaymentMethod && isArrivalConfirmed && !cashReserved;
                const showComplete = requestTab === "ongoing";
                return (
                  <>
              {String(activeRequest.status || "").toLowerCase() === "accepted" &&
                String(activeRequest.paymentStatus || "").toUpperCase() === "RESERVED" &&
                String(activeRequest.paymentMethod || activeRequest.paidVia || "").toUpperCase() === "CASH_ON_HAND" &&
                activeRequest.staffArrived && (
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => {
                      openCashConfirm(activeRequest);
                    }}
                  >
                    Mark payment received
                  </button>
                )}
              {showComplete && (
                <button
                  className="btn primary"
                  type="button"
                  onClick={openCompleteConfirm}
                  disabled={!canComplete}
                >
                  Complete
                </button>
              )}
              {String(activeRequest.status || "").toLowerCase() === "accepted" &&
                !activeRequest.staffArrived && (
                  <button
                    className={`btn ghost mark-arrived-btn ${
                      String(activeRequest.id || "") === arrivedClickId ? "is-clicked" : ""
                    }`}
                    type="button"
                    onClick={() => {
                      runWithConfirm("Mark staff arrival for this request?", () => {
                        triggerArrivedClick(activeRequest);
                        handleStaffArrived?.(activeRequest);
                      });
                    }}
                  >
                    Mark arrived
                  </button>
                )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showNotificationModal && activeNotification && (
        <div className="staff-request-modal" role="dialog" aria-modal="true" aria-label="Notification details">
          <div className="staff-request-modal__backdrop" onClick={closeNotificationModal} />
          <div className="staff-request-modal__panel staff-track-modal staff-track-modal--details">
            <div className="staff-track-modal__hero">
              <div className="staff-track-modal__icon">
                <i className="fas fa-bell"></i>
              </div>
              <h3>Notification details</h3>
            </div>
            <div className="staff-request-modal__header">
              <button className="icon-btn" type="button" onClick={closeNotificationModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="staff-request-modal__body">
              <div className="staff-request-grid">
                <div>
                  <small>Title</small>
                  <strong>{activeNotification.title || "Notification"}</strong>
                </div>
                  <div>
                    <small>Time</small>
                    <strong>
                      {activeNotification.createdAt ? formatNotificationWhen(activeNotification.createdAt) : "--"}
                    </strong>
                  </div>
                {activeNotification.requestId && (
                  <div className="full">
                    <small>Request ID</small>
                    <strong>{activeNotification.requestId}</strong>
                  </div>
                )}
                <div className="full">
                  <small>Message</small>
                  <strong>
                    {formatNotificationBody(activeNotification.body || activeNotification.message || "—")}
                  </strong>
                </div>
              </div>
            </div>
            <div className="staff-request-modal__footer">
              <button className="btn ghost" type="button" onClick={closeNotificationModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteConfirm && activeRequest && (
        <div className="staff-request-modal" role="dialog" aria-modal="true" aria-label="Complete service">
          <div className="staff-request-modal__backdrop" onClick={closeCompleteConfirm} />
          <div className="staff-request-modal__panel">
            <div className="staff-request-modal__body">
              <h3>Done the service?</h3>
              <p className="muted small">
                Confirming will complete the request and send a rating and feedback to the customer.
              </p>
            </div>
            <div className="staff-request-modal__footer">
              <button className="btn ghost" type="button" onClick={closeCompleteConfirm}>
                Cancel
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  closeCompleteConfirm();
                  if (typeof handleComplete === "function") {
                    Promise.resolve(handleComplete(activeRequest)).then(() => {
                      setCompletionToast("Task completed. Customer has been asked for feedback.");
                    });
                  }
                  closeRequestModal();
                }}
              >
                Yes, complete
              </button>
            </div>
          </div>
        </div>
      )}

      {isVisible("settings") &&
        (typeof renderSettingsSection === "function" ? renderSettingsSection(sectionContext) : null)}

      {showCashConfirm && cashConfirmTarget && (
        <div className="staff-request-modal" role="dialog" aria-modal="true" aria-label="Confirm payment received">
          <div className="staff-request-modal__backdrop" onClick={closeCashConfirm} />
          <div className="staff-request-modal__panel">
            <div className="staff-request-modal__body">
              <h3>Confirm payment received?</h3>
              <p className="muted small">
                Use this only after collecting the cash on-site. This will confirm the booking as paid.
              </p>
            </div>
            <div className="staff-request-modal__footer">
              <button className="btn ghost" type="button" onClick={closeCashConfirm}>
                Cancel
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  if (typeof handleCashPaymentReceived === "function") {
                    Promise.resolve(handleCashPaymentReceived(cashConfirmTarget)).then(() => {
                      setCompletionToast("Cash payment received. Booking confirmed.");
                    });
                  }
                  closeCashConfirm();
                  closeRequestModal();
                }}
              >
                Yes, confirm payment
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState.open && (
        <div className="staff-request-modal" role="dialog" aria-modal="true" aria-label={confirmState.title}>
          <div className="staff-request-modal__backdrop" onClick={closeConfirmModal} />
          <div className="staff-request-modal__panel">
            <div className="staff-request-modal__body">
              <h3>{confirmState.title}</h3>
              <p className="muted small">{confirmState.message}</p>
            </div>
            <div className="staff-request-modal__footer">
              <button className="btn ghost" type="button" onClick={closeConfirmModal}>
                Cancel
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  const action = confirmState.onConfirm;
                  closeConfirmModal();
                  if (typeof action === "function") action();
                }}
              >
                Yes, proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {isVisible("history") &&
        (typeof renderHistorySection === "function"
          ? renderHistorySection({
              requests,
              requestsLoading,
              notifications,
              currentUserId,
              isHousekeeper,
              staffServiceOptions,
              formatNotificationWhen,
              formatNotificationBody,
              openRequestModal,
              openNotificationModal
            })
          : null)}

      {isVisible("schedule") &&
        (typeof renderScheduleSection === "function" ? renderScheduleSection(sectionContext) : null)}
    </main>
  );
}

export default StaffMain;

