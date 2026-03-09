import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import "./Login.css";

function Register() {
  const [signUpStep, setSignUpStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    province: '',
    municipality: '',
    barangay: '',
    address: '',
    landmark: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [errorFields, setErrorFields] = useState({});
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const isValidName = (value, allowSpaces = false) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const lettersOnly = allowSpaces ? /^[A-Za-z ]+$/ : /^[A-Za-z]+$/;
    if (!lettersOnly.test(trimmed)) return false;
    const letterCount = trimmed.replace(/[^A-Za-z]/g, "").length;
    return letterCount >= 2;
  };

  const isValidFirstName = (value) => isValidName(value, true);
  const isValidLastName = (value) => isValidName(value, true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError('');

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 11);
      const hadNonDigit = digitsOnly.length !== value.length;
      const tooLong = value.length > 11 || digitsOnly.length > 11;
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
      setErrorFields((prev) => ({
        ...prev,
        phone: hadNonDigit || tooLong
      }));
      if (hadNonDigit || tooLong) {
        setError('Phone number must be digits only, max 11 characters.');
      }
      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
    setErrorFields((prev) => ({ ...prev, [name]: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (signUpStep === 1) {
      // shouldn't reach here because Next button advances to step 2
      return;
    }
    setSuccess(false);
    const nextErrors = {};
    if (!isValidFirstName(formData.firstName) || !isValidLastName(formData.lastName)) {
      setError('First and last name must be letters only (A-Z), min 2 letters. Spaces allowed.');
      nextErrors.firstName = !isValidFirstName(formData.firstName);
      nextErrors.lastName = !isValidLastName(formData.lastName);
      setErrorFields(nextErrors);
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // basic email
    const phonePattern = /^09\d{9}$/; // PH mobile, 11 digits starting with 09
    if (!phonePattern.test(formData.phone.trim())) {
      setError('Phone number must be 11 digits, start with 09, numbers only.');
      nextErrors.phone = true;
      setErrorFields(nextErrors);
      return;
    }
    if (formData.password.length < 6 || formData.password.length > 16) {
      setError('Password must be 6 to 16 characters.');
      nextErrors.password = true;
      setErrorFields(nextErrors);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      nextErrors.password = true;
      nextErrors.confirmPassword = true;
      setErrorFields(nextErrors);
      return;
    }
    if (!emailPattern.test(formData.email.trim())) {
      setError('Please enter a valid email address (example@gmail.com).');
      setErrorFields({ email: true });
      return;
    }
    setErrorFields({});
    try {
      // Uniqueness checks before creating auth user (email + phone)
      const emailInput = formData.email.trim();
      const emailLower = emailInput.toLowerCase();
      let emailSnapshot = await getDocs(
        query(collection(db, "Users"), where("email", "==", emailInput), limit(1))
      );
      if (emailSnapshot.empty && emailLower !== emailInput) {
        emailSnapshot = await getDocs(
          query(collection(db, "Users"), where("email", "==", emailLower), limit(1))
        );
      };


      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      await setDoc(doc(db, "Users", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        province: formData.province,
        municipality: formData.municipality,
        barangay: formData.barangay,
        address: formData.address,
        landmark: formData.landmark,
        email: emailInput,
        phone: formData.phone,
        role: "Householder"
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      let friendly = "";

    

      setError(friendly || "");
    }
  };

  const goToNextStep = () => {
    const nextErrors = {};
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.barangay) {
      setError('Please enter your first name, last name and complete the location (Barangay/House number & street)');
      nextErrors.firstName = !formData.firstName.trim();
      nextErrors.lastName = !formData.lastName.trim();
      nextErrors.barangay = !formData.barangay;
      setErrorFields(nextErrors);
      return;
    }
    if (!isValidFirstName(formData.firstName) || !isValidLastName(formData.lastName)) {
      setError('First and last name must be letters only (A-Z), min 2 letters. Spaces allowed.');
      nextErrors.firstName = !isValidFirstName(formData.firstName);
      nextErrors.lastName = !isValidLastName(formData.lastName);
      setErrorFields(nextErrors);
      return;
    }
    if (!formData.address || !formData.address.trim()) {
      setError('Please enter your house number and street');
      nextErrors.address = true;
      setErrorFields(nextErrors);
      return;
    }
    if (!formData.landmark || !formData.landmark.trim()) {
      setError('Please enter a landmark or nearby reference for your area');
      nextErrors.landmark = true;
      setErrorFields(nextErrors);
      return;
    }
    setError('');
    setErrorFields({});
    setSignUpStep(2);
  };

  return (
    <div className="login-page">
      <div className="login-container signup-only">
        <div className="login-form">
          <div className="form-header">
            <h2>Create Account</h2>
            <p>Join HouseClean today</p>
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">Registration successful! Redirecting to sign in...</div>}
          </div>
          <form onSubmit={handleSubmit} className="form-content">
            {signUpStep === 1 ? (
              <>
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="Enter your first name"
                    className={errorFields.firstName ? "input-error" : ""}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Enter your last name"
                    className={errorFields.lastName ? "input-error" : ""}
                  />
                </div>
                <div className="form-group">
                  <div>
                    <label htmlFor="barangay">Barangay (Dagupan)</label>
                    <select id="barangay" name="barangay" value={formData.barangay} onChange={handleChange} required className={errorFields.barangay ? "input-error" : ""}>
                      <option value="">Select barangay</option>
                      <option value="Bacayao Norte">Bacayao Norte</option>
                      <option value="Bacayao Sur">Bacayao Sur</option>
                      <option value="Barangay I (Poblacion Oeste)">Barangay I (Poblacion Oeste)</option>
                      <option value="Barangay II (Nueva)">Barangay II (Nueva)</option>
                      <option value="Barangay III (Zamora)">Barangay III (Zamora)</option>
                      <option value="Barangay IV (Tondaligan)">Barangay IV (Tondaligan)</option>
                      <option value="Bolosan">Bolosan</option>
                      <option value="Bonuan Binloc">Bonuan Binloc</option>
                      <option value="Bonuan Boquig">Bonuan Boquig</option>
                      <option value="Bonuan Gueset">Bonuan Gueset</option>
                      <option value="Calmay">Calmay</option>
                      <option value="Carael">Carael</option>
                      <option value="Caranglaan">Caranglaan</option>
                      <option value="Herrero-Perez">Herrero-Perez</option>
                      <option value="Lasip Chico">Lasip Chico</option>
                      <option value="Lasip Grande">Lasip Grande</option>
                      <option value="Lomboy">Lomboy</option>
                      <option value="Lucao">Lucao</option>
                      <option value="Malued">Malued</option>
                      <option value="Mamalingling">Mamalingling</option>
                      <option value="Mangin">Mangin</option>
                      <option value="Mayombo">Mayombo</option>
                      <option value="Pantal">Pantal</option>
                      <option value="Pogo Chico">Pogo Chico</option>
                      <option value="Pogo Grande">Pogo Grande</option>
                      <option value="Pugaro Suit">Pugaro Suit</option>
                      <option value="Salapingao">Salapingao</option>
                      <option value="Salisay">Salisay</option>
                      <option value="Tambac">Tambac</option>
                      <option value="Tapuac">Tapuac</option>
                      <option value="Tebeng">Tebeng</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="address">House No. & Street</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 1234 Main St, Unit 5"
                    className={errorFields.address ? "input-error" : ""}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="landmark">Landmark / Nearby Reference</label>
                  <input
                    type="text"
                    id="landmark"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 'Near Central Park' or 'Opposite Mall'"
                    className={errorFields.landmark ? "input-error" : ""}
                  />
                </div>
                <div className="form-group">
                  <button type="button" onClick={goToNextStep} className="submit-btn">Next</button>
                </div>
              </>
            ) : (
              <>
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
                    className={errorFields.email ? "input-error" : ""}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="11-digit PH mobile (09xxxxxxxxx)"
                    maxLength="11"
                    className={errorFields.phone ? "input-error" : ""}
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
                      className={errorFields.password ? "input-error" : ""}
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
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showConfirm ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm your password"
                      className={errorFields.confirmPassword ? "input-error" : ""}
                    />
                    <button
                      type="button"
                      className="toggle-password icon-only"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      <i className={`fas ${showConfirm ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <button type="submit" className="submit-btn">Register</button>
                </div>
                <div className="form-group">
                  <button type="button" className="toggle-btn" onClick={() => setSignUpStep(1)}>Back</button>
                </div>
              </>
            )}
          </form>
          <div className="form-footer">
            <p>
              Already have an account?
              <button type="button" onClick={() => navigate("/login")} className="toggle-btn">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
