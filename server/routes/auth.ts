import { Hono } from "hono";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { verifyAzureToken } from "../utils/verifyAzureToken";

const authRoutes = new Hono();

authRoutes.post("/microsoft", async (c) => {
  console.log("c------",c);
  try {
    const { token } = await c.req.json();
    console.log("token",token);
    if (!token) {
      return c.json({ error: "Token is required" }, 400);
    }
    
    // Debug: Check token format
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      console.error("❌ Invalid token format - expected JWT with 3 parts, got", tokenParts.length);
      return c.json({ error: "Invalid token format" }, 400);
    }
    
    console.log("📝 Verifying Azure token...");
    const decoded: any = await verifyAzureToken(token);
    const userData = {
      azureId: decoded.oid,
      email: decoded.preferred_username,
      name: decoded.name,
      tenantId: decoded.tid,
    };
    console.log(userData);
    let user = await User.findOne({ azureId: userData.azureId });
    if (!user) {
      user = await User.create(userData);
    } else {
      user.lastLogin = new Date();
      await user.save();
    }
    const appToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );
    return c.json({
      message: "Login successful",
      token: appToken,
      user,
    });
  } catch (err) {
    console.error("❌ Auth error:", err);
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

export default authRoutes;