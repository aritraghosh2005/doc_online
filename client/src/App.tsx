import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace'; 
import './App.css';

function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  const handleLogin = (newToken: string, newUsername: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="App">
         <Routes>
           {/* If user is logged in, show Dashboard at the root */}
           <Route path="/" element={<Dashboard />} />
           
           {/* Show Workspace when a document is opened */}
           <Route path="/document/:id" element={<Workspace />} />
           
           {/* Redirect any other URL back to Dashboard */}
           <Route path="*" element={<Navigate to="/" />} />
         </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;