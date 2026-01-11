const express = require('express');
const cors = require('cors');
const { Server } = require('@hocuspocus/server');
const mongoose = require('mongoose');
const Y = require('yjs');

// --- CONFIGURATION ---
const API_PORT = 1234;       
const COLLAB_PORT = 1235;    
const MONGO_URI = 'mongodb://127.0.0.1:27017/doc_online';

// --- SETUP EXPRESS APP ---
const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE SETUP ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// [CHANGE 1] Update Schema to include "collaborators" array
const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, 
  title: { type: String, default: 'Untitled Document' },
  ownerId: { type: String, required: true }, 
  collaborators: { type: [String], default: [] }, // NEW FIELD
  data: Buffer, 
  lastModified: { type: Date, default: Date.now }
});

const DocModel = mongoose.model('Document', DocumentSchema);

// --- API ROUTES ---

// [CHANGE 2] GET: List documents where user is Owner OR Collaborator
app.get('/api/documents', async (req, res) => {
  const { userId } = req.query;
  try {
    const docs = await DocModel.find({ 
      $or: [
        { ownerId: userId },
        { collaborators: userId } // Check if user is in the list
      ]
    }, 'name title lastModified ownerId').sort({ lastModified: -1 });
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
        collaborators: [], // Init empty
        data: Buffer.from([]) 
      });
      await doc.save();
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Could not create document' });
  }
});

// [CHANGE 3] NEW POST: Join a document
app.post('/api/documents/join', async (req, res) => {
  const { documentId, userId } = req.body;
  try {
    // 1. Find the doc
    const doc = await DocModel.findOne({ name: documentId });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 2. Prevent adding the owner as a collaborator
    if (doc.ownerId === userId) {
      return res.json({ success: true, message: 'User is already the owner' });
    }

    // 3. Add userId to collaborators if not already there
    if (!doc.collaborators.includes(userId)) {
      doc.collaborators.push(userId);
      await doc.save();
    }

    res.json({ success: true, title: doc.title });
  } catch (err) {
    console.error("Join error:", err);
    res.status(500).json({ error: 'Failed to join document' });
  }
});

// PUT: Update Title
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

app.listen(API_PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${API_PORT}`);
});

// --- HOCUSPOCUS SERVER (Unchanged) ---
const hocuspocus = new Server({
  port: COLLAB_PORT,
  async onLoadDocument(data) {
    if (data.documentName === 'default') return null;
    try {
      const doc = await DocModel.findOne({ name: data.documentName });
      if (doc && doc.data && doc.data.length > 0) {
        const docData = new Uint8Array(doc.data);
        try {
          Y.applyUpdate(data.document, docData);
          return data.document;
        } catch (e) {
          return null; 
        }
      }
    } catch (err) {
      console.error("Database error during load:", err);
    }
    return null; 
  },
  async onStoreDocument(data) {
    const update = Y.encodeStateAsUpdate(data.document);
    const buf = Buffer.from(update);
    await DocModel.findOneAndUpdate(
      { name: data.documentName },
      { data: buf, lastModified: new Date() },
      { upsert: true, new: true }
    );
  },
});

hocuspocus.listen().then(() => console.log(`✨ Collab Server running on ws://localhost:${COLLAB_PORT}`));