// The backend has no "get my review for this product" endpoint, and there's no way to
// derive the current user's numeric id from the JWT or auth response to match against
// ReviewResponse.userId client-side. As a pragmatic (and honest - it never invents data)
// workaround, we remember what the current browser last submitted for a product, so the
// review form can pre-fill and switch to "update" mode within this session/browser. A
// fresh session on another device simply sees an empty form, which is still fully
// functional - the backend upserts by (product, user) regardless of which mode we call.

interface MyReviewEntry {
  rating: number;
  comment: string | null;
}

const STORAGE_KEY = "krateon_my_reviews";

function readAll(): Record<number, MyReviewEntry> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<number, MyReviewEntry>;
  } catch {
    return {};
  }
}

export function getMyReview(productId: number): MyReviewEntry | null {
  return readAll()[productId] ?? null;
}

export function setMyReview(productId: number, entry: MyReviewEntry): void {
  const all = readAll();
  all[productId] = entry;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
