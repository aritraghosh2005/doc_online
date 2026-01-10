const express = require('express');
const cors = require('cors');
const { Server } = require('@hocuspocus/server');
const mongoose = require('mongoose');
const Y = require('yjs');
const http = require('http'); // Required to merge Express and WebSockets

// --- 1. CONFIGURATION ---
// Use environment variables for production
const MONGO_URI = process.env.MONGO_URI; 
const PORT = process.env.PORT || 1234; 

// --- 2. SETUP EXPRESS APP ---
const app = express();
app.use(cors());
app.use(express.json());

// --- 3. DATABASE SETUP ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  title: { type: String, default: 'Untitled Document' },
  ownerId: { type: String, required: true },
  data: Buffer,
  lastModified: { type: Date, default: Date.now }
});

const DocModel = mongoose.model('Document', DocumentSchema);

// --- 4. API ROUTES ---
app.get('/api/documents', async (req, res) => {
  const { userId } = req.query;
  try {
    const docs = await DocModel.find({ ownerId: userId }, 'name title lastModified').sort({ lastModified: -1 });
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
      doc = new DocModel({ name, title: title || 'Untitled Document', ownerId, data: Buffer.from([]) });
      await doc.save();
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Could not create document' });
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

// --- 5. HOCUSPOCUS SETUP ---
const hocuspocus = new Server({
  // We leave the port out here because we are attaching it to our own server
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
          console.error(`⚠️ Corrupted document: ${data.documentName}`);
          return null;
        }
      }
    } catch (err) { console.error("Database error during load:", err); }
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

// --- 6. CREATE COMBINED SERVER ---
const server = http.createServer(app);

// Handle the WebSocket upgrade manually
server.on('upgrade', (request, socket, head) => {
  hocuspocus.handleUpgrade(request, socket, head);
});

// Start the unified server
server.listen(PORT, () => {
  console.log(`🚀 Unified Server running on port ${PORT}`);
});