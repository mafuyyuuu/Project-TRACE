import { useState, useEffect } from 'react';
import api from '@/services/api';

/**
 * Extract the bare filename from any stored path shape — absolute server
 * paths, `/uploads/x.jpg`, or a plain filename all appear in the DB.
 */
export function toFilename(pathOrName) {
  if (!pathOrName) return '';
  return String(pathOrName).split(/[\\/]/).pop();
}

/**
 * Loads a protected upload and returns a blob URL usable by <img>, <iframe>,
 * or window.open.
 *
 * Uploads are no longer publicly served — `/api/files/:filename` requires a
 * JWT and checks ownership. Since an <img src> cannot send an Authorization
 * header, we fetch the bytes through axios (which attaches the token) and
 * wrap them in an object URL instead.
 *
 * `loading` and the reset-on-change behaviour are derived from the result's
 * key rather than written with setState, so the effect never triggers a
 * synchronous re-render.
 *
 * @param {string|null} pathOrName stored path/filename, or falsy to load nothing
 * @returns {{ url: string|null, loading: boolean, error: string }}
 */
export default function useAuthedFile(pathOrName) {
  // A fully-qualified URL (e.g. an avatar service) needs no authentication.
  const isExternal = Boolean(pathOrName) && String(pathOrName).startsWith('http');
  const filename = isExternal ? '' : toFilename(pathOrName);

  const [result, setResult] = useState({ key: null, url: null, error: '' });

  useEffect(() => {
    if (!filename) return undefined;

    let objectUrl = null;
    let cancelled = false;

    api
      .get(`/files/${encodeURIComponent(filename)}`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setResult({ key: filename, url: objectUrl, error: '' });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({
          key: filename,
          url: null,
          error: err.response?.status === 403 ? 'You do not have access to this file.' : 'Failed to load file.',
        });
      });

    // Revoke on unmount/change so blobs don't accumulate in memory.
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename]);

  // Only trust the stored result if it belongs to the file currently requested;
  // otherwise this render is still loading the new one.
  const current = result.key === filename ? result : { url: null, error: '' };

  return {
    url: isExternal ? String(pathOrName) : current.url,
    loading: Boolean(filename) && !current.url && !current.error,
    error: current.error,
  };
}
