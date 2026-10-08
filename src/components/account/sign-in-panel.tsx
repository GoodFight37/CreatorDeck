"use client";

import { useState } from "react";
import { Check, KeyRound, Mail, Radio, UserPlus } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { oauthRedirectUrl } from "@/lib/cloud/twitch";
import { isNativeApp } from "@/lib/cloud/transport";
import { emailProblem } from "@/lib/cloud/credentials";

/**
 * Créer un compte, ou en retrouver un — l'écran qu'on voit quand on n'est pas
 * connecté : Twitch en un appui, un compte invité sans e-mail, puis deux replis
 * (mot de passe, ou code reçu par e-mail quand un SMTP est configuré).
 *
 * Rien n'est envoyé tant que le joueur n'a pas fait ce choix, et charger le
 * cloud demande deux appuis (le bouton se transforme en confirmation) : c'est la
 * seule action qui peut remplacer une partie locale.
 */
export function SignInPanel() {
  const cloud = useCloud();
  const [email, setEmail] = useState(cloud.email ?? "");
  const [code, setCode] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  /**
   * Ouvre le dialogue Twitch.
   *
   * L'adresse de retour dépend de l'endroit où tourne le jeu (page du site, ou
   * schéma de l'application Android) : c'est Supabase qui la reçoit, puis qui
   * renvoie le joueur dessus. La navigation se fait ici et non dans le store —
   * le store n'a pas le droit de connaître le navigateur, c'est ce qui le rend
   * testable sans DOM.
   */
  async function signInWithTwitch(): Promise<void> {
    const native = await isNativeApp();
    const url = cloudStore.twitchSignInUrl(oauthRedirectUrl(window.location, native));
    if (url) window.location.assign(url);
  }

  return (
          <section className="account-card">
            <p className="account-intro">
              Un compte sert à sauvegarder ta collection et à figurer au classement. La partie reste jouable sans
              compte : tout est local, comme aujourd&apos;hui.
            </p>
            <button type="button" className="account-button wide" disabled={cloud.busy} onClick={() => void signInWithTwitch()}>
              <Radio size={14} /> Continuer avec Twitch
            </button>
            <p className="account-hint">
              Un appui, aucun mot de passe : le navigateur te demande d&apos;autoriser CreatorDeck, puis tu
              reviens ici, connecté. Twitch ne reçoit que ton identité et ton adresse — rien de ta collection.
            </p>
            <button type="button" className="account-button wide ghost" disabled={cloud.busy} onClick={() => void cloudStore.signInAsGuest()}>
              <UserPlus size={14} /> Créer un compte invité (sans e-mail)
            </button>
            <p className="account-hint">
              Le plus rapide : aucun e-mail à confirmer, rien à recopier. Le compte vit avec la session de cet
              appareil — une fois créé, attache-lui une adresse et un mot de passe (« Garder ce compte ») pour
              pouvoir le retrouver ailleurs.
            </p>

            <details className="account-details">
              <summary>
                <KeyRound size={12} /> Se connecter avec un e-mail et un mot de passe
              </summary>
              <p className="account-hint">
                Le chemin pour retrouver une collection sur un autre appareil : <b>aucun e-mail n&apos;est
                envoyé</b>. Il faut que le mot de passe ait été attaché au compte depuis l&apos;appareil
                d&apos;origine (Compte → « Garder ce compte »).
              </p>
              <label className="account-field">
                <span>Adresse e-mail</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="toi@exemple.fr"
                  value={signInEmail}
                  onChange={(event) => setSignInEmail(event.target.value)}
                />
              </label>
              <label className="account-field">
                <span>Mot de passe</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Ton mot de passe"
                  value={signInPassword}
                  onChange={(event) => setSignInPassword(event.target.value)}
                />
              </label>
              <div className="account-actions">
                <button
                  type="button"
                  className="account-button wide"
                  disabled={cloud.busy || Boolean(emailProblem(signInEmail)) || !signInPassword}
                  onClick={() =>
                    void cloudStore.signInWithPassword(signInEmail, signInPassword).then((ok) => {
                      if (ok) {
                        setSignInPassword("");
                        setSignInEmail("");
                      }
                    })
                  }
                >
                  <KeyRound size={14} /> Se connecter
                </button>
              </div>
            </details>

            <details className="account-details">
              <summary>Ou recevoir un code par e-mail</summary>
              <p className="account-hint">
                Le code part vers l&apos;adresse que tu indiques, et il se recopie ici. S&apos;il
                n&apos;arrive pas, choisis plutôt un mot de passe : ça marche tout de suite.
              </p>
              <label className="account-field">
                <span>Adresse e-mail</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="toi@exemple.fr"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="account-button wide"
                disabled={cloud.busy || !email.includes("@")}
                onClick={() => void cloudStore.requestCode(email.trim())}
              >
                <Mail size={14} /> Recevoir un code
              </button>
              <label className="account-field">
                <span>Code à 6 chiffres</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                />
              </label>
              <button
                type="button"
                className="account-button wide"
                disabled={cloud.busy || code.length < 6}
                onClick={() => void cloudStore.verifyCode(email.trim(), code)}
              >
                <Check size={14} /> Valider le code
              </button>
            </details>
          </section>
  );
}
