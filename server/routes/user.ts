import { Hono } from "hono";
import User from "../models/User";
import Channel from "../models/Channel";

const userRoutes = new Hono();

// ✅ Get all users (only id + email)
userRoutes.get("/getAllUsers", async (c) => {
  try {
    const users = await User.find({}, "_id email");
    return c.json(users);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

userRoutes.get("/getAllUsers/:channelId", async (c) => {
  try {
    const channelId = c.req.param("channelId");

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const userIds = channel.members.map((m: any) => m.userId);

    const users = await User.find(
      { _id: { $in: userIds } },
      "_id email"
    );

    return c.json(users);
  } catch (err) {
    console.error("❌ Error fetching channel users:", err);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

export default userRoutes;
