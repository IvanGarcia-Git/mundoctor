
import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { LogIn, UserPlus, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationsDropdown from '@/components/layout/NotificationsDropdown';


const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout(navigate);
  };
  


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-gray-800/40 dark:bg-slate-900/75">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Logo className="h-8 w-auto" />
          </Link>

          <div className="flex items-center space-x-1 sm:space-x-2"> {/* Ajustado space-x */}
            {user && (
              <>
                <NotificationsDropdown />
              </>
            )}
            <ThemeToggle />
            {user ? (
              <div className="hidden md:flex items-center space-x-2">
                 <Button onClick={handleLogout} variant="outline" size="sm">
                   <LogOut size={16} className="mr-1.5" /> Cerrar Sesión
                 </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Link to="/login"><LogIn size={16} className="mr-1.5" /> Iniciar Sesión</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/registro"><UserPlus size={16} className="mr-1.5" /> Registrarse</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;
