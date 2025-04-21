import React, { useState } from 'react';
import './Profile.css';

const Profile: React.FC = () => {
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john@example.com');
  const [password, setPassword] = useState('password123');

  const [editMode, setEditMode] = useState({
    name: false,
    email: false,
    password: false,
  });

  const toggleEdit = (field: 'name' | 'email' | 'password') => {
    setEditMode((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = () => {
    alert('Changes saved!');
    setEditMode({ name: false, email: false, password: false });
    // Your save logic here
  };

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      <div className="profile-item">
        <label>Name:</label>
        {editMode.name ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          <span>{name}</span>
        )}
        <button onClick={() => toggleEdit('name')} className="edit-icon">✏️</button>
      </div>

      <div className="profile-item">
        <label>Email:</label>
        {editMode.email ? (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : (
          <span>{email}</span>
        )}
        <button onClick={() => toggleEdit('email')} className="edit-icon">✏️</button>
      </div>

      <div className="profile-item">
        <label>Password:</label>
        {editMode.password ? (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : (
          <span>{'*'.repeat(password.length)}</span>
        )}
        <button onClick={() => toggleEdit('password')} className="edit-icon">✏️</button>
      </div>

      <button className="save-button" onClick={handleSave}>
        Save Changes
      </button>

      <button className="personalize-button" onClick={() => alert('Open personalization...')}>
        Add Personalization
      </button>
    </div>
  );
};

export default Profile;
