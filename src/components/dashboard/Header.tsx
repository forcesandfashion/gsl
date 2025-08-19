import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, User, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import { useState } from "react";

const Header = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Function to get dashboard route based on user role
  const getDashboardRoute = () => {
    if (!user || !userRole) return "/";
    
    switch (userRole) {
      case 'shooter':
        return '/dashboard/shooter';
      case 'range_owner':
        return '/dashboard/range-owner';
      case 'technical_coach':
        return '/dashboard/technical-coach';
      case 'dietician':
        return '/dashboard/dietician';
      case 'mental_trainer':
        return '/dashboard/mental-trainer';
      case 'franchise_owner':
        return '/dashboard/franchise-owner';
      default:
        return '/dashboard';
    }
  };

  // Handle profile click with dynamic routing
  const handleProfileClick = () => {
    if (!user || !userRole) return;
    
    // Navigate to different profile routes based on user role
    switch (userRole) {
      case 'shooter':
        navigate("/profile");
        break;
      case 'range_owner':
        navigate("/dashboard/range-owner/profile");
        break;
      case 'technical_coach':
        navigate("/dashboard/technical-coach/profile");
        break;
      case 'dietician':
        navigate("/dashboard/dietician/profile");
        break;
      case 'mental_trainer':
        navigate("/dashboard/mental-trainer/profile");
        break;
      case 'franchise_owner':
        navigate("/dashboard/franchise-owner/profile");
        break;
      default:
        navigate("/profile");
    }
  };

  const handleSettingClick = () => {
    const dashboardRoute = getDashboardRoute();
    navigate(dashboardRoute);
  }

  return (
    <header className="fixed top-0 z-50 w-full bg-[rgba(255,255,255,0.9)] backdrop-blur-md border-b border-[#f5f5f7]/30">
      <div className="max-w-[1200px] mx-auto flex h-16 items-center justify-between px-4">
        <Link
          to="/"
          className="relative cursor-pointer  px-6  flex items-center"
        >
          <span className="text-black font-bold text-lg flex items-center">
            <span className="mr-2">
              <img src="/logo.png" className="w-16 h-16" alt="" />
            </span>{" "}
            Global Shooting League
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-7 text-sm font-medium">
          <Link to="/" className="hover:text-blue-600">
            Home
          </Link>
          <Link to="/about" className="hover:text-blue-600">
            About Us
          </Link>
          <Link to="/ranges" className="hover:text-blue-600">
            Ranges
          </Link>
          <Link to="/shooters" className="hover:text-blue-600">
            Shooters
          </Link>
          <Link to="/media" className="hover:text-blue-600">
            Media
          </Link>
          <Link to="/contact" className="hover:text-blue-600">
            Contact
          </Link>

          <Link to="/pricing" className="hover:text-blue-600">
            Get Involved
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 hover:cursor-pointer">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                    alt={user.email || ""}
                  />
                  <AvatarFallback>
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl border-none shadow-lg"
              >
                <DropdownMenuLabel className="text-xs text-gray-500">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onSelect={handleProfileClick}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer"
                  onSelect={handleSettingClick}>
                  
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => signOut()}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button
                  variant="ghost"
                  className="text-sm font-medium hover:text-blue-600"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="rounded-full bg-blue-700 text-white hover:bg-blue-800 text-sm px-4">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-2">
          <nav className="flex flex-col space-y-3 px-4 py-2">
            <Link to="/" className="py-2 hover:text-blue-600">
              Home
            </Link>
            <Link to="/about" className="py-2 hover:text-blue-600">
              About Us
            </Link>
            <Link to="/ranges" className="py-2 hover:text-blue-600">
              Ranges
            </Link>
            <Link to="/shooters" className="py-2 hover:text-blue-600">
              Shooters
            </Link>
            <Link to="/media" className="py-2 hover:text-blue-600">
              Media
            </Link>
            <Link to="/contact" className="hover:text-blue-600">
              Contact
            </Link>

            <Link to="/pricing" className="py-2 hover:text-blue-600">
              Get Involved
            </Link>

            {user ? (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">{user.email}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full text-left justify-start"
                  onClick={handleProfileClick}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-left justify-start text-sm"
                  onClick={() => signOut()}
                >
                  Log out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 pt-2">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="w-full bg-blue-700 hover:bg-blue-800">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;