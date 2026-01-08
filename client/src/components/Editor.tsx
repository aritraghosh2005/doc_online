import { useEffect, useState, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
// import CollaborationCursor from '@tiptap/extension-collaboration-cursor' // <--- KEEP THIS OFF FOR NOW
import * as Y from 'yjs'
// @ts-ignore
import { HocuspocusProvider } from '@hocuspocus/provider'
import './Editor.css'

const Tiptap = ({ provider, ydoc }: { provider: any, ydoc: any }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // @ts-ignore
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      // --- CURSORS DISABLED TO PREVENT CRASH ---
      // CollaborationCursor.configure({
      //   provider: provider,
      //   user: {
      //     name: 'User ' + Math.floor(Math.random() * 100),
      //     color: '#f783ac',
      //   },
      // }),
    ],
  })

  return <EditorContent editor={editor} />
}

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
         Status: 🟢 Connected (Text Sync Only)
      </div>
      <Tiptap provider={provider} ydoc={ydoc} />
    </div>
  )
}

export default Editor