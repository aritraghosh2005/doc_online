import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
// @ts-ignore
import { HocuspocusProvider } from '@hocuspocus/provider';
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
const MenuBar = ({ editor, onSave }: { editor: any, onSave: () => void }) => {
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);

  if (!editor) return null;

  // Define Highlight Colors
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
    setShowHighlightPalette(false); // Close menu after selection
  };

  const removeHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
    setShowHighlightPalette(false);
  };

  return (
    <div className="toolbar-container">
      <div className="word-toolbar">
        
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
            <option value="3" style={{ fontSize: '16px', fontWeight: 'bold' }}>H3 - Subtitle</option>
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
            <option value="Inter" style={{ fontFamily: 'Inter' }}>Inter</option>
            <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
            <option value="Comic Sans MS" style={{ fontFamily: 'Comic Sans MS' }}>Comic</option>
            <option value="Georgia" style={{ fontFamily: 'Georgia' }}>Georgia</option>
            <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times</option>
            <option value="Courier New" style={{ fontFamily: 'Courier New' }}>Courier</option>
          </select>

          <select
            onChange={e => setSize(e.target.value)}
            className="toolbar-select font-size-select"
            defaultValue="16"
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
            <option value="30">30px</option>
          </select>
        </div>

        <div className="divider" />

        {/* GROUP 3: FORMATTING & HIGHLIGHTER */}
        <div className="group">
          <button 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            className={editor.isActive('underline') ? 'is-active' : ''}
            title="Underline"
          >
            <u>U</u>
          </button>
          
          {/* --- DROPDOWN HIGHLIGHTER --- */}
          <div className="highlight-menu-wrapper">
             {/* The Main Button */}
             <button 
                className={`highlight-trigger-btn ${editor.isActive('highlight') ? 'is-active' : ''}`}
                onClick={() => setShowHighlightPalette(!showHighlightPalette)}
                title="Highlight Color"
             >
                🖍️ <span style={{ fontSize: '10px', marginLeft: '2px' }}>▼</span>
             </button>

             {/* The Floating Palette */}
             {showHighlightPalette && (
                <div className="highlight-popup">
                   {/* Unset Button */}
                   <button
                       onClick={removeHighlight}
                       className="swatch-btn unset-swatch"
                       title="Remove Highlight"
                   >
                       🚫
                   </button>
                   
                   {/* Color Buttons */}
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
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title="Bullet List"
          >
            • List
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            title="Ordered List"
          >
            1. List
          </button>
        </div>

        {/* SAVE BUTTON */}
        <div className="save-group">
          <button onClick={onSave} className="save-btn">
            💾 Save
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. TIPTAP EDITOR COMPONENT
const TiptapEditor = ({ provider, ydoc }: { provider: any, ydoc: Y.Doc }) => {
  const [, setForceUpdate] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false } as any),
      Underline,
      TextStyle, 
      FontFamily,
      Highlight.configure({ multicolor: true }), 
      FontSize,
      Collaboration.configure({ document: ydoc }),
    ],
    onUpdate: () => setForceUpdate(n => n + 1),
    onSelectionUpdate: () => setForceUpdate(n => n + 1),
    onTransaction: () => setForceUpdate(n => n + 1),
  });

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="editor-wrapper">
      <MenuBar editor={editor} onSave={handleSave} />
      <div className="a4-sheet">
        <EditorContent editor={editor} />
      </div>
      <div className={`toast-notification ${showToast ? 'visible' : ''}`}>
        ✅ Changes Saved Successfully!
      </div>
    </div>
  );
};

// 3. MAIN EDITOR WRAPPER
const Editor = () => {
  const { id } = useParams();
  const documentId = id || 'default_doc';
  
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [provider, setProvider] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newProvider = new HocuspocusProvider({
      url: 'ws://localhost:1234',
      name: documentId,
      document: ydoc,
      onConnect: () => setConnected(true),
      onClose: () => setConnected(false),
    });

    setProvider(newProvider);
    return () => { newProvider.destroy(); };
  }, [ydoc, documentId]);

  if (!provider || !connected) {
    return <div className="loading-spinner">Connecting to document...</div>;
  }

  return <TiptapEditor provider={provider} ydoc={ydoc} />;
};

export default Editor;