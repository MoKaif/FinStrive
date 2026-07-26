import axios from "axios";

/**
 * Attaches the stored bearer token to every request made to this app's own API.
 *
 * The token used to be pushed onto axios defaults in three places, and two of
 * them were missing it: logging in without reloading the page sent no token at
 * all, and logging out left the previous one attached. That went unnoticed while
 * the pages in use called unprotected endpoints. Reading the token per request
 * keeps a single source of truth — localStorage — so login, logout and reload
 * all behave the same.
 */
const isOwnApi = (url?: string) => {
  if (!url) return true; // relative request against our own origin
  if (url.startsWith("//")) return false;
  if (url.startsWith("/")) return true;
  return url.startsWith(window.location.origin);
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
};
