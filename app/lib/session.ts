import { cookies } from "next/headers";
import { getUsers, getUser, UserProfile } from "./db";

export const UNLOCK_COOKIE = "soyo_unlocked";
export const UNLOCK_MAX_AGE = 60 * 60 * 6; // 6 hours

export const ACTIVE_USER_COOKIE = "soyo_active_user";
export const ACTIVE_USER_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** True once the PIN has been entered — gates access to private folders. */
export async function isUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(UNLOCK_COOKIE);
}

/** Retrieves the currently active user profile for the session. */
export async function getActiveUser(): Promise<UserProfile> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(ACTIVE_USER_COOKIE)?.value;
  const users = getUsers();

  if (userId) {
    const user = getUser(userId);
    if (user) return user;
  }

  // Fallback to the first available user profile
  return users[0];
}
