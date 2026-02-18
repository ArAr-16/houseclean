import React from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import "./Navbar.css";
import Logo from "./Logo.png";

function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <img src={Logo} alt="Houseclean Logo" className="logo-img" />
      <ul className="nav-links">
        <li><NavLink to="/">HOME</NavLink></li>
        <li><NavLink to="/about">ABOUT US</NavLink></li>
        <li><NavLink to="/services">SERVICES</NavLink></li>
        <li><NavLink to="/blog">BLOG</NavLink></li>
        <li><NavLink to="/contact">CONTACT US</NavLink></li>
      </ul>
      <div className="nav-actions">
        <button className="cssbuttons-io" onClick={() => navigate('/login')}>
          <span>Login</span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
