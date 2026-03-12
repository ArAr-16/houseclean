export function getCustomerSidebarItems(basePath) {
  const root = String(basePath || "/customer").startsWith("/householder") ? "/householder" : "/customer";
  return [
    { key: "home", label: "Home", icon: "fas fa-th-large", to: root, exact: true },
    { key: "request", label: "Track Your Requests", icon: "fas fa-broom", to: `${root}/requests` },
    { key: "payments", label: "Payments", icon: "fas fa-wallet", to: `${root}/payments` },
    { key: "history", label: "History", icon: "fas fa-history", to: `${root}/history` },
    { key: "settings", label: "Settings", icon: "fas fa-cog", to: `${root}/settings` }
  ];
}
