// Host preferences remembered across games. localStorage can throw or be
// unavailable (private windows, blocked storage), so never let it break the UI.
const SHOW_ROUND_INDICATOR_KEY = "showRoundIndicator";

export function getShowRoundIndicatorPreference(): boolean {
  try {
    return localStorage.getItem(SHOW_ROUND_INDICATOR_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setShowRoundIndicatorPreference(show: boolean) {
  try {
    localStorage.setItem(SHOW_ROUND_INDICATOR_KEY, String(show));
  } catch {
    // Ignore: the preference just won't be remembered.
  }
}

const SHOW_RUNNING_TOTALS_KEY = "showRunningTotals";

export function getShowRunningTotalsPreference(): boolean {
  try {
    return localStorage.getItem(SHOW_RUNNING_TOTALS_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setShowRunningTotalsPreference(show: boolean) {
  try {
    localStorage.setItem(SHOW_RUNNING_TOTALS_KEY, String(show));
  } catch {
    // Ignore: the preference just won't be remembered.
  }
}
