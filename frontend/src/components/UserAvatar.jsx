import useAuthedFile from '@/hooks/useAuthedFile';
import { useState } from 'react';

/**
 * Local stand-in for an account without an available photo.
 */
function initials(user) {
  return String(user?.full_name || '').trim().split(/\s+/).filter(Boolean)
    .slice(0, 2).map(name => Array.from(name)[0]).join('').toLocaleUpperCase() || 'T';
}

/**
 * The signed-in account's picture, wherever it appears.
 *
 * An uploaded avatar is a protected upload and has to be fetched with the
 * caller's token. Initials are rendered locally when no photo is available.
 */
export default function UserAvatar({ user, overridePath = null, className = '', alt = 'User' }) {
  const path = overridePath || user?.profile_picture || null;
  const { url } = useAuthedFile(path);
  const [failedUrl, setFailedUrl] = useState(null);

  if (!url || failedUrl === url) {
    return <span role="img" aria-label={alt} className={`trace-avatar-fallback ${className}`}>{initials(user)}</span>;
  }

  return <img src={url} alt={alt} className={className} onError={() => setFailedUrl(url)} />;
}
