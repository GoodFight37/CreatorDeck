// Next.js l'exécute côté navigateur avant l'hydratation. Aucun appel réseau.
import { startLocalDiagnostics } from "./lib/local-diagnostics";

try { startLocalDiagnostics(); }
catch { /* Le diagnostic facultatif ne peut pas empêcher le démarrage. */ }
