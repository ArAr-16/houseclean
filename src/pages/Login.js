import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo.png";
import "./Login.css";

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
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
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignUp) {
      if (signUpStep === 1) {
        // shouldn't reach here because Next button advances to step 2
        return;
      }

      // Final registration step
      if (formData.password !== formData.confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      // TODO: send registration data to backend
      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        province: formData.province,
        municipality: formData.municipality,
        barangay: formData.barangay,
        address: formData.address,
        landmark: formData.landmark,
        email: formData.email,
        phone: formData.phone,
      };
      console.log('Registering user:', registrationData);
      navigate('/');
    } else {
      // Sign in
      console.log('Signing in with:', { email: formData.email });
      navigate('/');
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setSignUpStep(1);
    setFormData({
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
  };

  const goToNextStep = () => {
    // basic validation for step 1
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.barangay) {
      alert('Please enter your first name, last name and complete the location (Barangay/House number & street)');
      return;
    }
    if (!formData.address || !formData.address.trim()) {
      alert('Please enter your house number and street');
      return;
    }
    if (!formData.landmark || !formData.landmark.trim()) {
      alert('Please enter a landmark or nearby reference for your area');
      return;
    }
    setSignUpStep(2);
  };

  return (
    <div className="login-page">
      <div className={`login-container ${isSignUp ? 'signup-only' : ''}`}>
        <div className="login-form">
          {!isSignUp && (
            <div className="back-button">
            <button onClick={() => navigate('/')} className="back-btn">
            Back to Home
            </button>
          </div>)}
          
          <div className="form-header">
            <h2>{isSignUp ? 'Create Account' : 'Hello!'}</h2>
            <p>{isSignUp ? 'Join HouseClean today' : 'Sign in to your account'}</p>
          </div>

          <form onSubmit={handleSubmit} className="form-content">
            {isSignUp ? (
              signUpStep === 1 ? (
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
                    />
                  </div>

                  <div className="form-group">

                    <div>
                      <label htmlFor="barangay">Residence of Dagupan</label>
                      <select id="barangay" name="barangay" value={formData.barangay} onChange={handleChange} required>
                        <option value="">Select barangay</option>
                        <option value="Barangay 1">Barangay 1</option>
                        <option value="Barangay 2">Barangay 2</option>
                        <option value="Barangay 3">Barangay 3</option>
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
                      />
                    </div>
  

                  <div className="form-group">
                    <button type="button" onClick={goToNextStep} className="submit-btn">Next</button>
                  </div>
                </>
              ) : (
                // Step 2: email, phone, password, confirm
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
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter your password"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm your password"
                    />
                  </div>

                  <div className="form-group">
                    <button type="submit" className="submit-btn">Register</button>
                  </div>

                  <div className="form-group">
                    <button type="button" className="toggle-btn" onClick={() => setSignUpStep(1)}>Back</button>
                  </div>
                </>
              )
            ) : (
              // Sign in form
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
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                  />
                </div>

                <button type="submit" className="submit-btn">Sign In</button>
              </>
            )}
          </form>

          <div className="form-footer">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button type="button" onClick={toggleMode} className="toggle-btn">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>

        {!isSignUp && (
          <div className="login-decoration">
            <div className="decoration-content">           
              <img src={Logo} alt="Houseclean Logo" className="logo-img2" />
              <p>Your trusted partner for professional cleaning services</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;