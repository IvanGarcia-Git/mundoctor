import { ProfessionalService } from '@/types/services';
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, Calendar, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ServicesListProps {
  services: ProfessionalService[];
  onEdit: (service: ProfessionalService) => void;
  onDelete: (serviceId: number) => void;
}

const ServicesList: React.FC<ServicesListProps> = ({ services, onEdit, onDelete }) => {
  const { toast } = useToast();

  const handleDelete = (serviceId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      onDelete(serviceId);
      toast({
        title: "Servicio eliminado",
        description: "El servicio ha sido eliminado correctamente.",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <Card key={service.id} className="p-6 relative group">
          <div className="absolute top-4 right-4 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(service)}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(service.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">{service.description}</p>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              <span>{service.duration} min</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="h-4 w-4 mr-2" />
              <span>{service.patientsPerDay} pacientes/día</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{service.appointmentsPerDay} citas/día</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-2xl font-bold">{service.price}€</div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ServicesList;
