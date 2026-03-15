import React, { useEffect, useMemo, useState } from "react";
import "../../components/Admin.css";
import { rtdb, auth, secondaryAuth, functions } from "../../firebase";
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from "firebase/auth";
import { ref, onValue, set, update as rtdbUpdate, remove } from "firebase/database";
import { httpsCallable } from "firebase/functions";

const sampleStaff = [
  {
    id: "stf-001",
    fullName: "Arly Baldonasa",
    firstName: "Arly",
    lastName: "Baldonasa",
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
    serviceAreas: ["Downtown Dagupan", "Calasiao", "Bonuan"],
    status: "active",
    joined: "2026-02-10",
  },
  {
    id: "stf-002",
    fullName: "Juno Dela Cruz",
    firstName: "Juno",
    lastName: "Dela Cruz",
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
    serviceAreas: ["Downtown Dagupan", "Calasiao", "Mangaldan"],
    status: "pending",
    joined: "2026-03-01",
  },
];

const emptyForm = {
  fullName: "",
  firstName: "",
  lastName: "",
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

  const buildDisplayName = (user) => {
    const full = String(user?.fullName || user?.name || "").replace(/\s+/g, " ").trim();
    if (full) return full;
    const first = String(user?.firstName || "").trim();
    const last = String(user?.lastName || "").trim();
    const joined = `${first} ${last}`.replace(/\s+/g, " ").trim();
    if (joined) return joined;
    const email = String(user?.email || "").trim();
    return email || "Unnamed";
  };

  const buildInitials = (user) => {
    const first = String(user?.firstName || "").trim();
    const last = String(user?.lastName || "").trim();
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();

    const base = buildDisplayName(user);
    const words = String(base || "")
      .replace(/[^A-Za-z0-9 ]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
    const flat = words.join("");
    return (flat || "NA").slice(0, 2).toUpperCase();
  };
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
        s.firstName,
        s.lastName,
        s.name,
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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user account (Auth + Database)?")) return;
    try {
      const fn = httpsCallable(functions, "delete_user_account");
      await fn({ uid: id });
      setStaff((prev) => prev.filter((s) => s.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      // Fallback: at least remove the RTDB profile if the function isn't deployed yet.
      remove(ref(rtdb, `Users/${id}`)).catch(() => {});
      window.alert(err?.message || "Delete failed. Profile may not be fully removed.");
    }
  };

  const validateForm = () => {
    const errs = {};
    const fullName = form.fullName.trim();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const contact = form.contact.trim();
    const email = form.email.trim();
    const barangay = form.barangay.trim();
    const preferred = form.preferredService.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;
    const phonePattern = /^09\d{9}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!firstName) {
      errs.firstName = "First name is required";
    } else if (firstName.length < 2 || firstName.length > 40) {
      errs.firstName = "First name must be 2-40 characters";
    }
    if (!lastName) {
      errs.lastName = "Last name is required";
    } else if (lastName.length < 2 || lastName.length > 40) {
      errs.lastName = "Last name must be 2-40 characters";
    }
    if (fullName && fullName.length > 60) {
      errs.fullName = "Full name must be under 60 characters";
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
    if (form.availability && form.availability.length > 80) {
      errs.availability = "Availability must be under 80 characters";
    }
    if (form.certification && form.certification.length > 80) {
      errs.certification = "Certification must be under 80 characters";
    }
    if (form.healthCert && form.healthCert.length > 80) {
      errs.healthCert = "Health certificate must be under 80 characters";
    }
    if (form.bankAccount && form.bankAccount.length > 40) {
      errs.bankAccount = "Bank account must be under 40 characters";
    }
    if (form.emergency && form.emergency.length > 80) {
      errs.emergency = "Emergency contact must be under 80 characters";
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
    } else if (/\s/.test(password)) {
      errs.password = "Password cannot contain spaces";
    } else if (password.length < 8 || password.length > 32) {
      errs.password = "Password must be 8-32 characters";
    }
    if (!confirmPassword) {
      errs.confirmPassword = "Confirm your password";
    } else if (/\s/.test(confirmPassword)) {
      errs.confirmPassword = "Password cannot contain spaces";
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
        secondaryAuth,
        form.email.trim(),
        form.password
      );
      const fullName = form.fullName.trim() || `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      if (fullName) {
        await updateProfile(cred.user, { displayName: fullName });
      }
      const uid = cred.user.uid;
      const finalSkills =
        form.skills.includes("Other") && form.otherSkill.trim()
          ? form.skills.filter((s) => s !== "Other").concat(form.otherSkill.trim())
          : form.skills.filter((s) => s !== "Other" || form.otherSkill.trim());
      const { confirmPassword, password, ...cleanForm } = form;
      const newStaff = {
        ...cleanForm,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fullName,
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

  const formatSectionErrors = (fields) => {
    const labels = {
      firstName: "First name",
      lastName: "Last name",
      contact: "Contact number",
      email: "Email address",
      password: "Password",
      confirmPassword: "Confirm password",
      address: "Residential address",
      barangay: "Barangay",
      govId: "Government ID",
      experience: "Experience",
      preferredService: "Preferred service",
      availability: "Availability",
      skills: "Skills",
      certification: "Certification",
      healthCert: "Health certificate",
      bankAccount: "Bank account",
      emergency: "Emergency contact",
      serviceAreas: "Service area coverage"
    };
    const hits = fields.filter((field) => Boolean(formErrors[field]));
    if (hits.length === 0) return "";
    return `Please fix: ${hits.map((f) => labels[f] || f).join(", ")}`;
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

  const normalizeRole = (value) => String(value || "").trim().toLowerCase();
  const selectedRole = normalizeRole(selected?.role);
  const selectedProfileType = 
    selectedRole === "admin" 
      ? "admin" 
      : ["housekeeper", "staff"].includes(selectedRole) 
        ? "housekeeper" 
        : "householder"; 
 
  const selectedDisplayName = buildDisplayName(selected);
  const selectedInitials = buildInitials(selected);

  const selectedPhone = selected?.phone || selected?.contact || "-----";
  const selectedLocation = (() => {
    const parts = [
      selected?.address,
      selected?.barangay,
      selected?.municipality,
      selected?.province,
    ].filter(Boolean);
    return parts.join(", ") || selected?.barangay || "-----";
  })();

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
                        (() => {
                          const rowName = buildDisplayName(s);
                          const rowInitials = buildInitials(s);
                          const rowEmail = String(s.email || "").trim();
                          const rowEmailLabel = rowEmail || "—";
 
                          return (
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
                              {rowInitials} 
                            </span> 
                            <div className="user-meta"> 
                              <strong>{rowName}</strong> 
                              <span className="user-email">{rowEmailLabel}</span> 
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
                          );
                        })()
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
                {formatSectionErrors([
                  "firstName",
                  "lastName",
                  "contact",
                  "email",
                  "password",
                  "confirmPassword",
                  "address",
                  "barangay",
                  "govId"
                ]) && (
                  <div className="form-error form-error--banner">
                    {formatSectionErrors([
                      "firstName",
                      "lastName",
                      "contact",
                      "email",
                      "password",
                      "confirmPassword",
                      "address",
                      "barangay",
                      "govId"
                    ])}
                  </div>
                )}
                <div className="form-grid">
                  
                  <label>
                    First Name*
                    <input
                      type="text"
                      maxLength={40}
                      value={form.firstName}
                      onChange={(e) => {
                        const firstName = e.target.value;
                        const fullName = `${firstName} ${form.lastName}`.replace(/\s+/g, " ").trim();
                        setForm({ ...form, firstName, fullName });
                      }}
                    />
                    {formErrors.firstName && <span className="form-error">{formErrors.firstName}</span>}
                  </label>
                  <label>
                    Last Name*
                    <input
                      type="text"
                      maxLength={40}
                      value={form.lastName}
                      onChange={(e) => {
                        const lastName = e.target.value;
                        const fullName = `${form.firstName} ${lastName}`.replace(/\s+/g, " ").trim();
                        setForm({ ...form, lastName, fullName });
                      }}
                    />
                    {formErrors.lastName && <span className="form-error">{formErrors.lastName}</span>}
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
                        onChange={(e) => setForm({ ...form, password: e.target.value.replace(/\s/g, "") })}
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
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value.replace(/\s/g, "") })}
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
                {formatSectionErrors([
                  "experience",
                  "preferredService",
                  "availability",
                  "skills",
                  "certification",
                  "healthCert",
                  "bankAccount",
                  "emergency",
                  "serviceAreas"
                ]) && (
                  <div className="form-error form-error--banner">
                    {formatSectionErrors([
                      "experience",
                      "preferredService",
                      "availability",
                      "skills",
                      "certification",
                      "healthCert",
                      "bankAccount",
                      "emergency",
                      "serviceAreas"
                    ])}
                  </div>
                )}
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
                    {selectedInitials}
                  </div>
                  <div className="hero-meta">
                    <div className="hero-top">
                      <div>
                        <p className="eyebrow">
                          {selectedProfileType === "admin"
                            ? "Admin Profile"
                            : selectedProfileType === "housekeeper"
                              ? "Housekeeper Profile"
                              : "Householder Profile"}
                        </p>
                        <h3 className="hero-title">{selectedDisplayName}</h3>
                        <p className="hero-subtitle">
                          {selectedProfileType === "admin"
                            ? "Administrator"
                            : selectedProfileType === "housekeeper"
                              ? selected.preferredService || "Housekeeper"
                              : selectedLocation}
                        </p>
                        <div className="chip-row">
                          <span className={`status-chip ${selected.status || "pending"}`}>
                            {selected.status || "pending"}
                          </span>
                          <span className="role-chip">
                            {selectedProfileType === "admin"
                              ? "Admin"
                              : selectedProfileType === "housekeeper"
                                ? "Housekeeper"
                                : "Householder"}
                          </span>
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
                        <strong>{selectedPhone}</strong>
                      </div>
                      <div>
                        <small>{selectedProfileType === "admin" ? "UID" : "Location"}</small>
                        <strong>{selectedProfileType === "admin" ? selected.id : selectedLocation}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="profile-cards-row">
                  {selectedProfileType === "housekeeper" && (
                    <>
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
                        <p><strong>Bank Account:</strong> {selected.bankAccount || "-----"}</p>
                        <p><strong>Emergency Contact:</strong> {selected.emergency || "-----"}</p>
                      </div>
                    </>
                  )}

                  {selectedProfileType === "householder" && (
                    <>
                      <div className="profile-card">
                        <h4>Household Details</h4>
                        <p><strong>First name:</strong> {selected.firstName || "-----"}</p>
                        <p><strong>Last name:</strong> {selected.lastName || "-----"}</p>
                        <p><strong>Address:</strong> {selected.address || "-----"}</p>
                        <p><strong>Landmark:</strong> {selected.landmark || "-----"}</p>
                      </div>
                      <div className="profile-card">
                        <h4>Account</h4>
                        <p><strong>Joined:</strong> {selected.joined || "-----"}</p>
                        <p><strong>Status:</strong> {selected.status || "pending"}</p>
                        <p><strong>UID:</strong> {selected.id || "-----"}</p>
                        <p><strong>Barangay:</strong> {selected.barangay || "-----"}</p>
                      </div>
                    </>
                  )}

                  {selectedProfileType === "admin" && (
                    <>
                      <div className="profile-card">
                        <h4>Admin Access</h4>
                        <p><strong>Role:</strong> Admin</p>
                        <p><strong>Status:</strong> {selected.status || "active"}</p>
                        <p><strong>UID:</strong> {selected.id || "-----"}</p>
                        <p><strong>Notes:</strong> Admin account managed by the system.</p>
                      </div>
                      <div className="profile-card">
                        <h4>Contact</h4>
                        <p><strong>Email:</strong> {selected.email || "-----"}</p>
                        <p><strong>Phone:</strong> {selectedPhone}</p>
                        <p><strong>Location:</strong> {selectedLocation}</p>
                      </div>
                    </>
                  )}
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

                {selectedProfileType === "housekeeper" && (
                  <>
                    <div className="profile-card dense">
                      <h4>Bio</h4>
                      <p>{selected.experience || "No bio provided."}</p>
                    </div>
                    <div className="profile-card dense">
                      <h4>Compliance</h4>
                      <p><strong>Gov ID:</strong> {selected.govId || "—"}</p>
                      <p><strong>Brgy Clearance:</strong> {selected.barangayClearance}</p>
                      <p><strong>Training:</strong> {selected.trainingCompleted ? "Completed" : "Pending"}</p>
                      <p><strong>Certification:</strong> {selected.certification || "—"}</p>
                      <p><strong>Health Cert:</strong> {selected.healthCert || "—"}</p>
                    </div>
                  </>
                )}

                {selectedProfileType === "householder" && (
                  <>
                    <div className="profile-card dense">
                      <h4>Contact</h4>
                      <p><strong>Email:</strong> {selected.email || "—"}</p>
                      <p><strong>Phone:</strong> {selectedPhone}</p>
                    </div>
                    <div className="profile-card dense">
                      <h4>Location</h4>
                      <p><strong>Province:</strong> {selected.province || "—"}</p>
                      <p><strong>Municipality:</strong> {selected.municipality || "—"}</p>
                      <p><strong>Barangay:</strong> {selected.barangay || "—"}</p>
                    </div>
                  </>
                )}

                {selectedProfileType === "admin" && (
                  <>
                    <div className="profile-card dense">
                      <h4>Security</h4>
                      <p>Admin accounts can manage users, roles, and deletions.</p>
                    </div>
                    <div className="profile-card dense">
                      <h4>Account</h4>
                      <p><strong>Status:</strong> {selected.status || "active"}</p>
                      <p><strong>Joined:</strong> {selected.joined || "—"}</p>
                    </div>
                  </>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
