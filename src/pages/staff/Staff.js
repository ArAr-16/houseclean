import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo.png";
import "./Staff.css";
import { auth, rtdb } from "../../firebase";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import {
  equalTo,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref as rtdbRef,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate
} from "firebase/database";
import { logAdminHistory } from "../../utils/adminHistory";
import BroomLoader from "../../components/BroomLoader";
import StaffHeader from "./components/StaffHeader";
import StaffSidebar from "./components/StaffSidebar";
import StaffMain from "./components/StaffMain";

const STAFF_SERVICE_OPTIONS = [
  "House Cleaning",
  "Deep Cleaning",
  "Kitchen Cleaning",
  "Bathroom Cleaning",
  "Bedroom Cleaning",
  "Outdoor Cleaning",
  "Appliance Cleaning"
];

const WEEKDAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_CITY = "Dagupan City";
const DEFAULT_COUNTRY = "Philippines";

function Staff({
  visibleSections,
  renderDashboardSection,
  renderRequestsSection,
  renderNotificationsSection,
  renderScheduleSection,
  renderSettingsSection,
  renderHistorySection
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [paymentMethodByRequestId, setPaymentMethodByRequestId] = useState({});
  const [attendanceEntries, setAttendanceEntries] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [customerAvatarSeeds, setCustomerAvatarSeeds] = useState({});
  const [customerAddressById, setCustomerAddressById] = useState({});
  const [staffProfileForm, setStaffProfileForm] = useState(null);
  const [staffProfileErrors, setStaffProfileErrors] = useState({});
  const [staffProfileSaving, setStaffProfileSaving] = useState(false);
  const [profileToast, setProfileToast] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const popoverRef = useRef(null);

  // Apply saved theme immediately to avoid flash on loader
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("theme");
    const root = document.documentElement;
    if (saved === "dark") root.classList.add("dark-mode");
    else if (saved === "light") root.classList.remove("dark-mode");
  }

  useEffect(() => {
    let stopProfile;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setProfileLoading(true);
      if (stopProfile) {
        stopProfile();
        stopProfile = undefined;
      }
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }
      const userRef = rtdbRef(rtdb, `Users/${user.uid}`);
      stopProfile = onValue(
        userRef,
        (snap) => {
          const data = snap.val();
          if (data) {
            setProfile({ id: user.uid, email: user.email, ...data });
            if (!data.avatarSeed) {
              rtdbUpdate(rtdbRef(rtdb, `Users/${user.uid}`), { avatarSeed: "housekeeper" }).catch(() => {});
            }
          } else {
            setProfile({ id: user.uid, email: user.email });
            rtdbUpdate(rtdbRef(rtdb, `Users/${user.uid}`), { avatarSeed: "housekeeper" }).catch(() => {});
          }
          setProfileLoading(false);
        },
        () => {
          setProfile({ id: user.uid, email: user.email });
          setProfileLoading(false);
        }
      );
    });

    return () => {
      if (stopProfile) stopProfile();
      unsubscribeAuth();
    };
  }, []);

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!menuOpen) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [menuOpen]);

  const displayName =
    (profile?.fullName || profile?.name || profile?.email || "Staff guest").trim();
  const initials = (displayName || "ST").slice(0, 2).toUpperCase();
  const status = (profile?.status || "pending").toLowerCase();
  const statusClass =
    status === "active" ? "active" : status === "disabled" ? "disabled" : "pending";
  const roleLabel = profileLoading ? "Connecting..." : profile?.role || "Housekeeper";
  const isStaffRole = ["housekeeper", "staff"].includes((profile?.role || "").toLowerCase());
  const myRole = String(profile?.role || "").toLowerCase();
  const isStaffManager = myRole === "staff";
  const isHousekeeper = myRole === "housekeeper";
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

  const avatarUrl = createAvatarDataUri(profile?.avatarSeed || "housekeeper");
  const showGuest = !profile && !profileLoading;
  const formatAvailabilityLabel = (days, start, end) => {
    if (!Array.isArray(days) || days.length === 0 || !start || !end) return "";
    const to12Hour = (timeValue) => {
      const [hhRaw, mmRaw] = String(timeValue).split(":");
      const hh = Number(hhRaw);
      const mm = Number(mmRaw);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return timeValue;
      const suffix = hh >= 12 ? "PM" : "AM";
      const hour = ((hh + 11) % 12) + 1;
      return `${hour}:${String(mm).padStart(2, "0")} ${suffix}`;
    };
    return `${days.join(", ")} ${to12Hour(start)}-${to12Hour(end)}`;
  };

  const buildStaffProfileForm = (data, useDefaults = true) => {
    const fullName = String(data?.fullName || data?.name || "").trim();
    const [first, ...rest] = fullName.split(" ").filter(Boolean);
    const lastFromName = rest.join(" ");
    const rawSkills = Array.isArray(data?.skills) ? data.skills : [];
    const safeSkills = useDefaults && rawSkills.length === 0 ? [STAFF_SERVICE_OPTIONS[0]] : rawSkills;
    const rawDays = Array.isArray(data?.availabilityDays) ? data.availabilityDays : [];
    const safeDays = useDefaults && rawDays.length === 0 ? WEEKDAY_OPTIONS.slice(0, 6) : rawDays;
    return {
      profileId: data?.id || auth.currentUser?.uid || "",
      firstName: String(data?.firstName || first || "").trim(),
      lastName: String(data?.lastName || lastFromName || "").trim(),
      email: String(data?.email || auth.currentUser?.email || "").trim(),
      contact: String(data?.contact || data?.phone || "").trim(),
      address: String(data?.street || data?.address || "").trim(),
      barangay: String(data?.barangay || "").trim(),
      landmark: String(data?.landmark || "").trim(),
      municipality: DEFAULT_CITY,
      province: DEFAULT_COUNTRY,
      avatarSeed: String(data?.avatarSeed || "housekeeper").trim(),
      skills: safeSkills,
      availabilityDays: safeDays,
      availabilityStart: String(data?.availabilityStart || (useDefaults ? "09:00" : "")),
      availabilityEnd: String(data?.availabilityEnd || (useDefaults ? "17:00" : "")),
      previousPosition: String(data?.previousPosition || "").trim(),
      experienceNotes: String(data?.experienceNotes || ""),
      rating: Number(data?.rating || 0) || 0
    };
  };

  useEffect(() => {
    if (profileLoading || !profile) return;
    if (staffProfileForm?.profileId === profile.id) return;
    setStaffProfileForm(buildStaffProfileForm(profile, true));
  }, [profile, profileLoading, staffProfileForm?.profileId]);

  useEffect(() => {
    if (!profileToast) return undefined;
    const timer = setTimeout(() => setProfileToast(""), 3000);
    return () => clearTimeout(timer);
  }, [profileToast]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setVerificationStatus("idle");
      setVerificationMessage("");
      return;
    }
    if (currentUser.emailVerified) {
      setVerificationStatus("verified");
      setVerificationMessage("Verified email");
    } else {
      setVerificationStatus("sent");
      setVerificationMessage("Please verify your email before completing your first staff login.");
    }
  }, [profile?.id]);

  const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
  const validateStaffProfile = (form) => {
    const errors = {};
    const alpha = /^[A-Za-z ]+$/;
    const emailRegex = /^\S+@\S+\.\S{2,}$/;
    const phoneRegex = /^09\d{9}$/;
    const firstName = String(form?.firstName || "").trim();
    const lastName = String(form?.lastName || "").trim();
    const email = String(form?.email || "").trim().toLowerCase();
    const contactRaw = String(form?.contact || "").trim();
    const contact = normalizePhone(contactRaw);
    const address = String(form?.address || "").trim();
    const barangay = String(form?.barangay || "").trim();
    const landmark = String(form?.landmark || "").trim();
    const skills = Array.isArray(form?.skills) ? form.skills : [];
    const days = Array.isArray(form?.availabilityDays) ? form.availabilityDays : [];
    const start = String(form?.availabilityStart || "").trim();
    const end = String(form?.availabilityEnd || "").trim();

    if (!firstName || firstName.length < 2 || !alpha.test(firstName)) {
      errors.firstName = "First name is required (letters only, min 2 characters).";
    }
    if (!lastName || lastName.length < 2 || !alpha.test(lastName)) {
      errors.lastName = "Last name is required (letters only, min 2 characters).";
    }
    if (!email || !emailRegex.test(email)) {
      errors.email = "Enter a valid email (e.g., maria@example.com).";
    }
    if (!contact || !phoneRegex.test(contact)) {
      errors.contact = "Use PH mobile format: 09XXXXXXXXX.";
    }
    if (!address || address.length < 5) {
      errors.address = "House number/street must be at least 5 characters.";
    }
    if (!barangay) {
      errors.barangay = "Barangay is required.";
    }
    if (!landmark) {
      errors.landmark = "Landmark is required.";
    }
    if (skills.length === 0) {
      errors.skills = "Select at least one service capability.";
    }
    if (days.length === 0 || !start || !end) {
      errors.availability = "Select at least one day and a time range.";
    } else if (start >= end) {
      errors.availability = "Start time must be earlier than end time.";
    }
    return errors;
  };

  const isStaffProfileComplete = (form) => Object.keys(validateStaffProfile(form)).length === 0;
  const rawProfileForm = profile ? buildStaffProfileForm(profile, false) : null;
  const isProfileRecordComplete = rawProfileForm ? isStaffProfileComplete(rawProfileForm) : false;
  const showProfilePrompt = Boolean(isStaffRole && !profileLoading && profile && !isProfileRecordComplete);
  const requiresStaffEmailVerification = Boolean(
    showProfilePrompt && isHousekeeper && auth.currentUser && !auth.currentUser.emailVerified
  );

  const handleResendVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || verificationBusy) return;
    try {
      setVerificationBusy(true);
      await sendEmailVerification(currentUser, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false
      });
      setVerificationStatus("sent");
      setVerificationMessage("Verification link sent. Please check your email inbox.");
    } catch (err) {
      console.error("Staff verification resend error:", err);
      setVerificationStatus("idle");
      setVerificationMessage("We couldn't resend the verification link right now. Please try again.");
    } finally {
      setVerificationBusy(false);
    }
  };

  const handleCheckVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || verificationBusy) return;
    try {
      setVerificationBusy(true);
      await currentUser.reload();
      if (auth.currentUser?.emailVerified) {
        setVerificationStatus("verified");
        setVerificationMessage("Verified email");
        setProfile((prev) => (prev ? { ...prev, emailVerified: true } : prev));
      } else {
        setVerificationStatus("sent");
        setVerificationMessage("Not verified yet. Open the link from your email, then check again.");
      }
    } catch (err) {
      console.error("Staff verification check error:", err);
      setVerificationMessage("We couldn't check your verification status right now. Please try again.");
    } finally {
      setVerificationBusy(false);
    }
  };

  const handleStaffProfileSave = async () => {
    if (!staffProfileForm || showGuest || !isStaffRole) return;
    const errors = validateStaffProfile(staffProfileForm);
    if (requiresStaffEmailVerification) {
      errors.email = "Verify your email before completing your first staff login.";
    }
    setStaffProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      firstName: staffProfileForm.firstName.trim(),
      lastName: staffProfileForm.lastName.trim(),
      fullName: `${staffProfileForm.firstName.trim()} ${staffProfileForm.lastName.trim()}`.trim(),
      email: staffProfileForm.email.trim(),
      contact: normalizePhone(staffProfileForm.contact),
      street: staffProfileForm.address.trim(),
      address: staffProfileForm.address.trim(),
      barangay: String(staffProfileForm.barangay || "").trim(),
      landmark: String(staffProfileForm.landmark || "").trim(),
      municipality: DEFAULT_CITY,
      province: DEFAULT_COUNTRY,
      location: [
        staffProfileForm.address.trim(),
        String(staffProfileForm.barangay || "").trim(),
        String(staffProfileForm.landmark || "").trim(),
        DEFAULT_CITY,
        DEFAULT_COUNTRY
      ]
        .filter(Boolean)
        .join(", "),
      avatarSeed: String(staffProfileForm.avatarSeed || profile?.avatarSeed || "housekeeper").trim(),
      skills: staffProfileForm.skills,
      availabilityDays: staffProfileForm.availabilityDays,
      availabilityStart: staffProfileForm.availabilityStart,
      availabilityEnd: staffProfileForm.availabilityEnd,
      availability: formatAvailabilityLabel(
        staffProfileForm.availabilityDays,
        staffProfileForm.availabilityStart,
        staffProfileForm.availabilityEnd
      ),
      previousPosition: String(staffProfileForm.previousPosition || "").trim(),
      experienceNotes: String(staffProfileForm.experienceNotes || "").trim(),
      rating: Number(profile?.rating || staffProfileForm.rating || 0) || 0,
      profileComplete: true
    };

    try {
      setStaffProfileSaving(true);
      const uid = auth.currentUser?.uid || profile?.id;
      if (!uid) return;
      await rtdbUpdate(rtdbRef(rtdb, `Users/${uid}`), payload);
      setProfileToast("Profile saved successfully.");
    } finally {
      setStaffProfileSaving(false);
    }
  };

  const handleStaffProfileReset = () => {
    if (!profile) return;
    setStaffProfileForm(buildStaffProfileForm(profile));
    setStaffProfileErrors({});
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

  // Ensure saved theme applies on this route (no FloatingThemeToggle here)
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const root = document.documentElement;
    if (saved === "dark") root.classList.add("dark-mode");
    if (saved === "light") root.classList.remove("dark-mode");
  }, []); 
 
  // Live Requests feed from RTDB
  useEffect(() => {
    if (profileLoading) return;
    setRequestsLoading(true);

    const myId = profile?.id || auth.currentUser?.uid || "";
    const myRoleLocal = String(profile?.role || "").trim().toLowerCase();
    const isStaffLocal = ["housekeeper", "staff"].includes(myRoleLocal);

    if (!isStaffLocal || !myId) {
      setRequests([]);
      setRequestsLoading(false);
      return;
    }

    const q =
      myRoleLocal === "housekeeper"
        ? rtdbQuery(rtdbRef(rtdb, "ServiceRequests"), orderByChild("housekeeperId"), equalTo(myId))
        : rtdbQuery(rtdbRef(rtdb, "ServiceRequests"), orderByChild("createdAt"));
    const stop = onValue(
      q,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, data]) => ({
          id,
          requestId: data?.requestId || id,
          ...(data || {})
        }));
        list.sort((a, b) => {
          const aMs = Number(a.createdAt ?? a.timestamp ?? 0) || 0;
          const bMs = Number(b.createdAt ?? b.timestamp ?? 0) || 0;
          return bMs - aMs;
        });
        setRequests(list);
        setRequestsLoading(false);
      },
      () => setRequestsLoading(false)
    );
    return () => stop();
  }, [profile?.id, profile?.role, profileLoading]);

  useEffect(() => {
    const uid = auth.currentUser?.uid || profile?.id || "";
    if (!uid) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    const notifRef = rtdbRef(rtdb, `UserNotifications/${uid}`);
    const stop = onValue(
      notifRef,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, data]) => ({
          id,
          ...(data || {}),
          createdAt: data?.createdAt || 0
        }));
        list.sort((a, b) => (Number(b.createdAt || 0) || 0) - (Number(a.createdAt || 0) || 0));
        setNotifications(list.slice(0, 25));
        setNotificationsLoading(false);
      },
      () => setNotificationsLoading(false)
    );

    return () => stop();
  }, [profile?.id]);

  const tasks = useMemo(() => { 
    const formatScheduleLabel = (req) => {
      const startDate = req?.startDate || "";
      const combined = `${req?.date || ""} ${req?.time || ""}`.trim();
      const raw = String(startDate || combined || "").trim();
      if (!raw) return "Scheduled";
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
    return (requests || []) 
      .filter((r) => {
        const status = String(r.status || "").toLowerCase();
        const isActive = ["accepted", "scheduled"].includes(status);
        const isCompleted = status === "completed" || Boolean(r.completedAt);
        return isActive && !isCompleted;
      }) 
      .map((r) => ({ 
        id: r.id, 
        title: `${r.serviceType || r.service || "Service"} - ${r.location || "Location"}`, 
        time: formatScheduleLabel(r), 
        status: String(r.status || "scheduled").toLowerCase() 
      })); 
  }, [requests]); 

  useEffect(() => {
    if (!profile?.id) {
      setAttendanceEntries([]);
      setAttendanceLoading(false);
      return;
    }
    setAttendanceLoading(true);
    const myId = profile?.id || auth.currentUser?.uid || "";
    const entries = (requests || [])
      .filter((r) => {
        if (!r?.staffArrivedAt) return false;
        if (isHousekeeper) {
          const assignedId = String(r.housekeeperId || "").trim();
          return Boolean(myId) && assignedId === myId;
        }
        return true;
      })
      .map((r) => ({
        id: r.id,
        at: Number(r.staffArrivedAt) || 0,
        service: r.serviceType || r.service || "Service"
      }))
      .sort((a, b) => (Number(b.at || 0) || 0) - (Number(a.at || 0) || 0));
    setAttendanceEntries(entries);
    setAttendanceLoading(false);
  }, [requests, profile?.id, isHousekeeper]);

  const completedTasks = useMemo(() => {
    const formatScheduleLabel = (req) => {
      const startDate = req?.startDate || "";
      const combined = `${req?.date || ""} ${req?.time || ""}`.trim();
      const raw = String(startDate || combined || "").trim();
      if (!raw) return "Completed";
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
    return (requests || [])
      .filter((r) => {
        const status = String(r.status || "").toLowerCase();
        return status === "completed" || Boolean(r.completedAt);
      })
      .map((r) => ({
        id: r.id,
        title: `${r.serviceType || r.service || "Service"} - ${r.location || "Location"}`,
        time: formatScheduleLabel(r),
        status: "completed"
      }));
  }, [requests]);

  const nextJobLabel = tasks[0]?.time || "No upcoming job";
  const assignedTodayCount = tasks.length;
  const pendingPaymentsCount = (requests || []).filter((r) => {
    const statusValue = String(r.status || "").toLowerCase();
    const isCompleted = statusValue === "completed";
    const method = String(r.paymentMethod || "").trim();
    return isCompleted && !method;
  }).length;
  const ratingAverage = Number(profile?.ratingAverage ?? profile?.rating ?? 4.5);
  const ratingDisplay = Number.isFinite(ratingAverage) ? ratingAverage.toFixed(1) : "4.5";


  const handleRequestAction = async (req, statusValue) => { 
    const id = req?.id;
    if (!id) return; 
    const statusUpper = String(statusValue || "PENDING").toUpperCase();
    const payload = {
      status: statusUpper,
      updatedAt: rtdbServerTimestamp()
    };

    if (statusUpper === "CONFIRMED") {
      payload.confirmedAt = rtdbServerTimestamp();
      payload.confirmedById = profile?.id || auth.currentUser?.uid || "";
      payload.confirmedByName = displayName;
    } else if (statusUpper === "ACCEPTED") {
      payload.acceptedAt = rtdbServerTimestamp();
      payload.housekeeperId = profile?.id || auth.currentUser?.uid || "";
      payload.housekeeperName = displayName;
      payload.housekeeperRole = String(profile?.role || "staff");
      payload.housekeeperAvatarSeed = String(profile?.avatarSeed || "housekeeper");
    } else if (statusUpper === "DECLINED") {
      payload.declinedAt = rtdbServerTimestamp();
      payload.declinedById = profile?.id || auth.currentUser?.uid || "";
      payload.declinedByName = displayName;
    }

    await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), payload);

    const customerId = String(req?.householderId || "").trim();
    const serviceLabel = String(req?.serviceType || req?.service || "Service request");
    const timeLabel = String(req?.startDate || req?.preferredTime || "").trim();

    if (statusUpper === "CONFIRMED") {
      await sendNotification({
        toUserId: customerId,
        requestId: id,
        title: "Request confirmed",
        body: `${serviceLabel}${timeLabel ? ` - ${timeLabel}` : ""} is confirmed. Waiting for staff/housekeeper acceptance.`
      });

      const assignedHousekeeperId = String(req?.housekeeperId || "").trim();
      if (assignedHousekeeperId) {
        await sendNotification({
          toUserId: assignedHousekeeperId,
          requestId: id,
          title: "Request ready to accept",
          body: `${serviceLabel}${timeLabel ? ` - ${timeLabel}` : ""} was confirmed. Please accept it when ready.`
        });
      }
    } else if (statusUpper === "ACCEPTED") {
      await sendNotification({
        toUserId: customerId,
        requestId: id,
        title: "Request accepted",
        body: `${displayName} accepted your request${timeLabel ? ` - ${timeLabel}` : ""}.`
      });
    } else if (statusUpper === "DECLINED") {
      await sendNotification({
        toUserId: customerId,
        requestId: id,
        title: "Request declined",
        body: `${serviceLabel} was declined. You can submit a new request.`
      });
    }
  }; 

  const handleComplete = async (req) => {
    const id = req?.id;
    if (!id) return;
    const method = String(
      paymentMethodByRequestId[id] || req?.paymentMethod || ""
    ).trim();
    if (!method) return;

    await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), {
      status: "COMPLETED",
      completedAt: rtdbServerTimestamp(),
      completedById: profile?.id || auth.currentUser?.uid || "",
      completedByName: displayName,
      feedbackPending: true,
      feedbackRequestedAt: rtdbServerTimestamp(),
      paymentMethod: method,
      updatedAt: rtdbServerTimestamp()
    });

    setRequests((prev) =>
      (prev || []).map((item) =>
        String(item.id || "") === String(id)
          ? { ...item, status: "COMPLETED", paymentMethod: method }
          : item
      )
    );

    const customerId = String(req?.householderId || "").trim();
    const serviceLabel = String(req?.serviceType || req?.service || "Service request");
    await sendNotification({
      toUserId: customerId,
      requestId: id,
      title: "Service completed",
      body: `${serviceLabel} is completed. Payment method: ${method}.`
    });

    await sendNotification({
      toUserId: customerId,
      requestId: id,
      title: "Rate your service",
      body: "Please leave a rating and feedback for your staff to help us improve."
    });
  };

  const handleCashPaymentReceived = async (req) => {
    const id = req?.id;
    if (!id) return;
    const status = String(req?.status || "").toUpperCase();
    const method = String(req?.paymentMethod || req?.paidVia || "").toUpperCase();
    const paymentStatus = String(req?.paymentStatus || "").toUpperCase();
    const cashReserved = method === "CASH_ON_HAND" && paymentStatus === "RESERVED";
    if (!cashReserved || status !== "ACCEPTED") return;
    if (!req?.staffArrived) return;

      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), {
        paymentStatus: "PAID",
        paidVia: "CASH_ON_HAND",
        paidAt: rtdbServerTimestamp(),
        cashReceivedAt: rtdbServerTimestamp(),
        cashReceivedById: profile?.id || auth.currentUser?.uid || "",
        cashReceivedByName: displayName,
        updatedAt: rtdbServerTimestamp()
      });
      logAdminHistory({
        type: "payment",
        status: "success",
        action: "Payment received (cash)",
        message: `${req?.serviceType || "Service"} paid in cash.`,
        requestId: id,
        customerId: req?.householderId || req?.customerId,
        staffId: profile?.id || auth.currentUser?.uid || ""
      });

    const customerId = String(req?.householderId || "").trim();
    const serviceLabel = String(req?.serviceType || req?.service || "Service request");
    await sendNotification({
      toUserId: customerId,
      requestId: id,
      title: "Payment received",
      body: `${serviceLabel} payment was received. Your booking is confirmed.`
    });
  };

  const handleStaffArrived = async (req) => {
    const id = req?.id;
    if (!id) return;
    const status = String(req?.status || "").toUpperCase();
    if (status !== "ACCEPTED") return;
    if (req?.staffArrived) return;
    await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), {
      staffArrived: true,
      staffArrivedAt: rtdbServerTimestamp(),
      staffArrivedById: profile?.id || auth.currentUser?.uid || "",
      staffArrivedByName: displayName,
      updatedAt: rtdbServerTimestamp()
    });

    const customerId = String(req?.householderId || "").trim();
    if (customerId) {
      await sendNotification({
        toUserId: customerId,
        requestId: id,
        title: "Staff arrived",
        body: "Please confirm staff arrival to continue the service."
      });
    }
  };

  const formatWhenShort = (value) => {
    const ms = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(ms) || ms <= 0) return "Just now";
    const diff = Date.now() - ms;
    const s = Math.max(0, Math.floor(diff / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  const markAllRead = async () => {
    const uid = auth.currentUser?.uid || profile?.id || "";
    if (!uid) return;
    const unread = (notifications || []).filter((n) => n && n.read !== true);
    if (!unread.length) return;
    const updates = {};
    unread.forEach((n) => {
      updates[`UserNotifications/${uid}/${n.id}/read`] = true;
    });
    await rtdbUpdate(rtdbRef(rtdb), updates);
  };

  const markNotificationRead = async (notifId) => {
    const uid = auth.currentUser?.uid || profile?.id || "";
    if (!uid || !notifId) return;
    await rtdbUpdate(rtdbRef(rtdb, `UserNotifications/${uid}/${notifId}`), { read: true });
  };

  const handleNotificationsClick = () => {
    navigate("/staff/notifications");
  };

  const handleScrollToSettings = () => {
    document.getElementById("staff-settings")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleToggleTheme = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark-mode");
    root.classList.toggle("dark-mode", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleLogout = () => {
    window.location.href = "/login";
  };

  const currentUserId = auth.currentUser?.uid || "";
  const handleGoToRequests = () => navigate("/staff/requests");
  const handleGoToNotifications = () => navigate("/staff/notifications");
  const handleGoToSettings = () => {
    document.getElementById("staff-settings")?.scrollIntoView({ behavior: "smooth" });
  };

  const customerIds = useMemo(() => {
    const ids = new Set();
    (requests || []).forEach((req) => {
      const id = String(req?.householderId || req?.customerId || "").trim();
      if (id) ids.add(id);
    });
    return Array.from(ids);
  }, [requests]);

  useEffect(() => {
    if (!customerIds.length) {
      setCustomerAvatarSeeds({});
      setCustomerAddressById({});
      return;
    }
    const usersRef = rtdbRef(rtdb, "Users");
    const stop = onValue(
      usersRef,
      (snap) => {
        const val = snap.val() || {};
        const nextSeeds = {};
        const nextAddresses = {};
        customerIds.forEach((id) => {
          if (val[id]?.avatarSeed) nextSeeds[id] = String(val[id].avatarSeed);
          nextAddresses[id] = {
            street: String(val[id]?.street || "").trim(),
            address: String(val[id]?.address || "").trim(),
            barangay: String(val[id]?.barangay || "").trim(),
            landmark: String(val[id]?.landmark || "").trim()
          };
        });
        setCustomerAvatarSeeds(nextSeeds);
        setCustomerAddressById(nextAddresses);
      },
      () => {
        setCustomerAvatarSeeds({});
        setCustomerAddressById({});
      }
    );
    return () => stop();
  }, [customerIds.join("|")]);

  const hydratedRequests = useMemo(() => {
    return (requests || []).map((req) => {
      const customerId = String(req?.householderId || req?.customerId || "").trim();
      const fallback = customerId ? customerAddressById?.[customerId] || {} : {};
      return {
        ...req,
        street: String(req?.street || fallback?.street || fallback?.address || "").trim(),
        address: String(req?.address || req?.street || fallback?.street || fallback?.address || "").trim(),
        barangay: String(req?.barangay || fallback?.barangay || "").trim(),
        landmark: String(req?.landmark || fallback?.landmark || "").trim()
      };
    });
  }, [requests, customerAddressById]);

  return (
    <div className="staff-shell neo">
      {profileLoading && (
        <BroomLoader message="Sweeping your workspace..." fullscreen />
      )}
      <StaffHeader
        logoSrc={Logo}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        popoverRef={popoverRef}
        showGuest={showGuest}
        isStaffRole={isStaffRole}
        profileLoading={profileLoading}
        displayName={displayName}
        statusClass={statusClass}
        roleLabel={roleLabel}
        avatarUrl={avatarUrl}
        initials={initials}
        profile={profile}
        unreadCount={(notifications || []).filter((n) => n && n.read !== true).length}
        onNotificationsClick={handleNotificationsClick}
        onScrollToSettings={handleScrollToSettings}
        onToggleTheme={handleToggleTheme}
        onLogout={handleLogout}
      />

      <div className="staff-layout">
        <StaffSidebar />
        <StaffMain
          showGuest={showGuest}
          isStaffRole={isStaffRole}
          assignedTodayCount={assignedTodayCount}
          nextJobLabel={nextJobLabel}
          pendingPaymentsCount={pendingPaymentsCount}
          notificationsLoading={notificationsLoading}
          notifications={notifications}
          ratingDisplay={ratingDisplay}
          tasks={tasks}
          completedTasks={completedTasks}
          requests={hydratedRequests}
          requestsLoading={requestsLoading}
          isHousekeeper={isHousekeeper}
          isStaffManager={isStaffManager}
          profile={profile}
          currentUserId={currentUserId}
          paymentMethodByRequestId={paymentMethodByRequestId}
          setPaymentMethodByRequestId={setPaymentMethodByRequestId}
          customerAvatarSeeds={customerAvatarSeeds}
          customerAddressById={customerAddressById}
          attendanceEntries={attendanceEntries}
          attendanceLoading={attendanceLoading}
          handleRequestAction={handleRequestAction}
          handleComplete={handleComplete}
          handleCashPaymentReceived={handleCashPaymentReceived}
          handleStaffArrived={handleStaffArrived}
          markNotificationRead={markNotificationRead}
          markAllRead={markAllRead}
          formatWhenShort={formatWhenShort}
          visibleSections={visibleSections}
          onGoToRequests={handleGoToRequests}
          onGoToNotifications={handleGoToNotifications}
          onGoToSettings={handleGoToSettings}
          staffServiceOptions={STAFF_SERVICE_OPTIONS}
          weekdayOptions={WEEKDAY_OPTIONS}
          staffProfileForm={staffProfileForm}
          setStaffProfileForm={setStaffProfileForm}
          staffProfileErrors={staffProfileErrors}
          setStaffProfileErrors={setStaffProfileErrors}
          staffProfileSaving={staffProfileSaving}
          handleStaffProfileSave={handleStaffProfileSave}
          handleStaffProfileReset={handleStaffProfileReset}
          showProfilePrompt={showProfilePrompt}
          requiresStaffEmailVerification={requiresStaffEmailVerification}
          verificationStatus={verificationStatus}
          verificationMessage={verificationMessage}
          verificationBusy={verificationBusy}
          handleResendVerification={handleResendVerification}
          handleCheckVerification={handleCheckVerification}
          profileToast={profileToast}
          onDismissProfileToast={() => setProfileToast("")}
          renderDashboardSection={renderDashboardSection}
          renderRequestsSection={renderRequestsSection}
          renderNotificationsSection={renderNotificationsSection}
          renderScheduleSection={renderScheduleSection}
          renderSettingsSection={renderSettingsSection}
          renderHistorySection={renderHistorySection}
        />
      </div>
    </div>
  );
}

export default Staff;


