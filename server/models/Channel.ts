import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    // ✅ Updated members structure
    members: [memberSchema],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Channel", channelSchema);