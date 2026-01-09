import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import './Dashboard.css';

const Dashboard = () => {
  const [username, setUsername] = useState('User');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('username');
    if (storedUser) setUsername(storedUser);
  }, []);

  const createNewDoc = () => {
    const newId = uuidv4();
    // Navigate to the Workspace with a fresh ID
    navigate(`/document/${newId}`);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>doc_online</h1>
        <div className="user-menu">
          <span>Welcome, <strong>{username}</strong></span>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="action-bar">
          <h2>Your Documents</h2>
          <button className="create-btn" onClick={createNewDoc}>
            <span className="plus-icon">+</span> Blank Document
          </button>
        </div>

        <div className="doc-grid">
          {/* We will map through real DB documents here in Phase 4 */}
          <div className="doc-card placeholder">
            <div className="doc-preview"></div>
            <div className="doc-info">
              <p>No documents yet.</p>
              <span>Click "+" to start writing</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;