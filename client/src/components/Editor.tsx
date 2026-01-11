import { useState, useEffect } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import './Editor.css';

// --- CUSTOM EXTENSION: FONT SIZE ---
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize ? element.style.fontSize.replace('px', '') : null,
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ commands }) => {
        return commands.setMark('textStyle', { fontSize: fontSize });
      },
      unsetFontSize: () => ({ commands }) => {
        return commands.setMark('textStyle', { fontSize: null });
      },
    };
  },
});

// 1. TOOLBAR COMPONENT
// NOTE: Class name changed to 'editor-toolbar' to match new CSS
const MenuBar = ({ editor, onSave }: { editor: any, onSave: () => void }) => {
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);
  if (!editor) return null;

  const highlightColors = [
    { color: '#fef08a', label: 'Yellow' },
    { color: '#a7f3d0', label: 'Green' },
    { color: '#bae6fd', label: 'Blue' },
    { color: '#fbcfe8', label: 'Pink' },
  ];

  const setSize = (size: string) => {
    if (editor.commands.setFontSize) {
      editor.commands.setFontSize(size);
    }
  };

  const applyHighlight = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run();
    setShowHighlightPalette(false);
  };

  const removeHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
    setShowHighlightPalette(false);
  };

  return (
    <div className="editor-toolbar">
      {/* We keep the inner structure for button grouping */}
      <div className="word-toolbar" style={{border: 'none', boxShadow: 'none'}}>
        {/* GROUP 1: HEADINGS */}
        <div className="group">
          <select 
            onChange={e => editor.chain().focus().toggleHeading({ level: parseInt(e.target.value) as any }).run()}
            className="toolbar-select heading-select"
            defaultValue="0"
          >
            <option value="0" style={{ fontSize: '14px' }}>Normal</option>
            <option value="1" style={{ fontSize: '24px', fontWeight: 'bold' }}>H1 - Title</option>
            <option value="2" style={{ fontSize: '20px', fontWeight: 'bold' }}>H2 - Heading</option>
          </select>
        </div>
        <div className="divider" />
        
        {/* GROUP 2: FONT FAMILY & SIZE */}
        <div className="group">
          <select
            onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
            className="toolbar-select font-family-select"
            defaultValue="Inter"
          >
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times</option>
            <option value="Courier New">Courier</option>
          </select>

          <select
            onChange={e => setSize(e.target.value)}
            className="toolbar-select font-size-select"
            defaultValue="16"
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
          </select>
        </div>
        <div className="divider" />
        
        {/* GROUP 3: FORMATTING & COLORS */}
        <div className="group">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="Bold"><strong>B</strong></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="Italic"><em>I</em></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'is-active' : ''} title="Underline"><u>U</u></button>
          
          <div className="highlight-menu-wrapper">
             <button 
                className={`highlight-trigger-btn ${editor.isActive('highlight') ? 'is-active' : ''}`}
                onClick={() => setShowHighlightPalette(!showHighlightPalette)}
                title="Highlight Color"
             >
                🖍️ <span style={{ fontSize: '10px', marginLeft: '2px' }}>▼</span>
             </button>

             {showHighlightPalette && (
                <div className="highlight-popup">
                   <button onClick={removeHighlight} className="swatch-btn unset-swatch" title="No Color">🚫</button>
                   {highlightColors.map(({ color, label }) => (
                       <button
                           key={color}
                           onClick={() => applyHighlight(color)}
                           className={`swatch-btn color-swatch ${editor.isActive('highlight', { color }) ? 'is-active-swatch' : ''}`}
                           style={{ backgroundColor: color }}
                           title={label}
                       />
                   ))}
                </div>
             )}
          </div>
        </div>
        <div className="divider" />
        
        {/* GROUP 4: LISTS */}
        <div className="group">
          <button 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            className={`text-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`} 
            title="Bullet List"
          >
            • List
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            className={`text-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`} 
            title="Ordered List"
          >
            1. List
          </button>
        </div>

        <div className="save-group">
          <button onClick={onSave} className="save-btn" title="Save (Ctrl+S)">💾 Save</button>
        </div>
      </div>
    </div>
  );
};

// 2. MAIN EXPORT COMPONENT
const Editor = ({ provider, ydoc }: { provider: any, ydoc: Y.Doc }) => {
  const [, setForceUpdate] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ 
        history: false 
      } as any),
      Underline,
      TextStyle, 
      FontFamily,
      Highlight.configure({ multicolor: true }), 
      FontSize,
      Collaboration.configure({ document: ydoc }),
    ],
    editorProps: {
      attributes: {
        // This class connects to the CSS to provide the A4 Sheet look
        class: 'prose focus:outline-none', 
      },
    },
    onUpdate: () => setForceUpdate(n => n + 1),
    onSelectionUpdate: () => setForceUpdate(n => n + 1),
    onTransaction: () => setForceUpdate(n => n + 1),
  });

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // --- SHORTCUT LISTENER (Ctrl+S) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); 
        handleSave();       
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    // Changed class name to prevent conflict with Workspace.css
    <div className="modern-editor-wrapper">
      <MenuBar editor={editor} onSave={handleSave} />
      
      {/* Scroll area for centering */}
      <div className="editor-scroll-area">
        <EditorContent editor={editor} />
      </div>

      <div className={`toast-notification ${showToast ? 'visible' : ''}`}>
        ✅ Changes Saved Successfully!
      </div>
    </div>
  );
};

export default Editor;