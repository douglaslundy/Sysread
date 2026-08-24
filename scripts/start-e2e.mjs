process.env.HOSTNAME = process.env.E2E_HOSTNAME ?? "127.0.0.1";
process.env.PORT = process.env.E2E_PORT ?? "3100";
await import("../.next/standalone/server.js");