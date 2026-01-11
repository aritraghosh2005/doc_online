require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const { Server } = require('@hocuspocus/server');
const mongoose = require('mongoose');
const Y = require('yjs');
const http = require('http'); // Required to combine servers

// --- CONFIGURATION ---
// Use the PORT provided by the host, or default to 1234 for local
const PORT = process.env.PORT || 1234;
// Use the MONGO_URL from .env, or default to local
const MONGO_URI = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/doc_online';
// Allow frontend connection
const FRONTEND_URL = process.env.FRONTEND_URL || '*'; 

// --- SETUP EXPRESS APP ---
const app = express();
app.use(cors({
  origin: FRONTEND_URL, // Restrict to your frontend domain in production
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// --- DATABASE SETUP ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- SCHEMA DEFINITION ---
const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, 
  title: { type: String, default: 'Untitled Document' },
  ownerId: { type: String, required: true }, 
  collaborators: { type: [String], default: [] },
  data: Buffer, 
  lastModified: { type: Date, default: Date.now }
});

const DocModel = mongoose.model('Document', DocumentSchema);

// --- API ROUTES ---

// GET: List documents
app.get('/api/documents', async (req, res) => {
  const { userId } = req.query;
  try {
    const docs = await DocModel.find({ 
      $or: [
        { ownerId: userId },
        { collaborators: userId }
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
        collaborators: [],
        data: Buffer.from([]) 
      });
      await doc.save();
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Could not create document' });
  }
});

// POST: Join a document
app.post('/api/documents/join', async (req, res) => {
  const { documentId, userId } = req.body;
  try {
    const doc = await DocModel.findOne({ name: documentId });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.ownerId === userId) return res.json({ success: true, message: 'User is already the owner' });
    
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

// --- COMBINED SERVER SETUP ---

// 1. Create standard HTTP server wrapping Express
const httpServer = http.createServer(app);

// 2. Configure Hocuspocus
const hocuspocus = new Server({
  // No port here, we attach it manually below
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

// 3. Handle WebSocket Upgrades manually
httpServer.on('upgrade', (request, socket, head) => {
  hocuspocus.handleUpgrade(request, socket, head);
});

// 4. Start the single server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server (API + Collab) running on port ${PORT}`);
});