import Bowser from "bowser";

const regions = new Intl.DisplayNames(["en"], { type: "region" });
export function locationInfo(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code) || ["XX", "ZZ"].includes(code))
    return { name: "Not recorded", flag: "" };
  return {
    name: regions.of(code) ?? code,
    flag: String.fromCodePoint(
      ...[...code].map((c) => c.charCodeAt(0) + 127397),
    ),
  };
}
export function deviceInfo(userAgent: string | null) {
  const parsed = userAgent ? Bowser.parse(userAgent) : null;
  return {
    device: parsed?.platform.type || "unknown",
    browser: parsed?.browser.name || "Unknown client",
    os: parsed?.os.name || "OS not recorded",
  };
}
