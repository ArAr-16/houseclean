import { ref, push, set, serverTimestamp } from "firebase/database";
import { rtdb } from "../firebase";

export const logAdminHistory = async (entry = {}) => {
  try {
    const historyRef = ref(rtdb, "AdminHistory");
    const record = {
      type: entry.type || "log",
      status: entry.status || "info",
      action: entry.action || entry.message || "Activity",
      message: entry.message || "",
      ...entry,
      createdAt: serverTimestamp()
    };
    await set(push(historyRef), record);
  } catch {
    // Ignore logging failures to avoid blocking user actions.
  }
};
