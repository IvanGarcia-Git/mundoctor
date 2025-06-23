import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Briefcase, ShieldCheck, Ticket, Percent, LayoutDashboard } from 'lucide-react';

const AdminSidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    { name: 'Panel', path: '/admin/dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Usuarios', path: '/admin/usuarios', icon: <Users size={20}/> },
    { name: 'Suscripciones', path: '/admin/suscripciones', icon: <Briefcase size={20}/> },
    { name: 'Validaciones', path: '/admin/validaciones', icon: <ShieldCheck size={20}/> },
    { name: 'Tickets', path: '/admin/tickets', icon: <Ticket size={20}/> },
    { name: 'Descuentos', path: '/admin/descuentos', icon: <Percent size={20}/> },
  ];

  return (
    <div className="flex flex-col h-full w-64 bg-card dark:bg-gray-800/60 backdrop-blur-md border-r border-border dark:border-gray-700/50">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground dark:text-white mb-2">Administración</h2>
        <p className="text-sm text-muted-foreground dark:text-gray-400">Panel de Control</p>
      </div>
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.name}
              asChild
              variant={location.pathname === item.path ? 'default' : 'ghost'}
              className="w-full justify-start"
            >
              <Link to={item.path} className="flex items-center">
                {React.cloneElement(item.icon, { className: 'mr-3' })}
                {item.name}
              </Link>
            </Button>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
};

export default AdminSidebar;
