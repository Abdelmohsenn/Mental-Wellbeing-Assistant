import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import SignUp from './components/LoginSignup/Signup';
import Login from './components/LoginSignup/Login';
import Chat from './components/Chat';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  return (
    <Router>
      <div className="App">
        <h1 style={{ textAlign: 'center', margin: '20px' }}>Hello, I'm Nano, I'm here to talk hihi</h1>

        <Routes>
          <Route path="/" element={<SignUp setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route
            path="/chat"
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;

