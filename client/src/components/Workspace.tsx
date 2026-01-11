import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// Sounds
import startSfx from '../assets/sounds/start.mp3';
import endSfx from '../assets/sounds/end.mp3';

interface DBDoc {
  _id: string;
  name: string;
  title: string;
  lastModified: string;
  collaborators?: string[];
}

interface CollabUser {
  clientId: number;
  user: {
    id: string;
    name: string;
    imageUrl: string;
    status: 'online' | 'afk' | 'rule20';
  }
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
  
  // Layout State
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showDownloads, setShowDownloads] = useState(false);
  const [rightView, setRightView] = useState<'tools' | 'settings'>('tools');
  
  // Document State
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [docList, setDocList] = useState<DBDoc[]>([]); 
  
  // Collaborator State
  const [onlineUsers, setOnlineUsers] = useState<CollabUser[]>([]);
  const [allCollaboratorIds, setAllCollaboratorIds] = useState<string[]>([]);

  // --- SETTINGS ---
  const [isRuleActive, setIsRuleActive] = useState(() => {
    const saved = localStorage.getItem('rule2020_active');
    return saved ? JSON.parse(saved) : false;
  });

  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('app_muted');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => { localStorage.setItem('rule2020_active', JSON.stringify(isRuleActive)); }, [isRuleActive]);
  useEffect(() => { localStorage.setItem('app_muted', JSON.stringify(isMuted)); }, [isMuted]);

  // Audio
  const startSound = useMemo(() => {
    const audio = new Audio(startSfx); audio.volume = 1.0; return audio;
  }, []);
  const endSound = useMemo(() => {
    const audio = new Audio(endSfx); audio.volume = 1.0; return audio;
  }, []);

  // --- AFK & STATUS STATE ---
  const [showWellnessOverlay, setShowWellnessOverlay] = useState(false);
  const [wellnessCountdown, setWellnessCountdown] = useState(20);
  
  const [isAFK, setIsAFK] = useState(false);
  const [afkStartTime, setAfkStartTime] = useState<number | null>(null);
  const [afkTimerDisplay, setAfkTimerDisplay] = useState(0);
  
  const lastActivityRef = useRef(Date.now());

  // --- GENERATE COLORFUL BUBBLES ---
  const bubbles = useMemo(() => {
    // A palette of vibrant colors for the bubbles
    const colors = [
      'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)', // Red
      'linear-gradient(135deg, #fdba74 0%, #f97316 100%)', // Orange
      'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)', // Yellow
      'linear-gradient(135deg, #86efac 0%, #22c55e 100%)', // Green
      'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)', // Blue
      'linear-gradient(135deg, #d8b4fe 0%, #a855f7 100%)', // Purple
    ];

    return Array.from({ length: 50 }).map((_, i) => {
      const size = Math.floor(Math.random() * (100 - 5 + 1) + 5); 
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      return {
        id: i,
        size: size,
        left: Math.floor(Math.random() * 100), 
        duration: Math.floor(Math.random() * (15 - 3 + 1) + 3), 
        delay: Math.random() * 5, 
        moveX: Math.floor(Math.random() * (200 - (-100) + 1) + (-100)),
        background: randomColor // Assign random color
      };
    });
  }, []);

  const triggerAFK = (status: boolean) => {
    if (status) {
      setIsAFK(true);
      setAfkStartTime(Date.now());
      setAfkTimerDisplay(0);
    } else {
      setIsAFK(false);
      setAfkStartTime(null);
      setAfkTimerDisplay(0);
    }
  };

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (isAFK && afkStartTime) {
        if (Date.now() - afkStartTime > 1000) {
          triggerAFK(false);
        }
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveSecs = Math.floor((now - lastActivityRef.current) / 1000);

      if (inactiveSecs > 600 && !isAFK) { 
        triggerAFK(true);
      }

      if (isAFK && afkStartTime) { 
        const duration = Math.floor((now - afkStartTime) / 1000);
        setAfkTimerDisplay(duration); 
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(interval);
    };
  }, [isAFK, afkStartTime]);

  useEffect(() => {
    if (provider && user && provider?.awareness) {
      let myStatus = 'online';
      if (showWellnessOverlay) myStatus = 'rule20';
      else if (isAFK) myStatus = 'afk';
      provider.awareness.setLocalStateField('user', {
        id: user.id, name: user.firstName, imageUrl: user.imageUrl, status: myStatus, color: '#2563eb'
      });
    }
  }, [provider, user, isAFK, showWellnessOverlay]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRuleActive && !isAFK) { 
      interval = setInterval(() => {
        if (!isMuted) { startSound.currentTime = 0; startSound.play().catch((err) => console.error(err)); }
        setTimeout(() => { setWellnessCountdown(20); setShowWellnessOverlay(true); }, 1000);
      }, 1200000); 
    }
    return () => clearInterval(interval);
  }, [isRuleActive, startSound, isMuted, isAFK]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showWellnessOverlay && wellnessCountdown > 0) {
      timer = setTimeout(() => setWellnessCountdown((prev) => prev - 1), 1000);
      if (wellnessCountdown === 1 && !isMuted) { endSound.currentTime = 0; endSound.play().catch((err) => console.error(err)); }
    } else if (wellnessCountdown === 0 && showWellnessOverlay) { setShowWellnessOverlay(false); }
    return () => clearTimeout(timer);
  }, [showWellnessOverlay, wellnessCountdown, endSound, isMuted]);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:1234/api/documents?userId=${user.id}`);
      const data = await res.json();
      const validDocs = Array.isArray(data) ? data.filter(d => d && d.name) : [];
      setDocList(validDocs);
      const currentDoc = validDocs.find((d: DBDoc) => d.name === documentId);
      if (currentDoc) {
          if(currentDoc.title) setDocTitle(currentDoc.title);
          setAllCollaboratorIds(currentDoc.collaborators || []);
      }
    } catch (err) { console.error("Failed to load documents", err); }
  }, [user, documentId]);

  useEffect(() => { if (isLoaded && user) fetchDocuments(); }, [isLoaded, user, fetchDocuments]);

  const handleNewDocument = async () => {
    if (!user) return;
    const newId = uuidv4();
    try {
        await fetch('http://localhost:1234/api/documents', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newId, title: 'Untitled Document', ownerId: user.id })
        });
        navigate(`/document/${newId}`); setTimeout(() => window.location.reload(), 50);
    } catch (e) { alert("Error creating document"); }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string, docName: string) => {
    e.stopPropagation(); 
    if (window.confirm(`Are you sure you want to delete "${docName}"?`)) {
        try { await fetch(`http://localhost:1234/api/documents/${docId}`, { method: 'DELETE' });
            if (docId === documentId) { navigate('/'); window.location.reload(); } else { fetchDocuments(); }
        } catch (err) { alert("Failed to delete"); }
    }
  };

  const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => setDocTitle(e.target.value);
  const saveTitle = async () => {
    try {
      await fetch(`http://localhost:1234/api/documents/${documentId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: docTitle })
      });
      ydoc.getMap('metadata').set('title', docTitle); fetchDocuments();
    } catch (err) { console.error(err); }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("WARNING: Permanently delete account?")) {
      try { await user?.delete(); navigate('/'); } catch (err) { alert("Error deleting account."); }
    }
  };

  useEffect(() => {
    const newProvider = new HocuspocusProvider({
      url: 'ws://localhost:1235', name: documentId, document: ydoc,
      onConnect: () => setConnected(true), onClose: () => setConnected(false),
    });
    newProvider.on('awarenessUpdate', () => {
        const awareness = (newProvider as any).awareness; 
        if (awareness) {
          const states = awareness.getStates();
          const users: CollabUser[] = [];
          states.forEach((state: any, clientId: number) => {
            if (state.user) users.push({ clientId, user: state.user });
          });
          setOnlineUsers(users);
        }
    });
    setProvider(newProvider);
    return () => { newProvider.destroy(); };
  }, [ydoc, documentId]);

  const handleOpenDoc = (targetId: string) => { navigate(`/document/${targetId}`); window.location.reload(); };
  const handleLogout = async () => { await signOut(); navigate('/'); };
  
  const exportPDF = () => {
    const element = document.querySelector('.ProseMirror') as HTMLElement;
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
      document.body.appendChild(fileDownload); fileDownload.href = source; fileDownload.download = `${docTitle}.doc`; fileDownload.click(); document.body.removeChild(fileDownload);
    }
  };

  const [notes, setNotes] = useState(() => localStorage.getItem(`notes_${documentId}`) || '');
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setNotes(e.target.value); localStorage.setItem(`notes_${documentId}`, e.target.value); };
  
  const [tasks, setTasks] = useState<{id: number, text: string, done: boolean}[]>(() => {
    const saved = localStorage.getItem(`todo_${documentId}`); return saved ? JSON.parse(saved) : [];
  });
  const [newTask, setNewTask] = useState('');
  useEffect(() => { localStorage.setItem(`todo_${documentId}`, JSON.stringify(tasks)); }, [tasks, documentId]);
  
  const addTask = () => { if (newTask.trim()) { setTasks([...tasks, { id: Date.now(), text: newTask, done: false }]); setNewTask(''); }};
  const toggleTask = (id: number) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id: number) => setTasks(tasks.filter(t => t.id !== id));

  const getStatusColor = (status?: string) => {
    if (status === 'rule20' || status === 'afk') return '#ef4444'; 
    if (status === 'online') return '#22c55e'; 
    return '#9ca3af'; 
  };
  const getOfflineCollaborators = () => {
      if(!user) return [];
      const onlineIds = onlineUsers.map(u => u.user.id);
      return allCollaboratorIds.filter(id => !onlineIds.includes(id) && id !== user.id);
  }

  if (!isLoaded || !provider) return <div className="loading-spinner">Connecting...</div>;

  return (
    <div className="workspace-layout">
      {isAFK && !showWellnessOverlay && (
        <div className="wellness-overlay afk-overlay" style={{background: 'rgba(0,0,0,0.85)'}}>
           <div className="bubbles-container">
            {bubbles.map((b) => (
              <div 
                key={b.id} 
                className="bubble" 
                style={{
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  left: `${b.left}vw`,
                  '--move-x': `${b.moveX}px`, 
                  animationDuration: `${b.duration}s`,
                  animationDelay: `${b.delay}s`,
                  background: b.background 
                } as React.CSSProperties}
              ></div>
            ))}
          </div>

           <div className="wellness-content" style={{textAlign:'center', color:'white'}}>
             <h1 className="overlay-heading">AFK Mode</h1>
             <div className="wellness-timer" style={{color: '#ef4444', fontSize:'4rem', margin:'20px 0'}}>
               {new Date(afkTimerDisplay * 1000).toISOString().substr(14, 5)}
             </div>
             <p style={{marginTop:'10px', fontSize:'0.9rem'}}>Move your mouse to resume</p>
           </div>
        </div>
      )}
      {showWellnessOverlay && (
        <div className="wellness-overlay">
          {/* RENDER COLORFUL BUBBLES */}
          <div className="bubbles-container">
            {bubbles.map((b) => (
              <div 
                key={b.id} 
                className="bubble" 
                style={{
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  left: `${b.left}vw`,
                  '--move-x': `${b.moveX}px`, 
                  animationDuration: `${b.duration}s`,
                  animationDelay: `${b.delay}s`,
                  background: b.background // Using random colorful gradient
                } as React.CSSProperties}
              ></div>
            ))}
          </div>

          <button className="close-overlay" onClick={() => setShowWellnessOverlay(false)}>&times;</button>
          <div className="wellness-content" style={{ textAlign: 'center' }}>
            <h1 className="overlay-heading">Rule 20-20-20</h1>
            <p style={{ color: '#4b5563', fontSize: '1.2rem' }}>Look 20 feet away!</p>
            <div className="wellness-timer" style={{ fontSize: '5rem', color: '#2563eb' }}>{wellnessCountdown}s</div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`sidebar left-side ${leftOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {leftOpen && <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><button onClick={() => navigate('/')} className="nav-home-btn"
      title="Back to Dashboard">🏠</button><h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>Files</h3></div>}
          <button className="toggle-btn visible" onClick={() => setLeftOpen(!leftOpen)}>{leftOpen ? '◀' : '▶'}</button>
        </div>
        
        {leftOpen && (
          <div className="sidebar-content">
            <div className="sidebar-scrollable">
                <div className="doc-meta-section">
                    <label>Document Name:</label>
                    <input type="text" value={docTitle} onChange={handleRenameChange} onBlur={saveTitle} className="doc-title-input" />
                </div>
                <button className="new-doc-btn" onClick={handleNewDocument} style={{marginTop:'20px'}}>➕ New Document</button>
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
            
            <div className="sidebar-footer">
                <h4 style={{fontSize: '11px', fontWeight:'bold', color:'#9ca3af', marginBottom:'10px'}}>EDITORS</h4>
                <div className="avatars-list" style={{display:'flex', gap:'12px', flexWrap:'wrap'}}>
                    {onlineUsers.map(u => (
                        <div key={u.clientId} className="avatar-wrapper" title={`${u.user.name} (${u.user.status})`} style={{position:'relative'}}>
                            <img src={u.user.imageUrl} style={{ width:'38px', height:'38px', borderRadius:'50%', border: `3px solid ${getStatusColor(u.user.status)}`, padding: '1px' }} />
                        </div>
                    ))}
                    {user && !onlineUsers.some(u => u.user.id === user.id) && (
                      <div className="avatar-wrapper" title="You" style={{position:'relative'}}>
                           <img src={user.imageUrl} style={{ width:'38px', height:'38px', borderRadius:'50%', border: `3px solid ${getStatusColor(isAFK || showWellnessOverlay ? 'rule20' : 'online')}`, padding: '1px' }} />
                      </div>
                    )}
                    {getOfflineCollaborators().map(offlineId => (
                        <div key={offlineId} className="avatar-wrapper" title="Offline"><div className="offline-avatar-placeholder">👤</div></div>
                    ))}
                </div>
            </div>
          </div>
        )}
      </aside>

      <main className="editor-main-wrapper" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', margin: 0, padding: 0 }}>
        <Editor provider={provider} ydoc={ydoc} />
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className={`sidebar right-side ${rightOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="toggle-btn visible" onClick={() => setRightOpen(!rightOpen)}>{rightOpen ? '▶' : '◀'}</button>
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
                          <div style={{display:'flex', alignItems:'center', gap:'8px', flex:1, overflow:'hidden'}}>
                              <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} style={{cursor:'pointer', width:'15px', height:'15px', accentColor:'#2563eb'}} />
                              <span onClick={() => toggleTask(task.id)} title={task.text} style={{cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                {task.text}
                              </span>
                          </div>
                          <button className="del-btn" onClick={() => deleteTask(task.id)}>×</button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="tool-box tools-section"><h4>📝 Quick Notes</h4><textarea className="notes-area" rows={10} value={notes} onChange={handleNoteChange}></textarea></div>
                </>
              ) : (
                <div className="settings-panel">
                  <button className="back-to-workspace" onClick={() => setRightView('tools')}>← Workspace</button>
                  <div className="settings-card">
                    <div className="setting-item-row">
                      <div className="setting-label-group"><strong className="setting-main-label">Rule 20-20-20</strong><p className="setting-sub-label">Reminder every 20 minutes</p></div>
                      <label className="swipe-toggle"><input type="checkbox" checked={isRuleActive} onChange={() => setIsRuleActive(!isRuleActive)} /><span className="toggle-slider"></span></label>
                    </div>
                    <div className="setting-item-row" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                      <div className="setting-label-group"><strong className="setting-main-label">Sound Effects</strong><p className="setting-sub-label">{isMuted ? 'Muted' : 'Enabled'}</p></div>
                      <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: isMuted ? 0.5 : 1 }}>{isMuted ? '🔇' : '🔊'}</button>
                    </div>
                    <div className="setting-item-row" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                       <div className="setting-label-group"><strong className="setting-main-label">AFK Mode</strong><p className="setting-sub-label">{isAFK ? 'Status: Away' : 'Status: Active'}</p></div>
                       <label className="swipe-toggle"><input type="checkbox" checked={isAFK} onChange={() => triggerAFK(!isAFK)} /><span className="toggle-slider" style={isAFK ? {backgroundColor: '#ef4444'} : {}}></span></label>
                    </div>
                  </div>
                  <div className="danger-zone-card"><p className="danger-heading">Account Security</p><button className="delete-account-btn" onClick={handleDeleteAccount}>Delete Account</button></div>
                </div>
              )}
            </div>
            {rightView === 'tools' && (
              <div className="sidebar-footer-fixed">
                <div className="download-section-inner">
                  <div className="download-wrapper">
                    <button className="main-download-btn" onClick={() => setShowDownloads(!showDownloads)}><span>Download File</span><span style={{ fontSize: '12px' }}>◀</span></button>
                    {showDownloads && (<div className="download-options-popout"><button onClick={exportPDF}>📄 PDF ({docTitle})</button><button onClick={exportWord}>📝 DOCX ({docTitle})</button></div>)}
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