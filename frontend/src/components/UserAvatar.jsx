import useAuthedFile from '@/hooks/useAuthedFile';

/**
 * Generated stand-in for an account that hasn't uploaded a picture yet.
 * Seeded from the user's initials so it stays stable between sessions.
 */
function fallbackAvatarUrl(user) {
  const seed = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('')
    : 'MK';
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=c4e3d3`;
}

/**
 * The signed-in account's picture, wherever it appears.
 *
 * An uploaded avatar is a protected upload and has to be fetched with the
 * caller's token; the generated fallback is an ordinary public URL.
 * `useAuthedFile` already passes fully-qualified http(s) URLs through
 * untouched, so both cases go through the same single call.
 */
export default function UserAvatar({ user, overridePath = null, className = '', alt = 'User' }) {
  const path = overridePath || user?.profile_picture || fallbackAvatarUrl(user);
  const { url } = useAuthedFile(path);

  if (!url) {
    return <div className={`${className} bg-gray-100 animate-pulse`} aria-hidden="true" />;
  }

  return <img src={url} alt={alt} className={className} />;
}
