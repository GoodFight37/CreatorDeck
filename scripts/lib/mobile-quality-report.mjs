function cleanOutput(value) {
  return String(value ?? "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [masqué]")
    .replace(/\b((?:[A-Z_]*KEY|[A-Z_]*TOKEN|[A-Z_]*SECRET|[A-Z_]*PASSWORD)\s*[=:]\s*)[^\s"']+/gi, "$1[masqué]")
    .split(/\r?\n/).slice(-30).join("\n").slice(-6000)
    .replace(/```/g, "''' ");
}

export function summarizePlaywright(report) {
  const totals = { passed: 0, failed: 0, details: [] };
  function visit(suite) {
    for (const spec of suite.specs ?? []) for (const item of spec.tests ?? []) {
      const result = item.results?.at(-1);
      if (!result || result.status === "skipped") continue;
      if (result.status === "passed") totals.passed++;
      else {
        totals.failed++;
        totals.details.push(`${spec.title} : ${cleanOutput(result.error?.message ?? result.status).slice(0, 500)}`);
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
  return totals;
}

export function buildSummary(input) {
  const stages = input.stages.map((stage) => ({ ...stage, output: cleanOutput(stage.output) }));
  return { ...input, ok: stages.every((stage) => stage.exitCode === 0), stages };
}

export function renderSummary(summary) {
  const lines = [
    `# Qualité mobile — ${summary.ok ? "réussie" : "échec"}`,
    "",
    `SHA : \`${summary.sha}\` · Mode : ${summary.mode} · Début : ${summary.startedAt}`,
    "",
    ...summary.stages.map((stage) => `- ${stage.exitCode === 0 ? "OK" : "ÉCHEC"} · \`${stage.command}\` · ${(stage.durationMs / 1000).toFixed(1)} s${stage.tests ? ` · ${stage.tests.passed} réussis, ${stage.tests.failed} échoués` : ""}`),
  ];
  if (summary.ok) lines.push("", "Aucune intervention nécessaire.");
  if (summary.captures?.length) {
    lines.push("", "Captures conservées :", "", ...summary.captures.map((file) => `- [${file.split("/").at(-1).replace(/\.png$/, "")}](${file})`));
  }
  if (summary.metricsFile) lines.push("", `[Mesures des images et interactions](${summary.metricsFile})`);
  for (const stage of summary.stages.filter((item) => item.exitCode !== 0)) {
    lines.push("", `## ${stage.name}`, "", "```text", stage.output || "Aucune sortie disponible.", "```");
  }
  return `${lines.join("\n")}\n`;
}
