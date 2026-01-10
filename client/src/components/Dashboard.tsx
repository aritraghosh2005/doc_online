import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useUser, UserButton } from '@clerk/clerk-react';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useUser();
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreateNew = () => {
    const newDocId = uuidv4();
    navigate(`/document/${newDocId}`);
  };

  const handleJoin = () => {
    if (!roomId.trim()) return alert("Please enter a Document ID!");
    navigate(`/document/${roomId}`);
  };

  return (
    <div className="login-container">
      {/* Top Right Profile Menu */}
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <UserButton afterSignOutUrl="/" />
      </div>

      <div className="login-card">
        <h1>📄 Doc_Online</h1>
        <p className="subtitle">Welcome back, <b>{user?.firstName}</b>!</p>

        <div className="action-buttons">
          <button className="btn-primary" onClick={handleCreateNew}>
            ✨ Create New Document
          </button>
          
          <div className="divider"><span>OR</span></div>

          <div className="join-section">
            <input 
              type="text" 
              placeholder="Paste Document ID here..." 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button className="btn-secondary" onClick={handleJoin}>
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;