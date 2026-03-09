import React, { useEffect, useMemo, useState } from "react";
import "../../components/Admin.css";
import { rtdb, auth } from "../../firebase";
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from "firebase/auth";
import { ref, onValue, set, update as rtdbUpdate, remove } from "firebase/database";

const sampleStaff = [
  {
    id: "stf-001",
    fullName: "Arly Baldonasa",
    role: "Admin",
    dob: "1998-04-21",
    contact: "09171234567",
    email: "arlbaldonasa@gmail.com",
    address: "Purok 3, Perez Blvd",
    barangay: "Bacayao Norte",
    govId: "PH-8843-2211",
    barangayClearance: "Submitted",
    experience: "2 yrs part-time housekeeping",
    skills: ["Housecleaning", "Deep Cleaning", "Laundry/Ironing"],
    preferredService: "Housecleaning",
    availability: "Mon-Sat, 8am-5pm",
    trainingCompleted: true,
    certification: "Pass - Feb 2026",
    healthCert: "Valid until Dec 2026",
    phoneModel: "Samsung A54",
    bankAccount: "BPI ••4321",
    emergency: "Maria Baldonasa - 09179998888",
    uniformSize: "M",
    serviceAreas: ["Downtown Dagupan", "Calasiao", "Bonuan"],
    status: "active",
    joined: "2026-02-10",
  },
  {
    id: "stf-002",
    fullName: "Juno Dela Cruz",
    role: "Housekeeper",
    dob: "1996-12-02",
    contact: "09175551234",
    email: "juno.delacruz@example.com",
    address: "Brgy Lucao, Dagupan",
    barangay: "Lucao",
    govId: "PH-7721-0991",
    barangayClearance: "Pending",
    experience: "Hotel housekeeping, 3 yrs",
    skills: ["Housecleaning", "Laundry/Ironing"],
    preferredService: "Deep Cleaning",
    availability: "Tue-Sun, 10am-7pm",
    trainingCompleted: false,
    certification: "Scheduled Mar 12, 2026",
    healthCert: "Pending",
    phoneModel: "OPPO Reno 8",
    bankAccount: "GCash ••7788",
    emergency: "Rica Dela Cruz - 09170001111",
    uniformSize: "L",
    serviceAreas: ["Downtown Dagupan", "Calasiao", "Mangaldan"],
    status: "pending",
    joined: "2026-03-01",
  },
];

const emptyForm = {
  fullName: "",
  dob: "",
  contact: "",
  email: "",
  address: "",
  barangay: "",
  govId: "",
  barangayClearance: "Pending",
  experience: "",
  skills: [],
  preferredService: "",
  availability: "",
  trainingCompleted: false,
  certification: "",
  healthCert: "",
  phoneModel: "",
  bankAccount: "",
  emergency: "",
  uniformSize: "",
  serviceAreas: [],
  role: "Housekeeper",
  otherSkill: "",
  password: "",
  confirmPassword: "",
};

const skillOptions = [
  "Housecleaning",
  "Deep Cleaning",
  "Laundry/Ironing",
  "Other",
];

const serviceAreaOptions = [
  "Bacayao Norte",
  "Bacayao Sur",
  "Barangay I (Poblacion Oeste)",
  "Barangay II (Nueva)",
  "Barangay III (Zamora)",
  "Barangay IV (Tondaligan)",
  "Bolosan",
  "Bonuan Binloc",
  "Bonuan Boquig",
  "Bonuan Gueset",
  "Calmay",
  "Carael",
  "Caranglaan",
  "Herrero-Perez",
  "Lasip Chico",
  "Lasip Grande",
  "Lomboy",
  "Lucao",
  "Malued",
  "Mamalingling",
  "Mangin",
  "Mayombo",
  "Pantal",
  "Pogo Chico",
  "Pogo Grande",
  "Pugaro Suit",
  "Salapingao",
  "Salisay",
  "Tambac",
  "Tapuac",
  "Tebeng"
];

