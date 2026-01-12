require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Y = require('yjs');
const http = require('http');

// --- 1. ROBUST IMPORT FIX ---
// This handles cases where the library exports differently in production
const HocuspocusLib = require('@hocuspocus/server');
const Server = HocuspocusLib.Server || HocuspocusLib.default || HocuspocusLib;

// --- CONFIGURATION ---
const PORT = process.env.PORT || 1234;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/doc_online';

// --- SETUP EXPRESS APP ---
const app = express();
app.use(cors({
  origin: "*", 
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
app.get('/api/documents', async (req, res) => {
  const { userId } = req.query;
  try {
    const docs = await DocModel.find({ 
      $or: [{ ownerId: userId }, { collaborators: userId }]
    }, 'name title lastModified ownerId').sort({ lastModified: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const { name, title, ownerId } = req.body;
    let doc = await DocModel.findOne({ name });
    if (!doc) {
      doc = new DocModel({ name, title: title || 'Untitled Document', ownerId, collaborators: [], data: Buffer.from([]) });
      await doc.save();
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Could not create document' });
  }
});

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
    res.status(500).json({ error: 'Failed to join document' });
  }
});

app.put('/api/documents/:name', async (req, res) => {
  try {
    const { title } = req.body;
    await DocModel.findOneAndUpdate({ name: req.params.name }, { title: title }, { new: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update title' });
  }
});

app.delete('/api/documents/:name', async (req, res) => {
  try {
    await DocModel.deleteOne({ name: req.params.name });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// --- COMBINED SERVER SETUP ---
const httpServer = http.createServer(app);

// Initialize Hocuspocus
const hocuspocus = new Server({
  name: 'hocuspocus-server',
  port: null, 
  timeout: 4000,
  async onLoadDocument(data) {
    if (data.documentName === 'default') return null;
    try {
      const doc = await DocModel.findOne({ name: data.documentName });
      if (doc && doc.data && doc.data.length > 0) {
        const docData = new Uint8Array(doc.data);
        Y.applyUpdate(data.document, docData);
        return data.document;
      }
    } catch (err) { console.error(err); }
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

// --- 2. WEBSOCKET CRASH FIX ---
// Instead of calling hocuspocus.handleUpgrade (which doesn't exist),
// we access the internal WebSocket server directly.
httpServer.on('upgrade', (request, socket, head) => {
  const wsServer = hocuspocus.webSocketServer;
  if (wsServer) {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit('connection', ws, request);
    });
  } else {
    // If we can't find the internal server, we destroy the socket to prevent hanging
    console.error('⚠️ Critical: WebSocketServer is missing.');
    socket.destroy();
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});