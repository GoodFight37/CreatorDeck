"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCloud } from "@/hooks/use-cloud";
import { type CloudApi, CloudError } from "@/lib/cloud/api";
import type { ImgflipOpening, ImgflipStatus } from "@/lib/cloud/api/imgflip";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { deviceStorage } from "@/lib/storage";

const PENDING_PREFIX = "creatordeck.imgflip.pending:";
type State = {
  owner: string | null;
  status: ImgflipStatus | null;
  problem: string;
  notice: string;
  phase: "closed" | "prepared" | "opening";
  result: ImgflipOpening | null;
  extracted: boolean;
  left: boolean;
  pending: boolean;
  focus: HTMLElement | null;
};
const empty = (owner: string | null): State => ({
  owner, status: null, problem: "", notice: "", phase: "closed", result: null,
  extracted: false, left: false, pending: false, focus: null,
});
const message = (error: unknown) => error instanceof Error ? error.message : "Les boosters IMGFLIP ne répondent pas. Réessaie.";

/** La présentation ne tire rien. La même requête est reprise après une réponse perdue. */
export function useImgflipBooster() {
  const cloud = useCloud();
  const [state, setState] = useState<State>(() => empty(null));
  const [loading, setLoading] = useState(false);
  const apiRef = useRef<CloudApi | null>(null);
  const revision = useRef(0);
  const pending = useRef(false);
  const statusTicket = useRef(0);

  const refresh = useCallback(async () => {
    const api = apiRef.current;
    const version = revision.current;
    const owner = cloud.userId;
    if (!api || !owner || api.session()?.userId !== owner) return;
    const ticket = ++statusTicket.current;
    setLoading(true);
    setState((value) => ({ ...value, problem: "" }));
    try {
      const status = await api.imgflipStatus();
      if (revision.current === version && statusTicket.current === ticket && cloudStore.getSnapshot().userId === owner) {
        setState((value) => ({ ...value, status, problem: "" }));
      }
    } catch (error) {
      if (revision.current === version && statusTicket.current === ticket) setState((value) => ({ ...value, problem: message(error) }));
    } finally {
      if (revision.current === version && statusTicket.current === ticket) setLoading(false);
    }
  }, [cloud.userId]);

  useEffect(() => {
    const version = ++revision.current;
    apiRef.current = cloud.userId ? cloudStore.getApi() : null;
    pending.current = false;
    queueMicrotask(() => {
      if (revision.current !== version) return;
      setState(empty(cloud.userId));
      setLoading(false);
      void refresh();
    });
    return () => { revision.current = version + 1; apiRef.current = null; };
  }, [cloud.userId, refresh]);

  const current = state.owner === cloud.userId ? state : empty(cloud.userId);
  const status = current.status;
  useEffect(() => {
    if (!status?.nextAt || status.stock >= 4) return;
    const timer = window.setTimeout(() => void refresh(), Math.max(1000, Date.parse(status.nextAt) - Date.now() + 250));
    return () => window.clearTimeout(timer);
  }, [status, refresh]);
  useEffect(() => {
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);

  function prepare() {
    if (!status || status.stock < 1 || pending.current || current.phase !== "closed") return;
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setState((value) => ({ ...value, phase: "prepared", problem: "", notice: "", result: null, extracted: false, left: false, focus }));
  }
  function cancel() {
    if (pending.current) return;
    setState((value) => value.phase === "prepared" ? { ...value, phase: "closed" } : value);
  }
  async function commit() {
    const api = apiRef.current;
    const version = revision.current;
    const owner = cloud.userId;
    if (!api || !owner || current.phase !== "prepared" || pending.current || api.session()?.userId !== owner) return;
    pending.current = true;
    statusTicket.current++;
    setLoading(false);
    setState((value) => ({ ...value, phase: "opening", pending: true, problem: "" }));
    const storage = deviceStorage();
    const key = PENDING_PREFIX + owner;
    try {
      const requestId = storage?.getItem(key) ?? crypto.randomUUID();
      storage?.setItem(key, requestId);
      const [result, { IMGFLIP_BY_ID }] = await Promise.all([
        api.openImgflipPack(requestId),
        import("@/lib/imgflip-booster"),
      ]);
      if (revision.current !== version || cloudStore.getSnapshot().userId !== owner) return;
      if (result.cards.some((id) => !IMGFLIP_BY_ID.has(id))) throw new Error("Une carte du booster manque au catalogue. Recharge la page.");
      // Le résultat du serveur reste utilisable même si la relecture de la collection échoue.
      statusTicket.current++;
      storage?.removeItem(key);
      setState((value) => ({ ...value, result,
        status: value.status ? { ...value.status, stock: result.stock, nextAt: result.nextAt } : null,
        phase: value.left ? "closed" : "opening",
        notice: value.left ? "Booster ouvert : retrouve tes cartes dans le classeur MEMES." : "",
      }));
      await refresh();
    } catch (error) {
      if (revision.current !== version) return;
      if (error instanceof CloudError && error.status >= 400 && error.status < 500) storage?.removeItem(key);
      setState((value) => ({ ...value, phase: "closed", notice: "", problem: message(error) }));
    } finally {
      if (revision.current === version) {
        pending.current = false;
        setState((value) => ({ ...value, pending: false }));
      }
    }
  }
  const copies = useMemo(() => new Map(status?.owned.map((entry) => [entry.id, entry.copies]) ?? []), [status]);

  return {
    status, copies, loading, problem: current.problem, notice: current.notice,
    account: Boolean(cloud.userId), configured: cloud.configured,
    busy: current.pending,
    prepared: current.phase === "prepared",
    presenting: current.phase !== "closed" && !current.left,
    opening: current.result, extracted: current.extracted, returnFocusTo: current.focus,
    prepare, cancel, commit, refresh,
    complete: () => setState((value) => ({ ...value, extracted: true })),
    close: () => setState((value) => ({ ...value, phase: "closed", result: null, extracted: false })),
    leavePending: () => setState((value) => ({ ...value, left: true, phase: "closed",
      notice: value.result
        ? "Booster ouvert : retrouve tes cartes dans le classeur MEMES."
        : "Le tirage continue. Retrouve les cartes dans le classeur MEMES." })),
  };
}
export type ImgflipBooster = ReturnType<typeof useImgflipBooster>;
