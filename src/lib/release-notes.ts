/** Notes destinées aux joueurs, publiées avec le code qu'elles décrivent. */
export type ReleaseNote = {
  id: string;
  date: string;
  title: string;
  summary: string;
  sections: { title: string; items: string[] }[];
};

/** Plus récente en premier. Un identifiant publié ne change jamais. */
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    id: "2026-10-15-objectifs", date: "2026-10-15", title: "Tes objectifs, tes récompenses",
    summary: "Le quotidien, les jalons et les saisons sont plus faciles à suivre et à réclamer.",
    sections: [{ title: "Améliorations", items: [
      "Objectifs et saisons distingue les missions du jour, la collection et les familles à compléter, avec des accès directs entre les sections.",
      "Les récompenses prêtes sont regroupées en tête. Tout réclamer récupère les missions, les jalons et les paliers de saison en série ; le choix de la série quotidienne reste séparé.",
      "Les saisons disposent de filtres, de pages et du détail de leurs paliers. Tu vois la prochaine étape et ses récompenses, sans dérouler toutes les familles.",
    ] }, { title: "Corrections", items: [
      "Les commandes attendent la fin d’une réclamation pour éviter les doubles clics. Un refus arrête le groupe et le bilan conserve les résultats déjà reçus.",
      "Une famille refusée n’est plus annoncée comme récupérée. Les seuils, les récompenses et les règles du jeu restent identiques.",
    ] }],
  },
  {
    id: "2026-10-14-nouveautes", date: "2026-10-14", title: "Le journal de CreatorDeck est ouvert",
    summary: "Retrouve les changements du jeu et garde une trace de ce que tu as lu.",
    sections: [{ title: "Nouveautés", items: [
      "Le journal Nouveautés est accessible directement dans Toi, sans compte requis.",
      "Un repère sur Toi signale les notes non lues. Consulte une mise à jour, marque-la comme lue ou parcours tout l’historique.",
      "Les notes restent disponibles après leur lecture. Aucune fenêtre ne s’impose au lancement du jeu.",
    ] }, { title: "À savoir", items: ["La lecture est mémorisée sur ce navigateur ou cet appareil. Elle ne change ni ta collection ni ta sauvegarde de jeu."] }],
  },
  {
    id: "2026-10-14-toi", date: "2026-10-14", title: "Ton espace de collectionneur",
    summary: "La vitrine, le parcours et les objectifs trouvent leur place dans Toi.",
    sections: [{ title: "Améliorations", items: [
      "Les cartes de ta vitrine portent leur nom complet. Appuie sur une carte pour consulter les variantes que tu possèdes et leurs quantités.",
      "Ton niveau, ton expérience et ta collection sont visibles, avec un accès direct aux objectifs et au Tribunal.",
      "Compte, réglages et informations sont regroupés dans des sections repliables. Les états de sauvegarde et les erreurs du compte sont plus visibles.",
    ] }, { title: "Corrections", items: ["Une carte épinglée plusieurs fois n’occupe plus plusieurs places dans la vitrine."] }],
  },
  {
    id: "2026-10-14-atelier", date: "2026-10-14", title: "Choisir, confirmer, créer",
    summary: "L’Atelier montre la carte et le coût avant de dépenser.",
    sections: [{ title: "Améliorations", items: [
      "Consulte l’aperçu d’une carte Standard, son coût et ton solde avant de confirmer sa création.",
      "Le recyclage individuel ou groupé demande confirmation et affiche ensuite les points obtenus. Les doublons Live restent exclus du recyclage groupé.",
      "Après une création, retrouve le classeur directement. Après un recyclage, repars choisir une carte.",
    ] }, { title: "Corrections", items: ["Les commandes sont verrouillées pendant la transaction pour éviter les doubles clics. Les refus et les résultats partiels restent visibles.", "Les prix et les règles de protection de la dernière copie n’ont pas changé."] }],
  },
  {
    id: "2026-10-14-binder", date: "2026-10-14", title: "Un classeur à feuilleter",
    summary: "Des pages, des pochettes et une vraie place pour tes variantes.",
    sections: [{ title: "Améliorations", items: [
      "Feuillette les pages de douze cartes avec un geste horizontal, les flèches ou le clavier. Le défilement vertical reste disponible.",
      "Les cartes ont des noms lisibles sous les pochettes et des finitions selon leur rareté et leur variante.",
      "La fiche agrandie permet de consulter les variantes possédées. Les reflets respectent le réglage des effets et la réduction des mouvements.",
    ] }, { title: "Corrections", items: ["Les quantités sont distinguées par variante : les copies Standard ne sont plus attribuées à la variante Gold, par exemple.", "Un geste de feuilletage ne doit pas ouvrir une fiche par erreur."] }],
  },
  {
    id: "2026-10-14-ouverture", date: "2026-10-14", title: "Le rituel du booster",
    summary: "Une ouverture plus continue, du sachet jusqu’aux cinq cartes.",
    sections: [{ title: "Améliorations", items: [
      "Les consignes du geste sont raccourcies : TIRE, puis RELÂCHE. La coupe reste suivie jusqu’au relâchement.",
      "Les cinq dos ont davantage de temps pour se poser avant la révélation. L’impact visuel des cartes rares est renforcé.",
      "Le résumé de fin de booster laisse les cinq cartes visibles avant ton retour au Drop.",
    ] }, { title: "Corrections", items: ["Le bouton Suivant est verrouillé pendant le retournement d’une carte afin d’éviter de passer la suivante par un double appui."] },
      { title: "Encore en amélioration", items: ["Le ressenti de la déchirure reste à affiner. Les contrôles automatiques ne remplacent pas le ressenti au doigt."] }],
  },
  {
    id: "2026-10-14-drop", date: "2026-10-14", title: "Le booster au premier plan",
    summary: "Le Drop met l’objet et l’ouverture au centre de la scène.",
    sections: [{ title: "Améliorations", items: [
      "Le sachet est plus grand sur téléphone, avec des côtés métallisés, un reflet et une ombre au sol plus présents.",
      "Le nom du pack et ses cinq cartes restent visibles. Le tutoriel propose une action ESSAYER, avec les détails rangés dans Plus d’infos.",
      "La scène est moins encombrée : le sachet garde le premier rôle.",
    ] }],
  },
  {
    id: "2026-10-14-audio", date: "2026-10-14", title: "Musique et effets à ton rythme",
    summary: "Deux réglages distincts pour la musique et les sons du jeu.",
    sections: [{ title: "Améliorations", items: [
      "La musique et les effets se règlent séparément dans Toi, puis Réglages et informations.",
      "La musique utilise une piste provisoire plus douce, avec une arrivée progressive et un raccord de boucle adouci. Couper puis réactiver la musique conserve sa position.",
      "Selon ton navigateur, le premier geste dans le jeu peut être nécessaire pour autoriser le démarrage musical.",
    ] }, { title: "Encore en amélioration", items: ["Le choix musical reste provisoire. La sélection définitive est mise de côté pour le moment."] }],
  },
];

