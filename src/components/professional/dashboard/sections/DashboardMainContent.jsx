
import React from 'react';
import QuickActionsSection from './QuickActionsSection';
import CalendarPreviewSection from './CalendarPreviewSection';
import { quickLinksData } from '@/data/professionalDashboardData';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { MessageSquare, Users, BarChart2, Bell } from 'lucide-react';

const DashboardMainContent = () => {
  return (
    <div>
      <QuickActionsSection quickLinks={quickLinksData} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2">
          <CalendarPreviewSection />
        </div>
        <div className="lg:col-span-1">
           <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg h-full">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white flex items-center">
                <Bell size={22} className="mr-2 text-primary dark:text-blue-400" />
                Actividad Reciente
              </CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400">
                Un resumen de las últimas novedades.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    <li className="flex items-start space-x-3">
                        <Users size={18} className="text-blue-500 mt-1 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-foreground dark:text-gray-200">Marta Sánchez se registró como nueva paciente</p>
                            <p className="text-xs text-muted-foreground dark:text-gray-400">Hace 1 hora</p>
                        </div>
                    </li>
                    <li className="flex items-start space-x-3">
                        <BarChart2 size={18} className="text-purple-500 mt-1 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-foreground dark:text-gray-200">Tu informe de estadísticas de Mayo está listo</p>
                            <p className="text-xs text-muted-foreground dark:text-gray-400">Ayer</p>
                        </div>
                    </li>
                </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardMainContent;
