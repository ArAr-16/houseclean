import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../components/Admin.css";
import AdminSidebar from "../../components/AdminSidebar";
import { auth, rtdb } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  onValue,
  ref,
  update as rtdbUpdate
} from "firebase/database";
import { Link, useLocation } from "react-router-dom";

const dayMs = 24 * 60 * 60 * 1000;

const toMs = (value) => {
  if (value == null) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(num) && num > 0) return num;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const isPaid = (req) => {
  const paymentStatus = String(req?.paymentStatus || "").toUpperCase();
  return paymentStatus === "PAID" || Boolean(req?.paidAt || req?.cashReceivedAt);
};

const getPaidAt = (req) =>
  toMs(req?.paidAt || req?.cashReceivedAt || req?.completedAt || req?.updatedAt || req?.createdAt);

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
    bubbles: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#E0F2FE\" stroke=\"#0EA5E9\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"52\" r=\"12\" fill=\"#BAE6FD\"/><circle cx=\"58\" cy=\"42\" r=\"10\" fill=\"#7DD3FC\"/><circle cx=\"58\" cy=\"64\" r=\"8\" fill=\"#38BDF8\"/></svg>",
    home: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DCFCE7\" stroke=\"#22C55E\" stroke-width=\"2\"/><path d=\"M24 48l24-20 24 20\" fill=\"none\" stroke=\"#16A34A\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"30\" y=\"46\" width=\"36\" height=\"26\" rx=\"4\" fill=\"#22C55E\"/><rect x=\"42\" y=\"56\" width=\"12\" height=\"16\" rx=\"2\" fill=\"#DCFCE7\"/></svg>",
    admin: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\"><circle cx=\"48\" cy=\"48\" r=\"46\" fill=\"#DBEAFE\" stroke=\"#3B82F6\" stroke-width=\"2\"/><path d=\"M48 24l20 8v16c0 12-8 22-20 26-12-4-20-14-20-26V32l20-8z\" fill=\"#3B82F6\"/><path d=\"M40 46l6 6 10-12\" fill=\"none\" stroke=\"#DBEAFE\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
  };
  const svg = map[preset] || map.mop;
  return `${base}${encodeURIComponent(svg)}`;
};

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [reminders, setReminders] = useState([
    { id: 1, text: "Call barangay heads re: IDs", done: false },
    { id: 2, text: "Publish weekend rota", done: false },
  ]);
  const [darkLabel, setDarkLabel] = useState(
    document.documentElement.classList.contains("dark-mode") ? "Light mode" : "Dark mode"
  );
  const [newReminder, setNewReminder] = useState("");
  const [notes, setNotes] = useState("Shift notes:\n- Calmay short on staff\n- Verify Juno documents");
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [showEarnings, setShowEarnings] = useState(true);
  const [statsMenuOpen, setStatsMenuOpen] = useState(false);
  const [statsRangeDays, setStatsRangeDays] = useState(7);
  const [refreshTick, setRefreshTick] = useState(0);
  const unreadNotifications = notifications.filter((n) => n.status === "unread");
  const unreadCount = unreadNotifications.length;
  const { monthLabel, monthDays, visibleMonth, visibleYear } = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const totalDays = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const leading = base.getDay();
    const cells = Array.from({ length: leading }, () => null);
    for (let d = 1; d <= totalDays; d += 1) cells.push(d);
    const trailing = (7 - (cells.length % 7)) % 7;
    for (let t = 0; t < trailing; t += 1) cells.push(null);
    return {
      monthLabel: base.toLocaleString("default", { month: "long", year: "numeric" }),
      monthDays: cells,
      visibleMonth: base.getMonth(),
      visibleYear: base.getFullYear(),
    };
  }, [monthOffset, today]);

  const addReminder = () => {
    const text = newReminder.trim();
    if (!text) return;
    setReminders((prev) => [{ id: Date.now(), text, done: false }, ...prev]);
    setNewReminder("");
  };

  const toggleReminder = (id) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r))
    );
  };

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    const notifRef = ref(rtdb, "AdminNotifications");
    const unsub = onValue(notifRef, (snap) => {
      const val = snap.val();
      if (!val) {
        setNotifications([]);
        return;
      }
      const list = Object.entries(val).map(([id, data]) => ({
        id,
        ...data,
        createdAt: typeof data?.createdAt === "number" ? data.createdAt : 0,
      }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(list);
    });
    return () => unsub();
  }, [refreshTick]);

  useEffect(() => {
    const usersRef = ref(rtdb, "Users");
    const unsub = onValue(usersRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val).map(([id, data]) => ({ id, ...(data || {}) }));
      setUsers(list);
    });
    return () => unsub();
  }, [refreshTick]);

  useEffect(() => {
    const reqRef = ref(rtdb, "ServiceRequests");
    const unsub = onValue(reqRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val).map(([id, data]) => ({ id, ...(data || {}) }));
      setRequests(list);
    });
    return () => unsub();
  }, [refreshTick]);


  const markRead = (id, status = "read") =>
    rtdbUpdate(ref(rtdb, `AdminNotifications/${id}`), { status }).catch(() => {});

  const markAllRead = () => {
    unreadNotifications.forEach((n) => markRead(n.id, "read"));
  };

  const profileNameRaw = currentUser?.displayName || currentUser?.email || "Admin";
  const profileFirst = profileNameRaw.trim().split(" ").filter(Boolean)[0] || "NA";
  const profileName = profileFirst;
  const profileInitials = profileFirst.slice(0, 2).toUpperCase();
  const adminProfile = useMemo(() => {
    const uid = String(currentUser?.uid || "").trim();
    const email = String(currentUser?.email || "").trim().toLowerCase();
    return users.find((u) => String(u?.id || "").trim() === uid || String(u?.email || "").toLowerCase() === email);
  }, [users, currentUser]);
  const adminAvatarSeed = String(adminProfile?.avatarSeed || "admin");
  const adminAvatarUrl = createAvatarDataUri(adminAvatarSeed);
  const goToProfile = () => {
    if (currentUser?.uid) {
      window.location.href = `/profile/${currentUser.uid}`;
    } else {
      window.location.href = "/profile";
    }
  };
  const metrics = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * dayMs;
    const rangeDays = statsRangeDays;
    const bucketCount = 7;
    const rangeMs = rangeDays * dayMs;
    const bucketMs = rangeMs / bucketCount;
    const currentYear = new Date().getFullYear();
    let yearlyRevenue = 0;
    let last30Revenue = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let totalCount = requests.length;
    let ratingSum = 0;
    let ratingCount = 0;
    let rating4Plus = 0;
    let feedbackCount = 0;
    let acceptTotal = 0;
    let acceptCount = 0;
    let completeTotal = 0;
    let completeCount = 0;
    const dayBuckets = Array.from({ length: bucketCount }, () => ({ revenue: 0, requests: 0 }));

    requests.forEach((req) => {
      const status = normalizeStatus(req?.status);
      const createdAt = toMs(req?.createdAt || req?.timestamp || req?.requestedAt);
      const acceptedAt = toMs(req?.acceptedAt);
      const completedAt = toMs(req?.completedAt);
      const paidAt = getPaidAt(req);
      const total = Number(req?.totalPrice || 0);
      const rating = Number(req?.feedbackRating || 0) || 0;
      const hasFeedback = String(req?.feedbackComment || "").trim().length > 0;

      if (status === "completed" || completedAt) completedCount += 1;
      if (status.includes("cancel") || status.includes("declin") || status.includes("reject")) cancelledCount += 1;

      if (rating > 0) {
        ratingSum += rating;
        ratingCount += 1;
        if (rating >= 4) rating4Plus += 1;
      }
      if (hasFeedback || rating > 0) feedbackCount += 1;

      if (createdAt && acceptedAt) {
        acceptTotal += Math.max(0, acceptedAt - createdAt);
        acceptCount += 1;
      }
      if (acceptedAt && completedAt) {
        completeTotal += Math.max(0, completedAt - acceptedAt);
        completeCount += 1;
      }

      if ((status === "completed" || completedAt) && isPaid(req) && Number.isFinite(total)) {
        const paidDate = new Date(paidAt || completedAt || createdAt);
        if (paidDate.getFullYear() === currentYear) yearlyRevenue += total;
        if (paidAt >= thirtyDaysAgo) last30Revenue += total;
      }

      if (createdAt && createdAt >= now - rangeMs) {
        const index = Math.min(bucketCount - 1, Math.floor((createdAt - (now - rangeMs)) / bucketMs));
        if (index >= 0 && index < bucketCount) {
          dayBuckets[index].requests += 1;
          if ((status === "completed" || completedAt) && isPaid(req) && Number.isFinite(total)) {
            dayBuckets[index].revenue += total;
          }
        }
      }
    });

    const avgRating = ratingCount ? ratingSum / ratingCount : 0;
    const rating4PlusRate = ratingCount ? rating4Plus / ratingCount : 0;
    const completionRate = totalCount ? completedCount / totalCount : 0;

    const formatCurrency = (value) => `PHP ${Math.round(value).toLocaleString()}`;
    const avgRevenue = completedCount ? yearlyRevenue / completedCount : 0;
    const avgAcceptMins = acceptCount ? Math.round(acceptTotal / acceptCount / 60000) : 0;
    const avgCompleteMins = completeCount ? Math.round(completeTotal / completeCount / 60000) : 0;

    return {
      yearlyRevenue,
      last30Revenue,
      avgRevenue,
      completedCount,
      cancelledCount,
      totalCount,
      avgRating,
      rating4PlusRate,
      feedbackCount,
      completionRate,
      avgAcceptMins,
      avgCompleteMins,
      dayBuckets,
      formatCurrency,
      rangeDays,
      bucketCount
    };
  }, [requests, statsRangeDays]);

  const userCounts = useMemo(() => {
    const customers = users.filter((u) => ["householder", "customer", "user"].includes(String(u.role || "").toLowerCase()));
    const staff = users.filter((u) => ["staff", "housekeeper"].includes(String(u.role || "").toLowerCase()));
    const activeStaff = staff.filter((u) => String(u.status || "").toLowerCase() === "active");
    return { customers, staff, activeStaff };
  }, [users]);

  const overviewCards = [
    {
      label: "Yearly turnover",
      value: metrics.formatCurrency(metrics.yearlyRevenue),
      suffix: "",
      meta: `${new Date().getFullYear()} total revenue`,
      icon: "fas fa-wallet"
    },
    {
      label: "Enterprise clients",
      value: `${userCounts.customers.length}`,
      suffix: "+",
      meta: "Active client accounts",
      icon: "fas fa-building"
    }
  ];

  const earningsSeries = metrics.dayBuckets.map((d) => Math.min(48, Math.round((d.revenue / 1000) * 6 + 8)));
  const analyticsSeriesA = metrics.dayBuckets.map((d) => Math.min(40, d.requests * 6 + 6));
  const analyticsSeriesB = metrics.dayBuckets.map((d) => Math.min(40, Math.round(d.revenue / 1000) * 4 + 4));
  const statsLabels = useMemo(() => {
    const now = Date.now();
    const rangeMs = metrics.rangeDays * dayMs;
    const bucketMs = rangeMs / metrics.bucketCount;
    return Array.from({ length: metrics.bucketCount }, (_, idx) => {
      const end = new Date(now - rangeMs + (idx + 1) * bucketMs);
      return end.toLocaleDateString("default", { month: "short", day: "numeric" });
    });
  }, [metrics.rangeDays, metrics.bucketCount]);
  const statsBars = metrics.dayBuckets.map((d, idx) => ({
    label: statsLabels[idx] || `Day ${idx + 1}`,
    value: Math.min(100, d.requests * 15 + 20)
  }));

  const analyticsRangeLabel = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() - statsRangeDays * dayMs);
    const fmt = (date) =>
      date.toLocaleDateString("default", { month: "short", day: "numeric" });
    return `${fmt(start)} - ${fmt(now)}`;
  }, [statsRangeDays]);

  const handleExportCsv = () => {
    const rows = [["Bucket", "Requests", "Revenue"]];
    metrics.dayBuckets.forEach((bucket, idx) => {
      rows.push([
        statsLabels[idx] || `Day ${idx + 1}`,
        bucket.requests,
        Math.round(bucket.revenue)
      ]);
    });
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-stats-${metrics.rangeDays}d-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleRefreshData = () => {
    setRefreshTick((prev) => prev + 1);
  };

  const profitabilityMetrics = [
    { label: "Yearly revenue", value: metrics.formatCurrency(metrics.yearlyRevenue) },
    { label: "Last 30 days", value: metrics.formatCurrency(metrics.last30Revenue) },
    { label: "Avg revenue/job", value: metrics.formatCurrency(metrics.avgRevenue) }
  ];

  const satisfactionMetrics = [
    { label: "Avg rating", value: `${metrics.avgRating.toFixed(2)} / 5` },
    { label: "4★+ rate", value: `${Math.round(metrics.rating4PlusRate * 100)}%` },
    { label: "Feedback", value: metrics.feedbackCount }
  ];

  const performanceMetrics = [
    { label: "Completed jobs", value: metrics.completedCount },
    { label: "Cancelled jobs", value: metrics.cancelledCount },
    { label: "Completion rate", value: `${Math.round(metrics.completionRate * 100)}%` }
  ];

  const efficiencyMetrics = [
    { label: "Avg accept time", value: `${metrics.avgAcceptMins} min` },
    { label: "Avg completion time", value: `${metrics.avgCompleteMins} min` },
    { label: "Staff active", value: `${userCounts.activeStaff.length} / ${userCounts.staff.length}` }
  ];

  return (
    <div className="admin-page neo-admin">
      <div className="dashboard-shell no-sidebar">
        <main className="dash-main admin-overview">
          <div className="admin-topbar">
            <div className="welcome-card">
              <div className="welcome-copy">
                <p className="eyebrow">Welcome back!</p>
                <h2>Hello, {profileName}!</h2>
                <p className="muted">
                  Keep an eye on onboarding, revenue, and service quality. All your core metrics live here.
                </p>
              </div>
            </div>
          </div>

          <div className={`admin-top-grid ${overviewExpanded ? "overview-expanded" : ""}`}>
            <div className={`admin-card admin-card--stack ${overviewExpanded ? "expanded" : ""}`}>
              <div className="admin-card__header">
                <span className="muted small">Overview</span>
                <button
                  className="icon-btn ghost"
                  type="button"
                  aria-label={overviewExpanded ? "Collapse" : "Expand"}
                  onClick={() => setOverviewExpanded((prev) => !prev)}
                >
                  <i className={`fas ${overviewExpanded ? "fa-chevron-left" : "fa-chevron-right"}`}></i>
                </button>
              </div>
              <div className="admin-overview-content">
                <div className="admin-overview-main">
                  {overviewCards.map((card) => (
                    <div key={card.label} className="admin-metric">
                      <div className="admin-metric__icon">
                        <i className={card.icon}></i>
                      </div>
                      <div>
                        <p className="admin-metric__label">{card.label}</p>
                        <h3 className="admin-metric__value">
                          {card.value}
                          {card.suffix ? <span>{card.suffix}</span> : null}
                        </h3>
                        <p className="admin-metric__meta">{card.meta}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {overviewExpanded && (
                  <div className="admin-overview-side">
                    <div className="overview-kpi">
                      <span className="muted small">Completion rate</span>
                      <strong>{Math.round(metrics.completionRate * 100)}%</strong>
                    </div>
                    <div className="overview-kpi">
                      <span className="muted small">Avg rating</span>
                      <strong>{metrics.avgRating.toFixed(2)} / 5</strong>
                    </div>
                    <div className="overview-kpi">
                      <span className="muted small">Last 30 days</span>
                      <strong>{metrics.formatCurrency(metrics.last30Revenue)}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`admin-card admin-card--earnings ${overviewExpanded ? "is-hidden" : ""}`}>
              <div className="admin-card__header">
                <div>
                  <span className="muted small">Earnings</span>
                  <h3>{showEarnings ? metrics.formatCurrency(metrics.last30Revenue) : "PHP *****"}</h3>
                  <p className="muted tiny">Last 30 days</p>
                </div>
                <button
                  className={`toggle-pill ${showEarnings ? "on" : ""}`}
                  type="button"
                  aria-label="Toggle earnings visibility"
                  aria-pressed={showEarnings}
                  onClick={() => setShowEarnings((prev) => !prev)}
                >
                  <span></span>
                </button>
              </div>
              <svg className="admin-sparkline" viewBox="0 0 140 50" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  points={earningsSeries
                    .map((v, i) => `${(i / (earningsSeries.length - 1)) * 140},${50 - v}`)
                    .join(" ")}
                />
              </svg>
              <div className="admin-sparkline__labels">
                {statsLabels.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>


            </div>
            <div className={`admin-card admin-card--manage ${overviewExpanded ? "is-hidden" : ""}`}>
              <div className="admin-card__header">
                <span className="muted small">Manage</span>
                <span className="admin-pager">2 / 4</span>
              </div>
              <div className="admin-illustration">
                <div className="tower tall"></div>
                <div className="tower mid"></div>
                <div className="tower short"></div>
                <div className="tower cap"></div>
              </div>
            </div>     
            
          </div>
            
          <div className="admin-bottom-grid">
            <div className="admin-card admin-card--analytics">
              <div className="admin-card__header">
                <div>
                  <span className="muted small">Analytics</span>
                  <h4>Performance</h4>
                </div>
                <button className="btn pill ghost" type="button">
                  {analyticsRangeLabel}
                </button>
              </div>
              <svg className="admin-linechart" viewBox="0 0 280 140" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#5b7cfa"
                  strokeWidth="3"
                  points={analyticsSeriesA
                    .map((v, i) => `${(i / (analyticsSeriesA.length - 1)) * 280},${140 - v * 3}`)
                    .join(" ")}
                />
                <polyline
                  fill="none"
                  stroke="#67c1f7"
                  strokeWidth="3"
                  points={analyticsSeriesB
                    .map((v, i) => `${(i / (analyticsSeriesB.length - 1)) * 280},${140 - v * 3}`)
                    .join(" ")}
                />
              </svg>
              <div className="admin-legend">
                <span><i className="dot primary"></i> Active users</span>
                <span><i className="dot alt"></i> Payments</span>
              </div>
              <div className="admin-metrics-grid">
                <div className="admin-metric-block">
                  <h5>Profitability</h5>
                  {profitabilityMetrics.map((item) => (
                    <div key={item.label} className="admin-metric-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="admin-metric-block">
                  <h5>Customer Satisfaction</h5>
                  {satisfactionMetrics.map((item) => (
                    <div key={item.label} className="admin-metric-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="admin-metric-block">
                  <h5>Performance</h5>
                  {performanceMetrics.map((item) => (
                    <div key={item.label} className="admin-metric-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="admin-metric-block">
                  <h5>Operational Efficiency</h5>
                  {efficiencyMetrics.map((item) => (
                    <div key={item.label} className="admin-metric-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-card admin-card--stats">
              <div className="admin-card__header">
                <div>
                  <span className="muted small">Statistics</span>
                  <h4>{statsRangeDays === 30 ? "Last 30 days" : "Weekly"}</h4>
                </div>
                <div className="stats-menu">
                  <button
                    className="icon-btn ghost"
                    type="button"
                    aria-label="More"
                    aria-expanded={statsMenuOpen}
                    onClick={() => setStatsMenuOpen((prev) => !prev)}
                  >
                    <i className="fas fa-ellipsis-h"></i>
                  </button>
                  <div
                    className={`stats-menu__dropdown ${statsMenuOpen ? "open" : ""}`}
                    onMouseLeave={() => setStatsMenuOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleExportCsv();
                        setStatsMenuOpen(false);
                      }}
                    >
                      Export report
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleRefreshData();
                        setStatsMenuOpen(false);
                      }}
                    >
                      Refresh data
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatsRangeDays((prev) => (prev === 30 ? 7 : 30));
                        setStatsMenuOpen(false);
                      }}
                    >
                      {statsRangeDays === 30 ? "Last 7 days" : "Last 30 days"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="admin-bars">
                {statsBars.map((bar) => (
                  <div key={bar.label} className="admin-bar">
                    <span>{bar.label}</span>
                    <div className="admin-bar__track">
                      <div className="admin-bar__fill" style={{ width: `${bar.value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>

        <aside className="dash-rail">
          <div className="rail-card user-summary profile-card">
            <div className="rail-actions">
              <div className="menu-trigger" title="Menu">
                <button
                  type="button"
                  className="menu-button"
                  style={{ position: "relative" }}
                  aria-label="Menu"
                  onClick={(e) => {
                    const drop = e.currentTarget.nextElementSibling;
                    const isOpen = drop.dataset.open === "true";
                    drop.dataset.open = isOpen ? "false" : "true";
                    drop.style.opacity = isOpen ? "0" : "1";
                    drop.style.pointerEvents = isOpen ? "none" : "auto";
                    drop.style.transform = isOpen ? "translateY(-6px)" : "translateY(0)";
                  }}
                >
                  {unreadCount > 0 && <span className="ping-dot" aria-hidden="true"></span>}
                  <i className="fas fa-ellipsis-v"></i>
                </button>
                <div
                  className="menu-dropdown"
                  data-open="false"
                  onMouseLeave={(e) => {
                    e.currentTarget.dataset.open = "false";
                    e.currentTarget.style.opacity = "0";
                    e.currentTarget.style.pointerEvents = "none";
                    e.currentTarget.style.transform = "translateY(-6px)";
                  }}
                >
                  <button onClick={() => navigate("/admin/settings")}><i className="fas fa-cog"></i> Settings</button>
                  <button onClick={() => {
                    const root = document.documentElement;
                    const next = !root.classList.contains("dark-mode");
                    if (next) root.classList.add("dark-mode");
                    else root.classList.remove("dark-mode");
                    localStorage.setItem("theme", next ? "dark" : "light");
                    setDarkLabel(next ? "Light mode" : "Dark mode");
                  }}>
                    <i className="fas fa-moon"></i> {darkLabel}
                  </button>
                  <button onClick={() => navigate("/admin/notifications")} style={{ position: "relative" }}>
                    <i className="fas fa-bell"></i> Notifications
                    {unreadCount > 0 && <span className="ping-dot small" aria-hidden="true"></span>}
                  </button>
                  <button onClick={() => navigate("/login")} className="danger"><i className="fas fa-sign-out-alt"></i> Logout</button>
                </div>
              </div>
            </div>
            <div
              className="avatar-circle lg"
              style={{
                backgroundImage: adminAvatarUrl ? `url(${adminAvatarUrl})` : undefined,
                backgroundSize: adminAvatarUrl ? "cover" : undefined,
                backgroundPosition: adminAvatarUrl ? "center" : undefined,
                color: adminAvatarUrl ? "transparent" : undefined
              }}
            >
              {profileInitials}
            </div>
            <h4 className="profile-name">{profileName}</h4>
            <p className="profile-role">Administrator</p>
            <div className="rail-mini-list">
              <div className="rail-mini-item">
                <span className="mini-label"><i className="fas fa-sync"></i> Last sync</span>
                <span className="mini-value">5m ago</span>
              </div>
            </div>
          </div>

          <div className="rail-card notification-card">
            <div className="rail-header">
              <h4>Notifications</h4>
              <span className="muted small">{unreadCount} unread</span>
            </div>
            <div className="notification-list">
              {unreadNotifications.slice(0, 6).map((n) => (
                <button
                  key={n.id}
                  className={`notification-item ${n.status === "read" ? "read" : "unread"} fade-in`}
                  onClick={() => markRead(n.id, "read")}
                  type="button"
                >
                  <div className="notification-top">
                    <span className="notification-title">{n.title || "Notification"}</span>
                    {n.createdAt ? (
                      <span className="muted tiny">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <p className="notification-body">
                    {n.message || n.preview || n.body || "—"}
                  </p>
                  {n.email && (
                    <span className="muted tiny">From: {n.name || "Visitor"} · {n.email}</span>
                  )}
                </button>
              ))}
              {!unreadNotifications.length && (
                <p className="muted small">No notifications yet.</p>
              )}
            </div>
            <div className="rail-actions" style={{ marginTop: 8 }}>
              <button className="btn pill ghost" type="button" onClick={markAllRead}>
                Mark all read
              </button>
            </div>
          </div>

          <div className="rail-card calendar-card">
            <div className="rail-actions">
              <button className="icon-btn ghost" aria-label="Prev month" onClick={() => setMonthOffset((o) => o - 1)}>
                <i className="fas fa-chevron-left"></i>
              </button>
              <div className="muted" style={{ fontWeight: 700 }}>{monthLabel}</div>
              <button className="icon-btn ghost" aria-label="Next month" onClick={() => setMonthOffset((o) => o + 1)}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            <div className="calendar-grid">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div key={d} className="calendar-head">{d}</div>
              ))}
              {monthDays.map((d, idx) => {
                const isToday =
                  d === today.getDate() &&
                  visibleMonth === today.getMonth() &&
                  visibleYear === today.getFullYear();
                return (
                  <div
                    key={`${d}-${idx}`}
                    className={`calendar-cell ${d ? "" : "empty"} ${isToday ? "today" : ""}`}
                  >
                    {d || ""}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rail-card reminder-card">
            <div className="rail-header">
              <h4>Reminders</h4>
              <span className="muted small">{reminders.length} items</span>
            </div>
            <div className="reminder-input">
              <input
                type="text"
                placeholder="Add reminder..."
                value={newReminder}
                onChange={(e) => setNewReminder(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addReminder();
                }}
              />
              <button className="btn pill primary" onClick={addReminder}>Add</button>
            </div>
            <div className="reminder-list">
              {reminders.map((r) => (
                <label key={r.id} className={`reminder-item ${r.done ? "done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={r.done}
                    onChange={() => toggleReminder(r.id)}
                  />
                  <span>{r.text}</span>
                </label>
              ))}
              {!reminders.length && <p className="muted small">No reminders yet.</p>}
            </div>
          </div>

          <div className="rail-card note-card">
            <div className="rail-header">
              <h4>Notes</h4>
              <span className="muted small">Quick pad</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="note-pad"
              placeholder="Type notes..."
            />
          </div>

        </aside>
      </div>
    </div>
  );
}

export default Dashboard;


