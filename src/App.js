import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { DarkModeProvider } from "./context/DarkModeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AdminSidebar from "./components/AdminSidebar";
import FloatingThemeToggle from "./components/FloatingThemeToggle";
import BroomLoader from "./components/BroomLoader";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffRequests from "./pages/staff/StaffRequests";
import StaffSchedule from "./pages/staff/StaffSchedule";
import StaffHistory from "./pages/staff/StaffHistory";
import StaffSettings from "./pages/staff/StaffSettings";
import StaffNotifications from "./pages/staff/StaffNotifications";
import Customer from "./pages/customer/Customer";
import CustomerSettings from "./pages/customer/CustomerSettings";
import CustomerRequests from "./pages/customer/CustomerRequests";
import CustomerPayments from "./pages/customer/CustomerPayments";
import CustomerHistoryPage from "./pages/customer/CustomerHistoryPage";
import CustomerNotificationsPage from "./pages/customer/CustomerNotificationsPage";
import Dashboard from "./pages/admin/Dashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import History from "./pages/admin/History";
import Settings from "./pages/admin/Settings";
import Notifications from "./pages/admin/Notifications";
import { auth } from "./firebase";
import { resolveAdminStatus } from "./utils/adminRole";
import "./App.css";
import "./styles/DarkModeEnhancements.css";

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';
  const isCustomerPage = location.pathname.startsWith('/customer') || location.pathname.startsWith('/householder');
  const isStaffPage = location.pathname.startsWith('/staff');
  const isAdminPage = location.pathname.startsWith('/admin');
  const [adminGuard, setAdminGuard] = useState({ loading: false, allowed: false, checked: false });
  const loadingMessages = [
    "Signing you in…",
    "Checking householder access…",
    "Checking housekeeper access…",
    "Checking admin access…"
  ];
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isAdminPage) {
      setAdminGuard({ loading: false, allowed: false, checked: false });
      setMessageIndex(0);
      return undefined;
    }

    setAdminGuard({ loading: true, allowed: false, checked: false });
    setMessageIndex(0);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAdminGuard({ loading: false, allowed: false, checked: true });
        return;
      }

      let isAdmin = false;
      try {
        const adminState = await resolveAdminStatus(user);
        isAdmin = adminState.isAdmin;
      } catch (error) {
        isAdmin = false;
      }

      setAdminGuard({ loading: false, allowed: isAdmin, checked: true });
    });

    return () => unsubscribe();
  }, [isAdminPage]);

  useEffect(() => {
    if (!isAdminPage) return undefined;
    if (!adminGuard.loading && adminGuard.checked) return undefined;
    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % loadingMessages.length);
    }, 900);
    return () => clearInterval(interval);
  }, [adminGuard.loading, adminGuard.checked, isAdminPage, loadingMessages.length]);

  return (
    <div className="App">
      {isAdminPage && (!adminGuard.checked || adminGuard.loading) && (
        <BroomLoader message="Sweeping admin access…" fullscreen />
      )}
      {!isAdminPage && !isStaffPage && !isCustomerPage && <FloatingThemeToggle />}
      {/* Hide Navbar on login and register pages */}
      {!isLoginPage && !isRegisterPage && !isAdminPage && !isStaffPage && !isCustomerPage && <Navbar />}
      {isAdminPage ? (
        !adminGuard.checked || adminGuard.loading ? (
          <div className="main-content" />
        ) : !adminGuard.allowed ? (
          <Navigate to="/login" replace />
        ) : (
        <div className="admin-area">
          <div className="admin-container">
            <AdminSidebar />
            <main className="admin-main">
              <Routes>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/users" element={<ManageUsers />} />
                <Route path="/admin/history" element={<History />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/notifications" element={<Notifications />} />
              </Routes>
            </main>
          </div>
        </div>
        )
      ) : isStaffPage ? (
        <>
          <div className="main-content">
            <main>
              <Routes>
                <Route path="/staff" element={<StaffDashboard />} />
                <Route path="/staff/requests" element={<StaffRequests />} />
                <Route path="/staff/notifications" element={<StaffNotifications />} />
                <Route path="/staff/schedule" element={<StaffSchedule />} />
                <Route path="/staff/history" element={<StaffHistory />} />
                <Route path="/staff/settings" element={<StaffSettings />} />
              </Routes>
            </main>
          </div>
          {!isLoginPage && !isRegisterPage && !isAdminPage && <Footer />}
        </>
      ) : (
        <>
          <div className="main-content">
            <main>
              <Routes location={location} key={location.key}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/services" element={<Services />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/customer" element={<Customer />} />
                <Route path="/customer/requests" element={<CustomerRequests />} />
                <Route path="/customer/payments" element={<CustomerPayments />} />
                <Route path="/customer/history" element={<CustomerHistoryPage />} />
                <Route path="/customer/notifications" element={<CustomerNotificationsPage />} />
                <Route path="/customer/settings" element={<CustomerSettings />} />
                <Route path="/householder" element={<Customer />} />
                <Route path="/householder/requests" element={<CustomerRequests />} />
                <Route path="/householder/payments" element={<CustomerPayments />} />
                <Route path="/householder/history" element={<CustomerHistoryPage />} />
                <Route path="/householder/notifications" element={<CustomerNotificationsPage />} />
                <Route path="/householder/settings" element={<CustomerSettings />} />
                <Route path="/staff" element={<StaffDashboard />} />
                <Route path="/staff/requests" element={<StaffRequests />} />
                <Route path="/staff/notifications" element={<StaffNotifications />} />
                <Route path="/staff/schedule" element={<StaffSchedule />} />
                <Route path="/staff/history" element={<StaffHistory />} />
                <Route path="/staff/settings" element={<StaffSettings />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Routes>
            </main>
          </div>
          {/* Hide Footer on login and register pages */}
          {!isLoginPage && !isRegisterPage && <Footer />}
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <Router>
        <AppContent />
      </Router>
    </DarkModeProvider>
  );
}

export default App;
