import { Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { WarehousesPage } from "@/pages/WarehousesPage";
import { SuppliersPage } from "@/pages/SuppliersPage";
import { RestockRequestsPage } from "@/pages/RestockRequestsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { ReviewsPage } from "@/pages/ReviewsPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/warehouses" element={<WarehousesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/restock-requests" element={<RestockRequestsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
