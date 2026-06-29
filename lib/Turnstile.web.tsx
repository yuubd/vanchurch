import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

const TURNSTILE_SITE_KEY = '0x4AAAAAADnapb_zU7u6dVfW';

declare global {
  interface Window { turnstile: any; }
}

export type TurnstileRef = { reset: () => void };

type Props = {
  onToken: (token: string) => void;
  onError: () => void;
};

const Turnstile = forwardRef<TurnstileRef, Props>(function Turnstile({ onToken, onError }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
      }
    },
  }));

  useEffect(() => {
    if (!document.getElementById('cf-turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      document.head.appendChild(script);
    }

    const interval = setInterval(() => {
      if (window.turnstile && containerRef.current && !widgetId.current) {
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          'error-callback': () => onErrorRef.current(),
          'refresh-expired': 'auto',
        });
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }} />;
});

export default Turnstile;
