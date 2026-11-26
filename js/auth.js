/* GTM to PDF — accounts (Firebase Authentication, REST API).
 * Passwords are never stored by the app: Firebase checks them on its servers
 * and returns short-lived tokens. Only the session tokens are kept on the
 * device so the user stays signed in (also offline). */
const GTMAuth = (() => {
  const C = GTM_CONFIG, KEY = "gtm_auth";
  const configured = !!(C.firebase && C.firebase.apiKey);
  const base = C.emulator ? C.emulator.replace(/\/$/, "") + "/" : "https://";
  const ID = base + "identitytoolkit.googleapis.com/v1/accounts:";
  const TOKEN = base + "securetoken.googleapis.com/v1/token";
  let session = null;

  const save = () => { try { session ? localStorage.setItem(KEY, JSON.stringify(session)) : localStorage.removeItem(KEY) } catch (e) { } };
  const load = () => { try { session = JSON.parse(localStorage.getItem(KEY) || "null") } catch (e) { session = null } };

  class AuthError extends Error { constructor(code) { super(code); this.code = code } }
  async function call(url, body, form) {
    let r;
    try {
      r = await fetch(url + (url.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(C.firebase.apiKey), {
        method: "POST",
        headers: { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" },
        body: form ? new URLSearchParams(body).toString() : JSON.stringify(body),
      });
    } catch (e) { throw new AuthError("NETWORK") }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new AuthError(((j.error && j.error.message) || "UNKNOWN").split(/[ :]/)[0]);
    return j;
  }
  function setFrom(j, extra = {}) {
    session = {
      uid: j.localId || j.user_id || (session && session.uid), email: j.email || (session && session.email),
      idToken: j.idToken || j.id_token, refreshToken: j.refreshToken || j.refresh_token,
      expiresAt: Date.now() + (Number(j.expiresIn || j.expires_in || 3600) - 60) * 1000,
      emailVerified: session ? !!session.emailVerified : false, ...extra,
    };
    save();
  }

  /** Valid ID token (refreshed when expired). Throws NETWORK when offline. */
  async function token() {
    if (!session) throw new AuthError("NO_SESSION");
    if (Date.now() < session.expiresAt) return session.idToken;
    const j = await call(TOKEN, { grant_type: "refresh_token", refresh_token: session.refreshToken }, true);
    setFrom(j); return session.idToken;
  }
  /** Reloads the account from the server (email verified? still exists?). */
  async function reload() {
    const j = await call(ID + "lookup", { idToken: await token() });
    const u = (j.users || [])[0]; if (!u) throw new AuthError("USER_NOT_FOUND");
    session.emailVerified = !!u.emailVerified; session.email = u.email; save();
    return user();
  }
  async function signUp(email, password) {
    const j = await call(ID + "signUp", { email, password, returnSecureToken: true });
    setFrom(j, { emailVerified: false });
    try { await call(ID + "sendOobCode", { requestType: "VERIFY_EMAIL", idToken: session.idToken }) } catch (e) { }
    return user();
  }
  async function signIn(email, password) {
    const j = await call(ID + "signInWithPassword", { email, password, returnSecureToken: true });
    setFrom(j, { emailVerified: false });
    try { await reload() } catch (e) { }
    return user();
  }
  const resetPassword = email => call(ID + "sendOobCode", { requestType: "PASSWORD_RESET", email });
  async function resendVerification() { return call(ID + "sendOobCode", { requestType: "VERIFY_EMAIL", idToken: await token() }) }
  function signOut() { session = null; save() }
  /** Deletes the account on the server (asks for the password again first). */
  async function deleteAccount(password) {
    await signIn(session.email, password);
    await call(ID + "delete", { idToken: await token() });
    signOut();
  }
  /** On start: keep the session; if the server says the account is gone, sign out. Offline = keep. */
  async function init() {
    load();
    if (!configured || !session) return user();
    try { await reload() }
    catch (e) { if (["USER_NOT_FOUND", "USER_DISABLED", "TOKEN_EXPIRED", "INVALID_REFRESH_TOKEN", "INVALID_ID_TOKEN"].includes(e.code)) signOut() }
    return user();
  }
  const user = () => session ? { uid: session.uid, email: session.email, emailVerified: !!session.emailVerified } : null;

  return { configured, init, user, token, reload, signUp, signIn, signOut, resetPassword, resendVerification, deleteAccount, AuthError };
})();
