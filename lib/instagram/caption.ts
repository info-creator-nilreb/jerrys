export function instagramCaptionAlt(caption: string | null | undefined, username: string): string {
  const trimmed = caption?.trim().replace(/\s+/g, " ") ?? "";
  if (trimmed) return trimmed.slice(0, 120);
  return username ? `Instagram @${username}` : "Instagram";
}
