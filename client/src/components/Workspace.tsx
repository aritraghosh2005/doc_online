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

  // Yjs Document (Created once per documentId load)
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [provider, setProvider] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  
  // UI State
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showDownloads, setShowDownloads] = useState(false);
  
  // Document Data
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [docList, setDocList] = useState<DBDoc[]>([]); 

  // --- 1. FETCH DOCUMENTS ---
  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:1234/api/documents?userId=${user.id}`);
      const data = await res.json();
      
      const validDocs = Array.isArray(data) ? data.filter(d => d && d.name) : [];
      setDocList(validDocs);

      // Set title from DB immediately (prevents "Loading..." flash)
      const currentDoc = validDocs.find((d: DBDoc) => d.name === documentId);
      if (currentDoc && currentDoc.title) {
        setDocTitle(currentDoc.title);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  }, [user, documentId]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchDocuments();
    }
  }, [isLoaded, user, fetchDocuments]);

  // --- 2. CREATE NEW DOCUMENT ---
  const handleNewDocument = async () => {
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
        // Small timeout to allow DB write before reload
        setTimeout(() => window.location.reload(), 50);
    } catch (e) {
        alert("Error creating document");
    }
  };

  // --- 3. DELETE DOCUMENT ---
  const handleDelete = async (e: React.MouseEvent, docId: string, docName: string) => {
    e.stopPropagation(); 
    if (window.confirm(`Are you sure you want to delete "${docName}"?`)) {
        try {
            await fetch(`http://localhost:1234/api/documents/${docId}`, {
                method: 'DELETE',
            });
            if (docId === documentId) {
                navigate('/');
                window.location.reload();
            } else {
                fetchDocuments();
            }
        } catch (err) {
            alert("Failed to delete");
        }
    }
  };

  // --- 4. RENAME LOGIC (API + Yjs) ---
  const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocTitle(e.target.value);
  };

  const saveTitle = async () => {
    try {
      // API Update (Persist to DB)
      await fetch(`http://localhost:1234/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle })
      });
      // Yjs Update (Real-time sync to others)
      ydoc.getMap('metadata').set('title', docTitle);
      
      fetchDocuments();
    } catch (err) {
      console.error("Failed to save title", err);
    }
  };

  // --- 5. CONNECTION SETUP ---
  useEffect(() => {
    const newProvider = new HocuspocusProvider({
      url: 'ws://localhost:1235', // Port 1235 for WebSockets
      name: documentId,
      document: ydoc,
      onConnect: () => setConnected(true),
      onClose: () => setConnected(false),
    });

    setProvider(newProvider);

    // Sync Title from Yjs (for remote changes)
    const metaMap = ydoc.getMap('metadata');
    metaMap.observe(() => {
        const title = metaMap.get('title');
        if (title && typeof title === 'string') {
            setDocTitle(title);
            if (user) fetchDocuments(); 
        }
    });

    return () => { newProvider.destroy(); };
  }, [ydoc, documentId, user, fetchDocuments]);

  const handleOpenDoc = (targetId: string) => {
    navigate(`/document/${targetId}`);
    window.location.reload();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // --- EXPORTS ---
  const exportPDF = () => {
    const element = document.querySelector('.a4-sheet') as HTMLElement;
    if (element) {
      const opt = {
        margin: 10,
        filename: `${docTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
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

  // --- 6. LOCAL TOOLS (Notes & Todos - PER DOCUMENT) ---
  
  // A. Quick Notes Logic (Unique per Document)
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(`notes_${documentId}`) || '';
  });

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setNotes(newVal);
    localStorage.setItem(`notes_${documentId}`, newVal);
  };

  // B. To-Do List Logic (Unique per Document)
  const [tasks, setTasks] = useState<{id: number, text: string, done: boolean}[]>(() => {
    const saved = localStorage.getItem(`todo_${documentId}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [newTask, setNewTask] = useState('');

  // Save tasks whenever they change
  useEffect(() => { 
    localStorage.setItem(`todo_${documentId}`, JSON.stringify(tasks)); 
  }, [tasks, documentId]);

  const addTask = () => { if (newTask.trim()) { setTasks([...tasks, { id: Date.now(), text: newTask, done: false }]); setNewTask(''); }};
  const toggleTask = (id: number) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id: number) => setTasks(tasks.filter(t => t.id !== id));

  if (!isLoaded || !provider) return <div className="loading-spinner">Connecting...</div>;

  return (
    <div className="workspace-layout">
      {/* LEFT PANEL */}
      <aside className={`sidebar left-side ${leftOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          {leftOpen && <h3>File Manager</h3>}
          <button className="toggle-btn visible" onClick={() => setLeftOpen(!leftOpen)}>
            {leftOpen ? '◀' : '▶'}
          </button>
        </div>
        
        {leftOpen && (
          <div className="sidebar-content">
            <div className="doc-meta-section">
                <label>Document Name:</label>
                <input 
                    type="text" 
                    value={docTitle} 
                    onChange={handleRenameChange}
                    onBlur={saveTitle} // SAVES ON BLUR
                    className="doc-title-input"
                    placeholder="Untitled Document"
                />
            </div>

            <button className="new-doc-btn" onClick={handleNewDocument}>
                ➕ New Document
            </button>

            <div className="divider-line"></div>
            
            <h4 style={{fontSize: '12px', color:'#888', marginBottom: '10px'}}>MY DOCUMENTS</h4>
            <div className="recent-list">
                {docList.map(doc => (
                    <div 
                        key={doc.name} 
                        className={`doc-item ${doc.name === documentId ? 'active' : ''}`}
                        onClick={() => handleOpenDoc(doc.name)}
                    >
                        <span className="doc-name-text">📄 {doc.title || "Untitled"}</span>
                        
                        <button 
                            className="list-del-btn"
                            title="Delete Document"
                            onClick={(e) => handleDelete(e, doc.name, doc.title || 'Untitled')}
                        >
                            🗑️
                        </button>
                    </div>
                ))}
                {docList.length === 0 && <div style={{padding:'10px', fontSize:'13px', color:'#999'}}>No documents found.</div>}
            </div>
          </div>
        )}
      </aside>

      {/* CENTER STAGE */}
      <main className="editor-container">
        <Editor provider={provider} ydoc={ydoc} />
      </main>

      {/* RIGHT PANEL */}
      <aside className={`sidebar right-side ${rightOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="toggle-btn visible" onClick={() => setRightOpen(!rightOpen)}>
             {rightOpen ? '▶' : '◀'}
          </button>
          {rightOpen && <h3>Workspace</h3>} 
        </div>

        {rightOpen && (
          <>
            <div className="sidebar-content">
              {/* PROFILE */}
              <div className="tool-box profile-box">
                <img src={user?.imageUrl} alt="Profile" className="avatar" style={{ borderRadius: '50%', objectFit: 'cover' }} />
                <div className="user-details">
                  <span className="user-name">{user?.firstName || "User"}</span>
                  <button className="logout-btn-prominent" onClick={handleLogout}>Logout</button>
                </div>
              </div>

              {/* TO-DO LIST */}
              <div className="tool-box todo-section">
                <h4>✅ To-Do List</h4>
                <div className="todo-input-group">
                  <input type="text" placeholder="Add a task..." value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTask()} />
                  <button onClick={addTask}>+</button>
                </div>
                <ul className="todo-list">
                  {tasks.map(task => (
                    <li key={task.id} className={task.done ? 'completed' : ''}>
                      <span onClick={() => toggleTask(task.id)}>{task.done ? '☑' : '☐'} {task.text}</span>
                      <button className="del-btn" onClick={() => deleteTask(task.id)}>×</button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* NOTES */}
              <div className="tool-box tools-section">
                <h4>📝 Quick Notes</h4>
                <textarea 
                  className="notes-area" 
                  placeholder="Jot down ideas here (Auto-saved for this doc)..." 
                  rows={10}
                  value={notes}
                  onChange={handleNoteChange}
                ></textarea>
              </div>
            </div>

            {/* DOWNLOAD FOOTER */}
            <div className="sidebar-footer">
              <div className="download-section">
                <div className="download-wrapper">
                <button className="main-download-btn" onClick={() => setShowDownloads(!showDownloads)}>
                  <span>Download File</span>
                  <span style={{ fontSize: '12px' }}>◀</span>
                </button>
                {showDownloads && (
                  <div className="download-options">
                    <button onClick={exportPDF}>📄 PDF ({docTitle})</button>
                    <button onClick={exportWord}>📝 DOCX ({docTitle})</button>
                  </div>
                )}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default Workspace;