export const RELEASE_NOTES_READ_KEY = "creatordeck.release-notes.v1";
export function parseReleaseNoteReadIds(raw: string | null): string[] {
  if (!raw || raw.length > 100_000) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("readIds" in value) || !Array.isArray(value.readIds)) return [];
    return [...new Set(value.readIds.filter((id): id is string => typeof id === "string" && /^[a-z0-9-]{1,100}$/.test(id)))];
  } catch { return []; }
}

/** Pas de solde, d'identité ou de sauvegarde dans ce stockage de lecture. */
export function createReleaseNotesStore() {
  type Snapshot = { readIds: readonly string[]; persisted: boolean };
  const initial: Snapshot = { readIds: [], persisted: true };
  let snapshot = initial;
  let hydrated = false;
  const listeners = new Set<() => void>();
  function readStorage() {
    try { return { readIds: parseReleaseNoteReadIds(window.localStorage.getItem(RELEASE_NOTES_READ_KEY)), persisted: true }; }
    catch { return { readIds: snapshot.readIds, persisted: false }; }
  }
  function publish(next: Snapshot) {
    if (next.persisted === snapshot.persisted && JSON.stringify(next.readIds) === JSON.stringify(snapshot.readIds)) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function storageChanged(event: StorageEvent) {
    if ((event.key === RELEASE_NOTES_READ_KEY || event.key === null) && (!event.storageArea || event.storageArea === window.localStorage)) publish(readStorage());
  }
  function getSnapshot() {
    if (!hydrated && typeof window !== "undefined") { hydrated = true; snapshot = readStorage(); }
    return snapshot;
  }
  function markRead(ids: readonly string[]) {
    const current = getSnapshot();
    // Relire avant écriture pour conserver les lectures d'un autre onglet.
    const stored = readStorage();
    const nextIds = [...new Set([...current.readIds, ...stored.readIds, ...ids.filter((id) => RELEASE_NOTES.some((note) => note.id === id))])];
    let persisted = true;
    try { window.localStorage.setItem(RELEASE_NOTES_READ_KEY, JSON.stringify({ version: 1, readIds: nextIds })); }
    catch { persisted = false; }
    publish({ readIds: nextIds, persisted });
  }
  return {
    getSnapshot, getServerSnapshot: () => initial, markRead,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", storageChanged);
      return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", storageChanged); };
    },
  };
}
