
import React from 'react';
import AppointmentListItem from './AppointmentListItem';

const AppointmentList = ({ appointments, onEdit, onDelete }) => {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground dark:text-gray-400">No hay citas para el día seleccionado o que coincidan con los filtros.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {appointments.map(app => (
        <AppointmentListItem 
          key={app.id} 
          appointment={app}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
};

export default AppointmentList;
