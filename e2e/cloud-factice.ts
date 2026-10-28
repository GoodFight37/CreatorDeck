/** Configuration Supabase factice des e2e : les RPC sont interceptés, rien ne part vers une vraie base. */
export const E2E_CLOUD_URL = "https://verification-test.supabase.co";
export const E2E_CLOUD_KEY = "placeholder-key-ne-verifie-jamais-rien-000000000000000000000000";

/** Mode cloud simulé : `CREATORDECK_E2E_CLOUD=1`. Sinon les e2e tournent sans cloud, quel que soit `.env.local`. */
export const e2eCloudActive = (): boolean => process.env.CREATORDECK_E2E_CLOUD === "1";
