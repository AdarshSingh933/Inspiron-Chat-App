// websocket/websocket.ts

import type { ServerWebSocket } from "bun";
import Channel from "../models/Channel";
import Message from "../models/Message";

type ClientMap = Map<string, ServerWebSocket<undefined>>;

const clients: ClientMap = new Map();

// ✅ Get channel with populated users (IMPORTANT)
export const getChannelMembers = async (channelId: string) => {
  const channel = await Channel.findById(channelId).populate(
    "members.userId",
    "email name role",
  );

  if (!channel) return [];

  return channel.members;
};

export const websocketHandler = {
  open(ws: ServerWebSocket<undefined>) {
    console.log("🟢 WebSocket Connected");
  },

  async message(ws: ServerWebSocket<undefined>, message: string | Buffer) {
    try {
      const data = JSON.parse(message.toString());

      // ✅ JOIN
      if (data.type === "JOIN") {
        if (!data.userId) {
          console.log("❌ Invalid userId");
          return;
        }

        clients.set(data.userId.toString(), ws);
        console.log(`User joined: ${data.userId}`);
      }

      // ✅ SEND MESSAGE
      if (data.type === "SEND_MESSAGE") {
        const {
          senderId,
          channelId,
          text,
          mentions = [],
          fileUrl,
          fileType,
          fileName,
        } = data;

        // ✅ Save message
        const newMessage = await Message.create({
          senderId,
          channelId,
          text,
          mentions,
          fileUrl,
          fileType,
          fileName,
        });

        // ✅ Populate sender info
        const populatedMsg = await newMessage.populate(
          "senderId",
          "name email",
        );

        // ✅ Get members with emails
        const members = await getChannelMembers(channelId);

        // ✅ Admin list
        const admins = members
          .filter((m: any) => m.userId?.role === "Admin")
          .map((m: any) => (m.userId as any)._id?.toString());

        // ✅ Recipients (admin + sender + mentioned users)
        let recipients = [...admins, senderId, ...mentions];
        recipients = [...new Set(recipients.map((id) => id.toString()))];

        // ✅ Send personalized message
        recipients.forEach((id) => {
          const client = clients.get(id);
          if (!client) return;

          const isAdmin = admins.includes(id);
          const isSender = id === senderId.toString();

          let filteredText = text;

          // 🔥 Apply filtering only for normal users
          if (!isAdmin && !isSender) {
            mentions.forEach((mentionId: string) => {
              const member = members.find(
                (m: any) => m.userId._id.toString() === mentionId.toString(),
              );

              if (!member) return;

              const email = (member.userId as any).email;

              // ❗ hide other mentions
              if (mentionId.toString() !== id) {
                filteredText = filteredText.replace(`@${email}`, "");
              }
            });
          }

          const payload = JSON.stringify({
            type: "RECEIVE_MESSAGE",
            message: {
              ...populatedMsg.toObject(),
              text: filteredText,
            },
          });

          client.send(payload);
        });
      }
    } catch (err) {
      console.error("❌ WS message error:", err);
    }
  },

  close(ws: ServerWebSocket<undefined>) {
    console.log("🔴 WebSocket Disconnected");

    // ✅ Cleanup
    for (const [userId, socket] of clients.entries()) {
      if (socket === ws) {
        clients.delete(userId);
        break;
      }
    }
  },
};
