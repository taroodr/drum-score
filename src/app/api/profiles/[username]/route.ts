import { NextResponse } from "next/server";
import { getPublicProfileServer } from "@/lib/publicProfilesServer";
import { isPublicUsername, normalizeUsername } from "@/lib/username";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const resolved = await context.params;
  const username = normalizeUsername(resolved.username);

  if (!isPublicUsername(username)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const profile = await getPublicProfileServer(username);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    links: profile.links,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  });
}
