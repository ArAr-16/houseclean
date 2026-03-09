import React, { useState } from "react";
import "./Contact.css";
import { rtdb } from "../firebase";
import { push, ref, serverTimestamp } from "firebase/database";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setFeedback("");
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      message: formData.message.trim(),
      status: "unread",
      createdAt: serverTimestamp(),
    };
    try {
      // Save the inbound message and grab the key
      const msgRef = await push(ref(rtdb, "ContactMessages"), payload);
      // Add an admin notification entry linked to the message
      await push(ref(rtdb, "AdminNotifications"), {
        title: "New contact message",
        body: `${payload.name || "Visitor"} sent a message`,
        message: payload.message,
        preview: payload.message.slice(0, 140),
        email: payload.email,
        name: payload.name,
        status: "unread",
        type: "contact",
        messageId: msgRef.key,
        createdAt: serverTimestamp(),
      });
      setFeedback("Thank you for your message! We'll get back to you soon.");
      setFormData({ name: "", email: "", message: "" });
    } catch (err) {
      setFeedback(err.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact">
      <h1>Contact Us</h1>
      <div className="contact-content">
        <div className="contact-info">
          <h2>Get In Touch</h2>
          <p><strong>Email:</strong> support@houseclean.com</p>
          <p><strong>Phone:</strong> +63 912 345 6789</p>
          <p><strong>Business Hours:</strong></p>
          <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
          <p>Saturday: 9:00 AM - 4:00 PM</p>
          <p>Sunday: Closed</p>
          <p><strong>Address:</strong></p>
          <p>Arellano Street 2400 Dagupan City Pangasinan</p>
          <p>We'd love to hear from you! Whether you have questions about our services, need to schedule a cleaning, or just want to say hello, feel free to reach out.</p>
        </div>
        <div className="contact-form">
          <h2>Send Us a Message</h2>
          {feedback && <div className="alert-box">{feedback}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
              ></textarea>
            </div>
            <button type="submit" className="submit-msg" disabled={sending}>
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
      <div className="map-section">
  <h2>Find Us</h2>
  <div className="map-container">
    <iframe
      title="Houseclean Location"
      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3876.123456789!2d120.333333!3d16.043333!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3393d123456789%3A0xabcdef123456789!2sArellano%20Street%2C%20Dagupan%20City%2C%20Pangasinan!5e0!3m2!1sen!2sph!4v1700000000000!5m2!1sen!2sph"
      width="100%"
      height="400"
      style={{ border: 0 }}
      allowFullScreen=""
      loading="lazy"
    ></iframe>
  </div>
</div>
    </div>
  );
}

export default Contact;
