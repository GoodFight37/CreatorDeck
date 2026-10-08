"use client";

import { Check, CloudOff, Upload } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";

/** Pastille d'état affichée dans le profil, sans ouvrir la feuille. */
export function CloudBadge() {
  const cloud = useCloud();
  if (!cloud.configured || !cloud.userId) return <CloudOff size={15} className="muted-icon" />;
  return cloud.pending ? <Upload size={15} className="pending-icon" /> : <Check size={15} className="success-icon" />;
}
