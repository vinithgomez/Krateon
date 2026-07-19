import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/sonner";

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
