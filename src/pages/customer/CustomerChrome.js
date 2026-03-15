import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Customer.css";
import Logo from "../../components/Logo.png";
import { auth, rtdb } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref as rtdbRef, update as rtdbUpdate } from "firebase/database";
import BroomLoader from "../../components/BroomLoader";
import CustomerSidebar from "./components/CustomerSidebar";
import CustomerHeader from "./components/CustomerHeader";
import { getCustomerSidebarItems } from "./customerNav";
import { useCustomerNotifications } from "./customerData";

const CustomerChromeContext = createContext(null);

const readCachedProfile = (uid) => {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(`hc_profile_${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
};

const writeCachedProfile = (uid, data) => {
  if (!uid || !data) return;
  try {
    localStorage.setItem(`hc_profile_${uid}`, JSON.stringify(data));
  } catch (_) {
    // Ignore storage errors (private mode, quota, etc.)
  }
};

export function useCustomerChrome() {
  const ctx = useContext(CustomerChromeContext);
  if (!ctx) throw new Error("useCustomerChrome must be used inside <CustomerChrome />");
  return ctx;
}

function CustomerChrome({ children, layout = "two-col" }) {
  const initialAuthUser = auth.currentUser;
  const initialCachedProfile = initialAuthUser ? readCachedProfile(initialAuthUser.uid) : null;
  const [authUser, setAuthUser] = useState(initialAuthUser);
  const [profile, setProfile] = useState(
    initialAuthUser ? { id: initialAuthUser.uid, email: initialAuthUser.email, ...(initialCachedProfile || {}) } : null
  );
  const [profileLoading, setProfileLoading] = useState(!initialAuthUser && !initialCachedProfile);
  const [notifSeenAt, setNotifSeenAt] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = String(location?.pathname || "").startsWith("/householder") ? "/householder" : "/customer";

  const sidebarItems = useMemo(() => getCustomerSidebarItems(basePath), [basePath]);
  const { notifications } = useCustomerNotifications(authUser?.uid, { limit: 1 });
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
      const cached = readCachedProfile(user.uid);
      if (cached) {
        setProfile({ id: user.uid, email: user.email, ...cached });
        setProfileLoading(false);
      } else {
        setProfileLoading(true);
      }
      const userRef = rtdbRef(rtdb, `Users/${user.uid}`);
      stopProfile = onValue(
        userRef,
        (snap) => {
          const data = snap.val();
          if (data) {
            const nextProfile = { id: user.uid, email: user.email, ...data };
            setProfile(nextProfile);
            writeCachedProfile(user.uid, nextProfile);
            if (!data.avatarSeed) {
              rtdbUpdate(rtdbRef(rtdb, `Users/${user.uid}`), { avatarSeed: "housekeeper" }).catch(() => {});
            }
          } else {
            const nextProfile = { id: user.uid, email: user.email };
            setProfile(nextProfile);
            writeCachedProfile(user.uid, nextProfile);
            rtdbUpdate(rtdbRef(rtdb, `Users/${user.uid}`), { avatarSeed: "housekeeper" }).catch(() => {});
          }
          setProfileLoading(false);
        },
        () => {
          const nextProfile = { id: user.uid, email: user.email };
          setProfile(nextProfile);
          writeCachedProfile(user.uid, nextProfile);
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
  const statusClass = status === "active" ? "active" : status === "disabled" ? "disabled" : "pending";
  const roleLabel = profileLoading ? "Connecting..." : normalizeRoleLabel(profile?.role);
  const showGuest = !profile && !profileLoading;

  const avatarUrl = useMemo(() => {
    const base = "data:image/svg+xml;charset=utf-8,";
    const preset = String(profile?.avatarSeed || "mop");
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
  }, [profile?.avatarSeed]);

  const ctx = useMemo(
    () => ({
      basePath,
      authUser,
      profile,
      profileLoading,
      role,
      roleLabel,
      displayName,
      firstNameDisplay,
      statusClass,
      showGuest,
      avatarUrl
    }),
    [authUser, avatarUrl, basePath, displayName, firstNameDisplay, profile, profileLoading, role, roleLabel, showGuest, statusClass]
  );

  return (
    <div className="customer-shell neo">
      {profileLoading && <BroomLoader message="Sweeping your workspace..." fullscreen />}
      <CustomerHeader
        logoSrc={Logo}
        avatarUrl={avatarUrl}
        displayName={displayName}
        firstNameDisplay={firstNameDisplay}
        roleLabel={roleLabel}
        statusClass={statusClass}
        showGuest={showGuest}
        email={profile?.email || authUser?.email || ""}
        phone={profile?.phone || profile?.contact || ""}
        location={profile?.location || ""}
        metaLine={profile?.location || profile?.email || authUser?.email || ""}
        basePath={basePath}
        showNotificationPing={showNotificationPing}
        onNotificationsOpen={markNotificationsSeen}
      />

      <div className={`layout ${layout === "two-col" ? "two-col" : ""}`}>
        <CustomerSidebar open={false} items={sidebarItems} />
        <main className="main">
          <CustomerChromeContext.Provider value={ctx}>
            {children}
          </CustomerChromeContext.Provider>
        </main>
      </div>
    </div>
  );
}

export default CustomerChrome;
