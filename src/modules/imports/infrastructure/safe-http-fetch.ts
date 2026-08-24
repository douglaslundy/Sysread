import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, request } from "undici";
import ipaddr from "ipaddr.js";

export class SafeFetchError extends Error {
  constructor(
    readonly code: "FETCH_BLOCKED" | "FETCH_FAILED" | "RESPONSE_TOO_LARGE" | "UNSUPPORTED_CONTENT",
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}

export interface PinnedTransport {
  request(input: {
    address: string;
    family: 4 | 6;
    maxBytes: number;
    timeoutMs: number;
    url: URL;
  }): Promise<{ body: Uint8Array; contentType: string; location?: string; status: number }>;
}

export interface HostResolver {
  resolve(hostname: string): Promise<Array<{ address: string; family: 4 | 6 }>>;
}

function assertPublicAddress(address: string) {
  if (!ipaddr.isValid(address)) {
    throw new SafeFetchError("FETCH_BLOCKED", "The destination address is invalid.");
  }
  let parsed = ipaddr.parse(address);
  if (parsed.kind() === "ipv6" && parsed.range() === "ipv4Mapped") {
    parsed = (parsed as ipaddr.IPv6).toIPv4Address();
  }
  if (parsed.range() !== "unicast") {
    throw new SafeFetchError("FETCH_BLOCKED", "The destination network is not public.");
  }
}

export function validatePublicUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SafeFetchError("FETCH_BLOCKED", "Enter a valid HTTP or HTTPS URL.");
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new SafeFetchError("FETCH_BLOCKED", "Only public HTTP or HTTPS URLs are allowed.");
  }
  const allowedPort = !url.port || (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (
    !allowedPort ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new SafeFetchError("FETCH_BLOCKED", "The destination is not allowed.");
  }
  if (isIP(hostname)) assertPublicAddress(hostname);
  url.hash = "";
  return url;
}

export const systemResolver: HostResolver = {
  async resolve(hostname) {
    if (isIP(hostname)) {
      return [{ address: hostname, family: isIP(hostname) as 4 | 6 }];
    }
    return (await lookup(hostname, { all: true, verbatim: true })).map((item) => ({
      address: item.address,
      family: item.family as 4 | 6,
    }));
  },
};

export class UndiciPinnedTransport implements PinnedTransport {
  async request(input: {
    address: string;
    family: 4 | 6;
    maxBytes: number;
    timeoutMs: number;
    url: URL;
  }) {
    const dispatcher = new Agent({
      connect: {
        lookup: (_hostname, _options, callback) =>
          _options.all
            ? callback(null, [{ address: input.address, family: input.family }])
            : callback(null, input.address, input.family),
      },
    });
    try {
      const response = await request(input.url, {
        bodyTimeout: input.timeoutMs,
        dispatcher,
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9",
          "accept-encoding": "identity",
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.7",
          "user-agent": "Mozilla/5.0 (compatible; SysreadImporter/1.0; +https://sysread.local)",
        },
        headersTimeout: input.timeoutMs,
        method: "GET",
        signal: AbortSignal.timeout(input.timeoutMs),
      });
      const declaredLength = Number(response.headers["content-length"] ?? 0);
      if (declaredLength > input.maxBytes) {
        response.body.destroy();
        throw new SafeFetchError("RESPONSE_TOO_LARGE", "The article exceeds the import limit.");
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of response.body) {
        const bytes = new Uint8Array(chunk);
        size += bytes.length;
        if (size > input.maxBytes) {
          response.body.destroy();
          throw new SafeFetchError("RESPONSE_TOO_LARGE", "The article exceeds the import limit.");
        }
        chunks.push(bytes);
      }
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }
      const header = (name: string) => {
        const value = response.headers[name];
        return Array.isArray(value) ? value[0] : value;
      };
      return {
        body,
        contentType: header("content-type") ?? "",
        location: header("location"),
        status: response.statusCode,
      };
    } finally {
      await dispatcher.close();
    }
  }
}

export async function safeFetchHtml(
  inputUrl: string,
  options: {
    maxBytes: number;
    maxRedirects?: number;
    resolver?: HostResolver;
    timeoutMs: number;
    transport?: PinnedTransport;
  },
) {
  const resolver = options.resolver ?? systemResolver;
  const transport = options.transport ?? new UndiciPinnedTransport();
  let url = validatePublicUrl(inputUrl);
  const maxRedirects = options.maxRedirects ?? 5;

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "");
    const addresses = await resolver.resolve(hostname).catch(() => []);
    if (addresses.length === 0) {
      throw new SafeFetchError("FETCH_FAILED", "The article host could not be resolved.", true);
    }
    addresses.forEach((item) => assertPublicAddress(item.address));
    let response: Awaited<ReturnType<PinnedTransport["request"]>> | undefined;
    let lastTransportError: unknown;
    for (const address of addresses) {
      try {
        response = await transport.request({ ...address, maxBytes: options.maxBytes, timeoutMs: options.timeoutMs, url });
        break;
      } catch (error) {
        lastTransportError = error;
      }
    }
    if (!response) {
      throw new SafeFetchError(
        "FETCH_FAILED",
        lastTransportError instanceof Error && lastTransportError.name === "TimeoutError"
          ? "The article request timed out."
          : "The article server could not be reached.",
        true,
      );
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location || redirect === maxRedirects) {
        throw new SafeFetchError("FETCH_BLOCKED", "The redirect chain is not allowed.");
      }
      url = validatePublicUrl(new URL(response.location, url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new SafeFetchError("FETCH_FAILED", "The article server returned an error.", response.status >= 500);
    }
    if (!/^(text\/html|application\/xhtml\+xml)(?:;|$)/iu.test(response.contentType)) {
      throw new SafeFetchError("UNSUPPORTED_CONTENT", "The URL does not contain an HTML article.");
    }
    return { bytes: response.body, contentType: response.contentType, finalUrl: url.toString() };
  }
  throw new SafeFetchError("FETCH_BLOCKED", "The redirect chain is not allowed.");
}

export const safeFetchInternals = { assertPublicAddress };

export function decodeHtml(bytes: Uint8Array, contentType: string): string {
  const charset = /charset\s*=\s*["']?([^;\s"']+)/iu.exec(contentType)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}
