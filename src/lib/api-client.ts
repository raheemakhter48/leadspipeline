const backendRouteMap: Record<string, string> = {};

const DEFAULT_BACKEND_URL = "http://92.4.71.166:7860";

export function apiFetch(path: string, init?: RequestInit) {
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
  const mappedPath = backendRouteMap[path];

  if (!mappedPath) {
    console.info("[apiFetch] local", { path });
    return fetch(path, init);
  }

  const url = `${backendUrl}${mappedPath}`;
  console.info("[apiFetch] backend", { path, url });
  return fetch(url, init);
}
