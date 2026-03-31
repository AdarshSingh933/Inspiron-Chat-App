import { Hono } from "hono";
import { serve } from "bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { connectDB } from "./db";
import authRoutes from "./routes/auth";
import messageRoutes from "./routes/message";
import websocketRoutes from "./routes/webSocket";
import { websocketHandler } from "./websocket/websocket";
import userRoutes from "./routes/user";
import channelRoutes from "./routes/channel";
import { serveStatic } from "hono/bun";

const PORT = process.env.PORT || 3000;

const app = new Hono();
app.use("*", logger());
app.use("*", cors());

app.use("*", async (c, next) => {
  try {
    await next();
  } catch (err) {
    console.error("❌ Error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("/", (c) => c.text("🚀 Server running with Bun + Hono"));
app.route("/user", userRoutes);
app.route("/auth", authRoutes);
app.route("/message", messageRoutes);
app.route("/channel", channelRoutes);

app.use("/uploads/*", serveStatic({ root: "./" }));

await connectDB();

const server = serve({
  port: Number(PORT),
  fetch: (req, server) => {
    return app.fetch(req, { ...server });
  },
  websocket: websocketHandler,
});

app.use("*", async (c: any, next) => {
  c.env.server = server; // ✅ inject server
  await next();
});

app.route("/ws", websocketRoutes);

console.log(`🚀 Server running on http://localhost:${PORT}`);