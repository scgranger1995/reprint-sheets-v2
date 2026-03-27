import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const STATUS_FILE = path.join(process.cwd(), "update-status.json");

interface UpdateStatus {
  status: "idle" | "running" | "success" | "error";
  step: string;
  log: string;
  startedAt: string | null;
  completedAt: string | null;
}

function readStatus(): UpdateStatus {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
  } catch {
    return {
      status: "idle",
      step: "",
      log: "",
      startedAt: null,
      completedAt: null,
    };
  }
}

function writeStatus(update: Partial<UpdateStatus>) {
  const current = readStatus();
  fs.writeFileSync(
    STATUS_FILE,
    JSON.stringify({ ...current, ...update }, null, 2)
  );
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, shell: true });
    let output = "";
    proc.stdout.on("data", (d: Buffer) => {
      output += d.toString();
    });
    proc.stderr.on("data", (d: Buffer) => {
      output += d.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output || `Exit code ${code}`));
    });
    proc.on("error", reject);
  });
}

// GET — poll current update status
export async function GET() {
  return Response.json(readStatus());
}

// POST — kick off the update pipeline in the background
export async function POST() {
  const current = readStatus();
  if (current.status === "running") {
    return Response.json(
      { error: "Update already in progress" },
      { status: 409 }
    );
  }

  const cwd = process.cwd();

  writeStatus({
    status: "running",
    step: "Starting...",
    log: "",
    startedAt: new Date().toISOString(),
    completedAt: null,
  });

  // Fire-and-forget — runs in the background
  (async () => {
    let log = "";
    const steps = [
      { name: "git pull", cmd: "git", args: ["pull"] },
      { name: "npm install", cmd: "npm", args: ["install"] },
      { name: "prisma generate", cmd: "npx", args: ["prisma", "generate"] },
      { name: "prisma db push", cmd: "npx", args: ["prisma", "db", "push"] },
      { name: "build", cmd: "npm", args: ["run", "build"] },
    ];

    try {
      for (const step of steps) {
        writeStatus({ step: step.name, log });
        log += `\n--- ${step.name} ---\n`;
        const output = await runCommand(step.cmd, step.args, cwd);
        log += output;
      }
      log += "\n--- done ---\n";
      writeStatus({
        status: "success",
        step: "Complete",
        log,
        completedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log += `\nERROR: ${msg}\n`;
      writeStatus({
        status: "error",
        step: "Failed",
        log,
        completedAt: new Date().toISOString(),
      });
    }
  })();

  return Response.json({ message: "Update started" });
}

// DELETE — restart the server via pm2 (with a delay so the response goes out)
export async function DELETE() {
  try {
    // Small delay so the HTTP response reaches the client before the process dies
    setTimeout(() => {
      spawn("pm2", ["restart", "reprint-sheets"], {
        detached: true,
        shell: true,
        stdio: "ignore",
      }).unref();
    }, 1500);

    return Response.json({ message: "Server restarting..." });
  } catch (error) {
    console.error("Restart failed:", error);
    return Response.json({ error: "Restart failed" }, { status: 500 });
  }
}
