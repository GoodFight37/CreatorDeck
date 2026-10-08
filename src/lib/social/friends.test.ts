import { describe, expect, it } from "vitest";
import {
  byNewestFirst,
  filterFriends,
  friendCountLabel,
  relativeDay,
  type Friendship,
} from "./friends";

function friend(id: number, name: string, iso: string): Friendship {
  return { id, friendId: `user-${id}`, friendName: name, createdAt: iso };
}

describe("le libellé du nombre d'amis", () => {
  it("écrit « 1 ami » au singulier", () => {
    expect(friendCountLabel(1)).toBe("1 ami");
  });

  it("écrit « 0 ami » et « 3 amis » au pluriel", () => {
    expect(friendCountLabel(0)).toBe("0 amis");
    expect(friendCountLabel(3)).toBe("3 amis");
  });
});

describe("le tri des listes", () => {
  it("place le plus récent en premier", () => {
    const rows = byNewestFirst([
      friend(1, "Ancienne", "2026-10-01T10:00:00Z"),
      friend(2, "Récente", "2026-10-05T10:00:00Z"),
      friend(3, "Milieu", "2026-10-03T10:00:00Z"),
    ]);
    expect(rows.map((row) => row.friendName)).toEqual(["Récente", "Milieu", "Ancienne"]);
  });

  it("ne modifie pas la liste reçue", () => {
    const source = [friend(1, "Une", "2026-10-01T10:00:00Z"), friend(2, "Deux", "2026-10-02T10:00:00Z")];
    byNewestFirst(source);
    expect(source.map((row) => row.friendName)).toEqual(["Une", "Deux"]);
  });
});

describe("la recherche dans ses amis", () => {
  const friends = [friend(1, "Kameto", "2026-10-01T10:00:00Z"), friend(2, "Ibai", "2026-10-02T10:00:00Z")];

  it("cherche sans tenir compte de la casse", () => {
    expect(filterFriends(friends, "KAME").map((row) => row.friendName)).toEqual(["Kameto"]);
  });

  it("cherche aussi sur l'identifiant, qu'un pseudo ne donne pas", () => {
    expect(filterFriends(friends, "user-2").map((row) => row.friendName)).toEqual(["Ibai"]);
  });

  it("rend toute la liste quand la recherche est vide", () => {
    expect(filterFriends(friends, "   ").length).toBe(2);
  });

  it("rend une liste vide quand personne ne correspond", () => {
    expect(filterFriends(friends, "zzz")).toEqual([]);
  });
});

describe("la date d'une demande, en français", () => {
  const now = Date.parse("2026-10-06T12:00:00Z");

  it("dit « à l'instant » pour la minute en cours", () => {
    expect(relativeDay("2026-10-06T11:59:40Z", now)).toBe("à l'instant");
  });

  it("compte en minutes, puis en heures", () => {
    expect(relativeDay("2026-10-06T11:45:00Z", now)).toBe("il y a 15 min");
    expect(relativeDay("2026-10-06T09:00:00Z", now)).toBe("il y a 3 h");
  });

  it("dit « hier », puis en jours", () => {
    expect(relativeDay("2026-10-05T09:00:00Z", now)).toBe("hier");
    expect(relativeDay("2026-10-02T09:00:00Z", now)).toBe("il y a 4 jours");
  });

  it("ne dit rien d'une date illisible", () => {
    expect(relativeDay("", now)).toBe("");
    expect(relativeDay("pas une date", now)).toBe("");
  });
});
