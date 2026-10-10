import { describe, expect, it } from "vitest";

import { shortBuildVersion } from "@/lib/build-version";

describe("version visible du build", () => {
  it("garde les sept premiers caractères du commit Git", () => {
    expect(shortBuildVersion("ABCDEF0123456789ABCDEF0123456789ABCDEF01")).toBe("abcdef0");
  });

  it("signale un build local quand aucun commit Git fiable n'est fourni", () => {
    expect(shortBuildVersion(undefined)).toBe("locale");
    expect(shortBuildVersion("not-a-commit")).toBe("locale");
  });
});
