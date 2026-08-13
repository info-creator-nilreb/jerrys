import packageJson from "../package.json";

/**
 * Anzeige-/Release-Version der App.
 * Quelle: `package.json` → `version` (semver).
 * Optionaler Override: `APP_VERSION` (z. B. CI/Release-Build).
 */
export function getAppVersion(): string {
  const fromEnv = process.env.APP_VERSION?.trim();
  if (fromEnv) return fromEnv.replace(/^v/i, "");
  return packageJson.version;
}

/** Sidebar-/UI-Label, z. B. `v1.0.0`. */
export function formatAppVersionLabel(version: string = getAppVersion()): string {
  const normalized = version.trim().replace(/^v/i, "");
  return normalized ? `v${normalized}` : "v—";
}
