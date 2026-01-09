import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Login from './components/Login';
import './App.css';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');

  // 1. Check for saved token on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('username');
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) setUsername(savedUser);
    }
  }, []);

  // 2. Handle Login Success
  const handleLogin = (newToken: string, newUsername: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
  };

  // 3. Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername('');
  };

  // 4. Decide which screen to show
  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
       {/* Small Header for Logout */}
       <div style={{
         position: 'absolute', 
         top: '10px', 
         right: '20px', 
         zIndex: 100,
         display: 'flex',
         gap: '10px',
         alignItems: 'center'
       }}>
          <span style={{fontWeight: 'bold', color: '#555'}}>Hi, {username}</span>
          <button 
            onClick={handleLogout}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              backgroundColor: '#ff4757',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
       </div>

       <Editor />
    </div>
  );
}

export default App;