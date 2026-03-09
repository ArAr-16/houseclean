import { getIdTokenResult } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where
} from "firebase/firestore";
import {
  equalTo,
  get,
  getDatabase,
  orderByChild,
  query as rtdbQuery,
  ref
} from "firebase/database";
import { db } from "../firebase";

const STATIC_ADMIN_EMAILS = ["arlryyy@gmail.com"].map((e) => e.toLowerCase());

function roleIsAdmin(role) {
  return String(role || "").toLowerCase() === "admin";
}

function emailIsStaticAdmin(email) {
  if (!email) return false;
  return STATIC_ADMIN_EMAILS.includes(String(email).toLowerCase());
}

export async function resolveAdminStatus(user) {
  let isAdminFromClaims = false;
  let profile = null;
  let profileSource = null;

  try {
    const tokenResult = await getIdTokenResult(user, true);
    isAdminFromClaims =
      tokenResult?.claims?.admin === true ||
      roleIsAdmin(tokenResult?.claims?.role);
  } catch (error) {
    isAdminFromClaims = false;
  }

  // Firestore lookup by UID (capitalized collection used by the app).
  try {
    const userDoc = await getDoc(doc(db, "Users", user.uid));
    if (userDoc.exists()) {
      profile = userDoc.data();
      profileSource = "firestore_uid";
    }
  } catch (err) {
    // swallow and continue to other sources
  }

  let profileIsAdmin = roleIsAdmin(profile?.role);

  // Firestore fallback by email for manually-created admin docs.
  if ((!profile || !profileIsAdmin) && user.email) {
    try {
      const emailQuery = query(
        collection(db, "Users"),
        where("email", "==", user.email),
        limit(1)
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        profile = emailSnapshot.docs[0].data();
        profileSource = "firestore_email";
        profileIsAdmin = roleIsAdmin(profile?.role);
      }
    } catch (err) {
      // swallow
    }
  }

  // Legacy Firestore lookup by UID (lowercase collection kept for backwards compatibility).
  if (!profile) {
    try {
      const legacyUserDoc = await getDoc(doc(db, "Users", user.uid));
      if (legacyUserDoc.exists()) {
        profile = legacyUserDoc.data();
        profileSource = "firestore_uid_legacy";
      }
    } catch (err) {
      // swallow
    }
  }

  // Legacy Firestore fallback by email (lowercase collection).
  if ((!profile || !roleIsAdmin(profile?.role)) && user.email) {
    try {
      const emailQuery = query(
        collection(db, "Users"),
        where("email", "==", user.email),
        limit(1)
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        profile = emailSnapshot.docs[0].data();
        profileSource = "firestore_email_legacy";
        profileIsAdmin = roleIsAdmin(profile?.role);
      }
    } catch (err) {
      // swallow
    }
  }

  // Realtime Database fallback by UID (lowercase path).
  if (!profile || !roleIsAdmin(profile?.role)) {
    try {
      const rtdb = getDatabase();
      const uidSnapshot = await get(ref(rtdb, `Users/${user.uid}`));
      if (uidSnapshot.exists()) {
        profile = uidSnapshot.val();
        profileSource = "rtdb_uid";
      }
    } catch (err) {
      // swallow
    }
  }

  // Realtime Database fallback by UID (capitalized path some datasets use).
  if (!profile || !roleIsAdmin(profile?.role)) {
    try {
      const rtdb = getDatabase();
      const uidSnapshot = await get(ref(rtdb, `Users/${user.uid}`));
      if (uidSnapshot.exists()) {
        profile = uidSnapshot.val();
        profileSource = "rtdb_uid_capital";
      }
    } catch (err) {
      // swallow
    }
  }

  // Realtime Database fallback by email (lowercase path).
  if ((!profile || !roleIsAdmin(profile?.role)) && user.email) {
    try {
      const rtdb = getDatabase();
      const emailSnapshot = await get(
        rtdbQuery(ref(rtdb, "Users"), orderByChild("email"), equalTo(user.email))
      );
      if (emailSnapshot.exists()) {
        const firstMatch = Object.values(emailSnapshot.val() || {})[0];
        if (firstMatch) {
          profile = firstMatch;
          profileSource = "rtdb_email";
        }
      }
    } catch (err) {
      // swallow
    }
  }

  // Realtime Database fallback by email (capitalized path).
  if ((!profile || !roleIsAdmin(profile?.role)) && user.email) {
    try {
      const rtdb = getDatabase();
      const emailSnapshot = await get(
        rtdbQuery(ref(rtdb, "Users"), orderByChild("email"), equalTo(user.email))
      );
      if (emailSnapshot.exists()) {
        const firstMatch = Object.values(emailSnapshot.val() || {})[0];
        if (firstMatch) {
          profile = firstMatch;
          profileSource = "rtdb_email_capital";
        }
      }
    } catch (err) {
      // swallow
    }
  }

  const isAdminFromProfile = roleIsAdmin(profile?.role);
  const isAdminFromStaticEmail = emailIsStaticAdmin(user.email);

  return {
    isAdmin: isAdminFromClaims || isAdminFromProfile || isAdminFromStaticEmail,
    isAdminFromClaims,
    isAdminFromProfile,
    isAdminFromStaticEmail,
    profile,
    profileSource
  };
}
