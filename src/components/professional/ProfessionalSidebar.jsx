import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle,
  MessageSquare,
  Settings,
  LogOut,
  CreditCard,
  Stethoscope,
  Star,
  Newspaper
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { 
    label: 'General',
    items: [
      { icon: LayoutDashboard, label: 'Panel', path: '/profesionales/dashboard' },
      { icon: Calendar, label: 'Citas', path: '/profesionales/citas' },
      { icon: Users, label: 'Pacientes', path: '/profesionales/pacientes' },
      { icon: Star, label: 'Valoraciones', path: '/profesionales/valoraciones' },
    ]
  },
  {
    label: 'Gestión',
    items: [
      { icon: UserCircle, label: 'Mi Perfil', path: '/profesionales/perfil' },
      { icon: Newspaper, label: 'Historia Clínica', path: '/profesionales/historias' },
      { icon: Stethoscope, label: 'Servicios', path: '/profesionales/servicios' },
    ]
  },
  {
    label: 'Configuración',
    items: [
      { icon: CreditCard, label: 'Suscripción', path: '/profesionales/suscripcion' },
      { icon: Settings, label: 'Ajustes', path: '/profesionales/configuracion' },
    ]
  }
];

const ProfessionalSidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex flex-col h-full w-64 bg-card dark:bg-gray-800/60 backdrop-blur-md border-r border-border dark:border-gray-700/50">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground dark:text-white mb-2">Área Profesional</h2>
        <p className="text-sm text-muted-foreground dark:text-gray-400">Panel de Control</p>
      </div>
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-6">
          {menuItems.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">
                {section.label}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.path}
                      asChild
                      variant={location.pathname === item.path ? 'default' : 'ghost'}
                      className="w-full justify-start"
                    >
                      <Link to={item.path} className="flex items-center">
                        <Icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
      <div className="p-4 mt-auto border-t border-border dark:border-gray-700/50">
        <Button 
          onClick={logout}
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};

export default ProfessionalSidebar;
