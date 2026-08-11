export type InstagramAuthMode = "instagram" | "facebook";

/**
 * `instagram` = Business Login for Instagram (Instagram App ID).
 * `facebook`  = Facebook Login for Business (Meta App ID oben im Dashboard).
 *
 * Bei "Invalid platform app" oft Facebook-Login-Setup → Mode `facebook` + Meta-App-ID.
 */
export function getInstagramAuthMode(): InstagramAuthMode {
  const raw = (process.env.INSTAGRAM_AUTH_MODE ?? "instagram").trim().toLowerCase();
  return raw === "facebook" ? "facebook" : "instagram";
}
