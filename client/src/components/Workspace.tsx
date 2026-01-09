import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from './Editor';
import './Workspace.css';

const Workspace = () => {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showDownloads, setShowDownloads] = useState(false);
  const [username, setUsername] = useState('User');
  
  // TO-DO LIST: Initialize from LocalStorage
  const [tasks, setTasks] = useState<{id: number, text: string, done: boolean}[]>(() => {
    const saved = localStorage.getItem('todo_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTask, setNewTask] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('username');
    if (storedUser) setUsername(storedUser);
  }, []);

  // Auto-save tasks
  useEffect(() => {
    localStorage.setItem('todo_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/');
    window.location.reload();
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
            {/* SCROLLABLE CONTENT AREA */}
            <div className="sidebar-content">
              
              {/* PROFILE BOX */}
              <div className="tool-box profile-box">
                <div className="avatar">{username.charAt(0).toUpperCase()}</div>
                <div className="user-details">
                  <div className="user-header">
                    <span className="user-name">Hi, {username}</span>
                    <button className="settings-icon" title="Settings">⚙️</button>
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

              {/* QUICK NOTES */}
              <div className="tool-box tools-section">
                <h4>📝 Quick Notes</h4>
                <textarea 
                  className="notes-area" 
                  placeholder="Jot down ideas here..."
                  rows={10} 
                ></textarea>
              </div>
            </div>

            {/* FIXED FOOTER (Contains Download Button) */}
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
                    <button>📄 Export as PDF</button>
                    <button>📝 Export as DOCX</button>
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