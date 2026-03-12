import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Customer.css";
import Logo from "../../components/Logo.png";
import { auth, rtdb } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref as rtdbRef } from "firebase/database";
import BroomLoader from "../../components/BroomLoader";
import CustomerSidebar from "./CustomerSidebar";
import CustomerHeader from "./CustomerHeader";
import { getCustomerSidebarItems } from "./customerNav";
import { useCustomerNotifications } from "./customerData";

const CustomerChromeContext = createContext(null);

export function useCustomerChrome() {
  const ctx = useContext(CustomerChromeContext);
  if (!ctx) throw new Error("useCustomerChrome must be used inside <CustomerChrome />");
  return ctx;
}

function CustomerChrome({ children, layout = "two-col" }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
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
          } else {
            setProfile({ id: user.uid, email: user.email });
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
  const statusClass = status === "active" ? "active" : status === "disabled" ? "disabled" : "pending";
  const roleLabel = profileLoading ? "Connecting..." : normalizeRoleLabel(profile?.role);
  const showGuest = !profile && !profileLoading;

  const avatarUrl = useMemo(() => {
    const seed = firstNameDisplay || displayName || "HU";
    const text = String(seed || "HU").trim() || "HU";
    const safe = text.slice(0, 2).toUpperCase();
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    const hue = hash % 360;
    const bg = `hsl(${hue} 72% 42%)`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="100%" height="100%" rx="64" fill="${bg}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial" font-size="56" font-weight="800" fill="white">${safe}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [displayName, firstNameDisplay]);

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
