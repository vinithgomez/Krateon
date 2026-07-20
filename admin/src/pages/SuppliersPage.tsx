import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { ApiError, supplierApi } from "@/lib/api";
import type { SupplierRequest, SupplierResponse } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const EMPTY_FORM: SupplierRequest = { name: "", contactEmail: "", contactPhone: "" };

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierRequest>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadSuppliers = () => {
    setLoading(true);
    supplierApi
      .list()
      .then(setSuppliers)
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load suppliers.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadSuppliers, []);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (supplier: SupplierResponse) => {
    setEditingId(supplier.id);
    setForm({ name: supplier.name, contactEmail: supplier.contactEmail, contactPhone: supplier.contactPhone ?? "" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId !== null) {
        await supplierApi.update(editingId, form);
        toast.success("Supplier updated.");
      } else {
        await supplierApi.create(form);
        toast.success("Supplier created.");
      }
      setDialogOpen(false);
      loadSuppliers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to save supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await supplierApi.remove(id);
      toast.success("Supplier deleted.");
      loadSuppliers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to delete supplier.");
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Suppliers"
        description="Vendors that fulfill restock requests."
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button onClick={openCreateDialog} />}>
              <Plus className="size-4" />
              Create Supplier
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId !== null ? "Edit Supplier" : "Create Supplier"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sup-name">Name</Label>
                  <Input
                    id="sup-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sup-email">Contact Email</Label>
                  <Input
                    id="sup-email"
                    type="email"
                    required
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sup-phone">Contact Phone</Label>
                  <Input
                    id="sup-phone"
                    value={form.contactPhone ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
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
      ) : suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="No suppliers yet" description="Create your first supplier to start creating restock requests." />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="text-muted-foreground">{supplier.contactEmail}</TableCell>
                  <TableCell className="text-muted-foreground">{supplier.contactPhone || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(supplier)} aria-label="Edit">
                        <Pencil className="size-3.5" />
                      </Button>
                      <ConfirmDeleteDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Delete">
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        }
                        title={`Delete "${supplier.name}"?`}
                        description="This cannot be undone, and will fail if restock requests still reference this supplier."
                        onConfirm={() => handleDelete(supplier.id)}
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
