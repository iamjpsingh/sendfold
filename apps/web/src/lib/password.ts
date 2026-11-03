const groups = [
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "abcdefghijkmnopqrstuvwxyz",
  "23456789",
  "!@#$%*?",
];
const alphabet = groups.join(""); // 64 characters: six random bits per character.

export function randomPassword() {
  // Reject complete samples missing a group; every accepted password is equally likely.
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const password = Array.from(bytes, (byte) => alphabet[byte & 63]).join("");
    if (groups.every((group) => [...password].some((c) => group.includes(c))))
      return password;
  }
}
