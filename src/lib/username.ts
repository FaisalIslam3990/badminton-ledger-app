// Supabase Auth is email-based. Usernames created by the admin are given
// a synthetic, unreachable email behind the scenes so the person can log
// in with just a username + password — they never see or use this email.
const USERNAME_EMAIL_DOMAIN = "users.badminton-ledger.local";

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}

export function isUsernameAccount(email: string) {
  return email.toLowerCase().endsWith(`@${USERNAME_EMAIL_DOMAIN}`);
}

export function emailToUsername(email: string) {
  return email.slice(0, email.indexOf("@"));
}

// Login form accepts either a real email or a bare username, case-insensitive.
export function identifierToEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  return normalized.includes("@") ? normalized : usernameToEmail(normalized);
}

// What to show on screen: the capitalized username for admin-created
// accounts (the synthetic email is an implementation detail), or the
// real email as-is for accounts that signed in themselves.
export function displayIdentity(email: string) {
  if (!isUsernameAccount(email)) return email;
  const username = emailToUsername(email);
  return username.charAt(0).toUpperCase() + username.slice(1);
}
