import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { toast } from "sonner";
import { ApiError, warehouseApi } from "@/lib/api";
import type { WarehouseRequest, WarehouseResponse } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const EMPTY_FORM: WarehouseRequest = { name: "", location: "" };

export function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<WarehouseRequest>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadWarehouses = () => {
    setLoading(true);
    warehouseApi
      .list()
      .then(setWarehouses)
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load warehouses.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadWarehouses, []);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (warehouse: WarehouseResponse) => {
    setEditingId(warehouse.id);
    setForm({ name: warehouse.name, location: warehouse.location });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId !== null) {
        await warehouseApi.update(editingId, form);
        toast.success("Warehouse updated.");
      } else {
        await warehouseApi.create(form);
        toast.success("Warehouse created.");
      }
      setDialogOpen(false);
      loadWarehouses();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to save warehouse.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await warehouseApi.remove(id);
      toast.success("Warehouse deleted.");
      loadWarehouses();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to delete warehouse.");
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Warehouses"
        description="Physical locations that hold inventory."
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button onClick={openCreateDialog} />}>
              <Plus className="size-4" />
              Create Warehouse
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId !== null ? "Edit Warehouse" : "Create Warehouse"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wh-name">Name</Label>
                  <Input
                    id="wh-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wh-location">Location</Label>
                  <Input
                    id="wh-location"
                    required
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <EmptyState icon={WarehouseIcon} title="No warehouses yet" description="Create your first warehouse to start tracking inventory." />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  <TableCell className="text-muted-foreground">{warehouse.location}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(warehouse)} aria-label="Edit">
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmDeleteDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Delete">
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        }
                        title={`Delete "${warehouse.name}"?`}
                        description="This cannot be undone, and will fail if inventory or restock requests still reference this warehouse."
                        onConfirm={() => handleDelete(warehouse.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
