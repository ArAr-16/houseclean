import React from "react";
import { useDarkMode } from "../context/DarkModeContext";
import "./FloatingThemeToggle.css";

function FloatingThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      className="floating-theme-toggle"
      onClick={toggleDarkMode}
      title={isDarkMode ? "Light Mode" : "Dark Mode"}
    >
      {isDarkMode ? '☀️' : '🌙'}
    </button>
  );
}

export default FloatingThemeToggle;
