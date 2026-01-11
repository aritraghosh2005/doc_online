import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';

import Editor from './Editor';
import './Workspace.css';

//Sounds
import startSfx from '../assets/sounds/start.mp3';
import endSfx from '../assets/sounds/end.mp3';

interface DBDoc {
  _id: string;
  name: string;
  title: string;
  lastModified: string;
}

const Workspace = () => {
  const { id } = useParams();
  const documentId = id || 'default_doc';
  
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const ydoc = useMemo(() => new Y.Doc(), []);
  const [provider, setProvider] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showDownloads, setShowDownloads] = useState(false);

  // --- WELLNESS & SETTINGS STATE ---
  const [rightView, setRightView] = useState<'tools' | 'settings'>('tools');
  
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [docList, setDocList] = useState<DBDoc[]>([]); 

  const [isRuleActive, setIsRuleActive] = useState(() => {
    const saved = localStorage.getItem('rule2020_active');
    return saved ? JSON.parse(saved) : false;
  });

  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('app_muted');
    return saved ? JSON.parse(saved) : false;
  });

  const [showWellnessOverlay, setShowWellnessOverlay] = useState(false);
  const [wellnessCountdown, setWellnessCountdown] = useState(20);

  useEffect(() => {
    localStorage.setItem('rule2020_active', JSON.stringify(isRuleActive));
  }, [isRuleActive]);

  useEffect(() => {
    localStorage.setItem('app_muted', JSON.stringify(isMuted));
  }, [isMuted]);
  // ADD THE AUDIO OBJECTS HERE
const startSound = useMemo(() => {
    const audio = new Audio(startSfx);
    audio.volume = 1.0; // Optional: Adjust volume (0.0 to 1.0)
    return audio;
  }, []);

  const endSound = useMemo(() => {
    const audio = new Audio(endSfx);
    audio.volume = 1.0; 
    return audio;
  }, []);

// --- 20-20-20 RULE LOGIC ---
// 1. START SEQUENCE
useEffect(() => {
  let interval: NodeJS.Timeout;
  if (isRuleActive) {
    interval = setInterval(() => {
      // PLAY SOUND (Only if not muted)
      if (!isMuted) {
        startSound.currentTime = 0;
        startSound.play().catch((err) => console.error("Start sound blocked:", err));
      }

      // Wait 1 second, then show window
      setTimeout(() => {
        setWellnessCountdown(20);
        setShowWellnessOverlay(true);
      }, 1000);

    }, 60000); // 1 minute
  }
  return () => clearInterval(interval);
}, [isRuleActive, startSound, isMuted]); // Added isMuted to dependency

