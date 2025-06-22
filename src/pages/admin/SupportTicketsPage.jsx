import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { MessageSquare, Clock } from 'lucide-react';

const mockTickets = [
  {
    id: 'T-1001',
    subject: 'Problema con el calendario',
    user: 'Dr. Juan Pérez',
    status: 'pending',
    priority: 'high',
    created: '2025-06-01',
    lastUpdate: '2025-06-02',
  },
  {
    id: 'T-1002',
    subject: 'Error en facturación',
    user: 'Dra. María García',
    status: 'inProgress',
    priority: 'medium',
    created: '2025-06-03',
    lastUpdate: '2025-06-04',
  },
  {
    id: 'T-1003',
    subject: 'Consulta sobre suscripción',
    user: 'Dr. Carlos Ruiz',
    status: 'resolved',
    priority: 'low',
    created: '2025-06-01',
    lastUpdate: '2025-06-05',
  },
];

const SupportTicketsPage = () => {
  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Gestión de Tickets de Soporte
        </h1>
        <p className="text-muted-foreground">
          Administra y responde a las solicitudes de soporte.
        </p>
      </header>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="inProgress">En Proceso</SelectItem>
              <SelectItem value="resolved">Resueltos</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {mockTickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">
                      {ticket.subject}
                    </h3>
                    <Badge
                      variant={
                        ticket.status === 'pending'
                          ? 'destructive'
                          : ticket.status === 'inProgress'
                          ? 'default'
                          : 'success'
                      }
                    >
                      {ticket.status === 'pending'
                        ? 'Pendiente'
                        : ticket.status === 'inProgress'
                        ? 'En Proceso'
                        : 'Resuelto'}
                    </Badge>
                    <Badge
                      variant={
                        ticket.priority === 'high'
                          ? 'destructive'
                          : ticket.priority === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {ticket.priority === 'high'
                        ? 'Alta'
                        : ticket.priority === 'medium'
                        ? 'Media'
                        : 'Baja'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Usuario: {ticket.user}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={16} />
                      Creado: {ticket.created}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={16} />
                      Última actualización: {ticket.lastUpdate}
                    </span>
                  </div>
                </div>
                <Button variant="default">Ver Detalles</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SupportTicketsPage;
