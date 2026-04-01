// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    azureId: { type: String, required: true, unique: true }, // oid
    email: { type: String, required: true },
    name: { type: String },
    tenantId: { type: String },
    lastLogin: { type: Date },
    channelId:[{ type: mongoose.Schema.Types.ObjectId, ref: "Channel" }],
    role: {
    type: String,
    enum: ["Admin", "Member"],
    default: "Member",
  },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);