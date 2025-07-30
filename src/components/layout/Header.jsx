import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { LogIn, UserPlus, Home, Stethoscope, Search, Phone } from 'lucide-react'; // Import icons
import { useAuth } from '@/contexts/ClerkAuthContext';
import { UserButton } from '@clerk/clerk-react';
import { useClerkAppearance } from '@/components/ClerkThemeProvider';
import NotificationsDropdown from '@/components/layout/NotificationsDropdown';


const Header = () => {
  const { user } = useAuth();
  const { appearance } = useClerkAppearance();
  


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-gray-800/40 dark:bg-slate-900/75">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between relative">
          <Link to="/" className="flex items-center space-x-2 z-20">
            <Logo className="h-8 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center justify-center flex-grow absolute inset-0 space-x-6 lg:space-x-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`
              }
            >
              <Home size={16} className="mr-1.5" /> Inicio
            </NavLink>
            <NavLink
              to="/profesionales"
              className={({ isActive }) =>
                `flex items-center text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`
              }
            >
              <Stethoscope size={16} className="mr-1.5" /> Profesionales
            </NavLink>
            <NavLink
              to="/buscar"
              className={({ isActive }) =>
                `flex items-center text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`
              }
            >
              <Search size={16} className="mr-1.5" /> Buscar
            </NavLink>
            <NavLink
              to="/contacto"
              className={({ isActive }) =>
                `flex items-center text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`
              }
            >
              <Phone size={16} className="mr-1.5" /> Contacto
            </NavLink>
          </nav>

          <div className="flex items-center space-x-1 sm:space-x-2 ml-auto z-20">
            {user && (
              <>
                <NotificationsDropdown />
              </>
            )}
            <ThemeToggle />
            {user ? (
              <div className="hidden md:flex items-center space-x-2">
                <UserButton
                  appearance={appearance}
                  userProfileMode="navigation"
                  userProfileUrl="/perfil"
                  afterSignOutUrl="/"
                />
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