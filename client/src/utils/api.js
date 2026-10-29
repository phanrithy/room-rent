/**
 * API client with automatic token attachment and standardized error parsing
 */

let onUnauthorizedCallback = null;

export function setOnUnauthorized(cb) {
  onUnauthorizedCallback = cb;
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('app_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle FormData (e.g. file uploads) by removing Content-Type
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  let data;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats-officedocument'))) {
    data = await res.blob();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorObj = new Error((data && data.error) || 'An unexpected error occurred');
    errorObj.code = data && data.code ? data.code : 'UNKNOWN_ERROR';
    errorObj.status = res.status;
    errorObj.details = data && data.details;
    throw errorObj;
  }

  return data;
}
