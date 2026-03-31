import mongoose from "mongoose";

// models/Message.js
const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" },
    text: String,
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    fileUrl: String,
    fileType: String,
    fileName: String,
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);