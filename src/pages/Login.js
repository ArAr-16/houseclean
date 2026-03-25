import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { get, ref, update } from "firebase/database";
import Logo from "../components/Logo.png";
import BroomLoader from "../components/BroomLoader";
import { auth, db, rtdb } from "../firebase";
import { logAdminHistory } from "../utils/adminHistory";
import { resolveAdminStatus } from "../utils/adminRole";
import "./Login.css";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [resetEmail, setResetEmail] = useState("");
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setError("");
    setSuccess("");
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === "password") {
      const cleaned = value.replace(/\s/g, "");
      if (cleaned.length !== value.length) {
        setError("Password cannot contain spaces.");
      }
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openForgotPasswordModal = () => {
    if (isLoading) return;
    setError("");
    setSuccess("");
    setResetEmail(formData.email.trim());
    setIsForgotModalOpen(true);
  };

  const closeForgotPasswordModal = () => {
    if (isLoading) return;
    setIsForgotModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const email = formData.email.trim();
      const password = formData.password;

      if (/\s/.test(password)) {
        setIsLoading(false);
        setError("Password cannot contain spaces.");
        return;
      }

      await setPersistence(
        auth,
        formData.rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      try {
        const statusSnap = await get(ref(rtdb, `Users/${user.uid}/status`));
        if (statusSnap.exists()) {
          const statusValue = String(statusSnap.val()).toLowerCase();
          if (statusValue === "disabled" || statusValue === "archived") {
            await signOut(auth);
            setIsLoading(false);
            setError(
              statusValue === "archived"
                ? "This account has been archived by an administrator."
                : "This account has been disabled by an administrator."
            );
            return;
          }
        }
      } catch (statusErr) {
        console.warn("Status check skipped", statusErr?.code);
      }

      const adminState = await resolveAdminStatus(user);
      const normalizedProfile = {
        ...(adminState.profile || {}),
        email: user.email || email,
        role: adminState.isAdmin ? "admin" : (adminState.profile?.role || "householder")
      };

      try {
        await setDoc(doc(db, "Users", user.uid), normalizedProfile, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore sync skipped (permission)", fsErr?.code);
      }

      try {
        await update(ref(rtdb, `Users/${user.uid}`), normalizedProfile);
      } catch (rtdbErr) {
        console.warn("RTDB sync skipped (permission)", rtdbErr?.code);
      }

      const role = (normalizedProfile.role || "").toLowerCase();
      if (adminState.isAdmin) {
        logAdminHistory({
          type: "login",
          status: "success",
          action: "Admin login",
          message: `${user.email || email} signed in.`,
          userId: user.uid,
          userName: normalizedProfile.fullName || normalizedProfile.name || user.email
        });
        navigate("/admin");
      } else if (role === "housekeeper" || role === "staff") {
        navigate("/staff");
      } else if (role === "householder" || role === "customer" || role === "user") {
        if (!user.emailVerified) {
          await signOut(auth);
          setIsLoading(false);
          setError("Please verify your email before signing in as a householder.");
          return;
        }
        navigate("/customer");
      } else {
        navigate("/");
      }
    } catch (error) {
      setIsLoading(false);
      const code = error?.code || "";
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setError("Email or password is incorrect.");
      } else if (code === "auth/user-disabled") {
        setError("This account has been disabled. Please contact support.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Unable to sign in right now. Please try again.");
      }
      console.error("Login error", code, error?.message);
      return;
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (isLoading) return;

    const email = resetEmail.trim();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Enter your email so we know where to send the reset link.");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setFormData((prev) => ({ ...prev, email }));
      setIsForgotModalOpen(false);
      setSuccess("Password reset link sent. Please check your email inbox.");
    } catch (error) {
      const code = error?.code || "";
      if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/user-not-found") {
        setError("No account was found with that email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many reset attempts. Please wait a moment and try again.");
      } else {
        setError("Unable to send reset email right now. Please try again.");
      }
      console.error("Password reset error", code, error?.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="login-page">
      {isLoading && !error && <BroomLoader message="Sweeping you in..." fullscreen />}
      <div className="login-container">
        <div className="login-form">
          <div className="back-button">
            <button onClick={() => navigate("/")} className="back-btn">
              Back to Home
            </button>
          </div>

          <div className="form-header">
            <h2>Hello!</h2>
            <p>Sign in to your account</p>
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}
          </div>

          <form onSubmit={handleSubmit} className="form-content">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="toggle-password icon-only"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>
            <div className="login-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="forgot-password-btn"
                onClick={openForgotPasswordModal}
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>
            <button type="submit" className="submit-btn">Sign In</button>
          </form>

          <div className="form-footer">
            <p>
              Don't have an account?
              <button type="button" onClick={() => navigate("/register")} className="toggle-btn">
                Sign Up
              </button>
            </p>
          </div>
        </div>

        <div className="login-decoration">
          <div className="decoration-content">
            <img src={Logo} alt="Houseclean Logo" className="login-logo" />
            <p>Your trusted partner for professional cleaning services</p>
          </div>
        </div>
      </div>
      {isForgotModalOpen && (
        <div className="login-modal" role="dialog" aria-modal="true" aria-label="Reset password">
          <div className="login-modal__backdrop" onClick={closeForgotPasswordModal} />
          <div className="login-modal__panel">
            <div className="login-modal__header">
              <div>
                <h3>Forgot password?</h3>
                <p>Enter your email and we&apos;ll send you a password reset link.</p>
              </div>
              <button
                type="button"
                className="login-modal__close"
                onClick={closeForgotPasswordModal}
                aria-label="Close reset password modal"
                disabled={isLoading}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="login-modal__body">
              <label htmlFor="reset-email">Email address</label>
              <input
                type="email"
                id="reset-email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                autoFocus
              />
            </div>
            <div className="login-modal__actions">
              <button
                type="button"
                className="login-modal__secondary"
                onClick={closeForgotPasswordModal}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="login-modal__primary"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                Send reset link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
