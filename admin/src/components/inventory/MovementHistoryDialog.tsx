import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import { ApiError, inventoryApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InventoryResponse, StockMovementResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 8;

interface MovementHistoryDialogProps {
  inventory: InventoryResponse;
  trigger: ReactElement;
}

export function MovementHistoryDialog({ inventory, trigger }: MovementHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadMovements = (targetPage: number) => {
    setLoading(true);
    inventoryApi
      .movements(inventory.id, targetPage, PAGE_SIZE)
      .then((result) => {
        setMovements(result.content);
        setTotalPages(result.totalPages);
        setPage(targetPage);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load movement history.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) loadMovements(0);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Stock Movement History</DialogTitle>
          <DialogDescription>
            {inventory.product.name} ({inventory.size === "ONE_SIZE" ? "One Size" : inventory.size}) at{" "}
            {inventory.warehouse.name}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : movements.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No stock movements recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    <Badge variant="secondary">{movement.type}</Badge>
                  </TableCell>
                  <TableCell className={cn(movement.changeQty < 0 ? "text-destructive" : "text-green-600")}>
                    {movement.changeQty > 0 ? `+${movement.changeQty}` : movement.changeQty}
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-muted-foreground">{movement.reason || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(movement.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={cn(page === 0 && "pointer-events-none opacity-50")}
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 0) loadMovements(page - 1);
                  }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={i === page}
                    onClick={(e) => {
                      e.preventDefault();
                      loadMovements(i);
                    }}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={cn(page === totalPages - 1 && "pointer-events-none opacity-50")}
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages - 1) loadMovements(page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </DialogContent>
    </Dialog>
  );
}
