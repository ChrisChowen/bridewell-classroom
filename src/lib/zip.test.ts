import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createZip } from "./zip";

function hasUnzip(): boolean {
  try {
    execFileSync("unzip", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("createZip", () => {
  it("starts with the local-file-header magic and ends with EOCD magic", () => {
    const buf = createZip([{ name: "a.txt", content: "hello" }]);
    expect(buf.readUInt32LE(0)).toBe(0x04034b50);
    expect(buf.readUInt32LE(buf.length - 22)).toBe(0x06054b50);
  });

  it("produces an archive that the real `unzip` tool can read", () => {
    if (!hasUnzip()) {
      // No unzip on this box — the magic-byte assertion above still guards.
      return;
    }
    const files = [
      { name: "README.txt", content: "research export\n" },
      { name: "engagement.csv", content: "participantId,state\r\nP001,flowing\r\n" },
      { name: "weird.csv", content: 'a,"b,c",d\r\n' },
    ];
    const buf = createZip(files);
    const dir = mkdtempSync(join(tmpdir(), "bw-zip-"));
    const zipPath = join(dir, "out.zip");
    try {
      writeFileSync(zipPath, buf);
      // -t tests archive integrity (CRC checks).
      const test = execFileSync("unzip", ["-t", zipPath], { encoding: "utf8" });
      expect(test).toContain("No errors detected");
      // -p streams a member to stdout; verify content survives byte-for-byte.
      const member = execFileSync("unzip", ["-p", zipPath, "engagement.csv"], {
        encoding: "utf8",
      });
      expect(member).toBe("participantId,state\r\nP001,flowing\r\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
