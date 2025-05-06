import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";
import { Menu, LayoutDashboard, History, User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Navigation links
  const navLinks = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Past Decisions", href: "/past-decisions", icon: History },
  ];
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="min-h-screen dice-bg">
      {/* Navigation */}
      <nav className="bg-white shadow-md fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Desktop Nav */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/">
                  <a>
                    <Logo size="sm" />
                  </a>
                </Link>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:ml-8 md:flex md:items-center md:space-x-4">
                {navLinks.map((link) => (
                  <Link key={link.name} href={link.href}>
                    <a 
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md",
                        location === link.href
                          ? "text-primary bg-primary-50"
                          : "text-neutral-600 hover:text-primary hover:bg-neutral-50"
                      )}
                    >
                      {link.name}
                    </a>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* User Menu & Mobile Menu Button */}
            <div className="flex items-center">
              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center space-x-2 text-neutral-600 hover:text-primary"
                  >
                    <span className="hidden sm:block text-sm font-medium">
                      {user?.displayName || user?.username}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      {user?.displayName?.[0] || user?.username?.[0] || "U"}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="ml-2 md:hidden">
                    <Menu className="h-6 w-6 text-neutral-600" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="py-6">
                  <div className="flex flex-col h-full">
                    <Logo className="mb-6" size="sm" />
                    
                    <div className="space-y-1">
                      {navLinks.map((link) => (
                        <Link key={link.name} href={link.href}>
                          <a
                            className={cn(
                              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                              location === link.href
                                ? "text-primary bg-primary-50"
                                : "text-neutral-600 hover:text-primary hover:bg-neutral-50"
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <link.icon className="mr-3 h-5 w-5" />
                            {link.name}
                          </a>
                        </Link>
                      ))}
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-neutral-200">
                      <div className="flex items-center px-3 py-2">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                          {user?.displayName?.[0] || user?.username?.[0] || "U"}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="flex w-full items-center px-3 py-2 text-sm text-destructive"
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        Sign out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
