const express = require('express');
const cors = require('cors');
const { Server } = require('@hocuspocus/server');
const mongoose = require('mongoose');
const Y = require('yjs');

// --- CONFIGURATION ---
const API_PORT = 1234;       // REST API
const COLLAB_PORT = 1235;    // WebSocket
const MONGO_URI = 'mongodb://127.0.0.1:27017/doc_online';

// --- 1. SETUP EXPRESS APP ---
const app = express();
app.use(cors());
app.use(express.json());

// --- 2. DATABASE SETUP ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // UUID
  title: { type: String, default: 'Untitled Document' },
  ownerId: { type: String, required: true }, // Clerk User ID
  data: Buffer, // Yjs Binary Data
  lastModified: { type: Date, default: Date.now }
});

const DocModel = mongoose.model('Document', DocumentSchema);

// --- 3. API ROUTES ---

// GET: List documents for a specific user
app.get('/api/documents', async (req, res) => {
  const { userId } = req.query;
  try {
    const docs = await DocModel.find({ ownerId: userId }, 'name title lastModified').sort({ lastModified: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST: Create new document
app.post('/api/documents', async (req, res) => {
  try {
    const { name, title, ownerId } = req.body;
    let doc = await DocModel.findOne({ name });
    if (!doc) {
      doc = new DocModel({ 
        name, 
        title: title || 'Untitled Document', 
        ownerId, 
        data: Buffer.from([]) 
      });
      await doc.save();
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Could not create document' });
  }
});

// PUT: Update Title Explicitly (Fixes Renaming Bug)
app.put('/api/documents/:name', async (req, res) => {
  try {
    const { title } = req.body;
    await DocModel.findOneAndUpdate(
      { name: req.params.name },
      { title: title },
      { new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update title' });
  }
});

// DELETE: Remove document
app.delete('/api/documents/:name', async (req, res) => {
  try {
    await DocModel.deleteOne({ name: req.params.name });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Start Express API
app.listen(API_PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${API_PORT}`);
});

// --- 4. HOCUSPOCUS WEBSOCKET SERVER ---
const hocuspocus = new Server({
  port: COLLAB_PORT,

async onLoadDocument(data) {
    if (data.documentName === 'default') return null;

    try {
      const doc = await DocModel.findOne({ name: data.documentName });
      
      // Check if doc exists AND has data
      if (doc && doc.data && doc.data.length > 0) {
        const docData = new Uint8Array(doc.data);
        
        // Wrap Yjs update in a try-catch to handle corruption
        try {
          Y.applyUpdate(data.document, docData);
          // console.log(`📂 Loaded: ${data.documentName}`);
          return data.document;
        } catch (e) {
          console.error(`⚠️ Corrupted document found: ${data.documentName}. Starting fresh.`);
          return null; // Start fresh if corrupted
        }
      }
    } catch (err) {
      console.error("Database error during load:", err);
    }
    
    return null; // Start fresh if no document found
  },

  async onStoreDocument(data) {
    const update = Y.encodeStateAsUpdate(data.document);
    const buf = Buffer.from(update);
    // Note: We don't save title here anymore to avoid overwriting the API update
    
    await DocModel.findOneAndUpdate(
      { name: data.documentName },
      { data: buf, lastModified: new Date() },
      { upsert: true, new: true }
    );
  },
});

hocuspocus.listen()
  .then(() => console.log(`✨ Collab Server running on ws://localhost:${COLLAB_PORT}`));