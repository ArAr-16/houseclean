import { useEffect, useMemo, useState } from "react";
import { rtdb } from "../../firebase";
import {
  equalTo,
  onValue,
  orderByChild,
  query as rtdbQuery,
  ref as rtdbRef
} from "firebase/database";

export function useCustomerServiceRequests(uid) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setRequests([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const q = rtdbQuery(
      rtdbRef(rtdb, "ServiceRequests"),
      orderByChild("householderId"),
      equalTo(uid)
    );

    const stop = onValue(
      q,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, data]) => ({
          id,
          requestId: data?.requestId || id,
          ...(data || {})
        }));
        list.sort((a, b) => {
          const aMs = Number(a.createdAt ?? a.timestamp ?? 0) || 0;
          const bMs = Number(b.createdAt ?? b.timestamp ?? 0) || 0;
          return bMs - aMs;
        });
        setRequests(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => stop();
  }, [uid]);

  return useMemo(() => ({ requests, loading }), [loading, requests]);
}

export function useCustomerNotifications(uid, { limit = 50 } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const notifRef = rtdbRef(rtdb, `UserNotifications/${uid}`);
    const stop = onValue(
      notifRef,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, data]) => ({
          id,
          ...(data || {}),
          createdAt: data?.createdAt || 0
        }));
        list.sort((a, b) => (Number(b.createdAt || 0) || 0) - (Number(a.createdAt || 0) || 0));
        setNotifications(list.slice(0, Math.max(1, Number(limit) || 50)));
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => stop();
  }, [limit, uid]);

  return useMemo(() => ({ notifications, loading }), [loading, notifications]);
}

