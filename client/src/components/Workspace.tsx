import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import Editor from './Editor';
import './Workspace.css';

const Workspace = () => {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showDownloads, setShowDownloads] = useState(false);
  
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  // Tasks State
  const [tasks, setTasks] = useState<{id: number, text: string, done: boolean}[]>(() => {
    const saved = localStorage.getItem('todo_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    localStorage.setItem('todo_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // --- 1. EXPORT TO PDF ---
  const exportPDF = () => {
    // FIX: specific cast to HTMLElement
    const element = document.querySelector('.a4-sheet') as HTMLElement;
    
    if (element) {
      const opt = {
        margin: 10,
        filename: `Document_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      // FIX: Cast opt to any to bypass strict type checking
      html2pdf().set(opt as any).from(element).save();
    }
  };

  // --- 2. EXPORT TO WORD ---
  const exportWord = () => {
    const element = document.querySelector('.ProseMirror');
    
    if (element) {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + element.innerHTML + footer;
      
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `Document_${Date.now()}.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
    }
  };

  const addTask = () => {
    if (newTask.trim() === '') return;
    const newItem = { id: Date.now(), text: newTask, done: false };
    setTasks([...tasks, newItem]);
    setNewTask('');
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="workspace-layout">
      {/* LEFT PANEL */}
      <aside className={`sidebar left-side ${leftOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          {leftOpen && <h3>Documents</h3>}
          <button className="toggle-btn visible" onClick={() => setLeftOpen(!leftOpen)}>
            {leftOpen ? '◀' : '▶'}
          </button>
        </div>
        {leftOpen && (
          <div className="sidebar-content">
            <div className="doc-item active">📄 Current Project</div>
          </div>
        )}
      </aside>

      {/* CENTER STAGE */}
      <main className="editor-container">
        <Editor />
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
              {/* PROFILE BOX */}
              <div className="tool-box profile-box">
                <img 
                   src={user?.imageUrl} 
                   alt="Profile" 
                   className="avatar" 
                   style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
                <div className="user-details">
                  <div className="user-header">
                    <span className="user-name">{user?.firstName || "User"}</span>
                    <button className="settings-icon">⚙️</button>
                  </div>
                  <button className="logout-btn-prominent" onClick={handleLogout}>Logout</button>
                </div>
              </div>

              {/* TO-DO LIST */}
              <div className="tool-box todo-section">
                <h4>✅ To-Do List</h4>
                <div className="todo-input-group">
                  <input 
                    type="text" 
                    placeholder="Add a task..." 
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  />
                  <button onClick={addTask}>+</button>
                </div>
                <ul className="todo-list">
                  {tasks.length === 0 && <li className="empty-msg">No tasks yet.</li>}
                  {tasks.map(task => (
                    <li key={task.id} className={task.done ? 'completed' : ''}>
                      <span onClick={() => toggleTask(task.id)}>
                        {task.done ? '☑' : '☐'} {task.text}
                      </span>
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
                  placeholder="Jot down ideas here..."
                  rows={10} 
                ></textarea>
              </div>
            </div>

            {/* DOWNLOAD FOOTER */}
            <div className="sidebar-footer">
              <div className="download-section">
                <button 
                  className="main-download-btn" 
                  onClick={() => setShowDownloads(!showDownloads)}
                >
                  <span>Download File</span>
                  <span style={{ fontSize: '12px' }}>◀</span>
                </button>
                
                {showDownloads && (
                  <div className="download-options">
                    <button onClick={exportPDF}>📄 Export as PDF</button>
                    <button onClick={exportWord}>📝 Export as DOCX</button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default Workspace;