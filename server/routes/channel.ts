import { Hono } from "hono";
import Channel from "../models/Channel";
import mongoose from "mongoose";

const channelRoutes = new Hono();

// ✅ Create Channel
channelRoutes.post("/", async (c) => {
  try {
    const { name, members, createdBy } = await c.req.json();

    if (!name || !members || members.length === 0) {
      return c.json({ error: "Name and members are required" }, 400);
    }

    const newChannel = await Channel.create({
      name,
      members, // ✅ directly use
      createdBy,
    });

    return c.json(newChannel);
  } catch (err:any) {
    console.error("❌ Error creating channel:", err);
    return c.json({ error: err.message }, 500); // 👈 show real error
  }
});

// ✅ Get channels for a user
channelRoutes.get("/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    const channels = await Channel.find({
      "members.userId": new mongoose.Types.ObjectId(userId),
    }).populate("members.userId", "_id email");
    return c.json(channels);
  } catch (err) {
    console.error("❌ Error fetching channels:", err);
    return c.json({ error: "Failed to fetch channels" }, 500);
  }
});

export default channelRoutes;