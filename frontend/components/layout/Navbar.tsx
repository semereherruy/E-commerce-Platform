'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, User, Search, Menu, Package, Info, LayoutGrid, LayoutDashboard, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart, useAuth } from '@/lib/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { useSyncExternalStore } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const cart = useCart((state) => state.cart);
  const { user, logout } = useAuth();
  const rawCount = cart?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const cartItemCount = rawCount > 99 ? '99+' : String(rawCount);
  
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  // Helper for Django Admin URL
  const backendAdminUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '/admin/');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-primary">
            NEBI STORE
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/products" className={cn("transition-colors hover:text-primary", pathname === '/products' && "text-primary")}>Products</Link>
            <Link href="/collections" className={cn("transition-colors hover:text-primary", pathname === '/collections' && "text-primary")}>Collections</Link>
            <Link href="/about" className={cn("transition-colors hover:text-primary", pathname === '/about' && "text-primary")}>About</Link>
            
            {/* Admin Quick Link */}
            {mounted && user?.role === 'admin' && (
              <Link 
                href="/admin/dashboard" 
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all",
                  pathname.startsWith('/admin') && "bg-primary text-white"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mounted && (
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger
                render={
                  <Button variant="ghost" size="icon" className="hidden sm:flex">
                    <Search className="h-5 w-5" />
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[425px] p-6 rounded-2xl border-2">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter mb-4">
                    Quick <span className="text-primary italic">Search</span>
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search for products..."
                    className="pl-11 h-14 border-2 text-lg font-medium rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button type="submit" className="hidden">Search</Button>
                </form>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest w-full mb-1">Popular:</span>
                  {['Shoes', 'Clothing', 'Accessories'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSearchQuery(tag);
                        router.push(`/products?search=${tag}`);
                        setSearchOpen(false);
                      }}
                      className="px-3 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-xs font-bold transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-tight">{user ? `${user.first_name || user.username}` : 'My Account'}</span>
                      {user && <span className="text-[10px] text-muted-foreground font-bold">{user.email}</span>}
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {user ? (
                  <>
                    <DropdownMenuItem nativeButton={false} render={<Link href="/profile" />} className="rounded-lg">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    
                    {user.role === 'admin' && (
                      <div className="bg-primary/5 rounded-xl mt-1 mb-1 p-1">
                        <DropdownMenuItem nativeButton={false} render={<Link href="/admin/dashboard" />} className="rounded-lg font-bold text-primary">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Frontend Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem nativeButton={false} render={<a href={backendAdminUrl} target="_blank" rel="noreferrer" />} className="rounded-lg font-bold text-amber-600">
                          <Settings2 className="mr-2 h-4 w-4" />
                          Django Backend Admin
                        </DropdownMenuItem>
                      </div>
                    )}
                    
                    <DropdownMenuItem nativeButton={false} render={<Link href="/orders" />} className="rounded-lg">
                      <Package className="mr-2 h-4 w-4" />
                      Orders
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="rounded-lg text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem nativeButton={false} render={<Link href="/login" />} className="rounded-lg">
                      Login
                    </DropdownMenuItem>
                    <DropdownMenuItem nativeButton={false} render={<Link href="/register" />} className="rounded-lg">
                      Register
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          )}

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {rawCount > 0 && (
                <span className="absolute -top-1 -right-1 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </Link>

          {mounted ? (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                }
              />
              <SheetContent
                side="right"
                className="flex h-full max-h-[100dvh] w-[min(100%,22rem)] flex-col border-l border-primary/10 bg-gradient-to-b from-background to-muted/30 p-0 sm:max-w-sm"
              >
                <SheetHeader className="border-b border-border/60 bg-muted/20 px-6 py-5 text-left">
                  <SheetTitle className="text-lg font-black tracking-tight text-primary">Menu</SheetTitle>
                  <SheetDescription className="text-xs font-medium text-muted-foreground">
                    Browse the store or open your account.
                  </SheetDescription>
                </SheetHeader>
                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Mobile">
                  {[
                    { href: '/products', label: 'Products', Icon: Package },
                    { href: '/collections', label: 'Collections', Icon: LayoutGrid },
                    { href: '/about', label: 'About', Icon: Info },
                  ].map(({ href, label, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors',
                        pathname === href || (href !== '/' && pathname.startsWith(href))
                          ? 'bg-primary/15 text-primary'
                          : 'text-foreground hover:bg-muted/80'
                      )}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/60">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      {label}
                    </Link>
                  ))}
                  
                  {/* Mobile Admin Section */}
                  {user?.role === 'admin' && (
                    <div className="mt-4 space-y-2">
                      <span className="px-4 text-[10px] uppercase font-black text-muted-foreground tracking-widest">Admin Tools</span>
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition-colors bg-primary/5 text-primary ring-1 ring-primary/20',
                          pathname.startsWith('/admin') && 'bg-primary text-white'
                        )}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Frontend Dashboard
                      </Link>
                      <a
                        href={backendAdminUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition-colors bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      >
                        <Settings2 className="h-4 w-4" />
                        Backend Admin
                      </a>
                    </div>
                  )}
                </nav>
                <div className="mt-auto border-t border-border/60 px-4 py-4">
                  <Link
                    href="/cart"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3 text-sm font-black text-primary ring-1 ring-primary/20"
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" aria-hidden />
                      View cart
                    </span>
                    {rawCount > 0 ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                        {cartItemCount}
                      </span>
                    ) : null}
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

// Added missing icon imports to the top of the file
import { LogOut } from 'lucide-react';
