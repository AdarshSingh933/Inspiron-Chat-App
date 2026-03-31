import { type Context, type Next } from "hono";
import jwt from "jsonwebtoken";

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
      return c.json({ error: "No token" }, 401);
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return c.json({ error: "Invalid token format" }, 401);
    }

    const decoded: any = jwt.verify(token,  process.env.JWT_SECRET as string);

    // ✅ attach user to context
    (c as any).set("user", { userId: decoded.userId });

    await next();
  } catch (err) {
    return c.json({ error: "Invalid token" }, 401);
  }
};;