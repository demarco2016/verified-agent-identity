const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { randomUUID } = require("crypto");

class FileStorage {
  constructor(filename, baseDir = path.join(os.homedir(), ".openclaw", "billions")) {
    this.filePath = path.join(baseDir, filename);
  }

  async ensureDirectory() {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  }

  async readFile() {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async writeFile(data) {
    await this.ensureDirectory();
    const json = JSON.stringify(data, null, 2);
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(tempPath, json, { encoding: "utf-8", mode: 0o600, flag: "wx" });
      await fs.rename(tempPath, this.filePath);
    } finally {
      await fs.rm(tempPath, { force: true });
    }
  }
}

module.exports = { FileStorage };
