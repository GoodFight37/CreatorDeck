export async function waitForAndroidApp({ probe, timeoutMs = 60_000, intervalMs = 1_000,
  now = () => Date.now(), sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) }) {
  const startedAt = now();
  let lastDetail = "Aucun état applicatif obtenu.";
  while (now() - startedAt <= timeoutMs) {
    try {
      const result = await probe();
      lastDetail = String(result?.detail ?? lastDetail).slice(0, 300);
      if (result?.ready) return { ready: true, elapsedMs: now() - startedAt, lastDetail, value: result.value };
    } catch (error) {
      lastDetail = String(error?.message ?? error).slice(0, 300);
    }
    await sleep(intervalMs);
  }
  return { ready: false, elapsedMs: now() - startedAt, lastDetail };
}
