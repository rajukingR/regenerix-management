export const TOKEN = 'rgx_token';

export const BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5000'
    : '')
).replace(/\/+$/, '');

/**
 * Normalize API paths.
 *
 * BASE=http://localhost:5000
 * /auth/login     -> http://localhost:5000/api/auth/login
 * /api/auth/login -> http://localhost:5000/api/auth/login
 *
 * BASE=http://localhost:5000/api
 * /auth/login     -> http://localhost:5000/api/auth/login
 * /api/auth/login -> http://localhost:5000/api/auth/login
 */
const normalizeApiPath = (path) => {
  let cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;

  if (/\/api$/i.test(BASE)) {
    cleanPath = cleanPath.replace(/^\/api(?=\/|$)/i, '');
  }

  return cleanPath || '/';
};

/**
 * Generate API URLs.
 */
export const apiUrl = (path) => {
  const cleanPath = normalizeApiPath(path);

  if (/\/api$/i.test(BASE)) {
    return `${BASE}${cleanPath}`;
  }

  return `${BASE}/api${cleanPath}`;
};

/**
 * Generate media URLs.
 */
export const fileUrl = (path) => {
  if (!path) return '';

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (/^\/?uploads\//i.test(path)) {
    const uploadPath = `/${path.replace(/^\/+/, '')}`;

    if (import.meta.env.DEV) {
      const backendBase = BASE.replace(/\/api$/i, '');

      return `${backendBase}${uploadPath}`;
    }

    if (!BASE || BASE.startsWith('/')) {
      return uploadPath;
    }

    return `${BASE}${uploadPath}`;
  }

  return path;
};

/**
 * Common API request handler.
 */
export async function api(
  path,
  { method = 'GET', body, form, ...options } = {}
) {
  const headers = {
    ...(options.headers || {}),
  };

  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(TOKEN)
      : null;

  if (token) {
    headers.Authorization =
      headers.Authorization ||
      headers.authorization ||
      `Bearer ${token}`;
  }

  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const requestBody =
    form ||
    (body !== undefined && body !== null
      ? JSON.stringify(body)
      : undefined);

  const res = await fetch(apiUrl(path), {
    ...options,
    method,
    headers,
    body: requestBody,
  });

  const data = await res.json().catch(() => ({}));

  if (
    res.status === 401 &&
    !String(path).startsWith('/auth/login')
  ) {
    localStorage.removeItem(TOKEN);
    window.location.href = '/admin/login';
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

/**
 * Open an application resume.
 */
export async function openResume(id) {
  const res = await fetch(
    apiUrl(`/admin/applications/${id}/resume`),
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(TOKEN)}`,
      },
    }
  );

  if (!res.ok) {
    alert('Could not open the resume');
    return;
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  window.open(objectUrl, '_blank');

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

/**
 * Upload files with progress reporting.
 */
export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();

    x.open('POST', apiUrl('/admin/media'));

    const token = localStorage.getItem(TOKEN);

    if (token) {
      x.setRequestHeader(
        'Authorization',
        `Bearer ${token}`
      );
    }

    x.timeout = 15 * 60 * 1000;

    x.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(
          Math.round((e.loaded / e.total) * 100)
        );
      }
    };

    x.onload = () => {
      let data = {};

      try {
        data = JSON.parse(x.responseText);
      } catch {
        // The response was not JSON.
      }

      if (x.status === 401) {
        localStorage.removeItem(TOKEN);
        window.location.href = '/admin/login';
      }

      if (x.status >= 200 && x.status < 300) {
        resolve(data);
      } else {
        reject(
          new Error(data.message || `Upload failed (${x.status})`)
        );
      }
    };

    x.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    x.ontimeout = () => {
      reject(new Error('The upload timed out'));
    };

    const fd = new FormData();
    fd.append('files', file);

    x.send(fd);
  });
}