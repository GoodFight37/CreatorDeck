export function buildManifest(input: {
  versionCode: number; versionName: string; sha: string; sha256: string; size: number;
  tag: string; repo: string; builtAt: string;
}): {
  versionCode: number; versionName: string; sha: string; url: string; sha256: string; size: number; builtAt: string;
};
