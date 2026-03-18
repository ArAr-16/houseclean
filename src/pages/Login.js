import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo.png";
import BroomLoader from "../components/BroomLoader";
import "./Login.css";
import { auth, db, rtdb } from "../firebase";
import { signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, update, get } from "firebase/database";
import { resolveAdminStatus } from "../utils/adminRole";

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setError('');
    const { name, value } = e.target;
    if (name === "password") {
      const cleaned = value.replace(/\s/g, "");
      if (cleaned.length !== value.length) {
        setError("Password cannot contain spaces.");
      }
      setFormData({ ...formData, [name]: cleaned });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const email = formData.email.trim();
      const password = formData.password;
      if (/\s/.test(password)) {
        setIsLoading(false);
        setError("Password cannot contain spaces.");
        return;
      }
      await setPersistence(auth, browserSessionPersistence);
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
        // Default non-admin users to householder to match app routing.
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
        navigate("/admin");
      } else if (role === "housekeeper" || role === "staff") {
        navigate("/staff");
      } else if (role === "householder" || role === "customer" || role === "user") {
        navigate("/customer");
      } else {
        navigate("/");
      }
    } catch (error) {
      setIsLoading(false);
      const code = error?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
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

  return (
    <div className="login-page">
      {isLoading && !error && <BroomLoader message="Sweeping you in…" fullscreen />}
      <div className="login-container">
        <div className="login-form">
          <div className="back-button">
            <button onClick={() => navigate('/')} className="back-btn">
              Back to Home
            </button>
          </div>
          
          <div className="form-header">
            <h2>Hello!</h2>
            <p>Sign in to your account</p>
            {error && <div className="form-error">{error}</div>}
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
    </div>
  );
}

export default Login;
