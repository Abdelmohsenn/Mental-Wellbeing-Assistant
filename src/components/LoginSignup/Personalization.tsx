import React, { useState } from "react";
import "./Personalization.css";
import { useNavigate } from "react-router-dom";

export default function BackgroundForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    occupation: "",
    educationLevel: "",
    relationshipStatus: "",
    interests: "",
    motherTongue: "",
    country: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitted Background:", formData);
    // Handle submission (API/localStorage/etc)
  };

  return (
    <div className="background-container">
      <form onSubmit={handleSubmit} className="form-container">
        <h2 className="form-title">Background Information</h2>

        <div className="form-field">
          <label className="form-label">Occupation</label>
          <input
            type="text"
            name="occupation"
            value={formData.occupation}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. Software Engineer"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Education Level</label>
          <select
            name="educationLevel"
            value={formData.educationLevel}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select...</option>
            <option value="High School">High School</option>
            <option value="Diploma">Diploma</option>
            <option value="Bachelor">Bachelor's Degree</option>
            <option value="Master">Master's Degree</option>
            <option value="PhD">PhD</option>
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Relationship Status</label>
          <select
            name="relationshipStatus"
            value={formData.relationshipStatus}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select...</option>
            <option value="Single">Single</option>
            <option value="In a relationship">In a relationship</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Interests</label>
          <input
            type="text"
            name="interests"
            value={formData.interests}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. Reading, Music, Coding"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Mother Tongue</label>
          <input
            type="text"
            name="motherTongue"
            value={formData.motherTongue}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. Arabic, English"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Country</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. Egypt, USA"
          />
        </div>

        <button type="submit" className="submit-button">
          Submit
        </button>

        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/profile")}
        >
          Back to Profile
        </button>
      </form>
    </div>
  );
}
