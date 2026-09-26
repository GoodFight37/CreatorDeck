import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "creatordeck_player";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolvePlayerId() {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(COOKIE_NAME)?.value;
  const candidate = cookieId && UUID_PATTERN.test(cookieId) ? cookieId : randomUUID();

  const [existing] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.id, candidate))
    .limit(1);

  if (!existing) {
    await db.insert(players).values({ id: candidate });
  }

  if (cookieId !== candidate) {
    cookieStore.set(COOKIE_NAME, candidate, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return candidate;
}
