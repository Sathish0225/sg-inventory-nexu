/**
 * Collision-resistant id. `crypto.randomUUID` only exists in secure contexts, so fall back
 * for the dev server opened over plain http on a LAN address.
 */
export const uid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
