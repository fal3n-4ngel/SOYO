import { cookies } from "next/headers";

export const UNLOCK_COOKIE = "soyo_unlocked";
export const UNLOCK_MAX_AGE = 60 * 60 * 6; // 6 hours

/** True once the PIN has been entered — gates access to private folders. */
export async function isUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(UNLOCK_COOKIE);
}
