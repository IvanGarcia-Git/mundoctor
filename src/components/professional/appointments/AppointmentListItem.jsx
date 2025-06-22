
import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Edit2, Trash2, Video, MapPin } from 'lucide-react';
import { getStatusColor } from '@/data/appointmentsData';

const AppointmentListItem = ({ appointment, onEdit, onDelete }) => {
  return (
    <li className="p-4 rounded-lg border dark:border-gray-700 bg-background/50 dark:bg-slate-900/30 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg text-foreground dark:text-white">{appointment.patientName}</h3>
          <p className="text-sm text-muted-foreground dark:text-gray-400">{appointment.time} - {appointment.type}</p>
          <p className="text-xs text-muted-foreground dark:text-gray-500 mt-1">{appointment.details}</p>
          {appointment.type === 'Videoconsulta' && appointment.link && (
             <a href={appointment.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center mt-1 dark:text-blue-400">
               <Video size={14} className="mr-1" /> Enlace Videoconsulta <ExternalLink size={12} className="ml-1"/>
             </a>
          )}
          {appointment.type === 'Presencial' && appointment.address && (
             <p className="text-xs text-primary flex items-center mt-1 dark:text-blue-400">
               <MapPin size={14} className="mr-1" /> {appointment.address}
             </p>
          )}
        </div>
        <div className="flex flex-col items-end mt-2 sm:mt-0">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>{appointment.status}</span>
          <div className="flex gap-1 sm:gap-2 mt-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400" onClick={() => onEdit(appointment)}>
              <Edit2 size={16} />
               <span className="sr-only">Editar cita</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive" onClick={() => onDelete(appointment.id)}>
              <Trash2 size={16} />
              <span className="sr-only">Eliminar cita</span>
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
};

export default AppointmentListItem;
