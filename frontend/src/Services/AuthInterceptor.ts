import axios from "axios";

/**
 * Attaches the stored bearer token to every request made to this app's own API,
 * and tears the session down as soon as that token stops being accepted.
 *
 * The token used to be pushed onto axios defaults in three places, and two of
 * them were missing it: logging in without reloading the page sent no token at
 * all, and logging out left the previous one attached. Reading the token per
 * request keeps a single source of truth — localStorage — so login, logout and
 * reload all behave the same.
 */
const isOwnApi = (url?: string) => {
  if (!url) return true; // relative request against our own origin
  if (url.startsWith("//")) return false;
  if (url.startsWith("/")) return true;
  return url.startsWith(window.location.origin);
};

// Login and register answer 401 for bad credentials. That is a form error, not
// an expired session, and must not bounce the user to the login page they are
// already looking at.
const isAuthEndpoint = (url?: string) =>
  !!url && /\/api\/account\/(login|register)/i.test(url);

const decodeExpiry = (token: string): number | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    const exp = JSON.parse(json).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
};

/**
 * Tokens last a week. Nothing checked that, so once one lapsed the app still
 * looked signed in — most endpoints carry no [Authorize] attribute and kept
 * answering — and only the holdings API returned 401. Checking on boot turns a
 * confusing partial failure into an ordinary trip to the login page.
 */
export const isTokenExpired = (token: string) => {
  const exp = decodeExpiry(token);
  if (exp === null) return true; // unreadable is a token the API will reject too
  return exp * 1000 <= Date.now();
};

let onSessionExpired: (() => void) | null = null;

export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

export const installAuthInterceptor = () => {
  axios.interceptors.request.use((config) => {
    // Never attach our token to third-party calls; the app also talks to
    // Financial Modeling Prep directly from the browser.
    if (!isOwnApi(config.url)) return config;

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const url = error?.config?.url as string | undefined;
      const status = error?.response?.status;
      if (status === 401 && isOwnApi(url) && !isAuthEndpoint(url)) {
        onSessionExpired?.();
      }
      return Promise.reject(error);
    }
  );
};
