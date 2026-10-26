import { useSyncExternalStore } from "react";
import { getSyncState, subscribeSync } from "../data/syncStatus";

export const useSyncStatus = () => useSyncExternalStore(subscribeSync, getSyncState);
