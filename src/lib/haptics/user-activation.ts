/**
 * Chrome blocks navigator.vibrate until the user has tapped the page and logs
 * a console error for every blocked call ("Blocked call to navigator.vibrate
 * because user hasn't tapped…"). Games that buzz on a timer or on load
 * (viking-longship logged 19 of these before the first tap) filled the console.
 * Skip the call until the page has had a user gesture. Browsers without the
 * UserActivation API keep the old behaviour.
 */
export function vibrationAllowed(nav: Navigator | undefined = typeof navigator === "undefined" ? undefined : navigator): boolean {
  if (!nav || typeof nav.vibrate !== "function") return false;
  const activation = (nav as Navigator & { userActivation?: { hasBeenActive?: boolean } }).userActivation;
  if (activation && activation.hasBeenActive === false) return false;
  return true;
}
