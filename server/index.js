const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const JWT_SECRET = "super_secret_key_123"; // In a real app, put this in .env
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("@hocuspocus/server");
const Document = require("./models/Document"); 
require("dotenv").config();

// --- EXPRESS SETUP ---
const app = express();

// Allow Frontend to talk to Backend
app.use(cors({
  origin: "*", // Allow all connections for now to fix the error
  methods: ["GET", "POST"],
}));

app.use(express.json()); // <--- CRITICAL: Allows JSON data reading

// Connect to Database
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MONGODB CONNECTED"))
  .catch((err) => console.log("❌ DB ERROR:", err));

// --- API ROUTES ---
app.get("/", (req, res) => {
  res.send("API is working!");
});

// LOAD ROUTE: Frontend asks for text, we send it back
app.get("/load/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const document = await Document.findById(id);
    
    // If we find it, send the data. If not, send null.
    if (document) {
      res.json(document.data);
    } else {
      res.status(404).send("No document found");
    }
  } catch (err) {
    console.error("❌ Load Error:", err);
    res.status(500).send("Error loading document");
  }
});

// THE SAVE ROUTE 
app.post("/save", async (req, res) => {
  console.log("📥 SAVE REQUEST RECEIVED"); // <--- This will show in terminal
  const { id, content } = req.body;
  
  if (!id || !content) {
    return res.status(400).send("Missing ID or Content");
  }

  try {
    await Document.findByIdAndUpdate(id, { data: content }, { upsert: true });
    console.log(`💾 Saved document: ${id}`);
    res.status(200).send("Document Saved");
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).send("Error saving document");
  }
});

// 1. REGISTER
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Hash the password (encrypt it)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to DB
    const newUser = await User.create({
      username,
      password: hashedPassword,
    });

    res.status(201).json({ message: "User created!" });
  } catch (err) {
    res.status(500).json({ message: "Error creating user" });
  }
});

// 2. LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Find user
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Create Token (The "ID Card")
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: "Error logging in" });
  }
});

// Start Express Server
app.listen(4000, () => {
  console.log("✅ EXPRESS Server running on port 4000");
});

// --- SYNC SERVER (Hocuspocus) ---
const server = new Server({
  port: 1234,
});

server.listen().then(() => {
  console.log("✅ SYNC Server running on port 1234");
});