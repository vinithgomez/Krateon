import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, PackageSearch, User as UserIcon, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const { wishlist } = useWishlist();
  const wishlistCount = wishlist?.items.length ?? 0;
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <PackageSearch className="size-6 text-primary" />
          Krateon
        </Link>

        <nav className="flex items-center gap-2">
          {isAuthenticated && (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/orders" />}>
              Orders
            </Button>
          )}

          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              nativeButton={false}
              render={<Link to="/wishlist" aria-label="View wishlist" />}
            >
              <Heart className="size-5" />
              {wishlistCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
                  {wishlistCount}
                </Badge>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            nativeButton={false}
            render={<Link to="/cart" aria-label="View cart" />}
          >
            <ShoppingCart className="size-5" />
            {itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
                {itemCount}
              </Badge>
            )}
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" className="gap-2" />}
              >
                <Avatar className="size-6">
                  <AvatarFallback className="text-xs">
                    {user?.email.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{user?.email}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Signed in as {user?.email}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/orders")}>
                  Order history
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" nativeButton={false} render={<Link to="/login" />}>
              <UserIcon className="size-4" />
              Log in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
