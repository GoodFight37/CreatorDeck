import type { CloudCore } from "./core";
import { CloudError, asRecord } from "./core";
import type { TribunalRecompense } from "./types";

/**
 * Fait payer une séance du Tribunal par le serveur.
 *
 * Ce qui part : la **journée de jeu**, les **verdicts rendus**, et le **login**
 * du créateur qui préside. Ce qui ne part pas : un montant. Le serveur
 * recalcule le karma depuis sa propre vérité (`0042_tribunal.sql`) et décide
 * seul combien la séance vaut — comme le score de l'arène, qu'on ne peut pas
 * s'inventer.
 *
 * Le multiplicateur Direct n'est pas envoyé non plus : le serveur regarde
 * `live_streams` lui-même, dans sa fenêtre de dix minutes.
 */
export async function tribunalRecompense(
  core: CloudCore,
  day: string,
  verdicts: Record<string, string>,
  login: string | null,
): Promise<TribunalRecompense> {
  const result = await core.rpc("tribunal_recompense", {
    p_day: day,
    p_verdicts: verdicts,
    p_login: login ?? "",
  });
  const record = asRecord(result);
  if (!record) throw new CloudError("Réponse du Tribunal illisible.", "invalid_response", 0);
  return {
    paye: record.paye === true,
    karma: Number(record.karma ?? 0),
    seuil: Number(record.seuil ?? 60),
    multiplicateur: Number(record.multiplicateur ?? 1),
    gained: Number(record.gained ?? 0),
    points: Number(record.points ?? 0),
  };
}
