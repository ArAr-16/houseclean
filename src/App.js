import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { DarkModeProvider } from "./context/DarkModeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AdminSidebar from "./components/AdminSidebar";
import FloatingThemeToggle from "./components/FloatingThemeToggle";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import History from "./pages/admin/History";
import "./App.css";

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="App">
      {!isAdminPage && <FloatingThemeToggle />}
      {!isLoginPage && !isAdminPage && <Navbar />}
      {isAdminPage ? (
        <div className="admin-area">
          <div className="admin-container">
            <AdminSidebar />
            <main className="admin-main">
              <Routes>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/users" element={<ManageUsers />} />
                <Route path="/admin/history" element={<History />} />
              </Routes>
            </main>
          </div>
        </div>
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
                <Route path="/login" element={<Login />} />
              </Routes>
            </main>
          </div>
          {!isLoginPage && <Footer />}
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
