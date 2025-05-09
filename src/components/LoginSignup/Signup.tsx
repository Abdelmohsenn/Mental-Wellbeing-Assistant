import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Signup.css';

interface SignUpProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const SignUp: React.FC<SignUpProps> = ({ setIsLoggedIn }) => {
  const [fullName, setFullName] = useState<string>(''); // Added state for full name
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      alert('Please fill out all fields');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    const SIGNUP_API = import.meta.env.VITE_SIGNUP_API;
    if (!SIGNUP_API) {
      alert('Sign-up API URL is not defined.');
      return;
    }

    const registerData = {
      FullName: fullName,
      PreferredName: (document.querySelector('input[placeholder="Enter your preferred name (optional)"]') as HTMLInputElement)?.value || '',
      DOB: (document.querySelector('input[type="date"]') as HTMLInputElement)?.value || '',
      Gender: (document.querySelector('select') as HTMLSelectElement)?.value || '',
      Email: email,
      Password: password,
      Username: email.split('@')[0], // Example: using part of the email as the username
    };

    try {
      const response = await fetch(SIGNUP_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      if (response.ok) {
        setIsLoggedIn(true);
        alert('Sign-up successful!');
        navigate('/login');
      } else {
        const errorData = await response.json();
        alert(`Sign-up failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during sign-up:', error);
      alert('An error occurred during sign-up. Please try again later.');
    }
  };

  return (
    <div className='form-container1'>
      <h1 className='SignupText'>Sign Up</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter your full name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
        />
        <input
          type="date"
          placeholder="Enter your date of birth"
          required
        />
        <select required>
          <option value="" disabled selected>
        Select your gender
          </option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </select>
        <input
          type="text"
          placeholder="Enter your preferred name (optional)"
        />
        <button type="submit" className="btn-submit">
          Sign Up
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default SignUp;
