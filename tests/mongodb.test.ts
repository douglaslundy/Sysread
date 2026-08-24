import type { Mongoose } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import {
  MongoConnectionManager,
  type MongoConnector,
} from "../src/lib/db/mongodb";

const connection = {} as Mongoose;

describe("MongoConnectionManager", () => {
  it("deduplicates concurrent connections and reuses the result", async () => {
    const connector = vi.fn<MongoConnector>().mockResolvedValue(connection);
    const manager = new MongoConnectionManager(
      "mongodb://localhost:27017/readcoach",
      connector,
    );

    const [first, second] = await Promise.all([
      manager.connect(),
      manager.connect(),
    ]);
    const third = await manager.connect();

    expect(first).toBe(connection);
    expect(second).toBe(connection);
    expect(third).toBe(connection);
    expect(connector).toHaveBeenCalledOnce();
    expect(connector).toHaveBeenCalledWith(
      "mongodb://localhost:27017/readcoach",
      expect.objectContaining({ bufferCommands: false, maxPoolSize: 10 }),
    );
  });

  it("clears a failed attempt so a later call can retry", async () => {
    const connector = vi
      .fn<MongoConnector>()
      .mockRejectedValueOnce(new Error("server unavailable"))
      .mockResolvedValueOnce(connection);
    const manager = new MongoConnectionManager(
      "mongodb://localhost:27017/readcoach",
      connector,
    );

    await expect(manager.connect()).rejects.toThrow(
      "MongoDB connection failed.",
    );
    await expect(manager.connect()).resolves.toBe(connection);
    expect(connector).toHaveBeenCalledTimes(2);
  });
});