import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const AVATAR_DIR = path.resolve("./public/avatars");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (!fs.existsSync(AVATAR_DIR)) {
      fs.mkdirSync(AVATAR_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".png";
    const filename = `pfp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
    const filePath = path.join(AVATAR_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    const avatarUrl = `/avatars/${filename}`;
    return NextResponse.json({ url: avatarUrl });
  } catch (error) {
    console.error("[soyo] Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}
