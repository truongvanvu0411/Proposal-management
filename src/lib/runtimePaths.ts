type LocationLike = {
  hostname: string;
};

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isLocalApiUrl(url: string) {
  try {
    const parsed = new URL(url, 'http://placeholder.local');
    return isLocalHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveApiBaseUrl(locationLike?: LocationLike, envApiBaseUrl?: string) {
  if (locationLike && isLocalHost(locationLike.hostname)) {
    return '/api';
  }

  if (envApiBaseUrl && !isLocalApiUrl(envApiBaseUrl)) {
    return envApiBaseUrl;
  }

  return '/api';
}

export function resolveManualUrl() {
  return '/manual.html';
}
