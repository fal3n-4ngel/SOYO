import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUsers, createUser, updateUser, deleteUser, getUser } from "@/app/lib/db";
import { ACTIVE_USER_COOKIE, ACTIVE_USER_MAX_AGE, getActiveUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = getUsers();
  const activeUser = await getActiveUser();
  return NextResponse.json({ users, activeUser });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, avatar, userId } = body;

    if (action === "create") {
      if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
      }

      const newProfile = createUser(name, avatar);
      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_USER_COOKIE, newProfile.id, {
        path: "/",
        maxAge: ACTIVE_USER_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
      });

      return NextResponse.json({ user: newProfile, users: getUsers() });
    }

    if (action === "select") {
      if (!userId || typeof userId !== "string") {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
      }

      const targetUser = getUser(userId);
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_USER_COOKIE, targetUser.id, {
        path: "/",
        maxAge: ACTIVE_USER_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
      });

      return NextResponse.json({ activeUser: targetUser });
    }

    if (action === "update") {
      if (!userId) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
      const updated = updateUser(userId, { name, avatar });
      return NextResponse.json({ user: updated, users: getUsers() });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[soyo] Profile API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");
    if (!userId) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

    const success = deleteUser(userId);
    if (!success) {
      return NextResponse.json({ error: "Cannot delete the last remaining profile" }, { status: 400 });
    }

    return NextResponse.json({ success: true, users: getUsers() });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
