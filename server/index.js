const { Server } = require('@hocuspocus/server');
const mongoose = require('mongoose');
const Y = require('yjs'); // <--- IMPORT YJS

// 1. CONNECT TO MONGODB
const MONGO_URI = 'mongodb://127.0.0.1:27017/doc_online';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 2. DEFINE THE SCHEMA
const Schema = mongoose.Schema;
const DocumentSchema = new Schema({
  name: String,
  data: Buffer,
});

const DocModel = mongoose.model('Document', DocumentSchema);

// 3. CONFIGURE HOCUSPOCUS
const server = new Server({
  port: 1234,

  // Hook: Called when a user connects
  async onLoadDocument(data) {
    if (data.documentName === 'default') return null;

    const doc = await DocModel.findOne({ name: data.documentName });
    
    if (doc) {
      console.log(`📂 Loaded document: ${data.documentName}`);
      // Load the data into the document
      const docData = new Uint8Array(doc.data);
      Y.applyUpdate(data.document, docData); // <--- CORRECT WAY TO LOAD
      return data.document;
    }
    
    console.log(`✨ Created new document: ${data.documentName}`);
    return data.document;
  },

  // Hook: Called when content changes
  async onStoreDocument(data) {
    // FIX: Use the static method from Yjs
    const update = Y.encodeStateAsUpdate(data.document); // <--- FIXED LINE
    const buf = Buffer.from(update);
    
    await DocModel.findOneAndUpdate(
      { name: data.documentName },
      { data: buf }, 
      { upsert: true, new: true }
    );
    
    console.log(`💾 Saved document: ${data.documentName}`);
  },
});

// 4. START THE SERVER
server.listen()
  .then(() => console.log('🚀 Server is running on port 1234'));