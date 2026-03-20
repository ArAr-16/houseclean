import React from "react";
import "./BroomLoader.css";

function BroomLoader({ message = "Sweeping things up…", fullscreen = true }) {
  return (
    <div
      className={`broom-overlay ${fullscreen ? "fullscreen" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="broom-loader">
        <div className="broom-handle" />
        <div className="broom-head" />       
        <div className="sparkles">
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
        </div>
      </div>
      <p>{message}</p>
    </div>
  );
}

export default BroomLoader;
