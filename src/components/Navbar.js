import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import "./Navbar.css";
import Logo from "./Logo.png";

function Navbar() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const toggleNav = () => {
    setNavOpen(!navOpen);
  };

  const closeNav = () => {
    setNavOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="Logo">
        <img src={Logo} alt="Houseclean Logo" className="logo-img" />
      </div>
      <ul className={`nav-links ${navOpen ? "active" : ""}`}>
        <li><NavLink to="/" onClick={closeNav}>Home</NavLink></li>
        <li><NavLink to="/about" onClick={closeNav}>About Us</NavLink></li>
        <li><NavLink to="/services" onClick={closeNav}>Services</NavLink></li>
        <li><NavLink to="/blog" onClick={closeNav}>Blog</NavLink></li>
        <li><NavLink to="/contact" onClick={closeNav}>Contact Us</NavLink></li>
      </ul>
      <div className="nav-actions">
        <button className="cssbuttons-io" onClick={() => navigate('/login')}>
          <span>Login</span>
        </button>
        <button className="hamburger" onClick={toggleNav} aria-label="Toggle menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
