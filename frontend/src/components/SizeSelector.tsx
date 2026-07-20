import { cn } from "@/lib/utils";
import type { ProductVariantResponse } from "@/types/api";

/**
 * Products with exactly one ONE_SIZE variant (accessories, bags, watches, and legacy
 * products) don't need a size picker at all - the caller should auto-select that single
 * variant and skip straight to add-to-cart/buy-now.
 */
export function isSingleOneSize(variants: ProductVariantResponse[]): boolean {
  return variants.length === 1 && variants[0].size === "ONE_SIZE";
}

interface SizeSelectorProps {
  variants: ProductVariantResponse[];
  selectedId: number | null;
  onSelect: (variantId: number) => void;
  disabled?: boolean;
}

// Note: GET /api/products/{id} only returns { id, size } per variant - no stock data is
// exposed on the public product endpoint, so we can't disable individual out-of-stock
// sizes here without fabricating that state. If a size is actually out of stock, the
// add-to-cart/buy-now call will fail with a clear "insufficient stock" error instead.
export function SizeSelector({ variants, selectedId, onSelect, disabled }: SizeSelectorProps) {
  if (isSingleOneSize(variants) || variants.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Select a size">
      {variants.map((variant) => {
        const isSelected = selectedId === variant.id;
        return (
          <button
            key={variant.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(variant.id)}
            aria-pressed={isSelected}
            className={cn(
              "flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-muted",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {variant.size === "ONE_SIZE" ? "One Size" : variant.size}
          </button>
        );
      })}
    </div>
  );
}
