import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PrivateObjectStorage } from "../application/types";
import { assertPrivateStorageKey } from "./storage-key";


export class LocalPrivateObjectStorage implements PrivateObjectStorage {
  private readonly root: string;

  constructor(rootDirectory: string) {
    this.root = path.resolve(rootDirectory);
  }

  private resolve(storageKey: string): string {
    assertPrivateStorageKey(storageKey);
    const target = path.resolve(this.root, storageKey);
    if (!target.startsWith(this.root + path.sep)) {
      throw new Error("Storage key escapes the private root.");
    }
    return target;
  }

  async get(storageKey: string) {
    return new Uint8Array(await readFile(this.resolve(storageKey)));
  }

  async put(input: {
    bytes: Uint8Array;
    contentType: string;
    storageKey: string;
  }) {
    const target = this.resolve(input.storageKey);
    await mkdir(path.dirname(target), { mode: 0o700, recursive: true });
    await writeFile(target, input.bytes, { mode: 0o600 });
  }

  async delete(storageKey: string) {
    await unlink(this.resolve(storageKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}