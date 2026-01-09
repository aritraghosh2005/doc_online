import { useEffect, useState, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
// @ts-ignore
import { HocuspocusProvider } from '@hocuspocus/provider'
import './Editor.css'

// --- CHILD COMPONENT (The actual editor area) ---
const Tiptap = ({ provider, ydoc }: { provider: any, ydoc: any }) => {
  const [status, setStatus] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // @ts-ignore
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
    ],
  })

  // --- NEW: Load Content on Startup ---
  useEffect(() => {
    // Only fetch if the editor is ready
    if (!editor) return;

    const loadDocument = async () => {
      try {
        const response = await fetch('http://localhost:4000/load/doc_online_room');
        
        if (response.ok) {
          const content = await response.json();
          // This pushes the saved content into the editor (and syncs it to Yjs)
          editor.commands.setContent(content); 
          console.log("Loaded from DB 📥");
        }
      } catch (e) {
        console.error("Could not load document:", e);
      }
    };

    loadDocument();
  }, [editor]); // Run this once when editor is ready

  // --- SAVE FUNCTION (Same as before) ---
  const saveDocument = async () => {
    if (!editor) return
    setStatus('Saving...')
    const content = editor.getJSON()
    try {
      const response = await fetch('http://localhost:4000/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'doc_online_room',
          content: content
        })
      })
      if (response.ok) {
        setStatus('Saved! ✅')
        setTimeout(() => setStatus(''), 2000)
      } else { setStatus('Error ❌') }
    } catch (e) { setStatus('Error ❌') }
  }

  return (
    <div className="editor-wrapper">
      <div className="toolbar">
         <button onClick={saveDocument} className="save-btn">
           Save Document 💾
         </button>
         <span className="save-status">{status}</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

// --- PARENT COMPONENT ---
const Editor = () => {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const [provider, setProvider] = useState<any>(null)

  useEffect(() => {
    const newProvider = new HocuspocusProvider({
      url: 'ws://localhost:1234',
      name: 'doc_online_room',
      document: ydoc,
    })

    setProvider(newProvider)

    return () => {
      newProvider.destroy()
    }
  }, [ydoc])

  if (!provider) {
    return <div>Connecting...</div>
  }

  return (
    <div className="editor-container">
      <div className="status-bar" style={{fontSize: '12px', color: '#888', marginBottom: '5px'}}>
         Status: 🟢 Connected
      </div>
      <Tiptap provider={provider} ydoc={ydoc} />
    </div>
  )
}

export default Editor