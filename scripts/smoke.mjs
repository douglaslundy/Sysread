const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const checks = [
  ["/api/health", /"status":"ok"/],
  ["/api/ready", /"status":"ready"/],
  ["/pricing", /\$97/],
  ["/privacy", /Privacy Policy/],
  ["/terms", /Terms of Service/],
];
for (const [path, pattern] of checks) {
  const response = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  const text = await response.text();
  if (!response.ok || !pattern.test(text)) throw new Error("Smoke failed: " + path + " (" + response.status + ")");
  process.stdout.write("smoke ok " + path + "\n");
}
