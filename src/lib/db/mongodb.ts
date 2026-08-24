import mongoose, { type ConnectOptions, type Mongoose } from "mongoose";
import { getServerEnv } from "../env";

export type MongoConnector = (
  uri: string,
  options: ConnectOptions,
) => Promise<Mongoose>;

const defaultConnector: MongoConnector = (uri, options) =>
  mongoose.connect(uri, options);

export class MongoConnectionManager {
  private connection: Mongoose | null = null;
  private pending: Promise<Mongoose> | null = null;

  constructor(
    private readonly uri: string,
    private readonly connector: MongoConnector = defaultConnector,
  ) {}

  async connect(): Promise<Mongoose> {
    if (this.connection) return this.connection;

    if (!this.pending) {
      this.pending = this.connector(this.uri, {
        bufferCommands: false,
        maxPoolSize: 10,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 10_000,
      });
    }

    try {
      this.connection = await this.pending;
      return this.connection;
    } catch (cause) {
      this.pending = null;
      throw new Error("MongoDB connection failed.", { cause });
    }
  }
}

declare global {
  var readcoachMongoManager: MongoConnectionManager | undefined;
}

let productionManager: MongoConnectionManager | undefined;

function getProductionManager(): MongoConnectionManager {
  const existing =
    process.env.NODE_ENV === "development"
      ? globalThis.readcoachMongoManager
      : productionManager;

  if (existing) return existing;

  const manager = new MongoConnectionManager(getServerEnv().MONGODB_URI);

  if (process.env.NODE_ENV === "development") {
    globalThis.readcoachMongoManager = manager;
  } else {
    productionManager = manager;
  }

  return manager;
}

export function connectToMongo(): Promise<Mongoose> {
  return getProductionManager().connect();
}