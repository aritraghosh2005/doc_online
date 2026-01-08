const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose"); // Import Mongoose
const cors = require("cors");
require("dotenv").config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// --- DATABASE CONNECTION ---
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MONGODB CONNECTED"))
  .catch((err) => console.log("DB CONNECTION ERROR:", err));

// --- SERVER SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.get("/", (req, res) => {
  res.send("Doc_Online Server is Running!");
});

server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});