export type StoredUser = {
  id: number;
  email: string;
  name: string;
};

export const SESSION_KEY = "innolympics:user";

export function saveUser(user: StoredUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function loadUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredUser>;
    if (
      typeof parsed.id === "number" &&
      typeof parsed.email === "string" &&
      typeof parsed.name === "string"
    ) {
      return { id: parsed.id, email: parsed.email, name: parsed.name };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
