import React from "react";
import Staff from "./Staff";

function StaffDashboard() {
  return (
    <Staff
      visibleSections={{
        dashboard: true,
        tasks: true,
        notifications: true,
        settings: true
      }}
    />
  );
}

export default StaffDashboard;
