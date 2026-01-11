import React, { useState, useEffect, useRef } from 'react';
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

// Updated Interface for Fading Particles
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string; // Stored as "r,g,b" so we can add opacity later
  life: number;  // 1.0 = fully visible, 0.0 = deleted
}

const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState<DBDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinId, setJoinId] = useState('');
  
  // --- MOUSE TRAIL PARTICLE LOGIC ---
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    // 1. Counter to track mouse moves
    let throttleCounter = 0; 

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = (e: MouseEvent) => {
      // 2. Increment counter
      throttleCounter++;

      // 3. Throttle Check - CHANGED from 4 to 2
      // Lower number = gaps filled in = smoother line
      if (throttleCounter % 2 !== 0) return; 

      const count = 1; 
      for (let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);

        particles.push({
          x: e.clientX,
          y: e.clientY,
          // CHANGED: Velocity reduced from 3 to 1 for "gentle" drift
          vx: (Math.random() - 0.5) * 1, 
          vy: (Math.random() - 0.5) * 1,
          // CHANGED: Size reduced from 10-20 to 2-6 for "dust" look
          size: Math.random() * 4 + 7,
          color: `${r},${g},${b}`,
          life: 1.0
        });
      }
    };

    // 2. Animation Loop
    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
  
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          
          // CHANGED: Slower fade (was 0.02)
          p.life -= 0.015; 
          // CHANGED: Slower shrink (was 0.95)
          p.size *= 0.98; 
  
          if (p.life > 0 && p.size > 0.5) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, ${p.life})`; 
            ctx.fill();
          } else {
            particles.splice(i, 1);
            i--;
          }
        }
  
        animationFrameId = requestAnimationFrame(animate);
      };
  
      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('mousemove', createParticles);
      
      resizeCanvas();
      animate();
  
      return () => {
        window.removeEventListener('resize', resizeCanvas);
        window.removeEventListener('mousemove', createParticles);
        cancelAnimationFrame(animationFrameId);
      };
  }, []);
  // --- END PARTICLE LOGIC ---

  useEffect(() => {
    if (user) {
      fetch(`http://localhost:1234/api/documents?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          const validDocs = Array.isArray(data) ? data.filter(d => d.name) : [];
          setDocuments(validDocs);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching docs:", err);
          setLoading(false);
        });
    }
  }, [user]);

  const handleCreateNew = async () => {
    if (!user) return;
    const newId = uuidv4();
    try {
      await fetch('http://localhost:1234/api/documents', {
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
      alert("Error creating document. Is the backend running?");
    }
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinId.trim()) return alert("Please enter a Document ID");
    if (!user) return;

    try {
      const res = await fetch('http://localhost:1234/api/documents/join', {
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
      {/* 1. THE PARTICLES CANVAS */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* 2. HEADER (Stays on top) */}
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

      {/* 3. MAIN CONTENT (Stays on top of canvas) */}
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