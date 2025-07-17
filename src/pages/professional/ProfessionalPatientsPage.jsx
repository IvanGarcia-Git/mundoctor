import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, Search, User, Mail, Phone, MoreHorizontal, Eye, Edit2, Trash2, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/ClerkAuthContext';
import { professionalApi } from '@/lib/clerkApi';
import { format } from 'date-fns';

const ProfessionalPatientsPage = () => {
	const [patients, setPatients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [currentPatient, setCurrentPatient] = useState(null);
	const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' });
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();
	const { user } = useAuth();

	// Load patients from API
	useEffect(() => {
		const loadPatients = async () => {
			try {
				setLoading(true);
				setError(null);
				
				const patientsData = await professionalApi.getPatients({
					limit: 100 // Load first 100 patients
				});
				
				setPatients(patientsData.data || patientsData.patients || []);
				
			} catch (err) {
				console.error('Error loading patients:', err);
				setError(err.message || 'Error al cargar los pacientes');
				toast({
					title: 'Error',
					description: 'No se pudieron cargar los pacientes. Intenta nuevamente.',
					variant: 'destructive',
				});
			} finally {
				setLoading(false);
			}
		};

		loadPatients();
	}, [toast]);

	const filteredPatients = patients.filter(patient => {
		if (!searchTerm) return true;
		
		const searchLower = searchTerm.toLowerCase();
		const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.name || '';
		const patientEmail = patient.email || '';
		
		return patientName.toLowerCase().includes(searchLower) ||
		       patientEmail.toLowerCase().includes(searchLower);
	});

	const openFormModal = (patient = null) => {
		if (patient) {
			setCurrentPatient(patient);
			setFormData({ ...patient });
		} else {
			setCurrentPatient(null);
			setFormData({ name: '', email: '', phone: '', notes: '' });
		}
		setIsFormOpen(true);
	};
	
	const handleFormChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleFormSubmit = async (e) => {
		e.preventDefault();
		
		try {
			setIsSubmitting(true);
			
			// Note: This would typically involve creating/updating patient records
			// For now, we'll just update the local state and show a success message
			if (currentPatient) {
				// Update existing patient
				setPatients(pats => pats.map(p => 
					p.id === currentPatient.id 
						? { ...p, ...formData, first_name: formData.name.split(' ')[0], last_name: formData.name.split(' ').slice(1).join(' ') }
						: p
				));
				
				toast({
					title: 'Éxito',
					description: 'Información del paciente actualizada correctamente.',
					variant: 'default',
				});
			} else {
				// Add new patient (this would typically call an API)
				const newPatient = {
					id: `p${Date.now()}`,
					first_name: formData.name.split(' ')[0],
					last_name: formData.name.split(' ').slice(1).join(' '),
					email: formData.email,
					phone: formData.phone,
					notes: formData.notes,
					last_appointment_date: null,
					total_appointments: 0,
					profile_completed: false
				};
				
				setPatients(pats => [...pats, newPatient]);
				
				toast({
					title: 'Éxito',
					description: 'Paciente agregado correctamente.',
					variant: 'default',
				});
			}
			
			setIsFormOpen(false);
			
		} catch (err) {
			console.error('Error handling patient form:', err);
			toast({
				title: 'Error',
				description: 'No se pudo guardar la información del paciente.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const deletePatient = (id) => {
		setPatients(pats => pats.filter(p => p.id !== id));
		toast({
			title: 'Paciente eliminado',
			description: 'El paciente ha sido eliminado correctamente.',
			variant: 'default',
		});
	};

	const resendSetupEmail = (patient) => {
		// This would typically send an email to the patient
		toast({
			title: 'Email enviado',
			description: `Email de configuración enviado a ${patient.email || 'el paciente'}.`,
			variant: 'default',
		});
	};

	return (
		<>
			<header className="mb-8">
				<h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">Gestión de Pacientes</h1>
				<p className="text-muted-foreground dark:text-gray-400">Consulta y administra la información de tus pacientes.</p>
			</header>

			<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
				<CardHeader>
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<CardTitle className="text-foreground dark:text-white">Listado de Pacientes</CardTitle>
							<CardDescription className="text-muted-foreground dark:text-gray-400">Visualiza y gestiona tus pacientes.</CardDescription>
						</div>
						<div className="flex gap-2 w-full sm:w-auto">
							<div className="relative flex-grow sm:flex-grow-0">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
								<Input
									type="text"
									placeholder="Buscar paciente..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 w-full bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
								/>
							</div>
							<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
								<DialogTrigger asChild>
									<Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => openFormModal()}>
										<PlusCircle size={18} className="mr-2" /> Añadir Paciente
									</Button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-[425px] bg-card dark:bg-gray-800 border-border dark:border-gray-700">
									<DialogHeader>
										<DialogTitle className="text-foreground dark:text-white">{currentPatient ? 'Editar Paciente' : 'Nuevo Paciente'}</DialogTitle>
									</DialogHeader>
									<form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
										<div>
											<Label htmlFor="name" className="text-foreground dark:text-gray-300">Nombre</Label>
											<Input id="name" name="name" value={formData.name} onChange={handleFormChange} required className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white" />
										</div>
										<div>
											<Label htmlFor="email" className="text-foreground dark:text-gray-300">Email</Label>
											<Input id="email" name="email" type="email" value={formData.email} onChange={handleFormChange} className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white" />
										</div>
										<div>
											<Label htmlFor="phone" className="text-foreground dark:text-gray-300">Teléfono</Label>
											<Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleFormChange} className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white" />
										</div>
										<div>
											<Label htmlFor="notes" className="text-foreground dark:text-gray-300">Notas</Label>
											<Input id="notes" name="notes" value={formData.notes} onChange={handleFormChange} className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white" />
										</div>
										<DialogFooter>
											<DialogClose asChild><Button type="button" variant="outline" className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">Cancelar</Button></DialogClose>
											<Button 
												type="submit" 
												disabled={isSubmitting}
												className="bg-primary hover:bg-primary/90 text-primary-foreground"
											>
												{isSubmitting ? (
													<>
														<Loader2 size={16} className="mr-2 animate-spin" />
														{currentPatient ? 'Actualizando...' : 'Creando...'}
													</>
												) : (
													'Guardar'
												)}
											</Button>
										</DialogFooter>
									</form>
								</DialogContent>
							</Dialog>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
							<span className="ml-2 text-muted-foreground">Cargando pacientes...</span>
						</div>
					) : error ? (
						<div className="text-center py-8">
							<p className="text-destructive mb-4">{error}</p>
							<Button onClick={() => window.location.reload()} variant="outline">
								Reintentar
							</Button>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="dark:border-gray-700">
									<TableHead className="text-muted-foreground dark:text-gray-400"><User size={16} className="inline mr-1" /> Nombre</TableHead>
									<TableHead className="text-muted-foreground dark:text-gray-400 hidden md:table-cell"><Mail size={16} className="inline mr-1" /> Email</TableHead>
									<TableHead className="text-muted-foreground dark:text-gray-400 hidden lg:table-cell"><Phone size={16} className="inline mr-1" /> Teléfono</TableHead>
									<TableHead className="text-muted-foreground dark:text-gray-400 hidden sm:table-cell">Última Cita</TableHead>
									<TableHead className="text-muted-foreground dark:text-gray-400 text-right">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredPatients.length > 0 ? filteredPatients.map(patient => {
									const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.name || 'Sin nombre';
									const lastAppointment = patient.last_appointment_date 
										? format(new Date(patient.last_appointment_date), 'dd/MM/yyyy')
										: patient.lastAppointment || 'N/A';
									
									return (
								<TableRow key={patient.id} className="dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-700/30">
									<TableCell className="font-medium text-foreground dark:text-white">{patientName}</TableCell>
									<TableCell className="text-muted-foreground dark:text-gray-300 hidden md:table-cell">{patient.email || 'Sin email'}</TableCell>
									<TableCell className="text-muted-foreground dark:text-gray-300 hidden lg:table-cell">{patient.phone || 'Sin teléfono'}</TableCell>
									<TableCell className="text-muted-foreground dark:text-gray-300 hidden sm:table-cell">{lastAppointment}</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center gap-2 justify-end">
											{patient.profile_completed || patient.profileCompleted ? (
												<Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300">
													Perfil Completo
												</Badge>
											) : (
												<Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-300">
													<AlertCircle size={12} className="mr-1" />
													Pendiente
												</Badge>
											)}
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400">
														<span className="sr-only">Abrir menú</span>
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="bg-popover dark:bg-slate-800 border-border dark:border-gray-700 text-popover-foreground dark:text-white">
													<DropdownMenuLabel>Acciones</DropdownMenuLabel>
													<DropdownMenuItem onClick={() => openFormModal(patient)} className="hover:!bg-muted/80 dark:hover:!bg-gray-700/50">
														<Edit2 size={14} className="mr-2" /> Editar
													</DropdownMenuItem>
													{!(patient.profile_completed || patient.profileCompleted) && (
														<DropdownMenuItem onClick={() => resendSetupEmail(patient)} className="hover:!bg-muted/80 dark:hover:!bg-gray-700/50">
															<UserPlus size={14} className="mr-2" /> Reenviar Email Setup
														</DropdownMenuItem>
													)}
													<DropdownMenuItem className="hover:!bg-muted/80 dark:hover:!bg-gray-700/50">
														<Eye size={14} className="mr-2" /> Ver Detalles (Próx.)
													</DropdownMenuItem>
													<DropdownMenuSeparator className="dark:bg-gray-700" />
													<DropdownMenuItem onClick={() => deletePatient(patient.id)} className="text-destructive hover:!bg-destructive/10 dark:hover:!bg-red-700/30 focus:text-destructive focus:bg-destructive/10">
														<Trash2 size={14} className="mr-2" /> Eliminar
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</TableCell>
								</TableRow>
									);
								}) : (
								<TableRow>
									<TableCell colSpan={5} className="h-24 text-center text-muted-foreground dark:text-gray-400">
										No se encontraron pacientes.
									</TableCell>
								</TableRow>
							)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</>
	);
};

export default ProfessionalPatientsPage;
