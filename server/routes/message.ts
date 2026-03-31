import { Hono } from "hono";
import Message from "../models/Message";
import { authMiddleware } from "../middleware/authMiddleware";
import Channel from "../models/Channel";
import { writeFile } from "fs/promises";
import { v4 as uuid } from "uuid";
import { getChannelMembers } from "../websocket/websocket";

const messageRoutes = new Hono();

messageRoutes.get("/:channelId", authMiddleware, async (c) => {
  try {
    const channelId = c.req.param("channelId");
    const userId = (c as any).get("user").userId;

    // ✅ Get all messages
    const messages = await Message.find({ channelId })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });

    // ✅ Get members
    if(!channelId){
      return;
    }
    const members = await getChannelMembers(channelId);

    // ✅ Admin list
    const admins = members
      .filter((m: any) => m.role === "admin")
      .map((m: any) =>
        (m.userId as any)._id?.toString() || m.userId.toString()
      );

    const isAdmin = admins.includes(userId.toString());

    // ✅ Filter messages per user
    const filteredMessages = messages.map((msg: any) => {
      let filteredText = msg.text;

      const isSender = msg.senderId._id.toString() === userId.toString();

      // 🔥 Apply same logic as socket
      if (!isAdmin && !isSender) {
        msg.mentions.forEach((mentionId: string) => {
          const member = members.find(
            (m: any) =>
              m.userId._id.toString() === mentionId.toString()
          );

          if (!member) return;

          const email = (member.userId as any).email;

          // ❗ remove other mentions
          if (mentionId.toString() !== userId.toString()) {
            filteredText = filteredText.replace(`@${email}`, "");
          }
        });
      }

      return {
        ...msg.toObject(),
        text: filteredText,
      };
    });

    return c.json({
      success: true,
      data: filteredMessages,
    });
  } catch (err) {
    console.error("❌ Fetch messages error:", err);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

/**
 * ✅ Get Messages in Channel
 * GET /messages/:channelId
 */
messageRoutes.get("/:channelId", authMiddleware, async (c) => {
  try {
    const channelId = c.req.param("channelId");
    const userId = (c as any).get("user").userId;

    // 🔥 get channel to check role
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const member = channel.members.find(
      (m: any) => m.userId.toString() === userId
    );

    if (!member) {
      return c.json({ error: "Not part of channel" }, 403);
    }

    let messages;

    // ✅ ADMIN → see all
    if (member.role === "admin") {
      messages = await Message.find({ channelId })
        .populate("senderId", "name email")
        .sort({ createdAt: 1 });
    } else {
      // ✅ MEMBER → only own + mentioned
      messages = await Message.find({
        channelId,
        $or: [
          { senderId: userId },      // own messages
          { mentions: userId },      // tagged messages
        ],
      })
        .populate("senderId", "name email")
        .sort({ createdAt: 1 });
    }

    return c.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error("❌ Fetch messages error:", err);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

/**
 * ✅ Get All Conversations (Recent Messages per Channel)
 * GET /messages
 */
messageRoutes.get("/", authMiddleware, async (c) => {
  try {
    // For now, get all channels the user has messages in
    // TODO: Implement proper channel membership logic
    const messages = await Message.aggregate([
      {
        $group: {
          _id: "$channelId",
          lastMessage: { $last: "$text" },
          timestamp: { $last: "$createdAt" },
          senderId: { $last: "$senderId" },
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $lookup: {
          from: "channels",
          localField: "_id",
          foreignField: "_id",
          as: "channel",
        },
      },
      {
        $unwind: "$channel",
      },
      {
        $lookup: {
          from: "users",
          localField: "senderId",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $unwind: "$sender",
      },
      {
        $project: {
          channelId: "$_id",
          channelName: "$channel.name",
          lastMessage: 1,
          timestamp: 1,
          senderName: "$sender.name",
        },
      },
    ]);

    return c.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error("❌ Conversations error:", err);
    return c.json({ error: "Failed to fetch conversations" }, 500);
  }
});

messageRoutes.post("/upload", authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();

    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const fileName = `${uuid()}-${file.name}`;
    const path = `uploads/${fileName}`; // ✅ remove "./"

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(`./${path}`, buffer);

    let fileType = "doc";
    if (file.type.startsWith("image")) fileType = "image";
    else if (file.type === "application/pdf") fileType = "pdf";
    else if (file.type.startsWith("video")) fileType = "video";

    // ✅ ONLY return file info
    return c.json({
      success: true,
      fileUrl: path,
      fileType,
      fileName: file.name,
    });

  } catch (err) {
    console.error(err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

export default messageRoutes;