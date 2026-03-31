import { Hono } from "hono";

const websocketRoutes = new Hono();

websocketRoutes.get("/", (c:any) => {
  if (c.req.header("upgrade") !== "websocket") {
    return c.text("Expected WebSocket", 400);
  }

  // @ts-ignore (Bun specific)
  const upgraded = (c.env as any).server?.upgrade(c.req.raw);

  if (!upgraded) {
    return c.text("WebSocket upgrade failed", 500);
  }

  return; // IMPORTANT: do not return Response
});

export default websocketRoutes;