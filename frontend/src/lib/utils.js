export const capitialize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// --- Avatar utilities ---

// DiceBear avataaars style — free, no API key, deterministic by seed.
// Using SVG for lightweight, infinitely scalable avatars.
const DICEBEAR_BASE = "https://api.dicebear.com/9.x/avataaars/svg";

/**
 * A stable fallback avatar used when no profilePic is available or the image
 * fails to load. Uses a fixed seed so it's always the same image.
 */
export const FALLBACK_AVATAR = `${DICEBEAR_BASE}?seed=fallback`;

/**
 * Generate a random DiceBear avatar URL.
 * Each call produces a new random seed, giving a unique avatar.
 */
export function generateRandomAvatar() {
  const seed = Math.random().toString(36).substring(2, 10);
  return `${DICEBEAR_BASE}?seed=${seed}`;
}

/**
 * onError handler for <img> tags that display user profile pictures.
 * Replaces broken images (e.g. dead avatar.iran.liara.run URLs stored in DB)
 * with the fallback avatar. Clears the handler after first trigger to prevent
 * infinite error loops if the fallback itself ever fails.
 */
export function handleAvatarError(e) {
  e.currentTarget.onerror = null; // prevent infinite loop
  e.currentTarget.src = FALLBACK_AVATAR;
}
