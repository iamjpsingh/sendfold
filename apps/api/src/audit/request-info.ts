import { isIP } from "node:net";
import type { RequestInfo } from "@sendfold/shared/audit";

export function requestInfo(
  request: Request,
  address?: string | null,
  country?: string | null,
): RequestInfo {
  return {
    ipAddress: address && isIP(address) ? address : null,
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    userAgent: request.headers.get("User-Agent")?.slice(0, 500) || null,
  };
}
// Only the private Worker adapter trusts Cloudflare's edge-supplied IP headers.
export function cloudflareRequestInfo(request: Request): RequestInfo {
  const cf = (request as Request & { cf?: { country?: unknown } }).cf;
  const primary = request.headers.get("CF-Connecting-IP");
  const ipv6 = request.headers.get("CF-Connecting-IPv6");
  // The IPv6 companion is authoritative only with an edge-generated Class E
  // pseudo-IPv4 address. Do not let a client-supplied companion replace an IP.
  const pseudo =
    primary && isIP(primary) === 4 && Number(primary.split(".")[0]) >= 240;
  const address = pseudo && ipv6 && isIP(ipv6) === 6 ? ipv6 : primary;
  return requestInfo(
    request,
    address === "2a06:98c0:3600::103" ? null : address,
    typeof cf?.country === "string" ? cf.country : null,
  );
}
