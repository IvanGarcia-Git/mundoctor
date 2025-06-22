
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, CalendarCheck, UserPlus, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from 'react-router-dom';

const sampleNotifications = [
  { id: 1, icon: <CalendarCheck className="h-4 w-4 text-green-500" />, title: "Nueva cita confirmada", description: "Ana Pérez ha confirmado su cita para mañana a las 10:00.", time: "Hace 5m", read: false, link: "/profesionales/citas" },
  { id: 2, icon: <MessageSquare className="h-4 w-4 text-blue-500" />, title: "Nuevo mensaje", description: "Carlos López te ha enviado un mensaje.", time: "Hace 30m", read: false, link: "/profesionales/mensajes" },
  { id: 3, icon: <UserPlus className="h-4 w-4 text-purple-500" />, title: "Nuevo paciente registrado", description: "Sofía Martín se ha registrado como nueva paciente.", time: "Hace 1h", read: true, link: "/profesionales/pacientes" },
  { id: 4, icon: <AlertCircle className="h-4 w-4 text-yellow-500" />, title: "Recordatorio: Actualizar perfil", description: "Completa tu perfil para mayor visibilidad.", time: "Ayer", read: true, link: "/profesionales/perfil" },
  { id: 5, icon: <CalendarCheck className="h-4 w-4 text-red-500" />, title: "Cita cancelada", description: "Luis Fernández ha cancelado su cita del Viernes.", time: "Hace 2 días", read: true, link: "/profesionales/citas" },
];

const NotificationsDropdown = ({ isMobile = false, onOpenChange }) => {
  const unreadCount = sampleNotifications.filter(n => !n.read).length;

  const TriggerButton = React.forwardRef((props, ref) => (
     <Button {...props} ref={ref} variant="ghost" size="icon" className={`relative text-muted-foreground hover:text-foreground ${isMobile ? 'w-full justify-center' : 'inline-flex'}`}> {/* Changed hidden md:inline-flex to inline-flex */}
        <Bell size={isMobile ? 22 : 20} />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 min-w-min p-0.5 text-xs flex items-center justify-center">
            {unreadCount}
          </Badge>
        )}
        <span className="sr-only">Notificaciones</span>
      </Button>
  ));
  TriggerButton.displayName = 'TriggerButton';


  return (
    <DropdownMenu onOpenChange={isMobile ? onOpenChange : undefined}>
      <DropdownMenuTrigger asChild>
        <TriggerButton />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96 bg-card dark:bg-gray-800 border-border dark:border-gray-700">
        <DropdownMenuLabel className="flex justify-between items-center text-foreground dark:text-white">
          <span>Notificaciones</span>
          {unreadCount > 0 && <Badge variant="secondary" className="dark:bg-slate-700 dark:text-gray-300">{unreadCount} Nuevas</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="dark:bg-gray-700/50" />
        {sampleNotifications.length > 0 ? (
          <ScrollArea className="h-[300px]">
            {sampleNotifications.map(notification => (
              <DropdownMenuItem key={notification.id} asChild className={`cursor-pointer hover:!bg-muted/80 dark:hover:!bg-gray-700/50 ${!notification.read ? 'bg-primary/5 dark:bg-blue-500/10' : ''}`}>
                <Link to={notification.link || '#'} className="flex items-start gap-3 p-2">
                  <div className="flex-shrink-0 mt-0.5">{notification.icon}</div>
                  <div className="flex-grow">
                    <p className={`text-sm font-medium ${!notification.read ? 'text-foreground dark:text-white font-semibold' : 'text-muted-foreground dark:text-gray-300'}`}>{notification.title}</p>
                    <p className={`text-xs ${!notification.read ? 'text-foreground/80 dark:text-gray-200' : 'text-muted-foreground/80 dark:text-gray-400'}`}>{notification.description}</p>
                    <p className="text-xs text-muted-foreground/60 dark:text-gray-500 mt-0.5">{notification.time}</p>
                  </div>
                  {!notification.read && <div className="h-2 w-2 rounded-full bg-primary dark:bg-blue-500 self-center flex-shrink-0"></div>}
                </Link>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground dark:text-gray-400">No tienes notificaciones.</div>
        )}
        <DropdownMenuSeparator className="dark:bg-gray-700/50" />
        <DropdownMenuItem className="justify-center text-sm text-primary dark:text-blue-400 hover:!bg-muted/80 dark:hover:!bg-gray-700/50 cursor-pointer">
          <Link to="/profesionales/configuracion?tab=notifications">Ver todas las notificaciones</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
