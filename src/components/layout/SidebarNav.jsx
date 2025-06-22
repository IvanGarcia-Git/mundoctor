import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, X, Search, Home, Stethoscope, Phone, LogIn, UserPlus, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navLinks = [
  { name: 'Inicio', path: '/', icon: <Home size={20} />, exact: true },
  { name: 'Profesionales', path: '/profesionales', icon: <Stethoscope size={20} />, exact: true },
  { name: 'Buscar', path: '/buscar', icon: <Search size={20} />, exact: false },
  { name: 'Contacto', path: '/contacto', icon: <Phone size={20} />, exact: true },
];

const SidebarNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const sidebarRef = useRef(null);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(false); // Cerrar en desktop por defecto
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cerrar sidebar al hacer click fuera (solo móvil)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        const hamburgerButton = document.getElementById('hamburger-button');
        if (hamburgerButton && hamburgerButton.contains(event.target)) {
          return;
        }
        setIsOpen(false);
      }
    };

    if (isMobile && isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, isOpen]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const handleLogout = () => {
    closeSidebar();
    logout(navigate);
  };

  const NavItem = ({ path, name, icon, onClick, exact }) => {
    const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
    return (
      <NavLink
        to={path}
        onClick={onClick}
        className={cn(
          'flex items-center w-full px-3 py-3 text-left rounded-lg transition-colors duration-200 mx-2',
          isActive 
            ? 'bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-300' 
            : 'text-muted-foreground hover:text-foreground dark:text-gray-300 dark:hover:text-white hover:bg-muted/50 dark:hover:bg-gray-700/50'
        )}
      >
        {icon && React.cloneElement(icon, { className: cn('flex-shrink-0', (isOpen || isMobile) && 'mr-3') })}
        <span className={cn('transition-opacity duration-200', !isOpen && !isMobile && 'opacity-0')}>{name}</span>
      </NavLink>
    );
  };

  // Botón hamburguesa para móvil
  const HamburgerButton = () => (
    <Button
      id="hamburger-button"
      variant="ghost"
      size="icon"
      className="fixed top-4 left-4 z-[60] md:hidden bg-background/90 backdrop-blur-sm border border-border shadow-lg"
      onClick={toggleSidebar}
      aria-label="Abrir menú lateral"
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </Button>
  );

  // Botón toggle para desktop
  const DesktopToggle = () => (
    <div className="hidden md:flex justify-center py-4 border-b border-border dark:border-gray-700/50">
      <button
        onClick={toggleSidebar}
        className="p-3 text-muted-foreground hover:text-foreground dark:text-gray-300 dark:hover:text-white hover:bg-muted/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        <Menu size={20} />
      </button>
    </div>
  );

  return (
    <>
      {/* Botón hamburguesa móvil */}
      <HamburgerButton />

      {/* Overlay para móvil */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-[51] bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        ref={sidebarRef}
        initial={false}
        animate={{
          width: isMobile ? (isOpen ? '280px' : '0px') : (isOpen ? '280px' : '70px'),
          opacity: isMobile ? (isOpen ? 1 : 0) : 1
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-0 h-screen z-[52] bg-card/95 dark:bg-gray-800/95 backdrop-blur-md border-r border-border dark:border-gray-700/50 shadow-xl',
          isMobile && !isOpen && 'pointer-events-none'
        )}
      >
        {/* Botón toggle para desktop */}
        <DesktopToggle />

        {/* Contenido del sidebar */}
        <ScrollArea className="flex-1 py-6">
          <nav className="space-y-2">
            {/* Enlaces principales */}
            <div className="space-y-2">
              {(isOpen && !isMobile) || isMobile ? (
                <motion.h3 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4 text-sm font-medium text-muted-foreground dark:text-gray-400 mb-3"
                >
                  Principal
                </motion.h3>
              ) : null}
              
              {navLinks.map(link => (
                <NavItem key={link.name} {...link} onClick={closeSidebar} />
              ))}
            </div>

            {/* Enlaces de usuario autenticado */}
            {user && (
              <div className="pt-6 mt-6 border-t border-border dark:border-gray-700/50 space-y-2">
                {(isOpen && !isMobile) || isMobile ? (
                  <motion.h3 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 text-sm font-medium text-muted-foreground dark:text-gray-400 mb-3"
                  >
                    Mi Área
                  </motion.h3>
                ) : null}

                {user.role === 'admin' && (
                  <NavItem 
                    key="admin-dashboard" 
                    path="/admin/dashboard" 
                    name="Panel Admin" 
                    icon={<LayoutDashboard size={20}/>} 
                    onClick={closeSidebar}
                    exact={false} 
                  />
                )}
                
                {user.role === 'professional' && (
                  <NavItem 
                    key="prof-dashboard" 
                    path="/profesionales/dashboard" 
                    name="Mi Panel" 
                    icon={<LayoutDashboard size={20}/>} 
                    onClick={closeSidebar}
                    exact={false} 
                  />
                )}
                
                {user.role === 'patient' && (
                  <NavItem 
                    key="patient-dashboard" 
                    path="/paciente/dashboard" 
                    name="Mi Panel" 
                    icon={<LayoutDashboard size={20}/>} 
                    onClick={closeSidebar}
                    exact={false} 
                  />
                )}
              </div>
            )}

            {/* Enlaces para usuarios no autenticados */}
            {!user && (
              <div className="pt-6 mt-6 border-t border-border dark:border-gray-700/50 space-y-2">
                {(isOpen && !isMobile) || isMobile ? (
                  <motion.h3 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 text-sm font-medium text-muted-foreground dark:text-gray-400 mb-3"
                  >
                    Cuenta
                  </motion.h3>
                ) : null}

                <NavItem 
                  path="/login" 
                  name="Iniciar Sesión" 
                  icon={<LogIn size={20}/>} 
                  onClick={closeSidebar}
                  exact={true}
                />
                <NavItem 
                  path="/registro" 
                  name="Registrarse" 
                  icon={<UserPlus size={20}/>} 
                  onClick={closeSidebar}
                  exact={true}
                />
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* Footer del sidebar */}
        <AnimatePresence>
          {user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="p-4 border-t border-border dark:border-gray-700/50"
            >
              <Button 
                onClick={handleLogout}
                variant="ghost" 
                className={cn(
                  "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                  (isOpen || isMobile) ? "justify-start" : "justify-center px-0"
                )}
              >
                <LogIn size={20} className={cn("rotate-180", (isOpen || isMobile) && "mr-3")} />
                {(isOpen || isMobile) && 'Cerrar Sesión'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
};

export default SidebarNav;