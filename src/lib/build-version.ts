/** Identifiant court du commit incorporé au build distribué. */
export function shortBuildVersion(commit: string | undefined): string {
  const normalized = commit?.trim().toLowerCase();
  return normalized && /^[\da-f]{7,40}$/.test(normalized)
    ? normalized.slice(0, 7)
    : "locale";
}

export const BUILD_COMMIT = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "";
export const BUILD_VERSION = shortBuildVersion(BUILD_COMMIT);
