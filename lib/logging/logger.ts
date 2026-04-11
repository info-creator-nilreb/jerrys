type LogLevel = "debug" | "info" | "warn" | "error";

/** Kompakte Fehler-Metadaten für JSON-Logs (kein vollständiger Stack). */
export function errorMeta(e: unknown): Record<string, unknown> {
  if (e instanceof Error) {
    return { errName: e.name, errMessage: e.message };
  }
  return { errMessage: String(e) };
}

function write(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    scope,
    message,
    time: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: Record<string, unknown>) =>
      write("debug", scope, message, meta),
    info: (message: string, meta?: Record<string, unknown>) => write("info", scope, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => write("warn", scope, message, meta),
    error: (message: string, meta?: Record<string, unknown>) =>
      write("error", scope, message, meta),
  };
}
