const STORAGE_KEY = "krateon_recently_viewed";
const MAX_ENTRIES = 10;

function readIds(): number[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

/** Records a product view, most-recent-first, deduplicated, capped at MAX_ENTRIES. */
export function addRecentlyViewed(productId: number): void {
  const existing = readIds().filter((id) => id !== productId);
  const next = [productId, ...existing].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getRecentlyViewedIds(): number[] {
  return readIds();
}
