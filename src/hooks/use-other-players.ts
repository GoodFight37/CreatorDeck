"use client";

import { useEffect, useState } from "react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore } from "@/lib/cloud/cloud-store";

/** Une lecture globale ; un classement filtré vide ne prouve pas la solitude. */
export function useOtherPlayers(): boolean | null {
  const cloud = useCloud();
  const [result, setResult] = useState<{ userId: string; others: boolean | null } | null>(null);
  const userId = cloud.userId;
  useEffect(() => {
    if (!cloud.configured || !userId) return;
    let current = true;
    void cloudStore.hasOtherPlayers().then((others) => {
      if (current) setResult({ userId, others });
    });
    return () => { current = false; };
  }, [cloud.configured, userId]);
  if (!cloud.configured || !userId) return false;
  return result?.userId === userId ? result.others : null;
}
