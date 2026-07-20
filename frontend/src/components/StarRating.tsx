import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** 0-5, may be fractional for display mode. */
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

/** Read-only star display, supporting fractional fill (e.g. 4.3 stars). */
export function StarRating({ rating, size = "md", className }: StarRatingProps) {
  const starClass = SIZE_CLASSES[size];

  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fillPercent = Math.max(0, Math.min(1, rating - i)) * 100;
        return (
          <div key={i} className={cn("relative", starClass)}>
            <Star className={cn(starClass, "absolute inset-0 text-muted-foreground/40")} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
              <Star className={cn(starClass, "fill-amber-400 text-amber-400")} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface InteractiveStarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Clickable 1-5 star picker for the review form. */
export function InteractiveStarRating({ value, onChange, size = "lg", className }: InteractiveStarRatingProps) {
  const starClass = SIZE_CLASSES[size];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const filled = starValue <= value;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue)}
            aria-label={`Rate ${starValue} out of 5`}
            className="rounded-sm p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(starClass, filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
            />
          </button>
        );
      })}
    </div>
  );
}
