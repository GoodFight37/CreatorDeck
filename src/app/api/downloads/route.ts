import { stat } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

function formatMo(bytes: number) {
  const mo = bytes / 1_000_000;
  return `${mo.toFixed(1).replace(".", ",")} Mo`;
}

type DownloadInfo = {
  file: string;
  exists: boolean;
  label: string;
};

async function info(file: string, fallback: string): Promise<DownloadInfo> {
  try {
    const stats = await stat(path.join(process.cwd(), "public", "downloads", file));
    return { file, exists: true, label: formatMo(stats.size) };
  } catch {
    return { file, exists: false, label: fallback };
  }
}

export async function GET() {
  const [apk, assets] = await Promise.all([
    info("creatordeck-top500.apk", "— Mo"),
    info("creatordeck-assets-top500.zip", "— Mo"),
  ]);
  return Response.json({ apk, assets }, { headers: { "Cache-Control": "no-store" } });
}
