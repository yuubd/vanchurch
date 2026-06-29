import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

// Replace with your Cloudflare Turnstile site key after creating a site at
// dash.cloudflare.com -> Turnstile -> Add site
// Use widget mode "Invisible" so users never see a challenge UI
const TURNSTILE_SITE_KEY = '0x4AAAAAADnapb_zU7u6dVfW';

const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body style="margin:0;background:transparent;">
  <div class="cf-turnstile"
    data-sitekey="${TURNSTILE_SITE_KEY}"
    data-callback="onSuccess"
    data-error-callback="onError">
  </div>
  <script>
    function onSuccess(token) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ token }));
    }
    function onError() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ error: 'captcha_failed' }));
    }
  </script>
</body>
</html>
`;

export type TurnstileRef = { reset: () => void };

type Props = {
  onToken: (token: string) => void;
  onError: () => void;
};

const Turnstile = forwardRef<TurnstileRef, Props>(function Turnstile({ onToken, onError }, ref) {
  const webviewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    reset() {
      // Reload the WebView to get a fresh Turnstile token
      webviewRef.current?.reload();
    },
  }));

  function handleMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.token) onToken(data.token);
      else onError();
    } catch {
      onError();
    }
  }

  return (
    <WebView
      ref={webviewRef}
      source={{ html: HTML, baseUrl: 'https://vanchurch.vercel.app' }}
      style={styles.webview}
      onMessage={handleMessage}
      javaScriptEnabled
      originWhitelist={['*']}
    />
  );
});

export default Turnstile;

const styles = StyleSheet.create({
  webview: { position: 'absolute', width: 300, height: 65, left: -9999, top: -9999 },
});
