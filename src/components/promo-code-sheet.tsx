"use client";

/**
 * Feuille « J'ai un code » : le code promo donné en stream.
 *
 * Un seul champ, un seul bouton. **Le code n'est pas jugé ici** — ni sa casse,
 * ni sa date, ni ses usages : le serveur seul sait ce qui existe, et un contrôle
 * écrit dans l'application serait un contrôle que n'importe qui pourrait
 * s'accorder.
 *
 * Ce qu'un code donne, c'est **un booster à ouvrir** : la feuille ne l'ouvre
 * pas, elle le range dans la réserve du serveur, et le compteur de l'accueil se
 * met à jour au retour (le magasin relit `pack_status()` après la rédemption).
 *
 * Le refus du serveur s'affiche **tel quel** : ses phrases disent déjà quoi
 * faire (« ta réserve est pleine… ouvre un booster, puis retape ce code »), et
 * c'est exactement ce que le joueur a besoin de lire.
 */
import { useState, type FormEvent } from "react";
import { AlertTriangle, Info, Ticket, X } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore } from "@/lib/cloud/cloud-store";

export function PromoCodeSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ message: string; isError: boolean } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const outcome = await cloudStore.redeemPromoCode(code);
    setResult({ message: outcome.message, isError: outcome.status !== "done" });
    // Un code accepté ne resert jamais : on vide le champ pour éviter de le
    // retaper par habitude et de recevoir « tu as déjà utilisé ce code ».
    if (outcome.status === "done") setCode("");
  }

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="J'ai un code">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>J&apos;ai un code</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Les codes demandent le cloud</strong>
              <span>
                Cette version est hors ligne : un code se vérifie sur le serveur, il n&apos;y a
                personne ici pour le faire.
              </span>
            </div>
          </div>
        ) : !cloud.userId ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Connecte-toi d&apos;abord</strong>
              <span>
                Un code se réclame sur ton compte, une fois par joueur : ouvre « Compte et cloud »,
                connecte-toi, puis reviens ici.
              </span>
            </div>
          </div>
        ) : (
          <form className="account-card" onSubmit={(event) => void submit(event)}>
            <div className="account-head">
              <Ticket size={15} />
              <strong>Un code du stream</strong>
            </div>
            <p className="account-intro">
              Un code donne un booster à ouvrir. Il se tape une fois par joueur — la casse et les
              espaces n&apos;ont pas d&apos;importance.
            </p>
            <label className="account-field">
              <span>Code</span>
              <input
                type="text"
                value={code}
                placeholder="BOOSTER-2026"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="account-button wide"
              disabled={cloud.busy || !code.trim()}
            >
              {cloud.busy ? "Vérification…" : "Valider"}
            </button>
            {result ? (
              <div className={`account-note ${result.isError ? "error" : "ok"}`}>
                {result.isError ? <AlertTriangle size={15} /> : <Ticket size={15} />}
                <div>
                  <span>{result.message}</span>
                </div>
              </div>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
