import { useEffect, useState } from 'react';

// iOS renders a TextInput placeholder with distorted (expanded) letter
// spacing if it's painted while a screen-push transition (or modal
// presentation) is still animating in. Rendering the placeholder blank
// until the transition settles, then swapping in the real text, avoids it.
export function useDelayedPlaceholder(text: string, delay = 350): string {
  const [value, setValue] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setValue(text), delay);
    return () => clearTimeout(id);
  }, [text, delay]);
  return value;
}
