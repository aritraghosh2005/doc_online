import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import './Editor.css' // We will create this next

const Editor = () => {
  const editor = useEditor({
    extensions: [
      StarterKit, // Adds Bold, Italic, Bullet Lists, etc.
    ],
    content: '<p>Start collaborating...</p>',
  })

  return (
    <div className="editor-container">
      <EditorContent editor={editor} />
    </div>
  )
}

export default Editor