function ManageUsers() {
  const [staff, setStaff] = useState(sampleStaff);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [selected, setSelected] = useState(sampleStaff[0]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const toggleArea = (area) => {
    setForm((prev) => {
      const list = prev.serviceAreas || [];
      const exists = list.includes(area);
      const next = exists ? list.filter((a) => a !== area) : [...list, area];
      return { ...prev, serviceAreas: next };
    });
  };

  const toggleSkillButton = (skill) => {
    setForm((prev) => {
      const list = prev.skills || [];
      const exists = list.includes(skill);
      const next = exists ? list.filter((s) => s !== skill) : [...list, skill];
      return { ...prev, skills: next };
    });
  };

  const handleOtherSkillChange = (value) => {
    setForm((prev) => {
      const trimmed = value;
      const filtered = (prev.skills || []).filter((s) => s !== "Other");
      const nextSkills = trimmed.trim() ? [...filtered, "Other"] : filtered;
      return { ...prev, otherSkill: trimmed, skills: nextSkills };
    });
  };

  const activeCount = useMemo(
    () => staff.filter((s) => s.status === "active").length,
    [staff]
  );

  const disabledCount = useMemo(
    () => staff.filter((s) => s.status === "disabled").length,
    [staff]
  );

  const filteredStaff = useMemo(() => {
    const term = search.toLowerCase();
    const results = staff.filter((s) => {
      const skills = Array.isArray(s.skills) ? s.skills : [];
      const areas = Array.isArray(s.serviceAreas) ? s.serviceAreas : [];
      const combined = [
        s.fullName,
        s.email,
        s.contact,
        skills.join(" "),
        areas.join(" "),
        s.preferredService,
        s.role,
      ]
        .join(" ")
        .toLowerCase();
      const statusOk = statusFilter === "all" || (s.status || "").toLowerCase() === statusFilter;
      const roleOk = roleFilter === "all" || (s.role || "").toLowerCase() === roleFilter;
      return combined.includes(term) && statusOk && roleOk;
    });
    if (results.length && !selected) setSelected(results[0]);
    return results;
  }, [staff, search, selected, statusFilter, roleFilter]);

  const handleToggleStatus = (id) => {
    setStaff((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "active" ? "disabled" : "active" }
          : s
      )
    );
    const target = staff.find((s) => s.id === id);
    if (target) {
      const nextStatus = target.status === "active" ? "disabled" : "active";
      rtdbUpdate(ref(rtdb, `Users/${id}`), { status: nextStatus }).catch(() => {});
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this staff profile?")) return;
    setStaff((prev) => prev.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
    remove(ref(rtdb, `Users/${id}`)).catch(() => {});
  };

  const validateForm = () => {
    const errs = {};
    const fullName = form.fullName.trim();
    const contact = form.contact.trim();
    const email = form.email.trim();
    const barangay = form.barangay.trim();
    const preferred = form.preferredService.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;
    const phonePattern = /^09\d{9}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!fullName) {
      errs.fullName = "Full name is required";
    } else if (fullName.length < 2 || fullName.length > 60) {
      errs.fullName = "Full name must be 2-60 characters";
    }
    if (!contact) {
      errs.contact = "Contact number is required";
    } else if (!phonePattern.test(contact)) {
      errs.contact = "Phone must be 11 digits starting with 09";
    } else if (contact.length > 15) {
      errs.contact = "Phone number too long";
    }
    if (!email) {
      errs.email = "Email is required";
    } else if (!emailPattern.test(email)) {
      errs.email = "Enter a valid email address";
    } else if (email.length > 80) {
      errs.email = "Email must be under 80 characters";
    }
    if (!barangay) {
      errs.barangay = "Barangay is required";
    } else if (barangay.length > 60) {
      errs.barangay = "Barangay must be under 60 characters";
    }
    if (form.address && form.address.length > 120) {
      errs.address = "Address must be under 120 characters";
    }
    if (form.govId && form.govId.length > 30) {
      errs.govId = "Government ID must be under 30 characters";
    }
    if (form.experience && form.experience.length > 160) {
      errs.experience = "Experience must be under 160 characters";
    }
    if (!preferred) {
      errs.preferredService = "Preferred service is required";
    } else if (preferred.length > 80) {
      errs.preferredService = "Preferred service must be under 80 characters";
    }
    if (form.availability && form.availability.length > 80) {
      errs.availability = "Availability must be under 80 characters";
    }
    if (form.certification && form.certification.length > 80) {
      errs.certification = "Certification must be under 80 characters";
    }
    if (form.healthCert && form.healthCert.length > 80) {
      errs.healthCert = "Health certificate must be under 80 characters";
    }
    if (form.phoneModel && form.phoneModel.length > 40) {
      errs.phoneModel = "Phone model must be under 40 characters";
    }
    if (form.bankAccount && form.bankAccount.length > 40) {
      errs.bankAccount = "Bank account must be under 40 characters";
    }
    if (form.emergency && form.emergency.length > 80) {
      errs.emergency = "Emergency contact must be under 80 characters";
    }
    if (form.uniformSize && form.uniformSize.length > 10) {
      errs.uniformSize = "Uniform size must be under 10 characters";
    }
    if (form.skills.length === 0) errs.skills = "Select at least one skill";
    if (form.skills.includes("Other") && !form.otherSkill.trim()) {
      errs.skills = "Please specify other skill";
    } else if (form.otherSkill && form.otherSkill.length > 60) {
      errs.skills = "Other skill must be under 60 characters";
    }
    if (form.serviceAreas.length === 0) errs.serviceAreas = "Select at least one service area";
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 8 || password.length > 32) {
      errs.password = "Password must be 8-32 characters";
    }
    if (!confirmPassword) {
      errs.confirmPassword = "Confirm your password";
    } else if (confirmPassword !== password) {
      errs.confirmPassword = "Passwords do not match";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      if (form.fullName.trim()) {
        await updateProfile(cred.user, { displayName: form.fullName.trim() });
      }
      const uid = cred.user.uid;
      const finalSkills =
        form.skills.includes("Other") && form.otherSkill.trim()
          ? form.skills.filter((s) => s !== "Other").concat(form.otherSkill.trim())
          : form.skills.filter((s) => s !== "Other" || form.otherSkill.trim());
      const { confirmPassword, password, ...cleanForm } = form;
      const newStaff = {
        ...cleanForm,
        fullName: form.fullName.trim(),
        contact: form.contact.trim(),
        email: form.email.trim(),
        barangay: form.barangay.trim(),
        preferredService: form.preferredService.trim(),
        skills: finalSkills,
        id: uid,
        status: "active",
        joined: new Date().toISOString().slice(0, 10),
      };
      await set(ref(rtdb, `Users/${uid}`), newStaff);
      setForm(emptyForm);
      setFormErrors({});
      setShowModal(false);
      setSelected(newStaff);
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        submit: err.message || "Failed to create staff account",
      }));
    }
  };

  const badgeColor = (status) => {
    if (status === "active") return "badge-success";
    if (status === "pending") return "badge-warning";
    return "badge-error";
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user || null));
    return () => unsub();
  }, []);

  // Pull staff list from Realtime Database
  useEffect(() => {
    const usersRef = ref(rtdb, "Users");
    const unsub = onValue(
      usersRef,
      (snap) => {
        const val = snap.val();
        if (!val) {
          setStaff(sampleStaff);
          setSelected(sampleStaff[0]);
          return;
        }
        const list = Object.entries(val).map(([key, data]) => ({
          id: key,
          ...data,
          skills: Array.isArray(data?.skills) ? data.skills : [],
          serviceAreas: Array.isArray(data?.serviceAreas)
            ? data.serviceAreas
            : [],
        }));
        list.sort((a, b) => (b.joined || "").localeCompare(a.joined || ""));
        setStaff(list);
        setSelected((prev) => {
          if (prev && list.find((s) => s.id === prev.id)) return prev;
          return list[0] || null;
        });
      },
      () => {
        setStaff(sampleStaff);
        setSelected(sampleStaff[0]);
      }
    );
    return () => unsub();
  }, []);

  const handleRoleChange = (id, role) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, role } : s)));
    if (selected?.id === id) setSelected((p) => ({ ...p, role }));
    rtdbUpdate(ref(rtdb, `Users/${id}`), { role }).catch(() => {});
  };

  const heroPerson = selected || staff[0] || sampleStaff[0];
  const adminName = currentUser?.displayName || currentUser?.email || "Admin";
  const onboardingQueue = [...staff]
    .filter((s) => s.joined)
    .sort((a, b) => (b.joined || "").localeCompare(a.joined || ""))
    .slice(0, 6);

  return (
    <div className="admin-page neo-admin">
      <div className="dashboard-shell full-width">
        <main className="dash-main">
          <div className="welcome-card">
            <div>
              <h2>Hello, {adminName}!</h2>
              <p className="muted">Keep onboarding smooth—review pending accounts and publish assignments.</p>
              <div className="cta-row">
                <button
                  className="btn primary large"
                  title="Add staff"
                  onClick={() => {
                    setShowProfile(false);
      setShowModal(true);
      setForm((prev) => ({ ...emptyForm, ...prev, role: "Housekeeper" }));
    }}
  >
                  <i className="fas fa-user-plus" /> Add staff
                </button>
              </div>
            </div>
          </div>

          <div className="mini-stats">
            <div className="mini-card">
              <div className="mini-icon pink"><i className="fas fa-users" /></div>
              <div>
                <p className="mini-label">Total Staff</p>
                <h3>{staff.length}</h3>
              </div>
            </div>
            <div className="mini-card">
              <div className="mini-icon green"><i className="fas fa-user-check" /></div>
              <div>
                <p className="mini-label">Active</p>
                <h3>{activeCount}</h3>
              </div>
            </div>
            <div className="mini-card">
              <div className="mini-icon blue"><i className="fas fa-ban" /></div>
              <div>
                <p className="mini-label">Disabled</p>
                <h3>{disabledCount}</h3>
              </div>
            </div>
          </div>

          <div className="panel-grid single-column">
            <div className="panel card">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Staff roster</p>
                  <h4>Accounts & Roles</h4>
                </div>
                <div className="filters-row">
                  <div className="search-box modern">
                    <i className="fas fa-search" />
                    <input
                      type="text"
                      placeholder="Search name, email, skill, or area"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="pill-group">
                    <select
                      className="pill-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All status</option>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                    <select
                      className="pill-select"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="all">All roles</option>
                      <option value="householder">Householder</option>
                      <option value="housekeeper">Housekeeper</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="team-table modern">
                <table>
                  <thead>
                    <tr>
                      <th className="fit">#</th>
                      <th className="col-name">Name</th>
                      <th className="col-status">Status</th>
                      <th className="col-role">Role</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.length ? (
                      filteredStaff.map((s, idx) => (
                        <tr
                          key={s.id}
                          className={`team-row ${selected?.id === s.id ? "selected" : ""}`}
                          onClick={() => {
                            setSelected(s);
                            setShowModal(false);
                            setShowProfile(true);
                          }}
                        >
                          <td className="fit">{idx + 1}</td>
                          <td className="user-name compact col-name">
                            <span className="user-avatar">
                              {s.fullName ? s.fullName.slice(0, 2).toUpperCase() : "NA"}
                            </span>
                            <div className="user-meta">
                              <strong>{s.fullName}</strong>
                              <span className="user-email">{s.email}</span>
                            </div>
                          </td>
                          <td className="col-status">
                            <span className={`status-chip ${s.status}`}>
                              {s.status === "active" && "Active"}
                              {s.status === "pending" && "Pending"}
                              {s.status === "disabled" && "Disabled"}
                            </span>
                          </td>
                          <td className="col-role">
                            {((s.role || "").toLowerCase() === "admin") ? (
                              <span className="role-chip admin">Admin</span>
                            ) : (
                              <select
                                className="role-select"
                                value={s.role || "Householder"}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleRoleChange(s.id, e.target.value);
                                }}
                              >
                                <option>Householder</option>
                                <option>Housekeeper</option>
                              </select>
                            )}
                          </td>
                          <td className="col-actions actions-cell">
                            <button
                              className="icon-btn ghost"
                              title={s.status === "active" ? "Disable" : "Activate"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(s.id);
                              }}
                            >
                              <i className={s.status === "active" ? "fas fa-ban" : "fas fa-check"}></i>
                            </button>
                            <button
                              className="icon-btn ghost danger"
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(s.id);
                              }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="no-results">
                          No staff found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>

      <button
        className="floating-add"
        title="Add staff"
        aria-label="Add staff"
        onClick={() => {
          setShowProfile(false);
          setShowModal(true);
        }}
      >
        <i className="fas fa-user-plus"></i>
      </button>

      {showModal && (
        <div className="staff-modal">
          <div className="staff-modal__backdrop" onClick={() => setShowModal(false)} />
          <div className="staff-modal__panel">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Dagupan Staff Onboarding</p>
                <h3>Add New Staff</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)} aria-label="Close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            {formErrors.submit && (
              <div className="form-error" style={{ marginBottom: 10 }}>
                {formErrors.submit}
              </div>
            )}

            <form className="staff-form" onSubmit={handleSubmit}>
              <section>
                <h4>Step 1: Personal & City Information</h4>
                <div className="form-grid">
                  
                  <label>
                    Full Name*
                    <input
                      type="text"
                      maxLength={60}
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    />
                    {formErrors.fullName && <span className="form-error">{formErrors.fullName}</span>}
                  </label>
                  <label>
                    Date of Birth
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    />
                  </label>
                  <label>
                    Contact Number*
                    <input
                      type="text"
                      maxLength={15}
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    />
                    {formErrors.contact && <span className="form-error">{formErrors.contact}</span>}
                  </label>
                  <label>
                    Email Address*
                    <input
                      type="email"
                      maxLength={80}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    {formErrors.email && <span className="form-error">{formErrors.email}</span>}
                  </label>
                  <label>
                    Password*
                    <div className="password-field">
                      <input
                        type={showPwd ? "text" : "password"}
                        maxLength={32}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="toggle-eye"
                        onClick={() => setShowPwd((v) => !v)}
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        <i className={`fas ${showPwd ? "fa-eye-slash" : "fa-eye"}`}></i>
                      </button>
                    </div>
                    {formErrors.password && <span className="form-error">{formErrors.password}</span>}
                  </label>
                  <label>
                    Confirm Password*
                    <div className="password-field">
                      <input
                        type={showConfirmPwd ? "text" : "password"}
                        maxLength={32}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        className="toggle-eye"
                        onClick={() => setShowConfirmPwd((v) => !v)}
                        aria-label={showConfirmPwd ? "Hide confirm password" : "Show confirm password"}
                      >
                        <i className={`fas ${showConfirmPwd ? "fa-eye-slash" : "fa-eye"}`}></i>
                      </button>
                    </div>
                    {formErrors.confirmPassword && (
                      <span className="form-error">{formErrors.confirmPassword}</span>
                    )}
                  </label>
                  <label className="full">
                    Residential Address
                    <input
                      type="text"
                      maxLength={120}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                    {formErrors.address && <span className="form-error">{formErrors.address}</span>}
                  </label>
                  <label>
                    Barangay/Area in Dagupan*
                    <input
                      type="text"
                      maxLength={60}
                      value={form.barangay}
                      onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                    />
                    {formErrors.barangay && <span className="form-error">{formErrors.barangay}</span>}
                  </label>
                  <label>
                    Government ID Number
                    <input
                      type="text"
                      maxLength={30}
                      value={form.govId}
                      onChange={(e) => setForm({ ...form, govId: e.target.value })}
                    />
                    {formErrors.govId && <span className="form-error">{formErrors.govId}</span>}
                  </label>
                  <label>
                    Local Barangay Clearance
                    <select
                      value={form.barangayClearance}
                      onChange={(e) => setForm({ ...form, barangayClearance: e.target.value })}
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </label>
                </div>
              </section>

              <section>
                <h4>Step 2: Professional Details & Compliance</h4>
                <div className="form-grid">
                  <label className="full">
                    Previous Experience
                    <input
                      type="text"
                      maxLength={160}
                      value={form.experience}
                      onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    />
                    {formErrors.experience && <span className="form-error">{formErrors.experience}</span>}
                  </label>
                  <div className="full">
                    <p className="label">
                      Skills (tick all that apply)*
                    </p>
                    <div className="skill-list">
                      {skillOptions
                        .filter((s) => s !== "Other")
                        .map((skill) => (
                          <button
                            type="button"
                            key={skill}
                            className={`skill-pill ${
                              form.skills.includes(skill) ? "selected" : ""
                            }`}
                            onClick={() => toggleSkillButton(skill)}
                          >
                            {skill}
                          </button>
                        ))}
                      <div className="skill-other">
                        <button
                          type="button"
                          className={`skill-pill ${form.skills.includes("Other") ? "selected" : ""}`}
                          onClick={() => toggleSkillButton("Other")}
                        >
                          Other
                        </button>
                        <input
                          type="text"
                          placeholder="Specify other skill"
                          maxLength={60}
                          value={form.otherSkill}
                          onChange={(e) => handleOtherSkillChange(e.target.value)}
                        />
                      </div>
                    </div>
                    {formErrors.skills && <span className="form-error">{formErrors.skills}</span>}
                  </div>
                  <label>
                    Preferred Service Category*
                    <input
                      type="text"
                      maxLength={80}
                      value={form.preferredService}
                      onChange={(e) => setForm({ ...form, preferredService: e.target.value })}
                    />
                    {formErrors.preferredService && (
                      <span className="form-error">{formErrors.preferredService}</span>
                    )}
                  </label>
                  <label>
                    Availability (Days/Hours)
                    <input
                      type="text"
                      maxLength={80}
                      value={form.availability}
                      onChange={(e) => setForm({ ...form, availability: e.target.value })}
                    />
                    {formErrors.availability && <span className="form-error">{formErrors.availability}</span>}
                  </label>
                  <label>
                    Training Completed
                    <select
                      value={form.trainingCompleted ? "Yes" : "No"}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          trainingCompleted: e.target.value === "Yes",
                        })
                      }
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </label>
                  <label>
                    Certification/Assessment Result
                    <input
                      type="text"
                      maxLength={80}
                      value={form.certification}
                      onChange={(e) => setForm({ ...form, certification: e.target.value })}
                    />
                    {formErrors.certification && (
                      <span className="form-error">{formErrors.certification}</span>
                    )}
                  </label>
                  <label>
                    Health Certificate (if required)
                    <input
                      type="text"
                      maxLength={80}
                      value={form.healthCert}
                      onChange={(e) => setForm({ ...form, healthCert: e.target.value })}
                    />
                    {formErrors.healthCert && <span className="form-error">{formErrors.healthCert}</span>}
                  </label>
                  <label>
                    Smartphone Model
                    <input
                      type="text"
                      maxLength={40}
                      value={form.phoneModel}
                      onChange={(e) => setForm({ ...form, phoneModel: e.target.value })}
                    />
                    {formErrors.phoneModel && <span className="form-error">{formErrors.phoneModel}</span>}
                  </label>
                  <label>
                    Bank Account Number
                    <input
                      type="text"
                      maxLength={40}
                      value={form.bankAccount}
                      onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                    />
                    {formErrors.bankAccount && <span className="form-error">{formErrors.bankAccount}</span>}
                  </label>
                  <label>
                    Emergency Contact
                    <input
                      type="text"
                      maxLength={80}
                      value={form.emergency}
                      onChange={(e) => setForm({ ...form, emergency: e.target.value })}
                    />
                    {formErrors.emergency && <span className="form-error">{formErrors.emergency}</span>}
                  </label>
                  <label>
                    Uniform Size
                    <input
                      type="text"
                      maxLength={10}
                      value={form.uniformSize}
                      onChange={(e) => setForm({ ...form, uniformSize: e.target.value })}
                    />
                    {formErrors.uniformSize && <span className="form-error">{formErrors.uniformSize}</span>}
                  </label>
                  <label className="full">
                    Service Area Coverage (select one or more)*
                    <div className="area-grid">
                      {serviceAreaOptions.map((area) => {
                        const active = (form.serviceAreas || []).includes(area);
                        return (
                          <button
                            type="button"
                            key={area}
                            className={`area-chip ${active ? "selected" : ""}`}
                            onClick={() => toggleArea(area)}
                          >
                            {area}
                          </button>
                        );
                      })}
                    </div>
                    {formErrors.serviceAreas && (
                      <span className="form-error">{formErrors.serviceAreas}</span>
                    )}
                  </label>
                </div>
              </section>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  <i className="fas fa-save"></i> Save Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfile && selected && (
        <div className="profile-modal">
          <div
            className="profile-modal__backdrop"
            onClick={() => setShowProfile(false)}
          />
          <div className="profile-modal__panel">
            <div className="profile-layout">
              <div className="profile-main">
                <div className="profile-hero">
                  <div className="avatar-xl">
                    {(selected.fullName || "NA").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hero-meta">
                    <div className="hero-top">
                      <div>
                        <p className="eyebrow">Staff Profile</p>
                        <h3 className="hero-title">{selected.fullName || "Unnamed"}</h3>
                        <p className="hero-subtitle">{selected.preferredService || "Staff"}</p>
                        <div className="chip-row">
                          <span className={`status-chip ${selected.status || "pending"}`}>
                            {selected.status || "pending"}
                          </span>
                          <span className="role-chip">{selected.role || "Householder"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hero-contact">
                      <div>
                        <small>Email address</small>
                        <strong>{selected.email || "-----"}</strong>
                      </div>
                      <div>
                        <small>Phone number</small>
                        <strong>{selected.contact || "-----"}</strong>
                      </div>
                      <div>
                        <small>Barangay</small>
                        <strong>{selected.barangay || "-----"}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="profile-cards-row">
                  <div className="profile-card">
                    <h4>Work & Skills</h4>
                    <p><strong>Experience:</strong> {selected.experience || "-----"}</p>
                    <p><strong>Availability:</strong> {selected.availability || "-----"}</p>
                    <p><strong>Preferred Service:</strong> {selected.preferredService || "-----"}</p>
                    <div className="tag-row">
                      {(selected.skills || []).map((s) => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                    </div>
                    <div className="tag-row">
                      {(selected.serviceAreas || []).map((s) => (
                        <span key={s} className="tag soft">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="profile-card">
                    <h4>Logistics</h4>
                    <p><strong>Phone Model:</strong> {selected.phoneModel || "-----"}</p>
                    <p><strong>Bank Account:</strong> {selected.bankAccount || "-----"}</p>
                    <p><strong>Emergency Contact:</strong> {selected.emergency || "-----"}</p>
                    <p><strong>Uniform Size:</strong> {selected.uniformSize || "-----"}</p>
                  </div>
                </div>
              </div>

              <aside className="profile-side">
                <button
                  className="icon-btn"
                  onClick={() => setShowProfile(false)}
                  aria-label="Close profile"
                >
                  <i className="fas fa-times"></i>
                </button>
                <div className="profile-card dense">
                  <h4>Bio</h4>
                  <p>
                    {selected.experience || "No bio provided."}
                  </p>
                </div>
                <div className="profile-card dense">
                  <h4>Compliance</h4>
                  <p><strong>Gov ID:</strong> {selected.govId || "—"}</p>
                  <p><strong>Brgy Clearance:</strong> {selected.barangayClearance}</p>
                  <p><strong>Training:</strong> {selected.trainingCompleted ? "Completed" : "Pending"}</p>
                  <p><strong>Certification:</strong> {selected.certification || "—"}</p>
                  <p><strong>Health Cert:</strong> {selected.healthCert || "—"}</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
