import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Signup.css';

interface SignUpProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const SignUp: React.FC<SignUpProps> = ({ setIsLoggedIn }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email && password) {
      setIsLoggedIn(true);
      alert('Sign-up successful!');
    } else {
      alert('Please fill out all fields');
    }
  };

  return (
    <div className="form-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
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
