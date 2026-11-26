/* GTM to PDF — app configuration.
 *
 * firebase.apiKey / projectId: the PUBLIC web configuration of your Firebase
 *   project (Firebase console → Project settings → Your apps → Web app).
 *   It is not a secret: every app that uses Firebase ships it. Security comes
 *   from Firebase's server-side checks. While apiKey is empty, login is off
 *   and the app works exactly as before.
 *
 * remoteConfig: rules are read from Firebase Remote Config (Firebase console →
 *   Remote Config), at every start and every few hours, so rules changed
 *   there also apply to apps that are already installed. Parameters:
 *     minVersion, latestVersion, updateUrl, requireLogin, requireVerifiedEmail, message
 * remoteConfigUrl: alternative — a JSON file hosted online with the same fields:
 *     { "minVersion": "1.1", "latestVersion": "1.1", "updateUrl": "https://…",
 *       "requireLogin": true, "requireVerifiedEmail": true, "message": "" }
 */
const GTM_CONFIG = {
  version: "1.1",
  firebase: { apiKey: "AIzaSyA9fqbbGjaa6GbFoVFo9CdOyto_mJYWpyo", projectId: "gtm-to-pdf", appId: "1:630428625755:web:8e7242903f0699e32e087e" },
  appUrl: "https://bm7770.github.io/GTM-to-PDF/GTM-to-PDF.apk", // "Download the app" link (the update link set in Firebase takes priority)
  remoteConfig: true, // rules come from Firebase Remote Config (editable in the Firebase console)
  remoteConfigUrl: "",
  emulator: "", // development only (Firebase Auth emulator); must stay empty in releases
};
