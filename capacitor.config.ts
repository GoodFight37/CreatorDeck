import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.creatordeck.app",
  appName: "CreatorDeck",
  // Sortie de `next build` (output: "export"). Lancer `npm run android:sync`
  // pour régénérer `out/` puis le copier dans android/app/src/main/assets/public.
  webDir: "out",
  plugins: {
    // Client HTTP natif : indispensable au cloud dans l'APK.
    //
    // Le WebView sert l'app depuis `https://localhost` et envoie donc
    // `Origin: https://localhost`. Certains projets Supabase refusent ce
    // preflight CORS — le `fetch` échoue alors comme une panne réseau
    // (« Réseau injoignable ») alors que le même appel marche dans Chrome.
    // Ce réglage fait passer fetch/XHR par les bibliothèques Android : plus de
    // CORS du tout, et les appels partent directement (le HTTPS reste vérifié).
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    // L'app n'affiche aucun contenu distant : tout vient du paquet local.
    allowMixedContent: false,
  },
};

export default config;
