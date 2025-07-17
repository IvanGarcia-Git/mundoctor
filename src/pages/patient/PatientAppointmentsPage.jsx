import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { CalendarClock, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { es } from 'date-fns/locale';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const PatientAppointmentsPage = () => {
	const [appointments, setAppointments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedDate, setSelectedDate] = useState(null);
	const { getAppointments } = usePatientApi();
	const { toast } = useToast();

	// Fetch appointments on component mount
	useEffect(() => {
		const fetchAppointments = async () => {
			try {
				setLoading(true);
				setError(null);
				
				const filters = {};
				if (selectedDate) {
					filters.startDate = format(selectedDate, 'yyyy-MM-dd');
					filters.endDate = format(selectedDate, 'yyyy-MM-dd');
				}
				
				const result = await getAppointments(filters);
				setAppointments(result.data || []);
			} catch (err) {
				console.error('Error fetching appointments:', err);
				setError(err.message || 'Error al cargar las citas');
				toast({
					title: 'Error',
					description: 'No se pudieron cargar las citas. Intenta nuevamente.',
					variant: 'destructive',
				});
			} finally {
				setLoading(false);
			}
		};

		fetchAppointments();
	}, [selectedDate, getAppointments, toast]);

	// Filter appointments based on search term
	const filteredAppointments = appointments.filter(appointment => {
		if (!searchTerm) return true;
		
		const searchLower = searchTerm.toLowerCase();
		const professionalName = appointment.professional?.name || appointment.professional || '';
		const specialty = appointment.specialty || '';
		
		return professionalName.toLowerCase().includes(searchLower) ||
		       specialty.toLowerCase().includes(searchLower);
	});

	const getStatusBadge = (status) => {
		switch (status) {
			case 'confirmada':
				return (
					<Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
						Confirmada
					</Badge>
				);
			case 'pendiente':
				return (
					<Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
						Pendiente
					</Badge>
				);
			case 'cancelada':
				return (
					<Badge className="bg-red-500/20 text-red-600 dark:text-red-400">
						Cancelada
					</Badge>
				);
			default:
				return <Badge variant="secondary">Desconocido</Badge>;
		}
	};

	return (
		<>
			<header className="mb-8">
				<h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">
					Mis Citas
				</h1>
				<p className="text-muted-foreground dark:text-gray-400">
					Gestiona tus citas médicas programadas.
				</p>
			</header>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-1 space-y-6">
					<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
						<CardHeader>
							<CardTitle className="text-foreground dark:text-white">
								Calendario
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Calendar
								mode="single"
								selected={selectedDate}
								onSelect={setSelectedDate}
								className="rounded-md border dark:border-gray-700"
								locale={es}
							/>
						</CardContent>
					</Card>
				</div>

				<div className="lg:col-span-2">
					<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
						<CardHeader>
							<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
								<div>
									<CardTitle className="text-foreground dark:text-white">
										Próximas Citas
									</CardTitle>
									<CardDescription className="text-muted-foreground dark:text-gray-400">
										Consulta y gestiona tus citas programadas.
									</CardDescription>
								</div>
								<div className="relative w-full sm:w-auto">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
									<Input
										placeholder="Buscar cita..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="pl-10 w-full sm:w-[300px] bg-background dark:bg-slate-700 border-border dark:border-gray-600"
									/>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{loading ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="h-8 w-8 animate-spin text-primary" />
									<span className="ml-2 text-muted-foreground">Cargando citas...</span>
								</div>
							) : error ? (
								<div className="text-center py-8">
									<p className="text-destructive mb-4">{error}</p>
									<Button onClick={() => window.location.reload()} variant="outline">
										Reintentar
									</Button>
								</div>
							) : filteredAppointments.length === 0 ? (
								<div className="text-center py-8">
									<p className="text-muted-foreground">
										{searchTerm ? 'No se encontraron citas que coincidan con la búsqueda.' : 'No tienes citas programadas.'}
									</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow className="dark:border-gray-700">
											<TableHead className="text-muted-foreground dark:text-gray-400">
												Profesional
											</TableHead>
											<TableHead className="text-muted-foreground dark:text-gray-400">
												Fecha y Hora
											</TableHead>
											<TableHead className="text-muted-foreground dark:text-gray-400">
												Tipo
											</TableHead>
											<TableHead className="text-muted-foreground dark:text-gray-400">
												Estado
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredAppointments.map((apt) => (
											<TableRow key={apt.id} className="dark:border-gray-700">
												<TableCell>
													<div>
														<p className="font-medium text-foreground dark:text-white">
															{apt.professional?.name || apt.professional || 'N/A'}
														</p>
														<p className="text-sm text-muted-foreground dark:text-gray-400">
															{apt.specialty || 'Sin especialidad'}
														</p>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center">
														<CalendarClock
															size={16}
															className="mr-2 text-primary dark:text-blue-400"
														/>
														<span className="text-muted-foreground dark:text-gray-300">
															{apt.appointment_date ? format(new Date(apt.appointment_date), 'dd/MM/yyyy') : apt.date || 'N/A'} - {apt.appointment_time || apt.time || 'N/A'}
														</span>
													</div>
												</TableCell>
												<TableCell className="text-muted-foreground dark:text-gray-300">
													{apt.consultation_type || apt.type || 'Presencial'}
												</TableCell>
												<TableCell>{getStatusBadge(apt.status)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	);
};

export default PatientAppointmentsPage;
