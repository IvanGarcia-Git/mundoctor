import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CalendarClock, Star, MessageSquare, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/ClerkAuthContext';
import { userApi } from '@/lib/clerkApi';
import { useToast } from "@/components/ui/use-toast";

const PatientDashboardPage = () => {
	const { user } = useAuth();
	const { toast } = useToast();
	const [stats, setStats] = useState([]);
	const [recentDoctors, setRecentDoctors] = useState([]);
	const [upcomingAppointments, setUpcomingAppointments] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadPatientData = async () => {
			try {
				setIsLoading(true);

				// Load data from API
				const [statsResponse, appointmentsResponse] = await Promise.all([
					userApi.getDashboardStats(),
					userApi.getDashboardAppointments(5)
				]);

				if (statsResponse.success) {
					const data = statsResponse.data;
					
					// Format stats for display
					const formattedStats = [
						{
							title: 'Próxima Cita',
							value: data.nextAppointment || '15 Junio',
							description: 'Dr. Carlos Soler - Cardiología',
							icon: <CalendarClock className="text-blue-500" />,
							color: 'blue',
							link: '/paciente/citas',
						},
						{
							title: 'Reseñas Realizadas',
							value: data.reviewsCount?.toString() || '5',
							description: 'Valoraciones enviadas',
							icon: <Star className="text-yellow-500" />,
							color: 'yellow',
							link: '/paciente/resenas',
						},
					];
					
					setStats(formattedStats);
				}

				if (appointmentsResponse.success) {
					setUpcomingAppointments(appointmentsResponse.data);
				}

				// Mock recent doctors data for now - this would be replaced with real API call
				const mockRecentDoctors = [
					{
						id: 'doc1',
						name: 'Dr. Carlos Soler',
						specialty: 'Cardiología',
						avatar: 'https://ui.shadcn.com/avatars/01.png',
						lastVisit: '2025-05-20',
					},
					{
						id: 'doc2',
						name: 'Dra. Ana García',
						specialty: 'Dermatología',
						avatar: 'https://ui.shadcn.com/avatars/02.png',
						lastVisit: '2025-05-15',
					},
				];
				setRecentDoctors(mockRecentDoctors);

			} catch (error) {
				console.error('Error loading patient dashboard data:', error);
				toast({
					title: "Error",
					description: "No se pudieron cargar los datos del dashboard. Intenta recargar la página.",
					variant: "destructive",
				});
			} finally {
				setIsLoading(false);
			}
		};

		if (user) {
			loadPatientData();
		}
	}, [user, toast]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
			</div>
		);
	}

	return (
		<>
			<header className="mb-8">
				<h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">
					Mi Panel de Paciente
				</h1>
				<p className="text-muted-foreground dark:text-gray-400">
					Bienvenido/a, {user?.name || 'Usuario'}.
				</p>
			</header>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
				{stats.map(stat => (
					<Link key={stat.title} to={stat.link}>
						<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-shadow">
							<CardContent className="p-6">
								<div
									className={`p-3 inline-block bg-${stat.color}-500/10 rounded-lg mb-3`}
								>
									{React.cloneElement(stat.icon, { size: 28 })}
								</div>
								<h3 className="text-2xl font-bold text-foreground dark:text-white mb-1">
									{stat.value}
								</h3>
								<p className="text-sm text-muted-foreground dark:text-gray-400">
									{stat.title}
								</p>
								<p className="text-xs text-muted-foreground dark:text-gray-500 mt-1">
									{stat.description}
								</p>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			{/* Recent Doctors Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
					<CardHeader>
						<CardTitle className="text-foreground dark:text-white flex items-center">
							<Users size={20} className="mr-2 text-primary dark:text-blue-400" />
							Últimos Profesionales Visitados
						</CardTitle>
						<CardDescription className="text-muted-foreground dark:text-gray-400">
							Profesionales con los que has tenido cita recientemente
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{recentDoctors.map(doctor => (
								<div
									key={doctor.id}
									className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-gray-700/30"
								>
									<div className="flex items-center space-x-4">
										<Avatar>
											<AvatarImage src={doctor.avatar} />
											<AvatarFallback>DR</AvatarFallback>
										</Avatar>
										<div>
											<p className="font-medium text-foreground dark:text-white">
												{doctor.name}
											</p>
											<p className="text-sm text-muted-foreground dark:text-gray-400">
												{doctor.specialty}
											</p>
										</div>
									</div>
									<p className="text-sm text-muted-foreground dark:text-gray-400">
										Última visita: {doctor.lastVisit}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
					<CardHeader>
						<CardTitle className="text-foreground dark:text-white flex items-center">
							<CalendarClock size={20} className="mr-2 text-primary dark:text-blue-400" />
							Próximas Citas
						</CardTitle>
						<CardDescription className="text-muted-foreground dark:text-gray-400">
							Tus próximas citas programadas
						</CardDescription>
					</CardHeader>
					<CardContent>
						{upcomingAppointments.length > 0 ? (
							<div className="space-y-4">
								{upcomingAppointments.map(appointment => (
									<div
										key={appointment.id}
										className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-gray-700/30"
									>
										<div>
											<p className="font-medium text-foreground dark:text-white">
												{appointment.professionalName || 'Dr. García'}
											</p>
											<p className="text-sm text-muted-foreground dark:text-gray-400">
												{appointment.specialty || 'Cardiología'}
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm font-medium text-foreground dark:text-white">
												{appointment.time}
											</p>
											<p className="text-xs text-muted-foreground dark:text-gray-400">
												{appointment.date}
											</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center text-muted-foreground dark:text-gray-400 py-8">
								No tienes citas programadas
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
};

export default PatientDashboardPage;
