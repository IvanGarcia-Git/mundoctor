import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, FileText, Download, CheckCircle, XCircle, Eye, RefreshCw, Users, Clock } from 'lucide-react';
import { useProfessionalValidations } from '@/hooks/useProfessionalValidations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const AdminValidationPage = () => {
  const { professionals, loading, updateVerificationStatus, getStats, refetch } = useProfessionalValidations();
  const [selectedValidation, setSelectedValidation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleOpenModal = (validation) => {
    setSelectedValidation(validation);
    setIsModalOpen(true);
  };

  const handleApprove = async (id) => {
    const success = await updateVerificationStatus(id, 'approved', 'Documentación verificada y aprobada por el administrador.');
    if (success) {
      toast({ 
        title: "Validación Aprobada", 
        description: `La documentación de ${selectedValidation?.fullName || selectedValidation?.professionalName} ha sido aprobada.`
      });
      setIsModalOpen(false);
      refetch();
    } else {
      toast({ 
        title: "Error", 
        description: "No se pudo actualizar el estado de verificación.", 
        variant: "destructive" 
      });
    }
  };

  const handleReject = async (id) => {
    const success = await updateVerificationStatus(id, 'rejected', 'Documentación rechazada. Por favor, revise los documentos y vuelva a enviarlos.');
    if (success) {
      toast({ 
        title: "Validación Rechazada", 
        description: `La documentación de ${selectedValidation?.fullName || selectedValidation?.professionalName} ha sido rechazada.`, 
        variant: "destructive" 
      });
      setIsModalOpen(false);
      refetch();
    } else {
      toast({ 
        title: "Error", 
        description: "No se pudo actualizar el estado de verificación.", 
        variant: "destructive" 
      });
    }
  };
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <Badge variant="warning" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"><ShieldAlert className="mr-1 h-3 w-3"/>Pendiente</Badge>;
      case 'approved': return <Badge variant="success" className="bg-green-500/20 text-green-700 dark:text-green-300"><ShieldCheck className="mr-1 h-3 w-3"/>Aprobado</Badge>;
      case 'rejected': return <Badge variant="destructive" className="bg-red-500/20 text-red-700 dark:text-red-300"><XCircle className="mr-1 h-3 w-3"/>Rechazado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Cargando validaciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Validación de Profesionales</h1>
        <p className="text-muted-foreground dark:text-gray-400">Revisa y aprueba la documentación de los nuevos profesionales.</p>
      </header>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card dark:bg-gray-800/60 p-4 rounded-lg border border-border dark:border-gray-700/50">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card dark:bg-gray-800/60 p-4 rounded-lg border border-border dark:border-gray-700/50">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card dark:bg-gray-800/60 p-4 rounded-lg border border-border dark:border-gray-700/50">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Aprobados</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card dark:bg-gray-800/60 p-4 rounded-lg border border-border dark:border-gray-700/50">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rechazados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {professionals.map((professional) => (
          <div key={professional.id} className="bg-card dark:bg-gray-800/60 backdrop-blur-md p-5 rounded-xl border border-border dark:border-gray-700/50 shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-semibold text-foreground dark:text-white">{professional.fullName || professional.professionalName}</h2>
              {getStatusBadge(professional.status)}
            </div>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-1"><span className="font-medium">Email:</span> {professional.email}</p>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-1"><span className="font-medium">Colegiado:</span> {professional.collegiateNumber}</p>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-1"><span className="font-medium">DNI:</span> {professional.dni}</p>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4"><span className="font-medium">Enviado:</span> {new Date(professional.submittedAt).toLocaleDateString('es-ES')}</p>
            
            {professional.notes && <p className="text-xs italic text-amber-600 dark:text-amber-400 mb-3 p-2 bg-amber-500/10 rounded-md">Nota: {professional.notes}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => handleOpenModal(professional)}>
                <Eye className="mr-1.5 h-4 w-4" /> Revisar
              </Button>
            </div>
          </div>
        ))}
        {professionals.length === 0 && (
            <div className="col-span-full text-center py-10">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground dark:text-gray-400 text-lg">No hay validaciones registradas</p>
              <p className="text-sm text-muted-foreground dark:text-gray-500">Los profesionales aparecerán aquí cuando se registren</p>
            </div>
        )}
      </div>

      {selectedValidation && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card dark:bg-gray-800 text-foreground dark:text-white border-border dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl">Revisar Documentación: {selectedValidation.fullName}</DialogTitle>
              <DialogDescription className="text-muted-foreground dark:text-gray-400">
                Documentación profesional - Enviado el {new Date(selectedValidation.submittedAt).toLocaleDateString('es-ES')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><span className="font-semibold">Profesional:</span> {selectedValidation.fullName}</p>
                  <p><span className="font-semibold">Email:</span> {selectedValidation.email}</p>
                </div>
                <div>
                  <p><span className="font-semibold">Número de Colegiado:</span> {selectedValidation.collegiateNumber}</p>
                  <p><span className="font-semibold">DNI:</span> {selectedValidation.dni}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Documentos Enviados:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/50 dark:bg-gray-700/50 rounded-md text-center">
                    <FileText size={32} className="mx-auto text-primary dark:text-blue-400 mb-2" />
                    <p className="text-sm font-medium">Imagen DNI</p>
                    <p className="text-xs text-muted-foreground">{selectedValidation.documentsSubmitted?.dniImage || 'documento_dni.pdf'}</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 dark:bg-gray-700/50 rounded-md text-center">
                    <FileText size={32} className="mx-auto text-primary dark:text-blue-400 mb-2" />
                    <p className="text-sm font-medium">Titulación</p>
                    <p className="text-xs text-muted-foreground">{selectedValidation.documentsSubmitted?.universityDegree || 'titulacion.pdf'}</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 dark:bg-gray-700/50 rounded-md text-center">
                    <FileText size={32} className="mx-auto text-primary dark:text-blue-400 mb-2" />
                    <p className="text-sm font-medium">Colegiación</p>
                    <p className="text-xs text-muted-foreground">{selectedValidation.documentsSubmitted?.collegiationCertificate || 'colegiacion.pdf'}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  En una implementación real, aquí estarían los enlaces para descargar los documentos
                </p>
              </div>
              
              {selectedValidation.notes && <p className="text-xs italic text-amber-600 dark:text-amber-400 mt-3 p-2 bg-amber-500/10 rounded-md">Nota existente: {selectedValidation.notes}</p>}
            </div>
            {selectedValidation.status === 'pending' && (
                <DialogFooter className="gap-2 sm:justify-end">
                    <Button variant="destructive" onClick={() => handleReject(selectedValidation.id)}>
                        <XCircle className="mr-1.5 h-4 w-4"/> Rechazar
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(selectedValidation.id)}>
                        <CheckCircle className="mr-1.5 h-4 w-4"/> Aprobar
                    </Button>
                </DialogFooter>
            )}
            {selectedValidation.status !== 'pending' && (
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
                 </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminValidationPage;
