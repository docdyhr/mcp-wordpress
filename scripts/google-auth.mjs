#!/usr/bin/env node
/**
 * One-time helper to obtain a Google OAuth2 refresh token for Search Console.
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/google-auth.mjs
 *
 * After running, copy the printed refresh token into your .env:
 *   GOOGLE_REFRESH_TOKEN=<token>
 *
 * Prerequisites:
 *   1. Create a project in Google Cloud Console
 *   2. Enable the "Google Search Console API"
 *   3. Create OAuth2 credentials (type: Desktop app)
 *   4. Copy Client ID and Client Secret into env vars above
 */

import { createInterface } from "readline";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.");
  console.error("  GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/google-auth.mjs");
  process.exit(1);
}

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  "urn:ietf:wg:oauth:2.0:oob" // out-of-band: prints the code in the browser
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent", // force consent screen so we always get a refresh_token
});

console.log("\n=== Google Search Console OAuth2 Setup ===\n");
console.log("1. Open this URL in your browser:\n");
console.log("   " + authUrl);
console.log("\n2. Sign in with your Google account and grant access.");
console.log("3. Copy the authorization code shown and paste it below.\n");

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question("Authorization code: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("\n=== Success! Add these to your .env file ===\n");
    console.log(`GOOGLE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`SEO_PROVIDER_SEARCH_CONSOLE=true`);
    console.log("\nThe refresh token does not expire unless revoked.");
  } catch (err) {
    console.error("\nFailed to exchange authorization code:", err.message);
    process.exit(1);
  }
});
