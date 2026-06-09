const backendRouteMap: Record<string, string> = {
  "/api/ai/intel": "/ai/intel",
  "/api/google/send": "/mail/send",
  "/api/mail/status": "/mail/status",
  "/api/messages/tailor": "/messages/tailor",
};

export function apiFetch(path: string, init?: RequestInit) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
  const mappedPath = backendRouteMap[path];

  if (!backendUrl || !mappedPath) {
    return fetch(path, init);
  }

  return fetch(`${backendUrl}${mappedPath}`, init);
}
