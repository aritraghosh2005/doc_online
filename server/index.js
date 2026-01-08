const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("@hocuspocus/server");
require("dotenv").config();

// --- 1. SETUP EXPRESS (API & DB) ---
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MONGODB CONNECTED"))
  .catch((err) => console.log("DB CONNECTION ERROR:", err));

app.get("/", (req, res) => {
  res.send("Doc_Online Server is Running!");
});

app.listen(PORT, () => {
  console.log(`EXPRESS SERVER RUNNING ON PORT ${PORT}`);
});

// --- 2. SETUP HOCUSPOCUS (COLLABORATION) ---
// We run this on a separate port (1234) to avoid conflicts
const server = new Server({
  port: 1234,
  async onConnect(data) {
    console.log("New Collaborator Connected!");
  },
});

server.listen().then(() => {
  console.log("COLLABORATION SERVER RUNNING ON PORT 1234");
});