import { isManagedBlobImageUrl } from "@/lib/catalog/storefront-product-image";

export type BlobHostProbeResult = "ok" | "blocked" | "unknown";

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Öffentliche Blob-Stores können 403 „Your store is blocked“ liefern. */
export async function probeBlobUrl(url: string): Promise<BlobHostProbeResult> {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (head.status === 403 || head.status === 404) return "blocked";
    if (head.ok) return "ok";
    if (head.status !== 405 && head.status !== 501) return "unknown";

    const get = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { Range: "bytes=0-0" },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (get.status === 403 || get.status === 404) return "blocked";
    if (get.ok || get.status === 206) return "ok";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Ein Probe pro Host. 403/404 → Host gilt als unbrauchbar für Storefront-Medien.
 */
export async function collectBlockedBlobHosts(urls: string[]): Promise<Set<string>> {
  const sampleByHost = new Map<string, string>();
  for (const url of urls) {
    if (!isManagedBlobImageUrl(url)) continue;
    const host = hostnameOf(url);
    if (!host || sampleByHost.has(host)) continue;
    sampleByHost.set(host, url);
  }

  const blocked = new Set<string>();
  await Promise.all(
    [...sampleByHost.entries()].map(async ([host, sample]) => {
      const result = await probeBlobUrl(sample);
      if (result === "blocked") blocked.add(host);
    }),
  );
  return blocked;
}

export function urlHostIsBlocked(url: string, blockedHosts: Set<string>): boolean {
  const host = hostnameOf(url);
  return host != null && blockedHosts.has(host);
}
