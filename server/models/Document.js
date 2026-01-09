const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  _id: String, // We will use the document name as the ID
  data: Object, // This stores the actual text content
});

module.exports = mongoose.model("Document", DocumentSchema);