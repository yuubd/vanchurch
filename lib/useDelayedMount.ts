import { useEffect, useState } from 'react';

// On a stack-push navigation (unlike a Modal's onShow, which fires only after
// its presentation animation fully completes), the destination screen's real
// native views are live and rendering *during* the slide transition. A
// TextInput mounted at that moment can get its placeholder laid out with
// distorted (expanded) letter spacing on iOS, and simply changing the
// placeholder string afterwards isn't enough to undo it — the underlying
// UITextField was already initialized mid-animation.
//
// The reliable fix is to not create the TextInput at all until the
// transition has settled. This hook returns `false` for `delay` ms after
// mount; render a plain placeholder-shaped box while it's false, and swap in
// the real TextInput once it flips to true.
export function useDelayedMount(delay = 400): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return ready;
}
