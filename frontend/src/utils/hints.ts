import { useSyncExternalStore } from "react";

// First-run hints that help new players recognise themselves and find the
// rename button. Everything lives in localStorage, which can throw or be
// unavailable, so fall back to memory for the current session.
const PREFIX = "frumbers:hint:";
type Flag = "guessed" | "youSeen" | "renameSeen";

const memory = new Set<Flag>();
const listeners = new Set<() => void>();

function read(flag: Flag): boolean {
  try {
    return localStorage.getItem(PREFIX + flag) === "1";
  } catch {
    return memory.has(flag);
  }
}

function write(flag: Flag) {
  memory.add(flag);
  try {
    localStorage.setItem(PREFIX + flag, "1");
  } catch {
    // Ignore: the flag just lasts for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useFlag(flag: Flag) {
  return useSyncExternalStore(subscribe, () => read(flag));
}

/** Call whenever the player submits a guess. */
export function markGuessMade() {
  write("guessed");
}

/** "That's you!" bubble next to the player's own guess. */
export function useYouHint() {
  const guessed = useFlag("guessed");
  const seen = useFlag("youSeen");
  return { show: guessed && !seen, dismiss: () => write("youSeen") };
}

/** "You can change your name here" bubble next to the profile button. */
export function useRenameHint() {
  const guessed = useFlag("guessed");
  const seen = useFlag("renameSeen");
  return { show: guessed && !seen, dismiss: () => write("renameSeen") };
}
