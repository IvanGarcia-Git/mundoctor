import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ServicesList from './ServicesList';
import ServiceForm from './ServiceForm';
import { useToast } from '@/components/ui/use-toast';
import { servicesApi } from '@/lib/servicesApi';
import { useAuth } from '@/contexts/ClerkAuthContext';

const ServicesManager = () => {
  const [services, setServices] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadServices();
  }, [user.id]);

  const loadServices = async () => {
    try {
      const loadedServices = await servicesApi.getServices(user.id);
      setServices(loadedServices);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los servicios.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateService = async (newService) => {
    try {
      const createdService = await servicesApi.createService(user.id, newService);
      setServices([...services, createdService]);
      toast({
        title: "Servicio creado",
        description: "El nuevo servicio ha sido creado correctamente.",
      });
      setIsFormOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el servicio.",
        variant: "destructive"
      });
    }
  };

  const handleEditService = async (serviceData) => {
    try {
      const updatedService = await servicesApi.updateService(editingService.id, serviceData);
      setServices(services.map(service =>
        service.id === editingService.id ? updatedService : service
      ));
      toast({
        title: "Servicio actualizado",
        description: "Los cambios han sido guardados correctamente.",
      });
      setEditingService(null);
      setIsFormOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el servicio.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (serviceId) => {
    try {
      await servicesApi.deleteService(serviceId);
      setServices(services.filter(service => service.id !== serviceId));
      toast({
        title: "Servicio eliminado",
        description: "El servicio ha sido eliminado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio.",
        variant: "destructive"
      });
    }
  };

  const openEditForm = (service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingService(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Cargando servicios...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Servicios</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona los servicios que ofreces a tus pacientes
          </p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nuevo Servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            No tienes servicios configurados todavía
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            Crear tu primer servicio
          </Button>
        </div>
      ) : (
        <ServicesList
          services={services}
          onEdit={openEditForm}
          onDelete={handleDelete}
        />
      )}

      <ServiceForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={editingService ? handleEditService : handleCreateService}
        initialData={editingService}
      />
    </div>
  );
};

export default ServicesManager;
