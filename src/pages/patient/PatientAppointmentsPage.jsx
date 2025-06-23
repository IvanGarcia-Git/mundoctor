import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { CalendarClock, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { es } from 'date-fns/locale';

const sampleAppointments = [
	{
		id: 'apt1',
		professional: 'Dr. Carlos Soler',
		specialty: 'Cardiología',
		date: '2025-06-10',
		time: '10:00',
		type: 'Presencial',
		status: 'confirmada',
	},
	{
		id: 'apt2',
		professional: 'Dra. Ana García',
		specialty: 'Dermatología',
		date: '2025-06-15',
		time: '16:30',
		type: 'Videoconsulta',
		status: 'pendiente',
	},
];

const PatientAppointmentsPage = () => {
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
										className="pl-10 w-full sm:w-[300px] bg-background dark:bg-slate-700 border-border dark:border-gray-600"
									/>
								</div>
							</div>
						</CardHeader>
						<CardContent>
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
									{sampleAppointments.map((apt) => (
										<TableRow key={apt.id} className="dark:border-gray-700">
											<TableCell>
												<div>
													<p className="font-medium text-foreground dark:text-white">
														{apt.professional}
													</p>
													<p className="text-sm text-muted-foreground dark:text-gray-400">
														{apt.specialty}
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
														{apt.date} - {apt.time}
													</span>
												</div>
											</TableCell>
											<TableCell className="text-muted-foreground dark:text-gray-300">
												{apt.type}
											</TableCell>
											<TableCell>{getStatusBadge(apt.status)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	);
};

export default PatientAppointmentsPage;
