import fs from "fs";
import path from "path";

const lockPath = path.join(".next", "dev", "lock");

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("Kein Next.js-Dev-Server aktiv (keine Lock-Datei).");
      process.exit(0);
    }
    throw err;
  }
}

const { pid, port } = readLock();

try {
  process.kill(pid, "SIGTERM");
  console.log(`Next.js-Dev-Server beendet (PID ${pid}, Port ${port ?? "unbekannt"}).`);
} catch (err) {
  if (err.code === "ESRCH") {
    fs.unlinkSync(lockPath);
    console.log("Lock entfernt (Prozess existierte nicht).");
    process.exit(0);
  }
  throw err;
}
