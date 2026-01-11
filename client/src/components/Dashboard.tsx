import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useUser, UserButton } from '@clerk/clerk-react';
import './Dashboard.css';

interface DBDoc {
  _id: string;
  name: string;
  title: string;
  lastModified?: string;
}

const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState<DBDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinId, setJoinId] = useState('');

  // 1. DEFINE API BASE URL (Live vs Local)
  // This will use your Vercel Environment Variable if it exists, otherwise it defaults to localhost.
  const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:1234';
  
  // --- FIXED MOUSE TRAIL LOGIC ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Create the container
      const parentDiv = document.createElement('div');
      parentDiv.className = "loader-container";
      
      // 2. Create the inner shape
      const innerDiv = document.createElement('div');
      innerDiv.className = "loader";
      parentDiv.appendChild(innerDiv);
      
      // 3. Append to body
      document.body.appendChild(parentDiv);

      // 4. Position it (Centered)
      parentDiv.style.left = (e.clientX - 50) + 'px';
      parentDiv.style.top = (e.clientY - 50) + 'px';

      // 5. AUTO-REMOVE after 0.5s (Matches CSS animation time)
      setTimeout(() => {
        if(parentDiv.parentNode) {
          parentDiv.parentNode.removeChild(parentDiv);
        }
      }, 500); 
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      const all = document.getElementsByClassName('loader-container');
      Array.from(all).forEach(el => {
        if(el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, []);
  // --- END MOUSE TRAIL LOGIC ---

  useEffect(() => {
    if (user) {
      // UPDATED: Use API_BASE variable
      fetch(`${API_BASE}/api/documents?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          const validDocs = Array.isArray(data) ? data.filter((d: any) => d.name) : [];
          setDocuments(validDocs);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching docs:", err);
          setLoading(false);
        });
    }
  }, [user, API_BASE]); // Added API_BASE to dependencies

  const handleCreateNew = async () => {
    if (!user) return;
    const newId = uuidv4();
    try {
      // UPDATED: Use API_BASE variable
      await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newId, 
          title: 'Untitled Document', 
          ownerId: user.id 
        })
      });
      navigate(`/document/${newId}`);
    } catch (e) {
      console.error(e);
      alert("Error creating document. Is the backend running?");
    }
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinId.trim()) return alert("Please enter a Document ID");
    if (!user) return;

    try {
      // UPDATED: Use API_BASE variable
      const res = await fetch(`${API_BASE}/api/documents/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: joinId.trim(), userId: user.id })
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/document/${joinId.trim()}`);
      } else {
        alert(data.error || "Failed to join document");
      }
    } catch (err) {
      console.error("Join error", err);
      alert("Could not connect to server");
    }
  };

  if (!isLoaded) return <div className="loading-screen">Loading Dashboard...</div>;

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="brand">
          <span className="logo-icon">📄</span>
          <h2>Doc_Online</h2>
        </div>
        <div className="user-controls">
          <span className="welcome-text">Hi, {user?.firstName}</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="dashboard-content">
        <div className="actions-bar">
          <div className="create-section">
            <button className="btn-new-doc" onClick={handleCreateNew}>
              <span>+</span> New Document
            </button>
          </div>
          <form className="join-section-bar" onSubmit={handleJoin}>
            <input 
              type="text" 
              placeholder="Paste Document ID to join..." 
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <button type="submit" className="btn-join">Join</button>
          </form>
        </div>

        <div className="docs-area">
          <h3>Your Documents</h3>
          {loading ? (
            <p className="status-text">Loading documents...</p>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <p>You haven't created any documents yet.</p>
            </div>
          ) : (
            <div className="docs-grid">
              {documents.map((doc) => (
                <div key={doc.name} className="doc-card" onClick={() => navigate(`/document/${doc.name}`)}>
                  <div className="doc-preview">
                    <span style={{fontSize: '40px'}}>📝</span>
                  </div>
                  <div className="doc-info">
                    <h4 className="doc-title">{doc.title || "Untitled"}</h4>
                    <span className="doc-id">ID: {doc.name.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;