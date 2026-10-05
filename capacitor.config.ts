import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.monnom.monapp",
  appName: "CreatorDeck",
  // Sortie de `next build` (output: "export"). Lancer `npm run android:sync`
  // pour régénérer `out/` puis le copier dans android/app/src/main/assets/public.
  webDir: "out",
  android: {
    // L'app est 100 % hors ligne : aucun contenu distant, donc aucun contenu mixte.
    allowMixedContent: false,
  },
};

export default config;