// 2. END SEQUENCE & COUNTDOWN
useEffect(() => {
  let timer: NodeJS.Timeout;

  if (showWellnessOverlay && wellnessCountdown > 0) {
    timer = setTimeout(() => setWellnessCountdown((prev) => prev - 1), 1000);

    // PLAY END SOUND (Only if not muted)
    if (wellnessCountdown === 1 && !isMuted) {
      endSound.currentTime = 0;
      endSound.play().catch((err) => console.error("End sound blocked:", err));
    }

  } else if (wellnessCountdown === 0 && showWellnessOverlay) {
    setShowWellnessOverlay(false);
  }

  return () => clearTimeout(timer);
}, [showWellnessOverlay, wellnessCountdown, endSound, isMuted]);

  // --- ACCOUNT DELETION ---
  const handleDeleteAccount = async () => {
    const confirm = window.confirm("WARNING: This will permanently delete your account and all documents. Proceed?");
    if (confirm && user) {
      try {
        await user.delete();
        navigate('/');
      } catch (err) {
        alert("For security, please log out and back in to verify your identity before deleting.");
      }
    }
  };

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:1234/api/documents?userId=${user.id}`);
      const data = await res.json();
      const validDocs = Array.isArray(data) ? data.filter(d => d && d.name) : [];
      setDocList(validDocs);
      const currentDoc = validDocs.find((d: DBDoc) => d.name === documentId);
      if (currentDoc && currentDoc.title) setDocTitle(currentDoc.title);
    } catch (err) { console.error("Failed to load documents", err); }
  }, [user, documentId]);

  useEffect(() => {
    if (isLoaded && user) fetchDocuments();
  }, [isLoaded, user, fetchDocuments]);

  const handleNewDocument = async () => {
    if (!user) return;
    const newId = uuidv4();
    try {
        await fetch('http://localhost:1234/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newId, title: 'Untitled Document', ownerId: user.id })
        });
        navigate(`/document/${newId}`);
        setTimeout(() => window.location.reload(), 50);
    } catch (e) { alert("Error creating document"); }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string, docName: string) => {
    e.stopPropagation(); 
    if (window.confirm(`Are you sure you want to delete "${docName}"?`)) {
        try {
            await fetch(`http://localhost:1234/api/documents/${docId}`, { method: 'DELETE' });
            if (docId === documentId) { navigate('/'); window.location.reload(); } else { fetchDocuments(); }
        } catch (err) { alert("Failed to delete"); }
    }
  };

  const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => setDocTitle(e.target.value);

  const saveTitle = async () => {
    try {
      await fetch(`http://localhost:1234/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle })
      });
      ydoc.getMap('metadata').set('title', docTitle);
      fetchDocuments();
    } catch (err) { console.error("Failed to save title", err); }
  };

  useEffect(() => {
    const newProvider = new HocuspocusProvider({
      url: 'ws://localhost:1235',
      name: documentId,
      document: ydoc,
      onConnect: () => setConnected(true),
      onClose: () => setConnected(false),
    });
    setProvider(newProvider);
    return () => { newProvider.destroy(); };
  }, [ydoc, documentId]);

  const handleOpenDoc = (targetId: string) => {
    navigate(`/document/${targetId}`);
    window.location.reload();
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const exportPDF = () => {
    const element = document.querySelector('.a4-sheet') as HTMLElement;
    if (element) {
      const opt = { margin: 10, filename: `${docTitle}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      html2pdf().set(opt as any).from(element).save();
    }
  };

  const exportWord = () => {
    const element = document.querySelector('.ProseMirror');
    if (element) {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + element.innerHTML + footer;
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `${docTitle}.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
    }
  };

  const [notes, setNotes] = useState(() => localStorage.getItem(`notes_${documentId}`) || '');
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    localStorage.setItem(`notes_${documentId}`, e.target.value);
  };

  const [tasks, setTasks] = useState<{id: number, text: string, done: boolean}[]>(() => {
    const saved = localStorage.getItem(`todo_${documentId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [newTask, setNewTask] = useState('');
  useEffect(() => { localStorage.setItem(`todo_${documentId}`, JSON.stringify(tasks)); }, [tasks, documentId]);

  const addTask = () => { if (newTask.trim()) { setTasks([...tasks, { id: Date.now(), text: newTask, done: false }]); setNewTask(''); }};
  const toggleTask = (id: number) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id: number) => setTasks(tasks.filter(t => t.id !== id));

  if (!isLoaded || !provider) return <div className="loading-spinner">Connecting...</div>;

  return (
    <div className="workspace-layout">
      {/* WELLNESS OVERLAY */}
      {showWellnessOverlay && (
  <div className="wellness-overlay">
    {/* Floating Bubbles behind text */}
    <div className="bubbles-container">
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
    </div>

    <button className="close-overlay" onClick={() => setShowWellnessOverlay(false)}>
      &times;
    </button>

    <div className="wellness-content" style={{ textAlign: 'center', zIndex: 1 }}>
      <h1 className="overlay-heading">Rule 20-20-20</h1>
      <p style={{ color: '#4b5563', fontSize: '1.2rem' }}>Look 20 feet away and blink 20 times!</p>
      <div className="wellness-timer" style={{ fontSize: '5rem', fontWeight: '900', color: '#2563eb', marginTop: '20px' }}>
        {wellnessCountdown}s
      </div>
    </div>
  </div>
)}
      {/* LEFT SIDEBAR */}
      <aside className={`sidebar left-side ${leftOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  {leftOpen && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* NEW BACK BUTTON */}
      <button 
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
        title="Back to Dashboard"
      >
        🏠
      </button>
      <h3>File Manager</h3>
    </div>
  )}
  <button className="toggle-btn visible" onClick={() => setLeftOpen(!leftOpen)}>
    {leftOpen ? '◀' : '▶'}
  </button>
</div>
        {leftOpen && (
          <div className="sidebar-content">
            <div className="doc-meta-section">
                <label>Document Name:</label>
                <input type="text" value={docTitle} onChange={handleRenameChange} onBlur={saveTitle} className="doc-title-input" />
            </div>
            <button className="new-doc-btn" onClick={handleNewDocument}>➕ New Document</button>
            <div className="divider-line"></div>
            <h4 style={{fontSize: '12px', color:'#888', marginBottom: '10px'}}>MY DOCUMENTS</h4>
            <div className="recent-list">
                {docList.map(doc => (
                    <div key={doc.name} className={`doc-item ${doc.name === documentId ? 'active' : ''}`} onClick={() => handleOpenDoc(doc.name)}>
                        <span className="doc-name-text">📄 {doc.title || "Untitled"}</span>
                        <button className="list-del-btn" onClick={(e) => handleDelete(e, doc.name, doc.title)}>🗑️</button>
                    </div>
                ))}
            </div>
          </div>
        )}
      </aside>

      <main className="editor-container">
        <Editor provider={provider} ydoc={ydoc} />
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className={`sidebar right-side ${rightOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="toggle-btn visible" onClick={() => setRightOpen(!rightOpen)}>
             {rightOpen ? '▶' : '◀'}
          </button>
          {rightOpen && <h3>{rightView === 'tools' ? 'Workspace' : 'Settings'}</h3>} 
        </div>

        {rightOpen && (
          <div className="sidebar-flex-wrapper">
            <div className="sidebar-content">
              {rightView === 'tools' ? (
                <>
                  <div className="tool-box profile-box">
                    <img src={user?.imageUrl} alt="Profile" className="avatar" style={{ borderRadius: '50%', objectFit: 'cover' }} />
                    <div className="user-details">
                      <div className="profile-row">
                        <span className="user-name">{user?.firstName || "User"}</span>
                        <button className="settings-gear-btn" onClick={() => setRightView('settings')}>⚙️</button>
                      </div>
                      <button className="logout-btn-prominent" onClick={handleLogout}>Logout</button>
                    </div>
                  </div>

                  <div className="tool-box todo-section">
                    <h4>✅ To-Do List</h4>
                    <div className="todo-input-group">
                      <input type="text" placeholder="Add task..." value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTask()} />
                      <button onClick={addTask}>+</button>
                    </div>
                    <ul className="todo-list">
                      {tasks.map(task => (
                        <li key={task.id} className={task.done ? 'completed' : ''}>
                          <span onClick={() => toggleTask(task.id)}>{task.text}</span>
                          <button className="del-btn" onClick={() => deleteTask(task.id)}>×</button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="tool-box tools-section">
                    <h4>📝 Quick Notes</h4>
                    <textarea className="notes-area" rows={10} value={notes} onChange={handleNoteChange}></textarea>
                  </div>
                </>
              ) : (
                <div className="settings-panel">
                  <button className="back-to-workspace" onClick={() => setRightView('tools')}>← Workspace</button>
                  <div className="settings-card">
                    <div className="setting-item-row">
                      <div className="setting-label-group">
                        <strong className="setting-main-label">Rule 20-20-20</strong>
                        <p className="setting-sub-label">Reminder every 1 minute</p>
                      </div>
                      <label className="swipe-toggle">
                        <input type="checkbox" checked={isRuleActive} onChange={() => setIsRuleActive(!isRuleActive)} />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    <div className="setting-item-row" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                    <div className="setting-label-group">
                    <strong className="setting-main-label">Sound Effects</strong>
                    <p className="setting-sub-label">{isMuted ? 'Muted' : 'Enabled'}</p>
                  </div>
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    opacity: isMuted ? 0.5 : 1
                  }}
                  title={isMuted ? "Unmute" : "Mute"}
                  >
                        {isMuted ? '🔇' : '🔊'}
                      </button>
                    </div>
                  </div>
                  <div className="danger-zone-card">
                    <p className="danger-heading">Account Security</p>
                    <button className="delete-account-btn" onClick={handleDeleteAccount}>Delete Account</button>
                  </div>
                </div>
              )}
            </div>

            {/* DOWNLOAD FOOTER (Only in Workspace/Tools view) */}
            {rightView === 'tools' && (
              <div className="sidebar-footer-fixed">
                <div className="download-section-inner">
                  <div className="download-wrapper">
                    <button className="main-download-btn" onClick={() => setShowDownloads(!showDownloads)}>
                      <span>Download File</span>
                      <span style={{ fontSize: '12px' }}>◀</span>
                    </button>
                    {showDownloads && (
                      <div className="download-options-popout">
                        <button onClick={exportPDF}>📄 PDF ({docTitle})</button>
                        <button onClick={exportWord}>📝 DOCX ({docTitle})</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

export default Workspace;