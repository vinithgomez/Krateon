import { PackageSearch } from "lucide-react";
import { NavLinks } from "./NavLinks";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-5 font-semibold">
        <PackageSearch className="size-6 text-primary" />
        Krateon Admin
      </div>
      <NavLinks />
    </aside>
  );
}
