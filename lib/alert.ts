import { Alert, Platform } from 'react-native';

type AlertButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };

// react-native-web's Alert.alert() is a no-op (see node_modules/react-native-web/src/exports/Alert),
// so every confirm/error dialog in the app silently did nothing on web. Fall back to
// window.confirm/alert there instead.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  if (window.confirm(text)) {
    const confirmBtn = buttons.find(b => b.style !== 'cancel') ?? buttons[buttons.length - 1];
    confirmBtn.onPress?.();
  } else {
    buttons.find(b => b.style === 'cancel')?.onPress?.();
  }
}
