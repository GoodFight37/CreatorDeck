"use client";

import { useSyncExternalStore } from "react";
import { createReleaseNotesStore, RELEASE_NOTES } from "@/lib/release-notes";

const store = createReleaseNotesStore();
export function useReleaseNotes() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return {
    readIds: state.readIds,
    persisted: state.persisted,
    unreadCount: RELEASE_NOTES.filter((note) => !state.readIds.includes(note.id)).length,
    markRead: (id: string) => store.markRead([id]),
    markAllRead: () => store.markRead(RELEASE_NOTES.map((note) => note.id)),
  };
}
