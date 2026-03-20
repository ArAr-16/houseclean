import React from "react";
import Staff from "./Staff";

function StaffDashboard() {
  return (
    <Staff
      visibleSections={{
        dashboard: true,
        tasks: true,
        requests: false
      }}
    />
  );
}

export default StaffDashboard;
