import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, FileText, Download, CheckCircle, XCircle, Eye } from 'lucide-react';
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

const sampleValidations = [
  { id: 'val_001', professionalName: 'Dra. Elena Marco', professionalEmail: 'elena.marco@mail.net', documentType: 'Título Especialista', dateSubmitted: '2023-04-10', status: 'pending', documentUrl: '#simulated-doc-url-1', notes: '' },
  { id: 'val_002', professionalName: 'Dr. Luis Torres', professionalEmail: 'luis.t@example.com', documentType: 'Número Colegiado', dateSubmitted: '2023-04-12', status: 'pending', documentUrl: '#simulated-doc-url-2', notes: 'Verificar con colegio médico.' },
  { id: 'val_003', professionalName: 'Dra. Ana Fuentes', professionalEmail: 'ana.fuentes@clinic.es', documentType: 'Seguro Responsabilidad Civil', dateSubmitted: '2023-03-25', status: 'approved', documentUrl: '#simulated-doc-url-3', notes: 'Validado por equipo legal.' },
  { id: 'val_004', professionalName: 'Dr. Pablo Casas', professionalEmail: 'p.casas@hospital.org', documentType: 'Certificado Colegiación', dateSubmitted: '2023-03-15', status: 'rejected', documentUrl: '#simulated-doc-url-4', notes: 'Documento ilegible, solicitar reenvío.' },
];

const AdminValidationPage = () => {
  const [validations, setValidations] = useState(sampleValidations);
  const [selectedValidation, setSelectedValidation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleOpenModal = (validation) => {
    setSelectedValidation(validation);
    setIsModalOpen(true);
  };

  const handleApprove = (id) => {
    setValidations(validations.map(v => v.id === id ? { ...v, status: 'approved' } : v));
    toast({ title: "Validación Aprobada", description: `La documentación de ${selectedValidation?.professionalName} ha sido aprobada.`});
    setIsModalOpen(false);
  };

  const handleReject = (id) => {
    setValidations(validations.map(v => v.id === id ? { ...v, status: 'rejected', notes: 'Rechazado: (Motivo pendiente)' } : v));
    toast({ title: "Validación Rechazada", description: `La documentación de ${selectedValidation?.professionalName} ha sido rechazada.`, variant: "destructive" });
    setIsModalOpen(false);
  };
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <Badge variant="warning" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"><ShieldAlert className="mr-1 h-3 w-3"/>Pendiente</Badge>;
      case 'approved': return <Badge variant="success" className="bg-green-500/20 text-green-700 dark:text-green-300"><ShieldCheck className="mr-1 h-3 w-3"/>Aprobado</Badge>;
      case 'rejected': return <Badge variant="destructive" className="bg-red-500/20 text-red-700 dark:text-red-300"><XCircle className="mr-1 h-3 w-3"/>Rechazado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Validación de Profesionales</h1>
        <p className="text-muted-foreground dark:text-gray-400">Revisa y aprueba la documentación de los nuevos profesionales.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {validations.map((validation) => (
          <div key={validation.id} className="bg-card dark:bg-gray-800/60 backdrop-blur-md p-5 rounded-xl border border-border dark:border-gray-700/50 shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-semibold text-foreground dark:text-white">{validation.professionalName}</h2>
              {getStatusBadge(validation.status)}
            </div>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-1"><span className="font-medium">Email:</span> {validation.professionalEmail}</p>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-1"><span className="font-medium">Documento:</span> {validation.documentType}</p>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4"><span className="font-medium">Enviado:</span> {validation.dateSubmitted}</p>
            
            {validation.notes && <p className="text-xs italic text-amber-600 dark:text-amber-400 mb-3 p-2 bg-amber-500/10 rounded-md">Nota: {validation.notes}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => handleOpenModal(validation)}>
                <Eye className="mr-1.5 h-4 w-4" /> Revisar
              </Button>
            </div>
          </div>
        ))}
        {validations.length === 0 && (
            <p className="text-center py-10 text-muted-foreground dark:text-gray-400">No hay validaciones pendientes.</p>
        )}
      </div>

      {selectedValidation && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card dark:bg-gray-800 text-foreground dark:text-white border-border dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl">Revisar Documentación: {selectedValidation.professionalName}</DialogTitle>
              <DialogDescription className="text-muted-foreground dark:text-gray-400">
                {selectedValidation.documentType} - Enviado el {selectedValidation.dateSubmitted}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p><span className="font-semibold">Profesional:</span> {selectedValidation.professionalName}</p>
              <p><span className="font-semibold">Email:</span> {selectedValidation.professionalEmail}</p>
              <div className="mt-2 p-4 bg-muted/50 dark:bg-gray-700/50 rounded-md text-center">
                <FileText size={48} className="mx-auto text-primary dark:text-blue-400 mb-3" />
                <p className="font-medium mb-1">Documento Adjunto</p>
                <a 
                    href={selectedValidation.documentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center text-sm text-blue-500 dark:text-blue-400 hover:underline"
                >
                    Ver/Descargar Documento <Download className="ml-1.5 h-4 w-4" />
                </a>
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
