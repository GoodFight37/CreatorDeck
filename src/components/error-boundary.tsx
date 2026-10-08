"use client";

/**
 * Le filet de sécurité : ce qui s'affiche quand un écran plante.
 *
 * Sans lui, une exception dans **un** composant fait tomber tout l'arbre React :
 * l'application se retrouve sur un écran blanc, sans message, sans bouton, et
 * sans autre recours que de tuer l'app — sur un téléphone, c'est un cul-de-sac.
 * Avec lui, le joueur lit ce qui s'est passé, peut relancer, et peut copier le
 * détail pour le transmettre.
 *
 * Ce qui est écrit est choisi : d'abord **la partie n'a pas bougé** (c'est la
 * première inquiétude, et c'est vrai — la sauvegarde vit dans le stockage de
 * l'appareil, le cloud garde sa copie), ensuite le geste à faire, et seulement
 * en dernier le message technique, en petit.
 *
 * Il vit en haut de l'arbre (la page du jeu et celle de l'overlay 16:9), et il
 * n'ajoute **aucun** élément au DOM tant que tout va bien.
 *
 * Deux habillages : le jeu dit les choses en clair et propose les gestes ;
 * l'overlay (`discret`) se contente d'une ligne sobre — il est projeté **devant
 * le public**, et la panne doit se voir dans OBS, pas sur le stream.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

/** Ce qu'on garde d'une panne : de quoi la reconnaître et la transmettre. */
type Panne = {
  message: string;
  /** Pile de l'erreur + chemin des composants traversés, pour l'envoi. */
  detail: string;
};

type Etat = { panne: Panne | null; copie: boolean };

/** Le message d'une panne, quel que soit ce qui a été jeté. */
function messageDe(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Erreur inconnue";
}

export class ErrorBoundary extends Component<
  { children: ReactNode; /** Habillage sobre, pour une page projetée en direct. */ discret?: boolean },
  Etat
> {
  state: Etat = { panne: null, copie: false };

  /** Appelé par React dès qu'un enfant jette : on bascule sur le filet. */
  static getDerivedStateFromError(error: unknown): Etat {
    return { panne: { message: messageDe(error), detail: "" }, copie: false };
  }

  /**
   * Le détail arrive ici, et pas dans `getDerivedStateFromError` : React n'y
   * donne que l'erreur, alors que le **chemin des composants** (quel écran,
   * quel composant, dans quel ordre) vient de `ErrorInfo`. C'est exactement ce
   * qu'il faut pour retrouver la ligne fautive.
   */
  componentDidCatch(error: unknown, info: ErrorInfo) {
    const stack = error instanceof Error && error.stack ? error.stack : "";
    this.setState({
      panne: {
        message: messageDe(error),
        detail: [stack, info.componentStack].filter(Boolean).join("\n\n"),
      },
      copie: false,
    });
  }

  /**
   * Le détail dans le presse-papiers, pour qu'il puisse être transmis tel quel.
   * Si le presse-papiers refuse (contexte non sécurisé), le message reste à
   * l'écran : une capture d'écran suffit.
   */
  private copier = () => {
    const texte = `${this.state.panne?.message ?? ""}\n\n${this.state.panne?.detail ?? ""}`;
    void navigator.clipboard
      ?.writeText(texte)
      .then(() => this.setState({ copie: true }))
      .catch(() => {});
  };

  render() {
    const panne = this.state.panne;
    if (!panne) return this.props.children;

    if (this.props.discret) {
      return (
        <div className="panne panne-quiete" role="alert">
          <p>Une erreur est survenue — l&apos;overlay est à relancer.</p>
          <code>{panne.message}</code>
        </div>
      );
    }

    return (
      <div className="panne" role="alert">
        <h1>L&apos;écran a planté</h1>
        <p className="panne-rassurance">
          Ta partie n&apos;a pas bougé : les cartes enregistrées sur le téléphone et la copie du
          cloud sont intactes.
        </p>
        <div className="panne-actions">
          <button type="button" className="account-button" onClick={() => window.location.reload()}>
            Relancer
          </button>
          <button type="button" className="account-button ghost" onClick={this.copier}>
            {this.state.copie ? "Détail copié" : "Copier le détail"}
          </button>
        </div>
        <p className="panne-detail">
          <code>{panne.message}</code>
        </p>
      </div>
    );
  }
}
