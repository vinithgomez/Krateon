import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import { ApiError, inventoryApi } from "@/lib/api";
import type { InventoryResponse, StockMovementType } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MOVEMENT_TYPES: { value: StockMovementType; label: string }[] = [
  { value: "STOCK_IN", label: "Stock In" },
  { value: "STOCK_OUT", label: "Stock Out" },
  { value: "RETURN", label: "Return" },
];

interface StockAdjustDialogProps {
  inventory: InventoryResponse;
  trigger: ReactElement;
  onAdjusted: () => void;
}

export function StockAdjustDialog({ inventory, trigger, onAdjusted }: StockAdjustDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<StockMovementType>("STOCK_IN");
  const [changeQty, setChangeQty] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setType("STOCK_IN");
    setChangeQty("");
    setReason("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(changeQty);
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await inventoryApi.adjust({ inventoryId: inventory.id, changeQty: qty, type, reason: reason || null });
      toast.success("Stock adjusted.");
      setOpen(false);
      resetForm();
      onAdjusted();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to adjust stock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {inventory.product.name} ({inventory.size === "ONE_SIZE" ? "One Size" : inventory.size}) at{" "}
            {inventory.warehouse.name} - currently {inventory.quantity} units.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => value && setType(value as StockMovementType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-qty">Quantity</Label>
            <Input
              id="adjust-qty"
              type="number"
              min={1}
              required
              value={changeQty}
              onChange={(e) => setChangeQty(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-reason">Reason</Label>
            <Textarea id="adjust-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adjusting..." : "Adjust Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
