import { Hono } from "hono";
import Channel from "../models/Channel";
import User from "../models/User";
import mongoose from "mongoose";
import { getPreranaUser, mergeMembers } from "../utils/channelMembers";

const channelRoutes = new Hono();

// ✅ Create Channel
channelRoutes.post("/", async (c) => {
  try {
    const { name, members, createdBy } = await c.req.json();

    if (!name || !members || members.length === 0) {
      return c.json({ error: "Name and members are required" }, 400);
    }

    const prerana = await getPreranaUser();
    const autoAddIds = [];

    if (createdBy) {
      autoAddIds.push(createdBy);
    }

    if (prerana?._id) {
      autoAddIds.push(prerana._id);
    } else {
      console.error("❌ Default channel member prerana.k@inspironlabs.com was not found");
    }

    const channelMembers = mergeMembers(members, autoAddIds);

    const newChannel = await Channel.create({
      name,
      members: channelMembers,
      createdBy,
    });

    return c.json(newChannel);
  } catch (err: any) {
    console.error("❌ Error creating channel:", err);
    return c.json({ error: err.message }, 500);
  }
});

// ✅ Add user to channel
channelRoutes.post("/:channelId/members", async (c) => {
  try {
    const channelId = c.req.param("channelId");
    const { userId } = await c.req.json();

    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const alreadyAdded = channel.members.some(
      (member: any) => member.userId?.toString() === userId.toString(),
    );

    if (!alreadyAdded) {
      channel.members.push({ userId });
      await channel.save();
    }

    const members = await User.find(
      { _id: { $in: channel.members.map((member: any) => member.userId) } },
      "_id name email role",
    );

    return c.json(members);
  } catch (err: any) {
    console.error("❌ Error adding channel member:", err);
    return c.json({ error: err.message }, 500);
  }
});

// ✅ Get channels for a user
channelRoutes.get("/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    const channels = await Channel.find({
      "members.userId": new mongoose.Types.ObjectId(userId),
    }).populate("members.userId", "_id name email role");
    return c.json(channels);
  } catch (err) {
    console.error("❌ Error fetching channels:", err);
    return c.json({ error: "Failed to fetch channels" }, 500);
  }
});

export default channelRoutes;
