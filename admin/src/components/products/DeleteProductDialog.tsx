import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import { ApiError, productApi } from "@/lib/api";
import type { ProductResponse } from "@/types/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteProductDialogProps {
  product: ProductResponse;
  trigger: ReactElement;
  onDeleted: () => void;
}

// Two-step flow in a single dialog: a normal delete confirmation first, and only if that's
// rejected with a 409 (still referenced by inventory/restock data) does it offer force-delete,
// gated behind typing the product's name - this is a destructive, irreversible action.
export function DeleteProductDialog({ product, trigger, onDeleted }: DeleteProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"confirm" | "force">("confirm");
  const [blockedMessage, setBlockedMessage] = useState("");
  const [forceConfirmText, setForceConfirmText] = useState("");
  const [pending, setPending] = useState(false);

  const resetState = () => {
    setStep("confirm");
    setBlockedMessage("");
    setForceConfirmText("");
  };

  const handleNormalDelete = async () => {
    setPending(true);
    try {
      await productApi.remove(product.id);
      toast.success("Product deleted.");
      onDeleted();
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setBlockedMessage(error.message);
        setStep("force");
      } else {
        toast.error(error instanceof ApiError ? error.message : "Failed to delete product.");
      }
    } finally {
      setPending(false);
    }
  };

  const handleForceDelete = async () => {
    setPending(true);
    try {
      await productApi.forceRemove(product.id);
      toast.success(`"${product.name}" was force-deleted.`);
      onDeleted();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to force-delete product.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        {step === "confirm" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{product.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone, and will fail if the product has existing orders, cart items, or
                inventory.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={(e) => {
                  e.preventDefault();
                  void handleNormalDelete();
                }}
              >
                {pending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Force delete &quot;{product.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                {blockedMessage} This product has related inventory/restock data but no real orders. Force
                delete will permanently remove the product along with all its size variants, inventory rows,
                stock movement history, and restock requests. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="force-delete-confirm">
                Type <span className="font-semibold">{product.name}</span> to confirm
              </Label>
              <Input
                id="force-delete-confirm"
                value={forceConfirmText}
                onChange={(e) => setForceConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending || forceConfirmText !== product.name}
                onClick={(e) => {
                  e.preventDefault();
                  void handleForceDelete();
                }}
              >
                {pending ? "Force deleting..." : "Force Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
