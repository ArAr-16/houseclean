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
import Staff from "./pages/Staff";
import Customer from "./pages/Customer";
import Dashboard from "./pages/admin/Dashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import History from "./pages/admin/History";
import Settings from "./pages/admin/Settings";
import Notifications from "./pages/admin/Notifications";
import { auth } from "./firebase";
import { resolveAdminStatus } from "./utils/adminRole";
import "./App.css";

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
                <Route path="/staff" element={<Staff />} />
              </Routes>
            </main>
          </div>
          {!isLoginPage && !isRegisterPage && !isAdminPage && <Footer />}
        </>
      ) : (
        <>
          <div className="main-content">
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/services" element={<Services />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/customer" element={<Customer />} />
                <Route path="/householder" element={<Customer />} />
                <Route path="/staff" element={<Staff />} />
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
