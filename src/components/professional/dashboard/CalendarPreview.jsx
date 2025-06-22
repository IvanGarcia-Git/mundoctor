
import React from 'react';
import { CalendarDays, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const sampleTodayAppointments = [
  { time: '10:00', patient: 'Ana Pérez', type: 'Videoconsulta' },
  { time: '11:30', patient: 'Carlos López', type: 'Presencial' },
];

const CalendarPreview = () => {
  return (
    <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground dark:text-white flex items-center">
          <CalendarDays size={22} className="mr-2 text-primary dark:text-blue-400"/>
          Citas de Hoy
        </CardTitle>
        <Button asChild variant="outline" size="sm" className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
          <Link to="/profesionales/citas">
            <PlusCircle size={16} className="mr-1.5" /> Ver Todas
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {sampleTodayAppointments.length > 0 ? (
          <ul className="space-y-3">
            {sampleTodayAppointments.map((app, index) => (
              <li key={index} className="p-3 rounded-md bg-background/50 dark:bg-slate-900/30 border dark:border-gray-700/60 flex justify-between items-center">
                <div>
                  <p className="font-medium text-foreground dark:text-gray-200">{app.time} - {app.patient}</p>
                  <p className="text-xs text-muted-foreground dark:text-gray-400">{app.type}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-300">Próxima</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground dark:text-gray-400 text-center py-4">No tienes citas programadas para hoy.</p>
        )}
        <div className="mt-4 text-center">
             <Button asChild variant="link" className="text-primary dark:text-blue-400">
                <Link to="/profesionales/citas">Gestionar calendario completo</Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarPreview;
