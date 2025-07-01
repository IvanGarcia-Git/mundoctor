import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, Search, User, Mail, Phone, MoreHorizontal, Eye, Edit2, Trash2, UserPlus, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/ClerkAuthContext';
import { emailService } from '@/lib/emailService';

const samplePatients = [
	{
		id: 'p1',
		name: 'Elena Navarro',
		email: 'elena.n@example.com',
		phone: '600112233',
		lastAppointment: '2025-05-20',
		totalAppointments: 5,
		notes: 'Alergia a penicilina.',
	},
	{
		id: 'p2',
		name: 'Roberto Sanz',
		email: 'roberto.s@example.com',
		phone: '611223344',
		lastAppointment: '2025-05-15',
		totalAppointments: 2,
		notes: 'Hipertensión controlada.',
	},
	{
		id: 'p3',
		name: 'Lucía Jimenez',
		email: 'lucia.j@example.com',
		phone: '622334455',
		lastAppointment: '2025-04-28',
		totalAppointments: 8,
		notes: '',
	},
	{
		id: 'p4',
		name: 'Marcos Alonso',
		email: 'marcos.a@example.com',
		phone: '633445566',
		lastAppointment: '2025-05-02',
		totalAppointments: 3,
		notes: 'Necesita seguimiento anual.',
	},
];

const ProfessionalPatientsPage = () => {
	const [patients, setPatients] = useState(samplePatients);
	const [searchTerm, setSearchTerm] = useState('');
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [currentPatient, setCurrentPatient] = useState(null);
	const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' });
	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();
	const { user } = useAuth();

	const filteredPatients = patients.filter(patient =>
		patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		patient.email.toLowerCase().includes(searchTerm.toLowerCase())
	);

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

	const handleFormSubmit = (e) => {
		e.preventDefault();
		if (currentPatient) {
			setPatients(pats => pats.map(p => p.id === currentPatient.id ? { ...formData, id: p.id, lastAppointment: p.lastAppointment, totalAppointments: p.totalAppointments } : p));
		} else {
			setPatients(pats => [...pats, { ...formData, id: `p${Date.now()}`, lastAppointment: 'N/A', totalAppointments: 0 }]);
		}
		setIsFormOpen(false);
	};

	const deletePatient = (id) => {
		setPatients(pats => pats.filter(p => p.id !== id));
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
												disabled={isLoading}
												className="bg-primary hover:bg-primary/90 text-primary-foreground"
											>
												{isLoading ? (currentPatient ? 'Actualizando...' : 'Creando...') : 'Guardar'}
											</Button>
										</DialogFooter>
									</form>
								</DialogContent>
							</Dialog>
						</div>
					</div>
				</CardHeader>
				<CardContent>
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
							{filteredPatients.length > 0 ? filteredPatients.map(patient => (
								<TableRow key={patient.id} className="dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-700/30">
									<TableCell className="font-medium text-foreground dark:text-white">{patient.name}</TableCell>
									<TableCell className="text-muted-foreground dark:text-gray-300 hidden md:table-cell">{patient.email}</TableCell>
									<TableCell className="text-muted-foreground dark:text-gray-300 hidden lg:table-cell">{patient.phone}</TableCell>
									<TableCell className="text-muted-foreground dark:text-gray-300 hidden sm:table-cell">{patient.lastAppointment}</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center gap-2 justify-end">
											{patient.profileCompleted ? (
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
													{!patient.profileCompleted && (
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
							)) : (
								<TableRow>
									<TableCell colSpan={5} className="h-24 text-center text-muted-foreground dark:text-gray-400">
										No se encontraron pacientes.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</>
	);
};

export default ProfessionalPatientsPage;
