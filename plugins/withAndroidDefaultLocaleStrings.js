const { withStringsXml, AndroidConfig } = require('@expo/config-plugins');

/**
 * app.json's `locales` field (used to localize the iOS home-screen name via
 * CFBundleDisplayName) gets copied verbatim by Expo's Android `withLocales`
 * plugin into per-locale strings.xml files (values-b+en, values-b+ko, ...),
 * even though Android's app label doesn't read that key at all.
 *
 * Because those locale-qualified files then have a `CFBundleDisplayName`
 * string with no counterpart in the default (unqualified) strings.xml,
 * Android's release lint flags it as a fatal "ExtraTranslation" error and
 * fails `lintVitalRelease` in production builds.
 *
 * Fix: add a default-locale fallback for that same key. It has no effect on
 * the actual Android app label (still controlled by `app_name`) — it only
 * satisfies lint's "every translated string needs a default" rule.
 */
module.exports = function withAndroidDefaultLocaleStrings(config) {
  return withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: 'CFBundleDisplayName' }, _: config.name ?? 'PrayerRoom' }],
      config.modResults
    );
    return config;
  });
};
