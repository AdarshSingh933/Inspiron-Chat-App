// utils/verifyAzureToken.ts

import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
});

function getKey(header: jwt.JwtHeader, callback: (err: Error | null, key?: string) => void) {
  if (!header.kid) {
    callback(new Error("Token missing 'kid' header - not a valid Azure token"), undefined);
    return;
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error("❌ Error getting signing key:", err);
      callback(err, undefined);
      return;
    }
    if (!key) {
      callback(new Error("Signing key not found for kid: " + header.kid), undefined);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// ✅ MAIN FUNCTION YOU WILL USE
export const verifyAzureToken = (token: string): Promise<jwt.JwtPayload> => {
  // Validate environment variables
  if (!process.env.CLIENT_ID || !process.env.TENANT_ID) {
    return Promise.reject(
      new Error("Missing CLIENT_ID or TENANT_ID environment variables")
    );
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`,
        algorithms: ["RS256"], // Azure uses RS256
      },
      (err, decoded) => {
        if (err) {
          console.error("❌ JWT verification failed:", {
            message: err.message,
            name: err.name,
          });
          reject(err);
        } else {
          resolve(decoded as jwt.JwtPayload);
        }
      }
    );
  });
};