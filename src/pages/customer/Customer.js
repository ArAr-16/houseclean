import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Customer.css";
import Logo from "../../components/Logo.png";
import { auth, rtdb } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
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
import CustomerSidebar from "./components/CustomerSidebar";
import CustomerHeader from "./components/CustomerHeader";
import CustomerMain from "./components/CustomerMain";
import BookingWizardModal from "./BookingWizardModal";
import { getCustomerSidebarItems } from "./customerNav";
import hcCorpStaticQr from "../../assets/payments/hc-corp-static-qr.png";

function Customer() {
  const sidebarOpen = false;
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const location = useLocation();
  const [myRequests, setMyRequests] = useState([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notifSeenAt, setNotifSeenAt] = useState(0);
  const [staffAvatarSeeds, setStaffAvatarSeeds] = useState({});
  const [dashboardBookingOpen, setDashboardBookingOpen] = useState(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [submittedRequestId, setSubmittedRequestId] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentTxn, setPaymentTxn] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [showQrPreviewModal, setShowQrPreviewModal] = useState(false);
  const [queuedPaymentTarget, setQueuedPaymentTarget] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [arrivalTarget, setArrivalTarget] = useState(null);
  const [arrivalSubmitting, setArrivalSubmitting] = useState(false);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [staffDirectoryLoading, setStaffDirectoryLoading] = useState(true);
  const navigate = useNavigate();
  const basePath = String(location?.pathname || "").startsWith("/householder") ? "/householder" : "/customer";
  const latestNotifAt = Number(notifications?.[0]?.createdAt || 0) || 0;

  useEffect(() => {
    if (!authUser?.uid) {
      setNotifSeenAt(0);
      return;
    }
    const key = `hc_notif_seen_${authUser.uid}`;
    const raw = localStorage.getItem(key);
    const seen = Number(raw || 0) || 0;
    setNotifSeenAt(seen);
  }, [authUser?.uid]);

  const showNotificationPing = latestNotifAt > 0 && latestNotifAt > (Number(notifSeenAt) || 0);
  const markNotificationsSeen = () => {
    if (!authUser?.uid) return;
    const key = `hc_notif_seen_${authUser.uid}`;
    const now = latestNotifAt > 0 ? latestNotifAt : Date.now();
    localStorage.setItem(key, String(now));
    setNotifSeenAt(now);
  };

  // Apply saved theme immediately
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
        setAuthUser(null);
        setProfile(null);
        setProfileLoading(false);
        navigate("/login", { replace: true });
        return;
      }
      setAuthUser(user);
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
  }, [navigate]);

  const role = String(profile?.role || "").trim().toLowerCase();
  const isHouseholderRole = ["householder", "customer", "user"].includes(role);

  useEffect(() => {
    if (profileLoading) return;
    if (!authUser) return;
    if (!role) return;

    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "housekeeper" || role === "staff") navigate("/staff", { replace: true });
    else if (!isHouseholderRole) navigate("/", { replace: true });
  }, [authUser, isHouseholderRole, navigate, profileLoading, role]);

  
  const normalizeRoleLabel = (raw) => {
    const value = String(raw || "").trim().toLowerCase();
    if (!value) return "Householder";
    if (["householder", "customer", "user"].includes(value)) return "Householder";
    if (value === "staff") return "Staff";
    if (value === "housekeeper") return "Housekeeper";
    if (value === "admin") return "Admin";
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  };

  const displayName =
    (
      authUser?.displayName ||
      profile?.fullName ||
      profile?.name ||
      `${profile?.firstName || ""} ${profile?.lastName || ""}` ||
      profile?.email ||
      authUser?.email ||
      "Householder"
    )
      .replace(/\s+/g, " ")
      .trim();

  const firstNameDisplay = (() => {
    const direct = String(profile?.firstName || "").trim();
    if (direct) return direct;
    const full = String(displayName || "").trim();
    if (!full) return "";
    return full.split(" ").filter(Boolean)[0] || full;
  })();

  const status = String(profile?.status || "active").toLowerCase();
  const statusClass =
    status === "active" ? "active" : status === "disabled" ? "disabled" : "pending";
  const roleLabel = profileLoading ? "Connecting..." : normalizeRoleLabel(profile?.role);
  const showGuest = !profile && !profileLoading;

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

  const avatarUrl = createAvatarDataUri(profile?.avatarSeed || "mop");

  const contactLine = (profile?.phone || profile?.contact || "").trim();
  const addressLine = [
    profile?.street || profile?.address,
    profile?.barangay,
    profile?.landmark,
    profile?.municipality,
    profile?.province
  ]
    .filter(Boolean)
    .join(", ")
    .trim();


  useEffect(() => {
    if (!authUser?.uid) {
      setMyRequests([]);
      setMyRequestsLoading(false);
      return;
    }

    setMyRequestsLoading(true);
    const q = rtdbQuery(
      rtdbRef(rtdb, "ServiceRequests"),
      orderByChild("householderId"),
      equalTo(authUser.uid)
    );

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
        setMyRequests(list);
        setMyRequestsLoading(false);
      },
      () => setMyRequestsLoading(false)
    );

    return () => stop();
  }, [authUser?.uid]);

  useEffect(() => {
    if (!authUser?.uid) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    const notifRef = rtdbRef(rtdb, `UserNotifications/${authUser.uid}`);
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
  }, [authUser?.uid]);

  const parseMoney = (value) => {
    const cleaned = String(value || "").replace(/[^\d.]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  const getRequestUpdatedAt = (req) => {
    const candidates = [
      req?.updatedAt,
      req?.completedAt,
      req?.acceptedAt,
      req?.confirmedAt,
      req?.createdAt,
      req?.timestamp
    ];
    return candidates.reduce((acc, val) => {
      const num = typeof val === "number" ? val : Number(val);
      if (!Number.isFinite(num)) return acc;
      return Math.max(acc, num);
    }, 0);
  };

  const formatWhen = (value) => {
    if (value == null) return "";
    if (typeof value?.toDate === "function") return value.toDate().toLocaleString();
    const ms = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(ms) || ms <= 0) return "";
    return new Date(ms).toLocaleString();
  };

  const preferredStaffId = String(
    profile?.preferredStaffId || profile?.preferredHousekeeperId || ""
  ).trim();
  const preferredStaffName = String(
    profile?.preferredStaffName || profile?.preferredHousekeeperName || ""
  ).trim();
  const preferredStaffRole = String(
    profile?.preferredStaffRole || profile?.preferredHousekeeperRole || ""
  ).trim();

  const preferredStaffList = (() => {
    const map = new Map();
    (myRequests || []).forEach((req) => {
      const id = String(req?.housekeeperId || "").trim();
      if (!id) return;
      const name = String(req?.housekeeperName || "Staff").trim();
      const role = String(req?.housekeeperRole || "staff").trim();
      const avatarSeed = String(req?.housekeeperAvatarSeed || req?.avatarSeed || "").trim();
      const updatedAt = getRequestUpdatedAt(req);
      const initials = (() => {
        const words = String(name || "")
          .replace(/[^A-Za-z0-9 ]/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
        return (words.join("") || "HK").slice(0, 2).toUpperCase();
      })();
      const current = map.get(id) || {
        id,
        name,
        role,
        avatarSeed,
        initials,
        servicesCount: 0,
        lastServiceAt: 0
      };
      if (!current.avatarSeed && avatarSeed) current.avatarSeed = avatarSeed;
      current.servicesCount += 1;
      current.lastServiceAt = Math.max(current.lastServiceAt, updatedAt);
      map.set(id, current);
    });
    return Array.from(map.values()).sort((a, b) => {
      const aPreferred = preferredStaffId && a.id === preferredStaffId ? 1 : 0;
      const bPreferred = preferredStaffId && b.id === preferredStaffId ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;
      return (b.lastServiceAt || 0) - (a.lastServiceAt || 0);
    });
  })();

  useEffect(() => {
    const usersRef = rtdbRef(rtdb, "Users");
    setStaffDirectoryLoading(true);
    const stop = onValue(
      usersRef,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, data]) => ({ id, ...(data || {}) }));
        const staff = list.filter((user) => {
          const role = String(user?.role || "").trim().toLowerCase();
          if (!(role === "staff" || role === "housekeeper")) return false;
          const status = String(user?.status || "").trim().toLowerCase();
          if (status === "disabled") return false;
          const areaFields = [
            user?.barangay,
            user?.municipality,
            user?.city,
            user?.area,
            user?.location,
            user?.street || user?.address,
            user?.province
          ]
            .filter(Boolean)
            .join(" ");
          const serviceAreas = Array.isArray(user?.serviceAreas)
            ? user.serviceAreas.join(" ")
            : "";
          const haystack = `${areaFields} ${serviceAreas}`.toLowerCase();
          return haystack.includes("dagupan");
        });
        const mapped = staff.map((user) => {
          const name =
            user?.fullName ||
            user?.name ||
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            "Staff";
          const initials = (() => {
            const words = String(name || "")
              .replace(/[^A-Za-z0-9 ]/g, " ")
              .trim()
              .split(/\s+/)
              .filter(Boolean);
            if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
            return (words.join("") || "HK").slice(0, 2).toUpperCase();
          })();
          const seed = String(user?.avatarSeed || "housekeeper");
          const areaLabel = [
            user?.barangay,
            user?.municipality,
            user?.city,
            user?.province
          ]
            .filter(Boolean)
            .join(", ")
            .trim();
          const availabilityDays = Array.isArray(user?.availabilityDays)
            ? user.availabilityDays
            : [];
          const availabilityStart = String(user?.availabilityStart || "").trim();
          const availabilityEnd = String(user?.availabilityEnd || "").trim();
          const availabilityLabel = String(user?.availability || "").trim()
            ? String(user?.availability).trim()
            : availabilityDays.length && availabilityStart && availabilityEnd
              ? `${availabilityDays.join(", ")} · ${availabilityStart}-${availabilityEnd}`
              : "";
          return {
            id: String(user?.id || ""),
            name,
            role: normalizeRoleLabel(user?.role),
            avatarSeed: seed,
            avatarUrl: createAvatarDataUri(seed),
            initials,
            area: areaLabel || "Dagupan City",
            rating: user?.ratingAverage || user?.rating || null,
            contact: String(user?.contact || user?.phone || "").trim(),
            email: String(user?.email || "").trim(),
            availability: availabilityLabel,
            availabilityDays,
            availabilityStart,
            availabilityEnd,
            previousPosition: String(user?.previousPosition || "").trim(),
            experienceNotes: String(user?.experienceNotes || user?.experience || "").trim(),
            certification: String(user?.certification || "").trim(),
            barangayClearance: String(user?.barangayClearance || "").trim(),
            phoneModel: String(user?.phoneModel || "").trim()
          };
        });
        mapped.sort((a, b) => {
          const aPinned = preferredStaffId && a.id === preferredStaffId ? 1 : 0;
          const bPinned = preferredStaffId && b.id === preferredStaffId ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          const aRating = Number(a.rating || 0) || 0;
          const bRating = Number(b.rating || 0) || 0;
          return bRating - aRating;
        });
        setStaffDirectory(mapped);
        setStaffDirectoryLoading(false);
      },
      () => setStaffDirectoryLoading(false)
    );
    return () => stop();
  }, [preferredStaffId]);

  const preferredStaffIds = preferredStaffList.map((staff) => staff.id).filter(Boolean);

  useEffect(() => {
    if (!preferredStaffIds.length) {
      setStaffAvatarSeeds({});
      return;
    }
    const usersRef = rtdbRef(rtdb, "Users");
    const stop = onValue(
      usersRef,
      (snap) => {
        const val = snap.val() || {};
        const next = {};
        preferredStaffIds.forEach((id) => {
          if (val[id]?.avatarSeed) next[id] = String(val[id].avatarSeed);
        });
        setStaffAvatarSeeds(next);
      },
      () => setStaffAvatarSeeds({})
    );
    return () => stop();
  }, [preferredStaffIds.join("|")]);

  const preferredStaffWithAvatars = preferredStaffList.map((staff) => {
    const seed = staff.avatarSeed || staffAvatarSeeds[staff.id] || "housekeeper";
    return {
      ...staff,
      avatarSeed: seed,
      avatarUrl: createAvatarDataUri(seed)
    };
  });

  const handlePreferredStaffSelect = async (staff) => {
    if (!authUser?.uid) return;
    const targetId = String(staff?.id || "").trim();
    const isSame = targetId && preferredStaffId && targetId === preferredStaffId;
    const payload = isSame
      ? {
          preferredStaffId: "",
          preferredStaffName: "",
          preferredStaffRole: "",
          preferredStaffUpdatedAt: rtdbServerTimestamp()
        }
      : {
          preferredStaffId: targetId,
          preferredStaffName: String(staff?.name || "").trim(),
          preferredStaffRole: String(staff?.role || "").trim(),
          preferredStaffUpdatedAt: rtdbServerTimestamp()
        };
    await rtdbUpdate(rtdbRef(rtdb, `Users/${authUser.uid}`), payload);
  };

  const latestRequest = (() => {
    let latest = null;
    let latestAt = 0;
    (myRequests || []).forEach((req) => {
      const updatedAt = getRequestUpdatedAt(req);
      if (updatedAt >= latestAt) {
        latestAt = updatedAt;
        latest = req;
      }
    });
    return latest
      ? {
          ...latest,
          lastUpdatedAt: latestAt
        }
      : null;
  })();
  const openLatestRequestDetails = (request = latestRequest) => {
    const requestId = String(request?.requestId || request?.id || "").trim();
    if (!requestId) return;
    setActiveRequest(request);
    setShowTrackModal(true);
  };

  const arrivalHandledRef = React.useRef(new Set());

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    if (!myRequests || myRequests.length === 0) return;
    notifications.forEach((n) => {
      const title = String(n.title || "").toLowerCase();
      const body = String(n.body || "").toLowerCase();
      const isArrival = title.includes("arrived") || body.includes("arrived");
      if (!isArrival) return;
      const requestId = String(n.requestId || "").trim();
      if (!requestId) return;
      const handledKey = `${requestId}_${String(n.id || "")}`;
      if (arrivalHandledRef.current.has(handledKey)) return;
      const match =
        myRequests.find((r) => String(r.id || "") === requestId) ||
        myRequests.find((r) => String(r.requestId || "") === requestId);
      if (!match || match.customerArrivalConfirmed) return;
      arrivalHandledRef.current.add(handledKey);
      openArrivalModal(match);
    });
  }, [notifications, myRequests]);


  const moneyLabel = (value) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return "PHP --";
    return `PHP ${Math.round(n).toLocaleString()}`;
  };

  const formatDateTimeLabel = (value, fallbackDate, fallbackTime) => {
    const raw = String(value || "").trim();
    const combined = String(`${fallbackDate || ""} ${fallbackTime || ""}`).trim();
    const candidate = raw || combined;
    if (!candidate) return "--";
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) return candidate;
    const date = parsed.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
    const time = parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${date} • ${time}`;
  };

  const formatPaymentMethodLabel = (value) => {
    const key = String(value || "").trim().toUpperCase();
    if (key === "STATIC_QR") return "Static QR";
    if (key === "CASH_ON_HAND") return "Cash on Hand";
    return value ? String(value) : "--";
  };
  const normalizeStatus = (raw) => {
    const value = String(raw || "").trim().toUpperCase();
    if (value === "CANCELLED" || value === "DECLINED" || value.includes("DECLIN")) return "CANCELLED";
    if (value === "REJECTED" || value.includes("REJECT")) return "CANCELLED";
    if (value === "ACCEPTED") return "ACCEPTED";
    if (value === "CONFIRMED") return "ACCEPTED";
    if (value === "COMPLETED") return "COMPLETED";
    return "PENDING";
  };

  const StatusBadge = ({ status }) => {
    const current = normalizeStatus(status);
    return <div className={`status-pill status-${current.toLowerCase()}`}>{current}</div>;
  };

  const DetailedStatusTracker = ({ request }) => {
    const status = normalizeStatus(request?.status);
    const paymentStatus = String(request?.paymentStatus || "").toUpperCase();
    const paymentMethod = String(request?.paymentMethod || request?.paidVia || "").toUpperCase();
    const hasPaymentMethod = Boolean(paymentMethod);
    const paymentReceived = paymentStatus === "PAID" || Boolean(request?.paidAt);
    const steps =
      status === "CANCELLED"
        ? [
            { key: "requested", label: "Requested", done: true },
            { key: "cancelled", label: "Cancelled", done: true }
          ]
        : (() => {
            const baseSteps = [
              { key: "requested", label: "Requested", ready: true },
              {
                key: "payment_set",
                label: paymentMethod === "CASH_ON_HAND" ? "Cash on hand reserved" : "Payment method set",
                ready: hasPaymentMethod
              },
              { key: "accepted", label: "Staff accepted", ready: status !== "PENDING" },
              {
                key: "payment_paid",
                label: paymentMethod === "CASH_ON_HAND" ? "Payment received" : "Payment confirmed",
                ready: paymentReceived
              },
              { key: "completed", label: "Service completed", ready: status === "COMPLETED" }
            ];
            let reached = true;
            return baseSteps.map((step) => {
              const done = reached && step.ready;
              if (!done) reached = false;
              return { ...step, done };
            });
          })();
    const completedSteps = steps.filter((step) => step.done).length;
    const progress =
      steps.length <= 1 ? 100 : Math.max(0, ((completedSteps - 1) / (steps.length - 1)) * 100);

    return (
      <div
        className={`status-tracker status-tracker--line status-${status.toLowerCase()}`}
        aria-label={`Request tracker: ${status}`}
        style={{ "--progress": progress }}
      >
        <div className="status-line" aria-hidden="true">
          <span className="status-line__bg"></span>
          <span className="status-line__fill"></span>
        </div>
        <div className="status-line__percent" aria-hidden="true">
          {`${Math.round(progress)}%`}
        </div>
        <div className="status-line__steps">
          {steps.map((step) => (
            <div key={step.key} className={`status-step ${step.done ? "on" : ""}`}>
              <span className="status-dot" aria-hidden="true"></span>
              <span className="status-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const formatSchedule = (request) =>
    formatDateTimeLabel(request?.startDate || request?.preferredTime, request?.date, request?.time);

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

  const downloadFile = (filename, content, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  };

  const buildInvoice = (request) => {
    const id = String(request?.requestId || request?.id || "").trim() || "INV";
    const service = String(request?.serviceType || "Service");
    const when = formatDateTimeLabel(request?.startDate, request?.date, request?.time);
    const staff = String(request?.housekeeperName || "Unassigned");
    const total = moneyLabel(request?.totalPrice);
    const customer = String(displayName || authUser?.email || "Customer");
    const email = String(authUser?.email || profile?.email || "");
    const location = String(profile?.location || request?.location || "");

    return [
      "HOUSECLEAN INVOICE",
      "",
      `Invoice: ${id}`,
      `Customer: ${customer}`,
      email ? `Email: ${email}` : null,
      location ? `Location: ${location}` : null,
      "",
      `Service: ${service}`,
      `Schedule: ${when || "--"}`,
      `Assigned staff: ${staff}`,
      "",
      `Total: ${total}`,
      "",
      `Status: ${String(request?.status || "PENDING").toUpperCase()}`,
      "",
      `Generated: ${new Date().toLocaleString()}`
    ]
      .filter(Boolean)
      .join("\n");
  };

  const buildReceipt = (request) => {
    const id = String(request?.requestId || request?.id || "").trim() || "RCT";
    const total = moneyLabel(request?.totalPrice);
    const paidVia = formatPaymentMethodLabel(request?.paidVia || "N/A");
    const paidAt = request?.paidAt ? new Date(Number(request.paidAt)).toLocaleString() : "N/A";
    const customer = String(displayName || authUser?.email || "Customer");

    return [
      "HOUSECLEAN RECEIPT",
      "",
      `Receipt: ${id}`,
      `Customer: ${customer}`,
      "",
      `Amount: ${total}`,
      `Paid via: ${paidVia}`,
      `Paid at: ${paidAt}`,
      "",
      `Generated: ${new Date().toLocaleString()}`
    ].join("\n");
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

  const openPaymentModal = (request) => {
    if (!request) return;
    if (showArrivalModal) {
      setQueuedPaymentTarget(request);
      return;
    }
    setPaymentTarget(request);
    setPaymentTxn("");
    setPaymentModalOpen(true);
  };

  const downloadQrCodeImage = () => {
    const link = document.createElement("a");
    link.href = hcCorpStaticQr;
    link.download = "hc-corp-static-qr.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const canRequestRefund = (req) => {
    const status = String(req?.status || "").toUpperCase();
    if (status === "COMPLETED") return false;
    const paymentMethod = String(req?.paymentMethod || req?.paidVia || "").toUpperCase();
    if (paymentMethod !== "STATIC_QR") return false;
    const paymentStatus = String(req?.paymentStatus || "").toUpperCase();
    const paid = paymentStatus === "PAID" || Boolean(req?.paidAt);
    const refundStatus = String(req?.refundStatus || "").toUpperCase();
    if (!paid) return false;
    return !["REQUESTED", "APPROVED", "DENIED", "REFUNDED"].includes(refundStatus);
  };
  const todayLabel = React.useMemo(
    () =>
      new Date().toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
    []
  );

  const openRefundModal = (request) => {
    if (!request) return;
    setRefundTarget(request);
    setRefundReason("");
    setRefundError("");
    setShowRefundModal(true);
  };

  const handleSubmitRefund = async () => {
    if (!refundTarget || !authUser?.uid) return;
    const reason = String(refundReason || "").trim();
    if (!reason) {
      setRefundError("Please provide a reason for the refund request.");
      return;
    }
    try {
      setRefundSubmitting(true);
      const refundListRef = rtdbRef(rtdb, "RefundRequests");
      const refundRef = push(refundListRef);
      const refundId = refundRef.key;
      const requestId = String(refundTarget.requestId || refundTarget.id || "").trim();
      const payload = {
        refundId,
        requestId,
        customerId: authUser.uid,
        customerName: String(displayName || authUser?.email || "Customer").trim(),
        reason,
        status: "PENDING",
        serviceType: refundTarget.serviceType || refundTarget.service || "",
        paymentMethod: String(refundTarget.paymentMethod || refundTarget.paidVia || ""),
        paymentStatus: String(refundTarget.paymentStatus || ""),
        paidAt: refundTarget.paidAt || "",
        totalPrice: refundTarget.totalPrice || 0,
        createdAt: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp()
      };
      await rtdbSet(refundRef, payload);
      const adminNotifRef = push(rtdbRef(rtdb, "AdminNotifications"));
      await rtdbSet(adminNotifRef, {
        title: "Refund request",
        message: `${payload.customerName} requested a refund for ${payload.serviceType || "a service"}.`,
        type: "system",
        status: "unread",
        requestId,
        refundRequestId: refundId,
        customerId: payload.customerId,
        reason,
        createdAt: rtdbServerTimestamp()
      });
      if (requestId) {
        await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${requestId}`), {
          refundStatus: "REQUESTED",
          refundReason: reason,
          refundRequestId: refundId,
          refundRequestedAt: rtdbServerTimestamp(),
          updatedAt: rtdbServerTimestamp()
        });
      }
      setShowRefundModal(false);
      setRefundTarget(null);
      setRefundReason("");
      setRefundError("");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const openArrivalModal = (req) => {
    if (!req) return;
    if (paymentModalOpen) {
      setQueuedPaymentTarget(paymentTarget || req);
      setPaymentModalOpen(false);
      setPaymentTarget(null);
    }
    setArrivalTarget(req);
    setShowArrivalModal(true);
  };

  const handleConfirmArrival = async () => {
    if (!arrivalTarget || !authUser?.uid) return;
    const requestId = String(arrivalTarget.requestId || arrivalTarget.id || "").trim();
    if (!requestId) return;
    try {
      setArrivalSubmitting(true);
      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${requestId}`), {
        customerArrivalConfirmed: true,
        customerArrivalConfirmedAt: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp()
      });
      setShowArrivalModal(false);
      setArrivalTarget(null);
      if (queuedPaymentTarget) {
        setPaymentTarget(queuedPaymentTarget);
        setPaymentTxn("");
        setPaymentModalOpen(true);
        setQueuedPaymentTarget(null);
      }
    } finally {
      setArrivalSubmitting(false);
    }
  };

  const handleSubmitQrPayment = async () => {
    if (!paymentTarget) return;
    const id = String(paymentTarget.id || paymentTarget.requestId || "").trim();
    if (!id || !paymentTxn.trim()) return;
    try {
      setPaymentSaving(true);
      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${id}`), {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paidVia: "STATIC_QR",
        paidAt: rtdbServerTimestamp(),
        paymentTransactionId: paymentTxn.trim(),
        updatedAt: rtdbServerTimestamp()
      });
      logAdminHistory({
        type: "payment",
        status: "success",
        action: "Payment confirmed (QR)",
        message: `${paymentTarget?.serviceType || "Service"} paid via QR.`,
        requestId: id,
        customerId: paymentTarget?.householderId || paymentTarget?.customerId
      });
      const staffId = String(paymentTarget.housekeeperId || "").trim();
      if (staffId) {
        await sendNotification({
          toUserId: staffId,
          requestId: id,
          title: "Booking confirmed (Paid)",
          body: `${paymentTarget?.serviceType || "Service"} has been paid via QR. Please review the job.`
        });
      }
      setPaymentModalOpen(false);
      setShowQrPreviewModal(false);
    } finally {
      setPaymentSaving(false);
    }
  };


  const promoCode = String(
    profile?.referralCode ||
      profile?.promoCode ||
      (authUser?.uid ? `HC-${authUser.uid.slice(-6).toUpperCase()}` : "HC-000000")
  ).trim();
  const promoCredits = Number(profile?.promoCredits || profile?.referralCredits || 0) || 0;

  const history = (myRequests || []).map((r) => {
    const statusText = String(r.status || "PENDING").toUpperCase();
    const startDate = r.startDate || r.preferredTime || "";
    const serviceType = r.serviceType || r.service || "Service";
    const location = r.location || "";
    const totalPriceValue = r.totalPrice ?? parseMoney(r.payout);
    const payoutLabel =
      typeof totalPriceValue === "number" && Number.isFinite(totalPriceValue) && totalPriceValue > 0
        ? `PHP ${Math.round(totalPriceValue).toLocaleString()}`
        : r.payout || "PHP --";
    const photos = Array.isArray(r.photos)
      ? r.photos
      : Array.isArray(r.images)
        ? r.images
        : Array.isArray(r.pictures)
          ? r.pictures
          : [];

    return {
      id: r.requestId || r.id,
      job: location ? `${serviceType} - ${location}` : serviceType,
      date: startDate,
      payout: payoutLabel,
      status: statusText,
      photos,
      feedbackRating: r.feedbackRating ?? null,
      feedbackComment: r.feedbackComment ?? ""
    };
  });

  return (
    <div className="customer-shell neo">
      {profileLoading && (
        <BroomLoader message="Sweeping your workspace..." fullscreen />
      )}
      <CustomerHeader
        logoSrc={Logo}
        avatarUrl={avatarUrl}
        displayName={displayName}
        firstNameDisplay={firstNameDisplay}
        roleLabel={roleLabel}
        statusClass={statusClass}
        showGuest={showGuest}
        email={profile?.email || authUser?.email || ""}
        phone={contactLine}
        location={addressLine || profile?.location || ""}
        metaLine={addressLine || profile?.location || profile?.email || authUser?.email || ""}
        basePath={basePath}
        showNotificationPing={showNotificationPing}
        onNotificationsOpen={markNotificationsSeen}
      />

      <div className="layout two-col">
        <CustomerSidebar
          open={sidebarOpen}
          items={getCustomerSidebarItems(basePath)}
        />
        <CustomerMain
          basePath={basePath}
          onRequestCleaning={() => setDashboardBookingOpen(true)}
          onOpenLatestRequestDetails={openLatestRequestDetails}
          todayLabel={todayLabel}
          history={history}
          myRequestsLoading={myRequestsLoading}
          latestRequest={latestRequest}
          formatWhen={formatWhen}
          preferredStaffId={preferredStaffId}
          preferredStaffName={preferredStaffName}
          preferredStaffRole={preferredStaffRole}
          preferredStaffList={preferredStaffWithAvatars}
          onSelectPreferredStaff={handlePreferredStaffSelect}
          promoCode={promoCode}
          promoCredits={promoCredits}
          onOpenPaymentModal={openPaymentModal}
          onOpenRefundModal={openRefundModal}
          canRequestRefund={canRequestRefund}
          staffDirectory={staffDirectory}
          staffDirectoryLoading={staffDirectoryLoading}
        />
      </div>

      <BookingWizardModal
        open={dashboardBookingOpen}
        onClose={() => setDashboardBookingOpen(false)}
        authUser={authUser}
        profile={profile}
        displayName={displayName}
        addressLine={addressLine || profile?.location || ""}
        preferredStaffId={preferredStaffId}
        preferredStaffName={preferredStaffName}
        preferredStaffRole={preferredStaffRole}
        onSubmitted={(requestId) => {
          setDashboardBookingOpen(false);
          setSubmittedRequestId(String(requestId || ""));
          setSubmittedMessage(
            "Your request has been submitted. Please wait for a housekeeper to be accepted the request. " +
              "You can track the status in the request list."
          );
          setShowSubmittedModal(true);
        }}
      />

      {showSubmittedModal && (
        <div className="customer-modal">
          <div
            className="customer-modal__backdrop"
            onClick={() => setShowSubmittedModal(false)}
          />
          <div className="customer-modal__panel" role="dialog" aria-modal="true">
            <div className="customer-modal__icon">
              <i className="fas fa-check"></i>
            </div>
            <h4>Request submitted</h4>
            <p>{submittedMessage}</p>
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill ghost"
                onClick={() => setShowSubmittedModal(false)}
              >
                Okay
              </button>
              <button
                type="button"
                className="btn pill primary"
                onClick={() => {
                  setShowSubmittedModal(false);
                  navigate(`${basePath}/requests`, {
                    state: { openTrackFor: submittedRequestId }
                  });
                }}
              >
                Track request
              </button>
            </div>
          </div>
        </div>
      )}
      {showTrackModal && activeRequest && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={() => setShowTrackModal(false)} />
          <div className="customer-modal__panel track-modal" role="dialog" aria-modal="true" aria-label="Request details">
            <div className="customer-modal__icon alt">
              <i className="fas fa-receipt"></i>
            </div>
            <h4>Request details</h4>
            <StatusBadge status={activeRequest.status} />
            <DetailedStatusTracker request={activeRequest} />
            <div className="track-modal__grid">
              <div>
                <small>Request ID</small>
                <strong>{activeRequest.requestId || activeRequest.id || "--"}</strong>
              </div>
              <div>
                <small>Service</small>
                <strong>
                  {Array.isArray(activeRequest.serviceTypes) && activeRequest.serviceTypes.length > 0
                    ? activeRequest.serviceTypes.join(", ")
                    : activeRequest.serviceType || activeRequest.service || "--"}
                </strong>
              </div>
              <div>
                <small>Payment</small>
                <strong>{formatPaymentMethodLabel(activeRequest.paymentMethod || activeRequest.paidVia)}</strong>
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
                <strong>{activeRequest.location || activeRequest.street || activeRequest.address || addressLine || "--"}</strong>
              </div>
              <div>
                <small>Staff</small>
                <strong>{activeRequest.housekeeperName || "Pending assignment"}</strong>
              </div>
              <div>
                <small>Status</small>
                <strong>{normalizeStatus(activeRequest.status)}</strong>
              </div>
              <div>
                <small>Total</small>
                <strong>{moneyLabel(activeRequest.totalPrice)}</strong>
              </div>
            </div>
            {activeRequest.notes && (
              <div className="track-modal__notes">
                <small>Notes</small>
                <p>{activeRequest.notes}</p>
              </div>
            )}
            {activeRequest?.staffArrived && (
              <div className="track-modal__notes">
                <small>Arrival</small>
                <p>
                  {activeRequest.customerArrivalConfirmed
                    ? "Staff arrival confirmed."
                    : "Staff has marked arrival. Please confirm."}
                </p>
              </div>
            )}
            <div className="customer-modal__actions">
              {canRequestRefund(activeRequest) && (
                <button className="btn pill ghost" type="button" onClick={() => openRefundModal(activeRequest)}>
                  Request refund
                </button>
              )}
              {activeRequest?.staffArrived && !activeRequest?.customerArrivalConfirmed && (
                <button
                  className="btn pill ghost"
                  type="button"
                  onClick={() => {
                    setShowTrackModal(false);
                    openArrivalModal(activeRequest);
                  }}
                >
                  Confirm staff arrival
                </button>
              )}
              <button className="btn pill primary" type="button" onClick={() => setShowTrackModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {paymentModalOpen && paymentTarget && (
        <div className="customer-modal">
          <div
            className="customer-modal__backdrop"
            onClick={() => setPaymentModalOpen(false)}
          />
          <div
            className="customer-modal__panel track-modal payment-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Payment details"
          >
            <div className="customer-modal__icon alt">
              <i className="fas fa-credit-card"></i>
            </div>
            <h4>Payment details</h4>
            <div className={`status-pill status-${normalizeStatus(paymentTarget.status).toLowerCase()}`}>
              {normalizeStatus(paymentTarget.status)}
            </div>
            <div className="track-modal__grid">
              <div>
                <small>Request ID</small>
                <strong>{paymentTarget.requestId || paymentTarget.id || "--"}</strong>
              </div>
              <div>
                <small>Service</small>
                <strong>
                  {Array.isArray(paymentTarget.serviceTypes) && paymentTarget.serviceTypes.length > 0
                    ? paymentTarget.serviceTypes.join(", ")
                    : paymentTarget.serviceType || "--"}
                </strong>
              </div>
              <div>
                <small>Schedule</small>
                <strong>
                  {formatDateTimeLabel(
                    paymentTarget.startDate,
                    paymentTarget.date,
                    paymentTarget.time
                  )}
                </strong>
              </div>
              <div>
                <small>Booked at</small>
                <strong>{formatBookedAt(paymentTarget)}</strong>
              </div>
              <div>
                <small>Total</small>
                <strong>{moneyLabel(paymentTarget.totalPrice)}</strong>
              </div>
              <div>
                <small>Payment</small>
                <strong>
                  {formatPaymentMethodLabel(
                    paymentTarget.paymentMethod || paymentTarget.paidVia
                  )}
                </strong>
              </div>
              <div>
                <small>Assigned staff</small>
                <strong>{paymentTarget.housekeeperName || "Unassigned"}</strong>
              </div>
            </div>

            {String(paymentTarget.status || "").toUpperCase() === "PENDING_PAYMENT" &&
              String(paymentTarget.paymentMethod || "").toUpperCase() === "STATIC_QR" && (
                <div className="track-modal__notes">
                  <small>QR payment</small>
                  <p>Enter the transaction ID from your QR payment.</p>
                  <input
                    type="text"
                    placeholder="Transaction ID"
                    value={paymentTxn}
                    onChange={(e) => setPaymentTxn(e.target.value)}
                  />
                  <div className="track-modal__actions">
                    <button
                      className="btn pill primary"
                      type="button"
                      disabled={!paymentTxn.trim() || paymentSaving}
                      onClick={handleSubmitQrPayment}
                    >
                      {paymentSaving ? "Saving..." : "Submit QR Payment"}
                    </button>
                                        <button
                      className="btn pill ghost text-btn"
                      type="button"
                      onClick={() => setShowQrPreviewModal(true)}
                    >
                      Scan this QR code
                    </button>
                  </div>
                </div>
              )}
            <div className="customer-modal__actions">
              <button
                className="btn pill ghost"
                type="button"
                onClick={() =>
                  downloadFile(
                    `invoice_${String(paymentTarget.requestId || paymentTarget.id).slice(-8)}.txt`,
                    buildInvoice(paymentTarget)
                  )
                }
              >
                Download invoice
              </button>
              {canRequestRefund(paymentTarget) && (
                <button
                  className="btn pill ghost"
                  type="button"
                  onClick={() => openRefundModal(paymentTarget)}
                >
                  Request refund
                </button>
              )}
              <button
                className="btn pill ghost"
                type="button"
                onClick={() => setPaymentModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showQrPreviewModal && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={() => setShowQrPreviewModal(false)} />
          <div className="customer-modal__panel qr-preview-modal" role="dialog" aria-modal="true" aria-label="Static QR code preview">
            <div className="customer-modal__icon alt">
              <i className="fas fa-qrcode"></i>
            </div>
            <h4>Scan this QR code</h4>
            <p className="muted small">Use this official HC Corp QR code for static QR payments.</p>
            <div className="qr-preview-modal__card">
              <img src={hcCorpStaticQr} alt="HC Corp static QR code" className="qr-preview-modal__image" />
            </div>
            <div className="customer-modal__actions">
              <button className="btn pill ghost text-btn" type="button" onClick={downloadQrCodeImage}>
                Download this QR code
              </button>
              <button className="btn pill ghost" type="button" onClick={() => setShowQrPreviewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showArrivalModal && arrivalTarget && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={() => setShowArrivalModal(false)} />
          <div className="customer-modal__panel" role="dialog" aria-modal="true" aria-label="Confirm staff arrival">
            <div className="customer-modal__icon alt">
              <i className="fas fa-user-check"></i>
            </div>
            <h4>Confirm staff arrival</h4>
            <p className="muted small">
              Please confirm the staff has arrived at your location before payment or service begins.
            </p>
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill ghost"
                onClick={async () => {
                  if (!arrivalTarget?.id && !arrivalTarget?.requestId) {
                    setShowArrivalModal(false);
                    setArrivalTarget(null);
                    return;
                  }
                  try {
                    setArrivalSubmitting(true);
                    const requestId = String(arrivalTarget.requestId || arrivalTarget.id || "").trim();
                    if (requestId) {
                      await rtdbUpdate(rtdbRef(rtdb, `ServiceRequests/${requestId}`), {
                        staffArrived: false,
                        staffArrivedAt: "",
                        staffArrivedById: "",
                        staffArrivedByName: "",
                        customerArrivalConfirmed: false,
                        customerArrivalDeclinedAt: rtdbServerTimestamp(),
                        updatedAt: rtdbServerTimestamp()
                      });
                    }
                  } finally {
                    setArrivalSubmitting(false);
                    setShowArrivalModal(false);
                    setArrivalTarget(null);
                    if (queuedPaymentTarget) {
                      setPaymentTarget(queuedPaymentTarget);
                      setPaymentTxn("");
                      setPaymentModalOpen(true);
                      setQueuedPaymentTarget(null);
                    }
                  }
                }}
                disabled={arrivalSubmitting}
              >
                Not yet
              </button>
              <button
                type="button"
                className="btn pill primary"
                onClick={handleConfirmArrival}
                disabled={arrivalSubmitting}
              >
                {arrivalSubmitting ? "Confirming..." : "Yes, staff arrived"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showRefundModal && refundTarget && (
        <div className="customer-modal">
          <div className="customer-modal__backdrop" onClick={() => setShowRefundModal(false)} />
          <div className="customer-modal__panel" role="dialog" aria-modal="true" aria-label="Request refund">
            <div className="customer-modal__icon alt">
              <i className="fas fa-rotate-left"></i>
            </div>
            <h4>Request a refund</h4>
            <p className="muted small">Tell us why you are requesting a refund.</p>
            <label className="feedback-label">
              Reason
              <textarea
                rows={4}
                value={refundReason}
                onChange={(e) => {
                  setRefundReason(e.target.value);
                  if (refundError) setRefundError("");
                }}
                
              />
            </label>
            {refundError && <div className="feedback-error">{refundError}</div>}
            <div className="customer-modal__actions">
              <button
                type="button"
                className="btn pill ghost"
                onClick={() => setShowRefundModal(false)}
                disabled={refundSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn pill primary"
                onClick={handleSubmitRefund}
                disabled={refundSubmitting}
              >
                {refundSubmitting ? "Submitting..." : "Submit refund request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customer;
