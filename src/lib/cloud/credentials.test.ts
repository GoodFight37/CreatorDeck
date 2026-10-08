import { describe, expect, it } from "vitest";
import { PASSWORD_MAX, PASSWORD_MIN, PASSWORD_WARNING, emailProblem, passwordProblem } from "@/lib/cloud/credentials";

describe("règles de saisie d'un compte", () => {
  it("accepte une adresse plausible et recadre les fautes de frappe", () => {
    expect(emailProblem("joueur@exemple.fr")).toBeNull();
    expect(emailProblem("  joueur@exemple.fr  ")).toBeNull();
    expect(emailProblem("joueur+creator@exemple.co.uk")).toBeNull();
    expect(emailProblem("")).toMatch(/manquante/);
    expect(emailProblem("joueur.exemple.fr")).toMatch(/incomplète/);
    expect(emailProblem("joueur@exemple")).toMatch(/incomplète/);
    expect(emailProblem("joueur@@exemple.fr")).toMatch(/incomplète/);
    expect(emailProblem(`${"a".repeat(250)}@exemple.fr`)).toMatch(/trop longue/);
  });

  it("exige un mot de passe court mais pas dérisoire", () => {
    expect(passwordProblem("azerty1234")).toBeNull();
    expect(passwordProblem("a".repeat(PASSWORD_MAX))).toBeNull();
    expect(passwordProblem("")).toMatch(/manquant/);
    expect(passwordProblem("a".repeat(PASSWORD_MIN - 1))).toMatch(/trop court/);
    expect(passwordProblem("a".repeat(PASSWORD_MAX + 1))).toMatch(/trop long/);
    expect(passwordProblem(" ".repeat(PASSWORD_MIN))).toMatch(/espaces/);
  });

  it("prévient que le mot de passe n'est pas récupérable", () => {
    // Le joueur doit le lire AVANT de choisir, pas le découvrir trop tard — et
    // la phrase ne lui explique pas la mécanique d'envoi : elle dit la limite.
    expect(PASSWORD_WARNING).toMatch(/récupéré/i);
    expect(PASSWORD_WARNING).toMatch(/note/i);
    for (const mot of ["SMTP", "Supabase", "cloud", "serveur"]) {
      expect(PASSWORD_WARNING).not.toContain(mot);
    }
  });
});
