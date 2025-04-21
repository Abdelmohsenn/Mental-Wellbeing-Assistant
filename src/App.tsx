import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import SignUp from './components/LoginSignup/Signup';
import Login from './components/LoginSignup/Login';
import Chat from './components/Chat';
import Profile from './components/Profile'; // Adjust path if needed


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  return (
    <Router>
      <div className="App">
        <div className="header">
          <h1 className='title'>Nano, Your Personal Wellbeing Assistant</h1>
        </div>
        <Routes>
          <Route path="/" element={<SignUp setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route
            path="/chat/:date?"
            element={
              isLoggedIn ? (
                <Chat />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p>Please log in to access the chat.</p>
                </div>
              )
            }
          />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

