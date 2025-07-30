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
				const [statsResponse, appointmentsResponse, professionalsResponse] = await Promise.all([
					userApi.getDashboardStats(),
					userApi.getDashboardAppointments(5),
					userApi.getDashboardProfessionals(3)
				]);

				if (statsResponse.success) {
					const data = statsResponse.data;
					
					// Format next appointment info
					let nextAppointmentText = 'No hay citas programadas';
					let nextAppointmentDescription = 'Programa tu próxima cita';
					
					if (data.nextAppointment) {
						const nextDate = new Date(data.nextAppointment.date);
						nextAppointmentText = nextDate.toLocaleDateString('es-ES', { 
							day: 'numeric', 
							month: 'long' 
						});
						nextAppointmentDescription = `${data.nextAppointment.professionalName} - ${data.nextAppointment.time}`;
					}
					
					// Format stats for display
					const formattedStats = [
						{
							title: 'Próxima Cita',
							value: nextAppointmentText,
							description: nextAppointmentDescription,
							icon: <CalendarClock className="text-blue-500" />,
							color: 'blue',
							link: '/paciente/citas',
						},
						{
							title: 'Total Citas',
							value: data.total_appointments?.toString() || '0',
							description: `${data.completed_appointments || 0} completadas`,
							icon: <CalendarClock className="text-green-500" />,
							color: 'green',
							link: '/paciente/citas',
						},
						{
							title: 'Reseñas Realizadas',
							value: data.reviewsCount?.toString() || '0',
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

				if (professionalsResponse.success) {
					const professionals = professionalsResponse.data.map(prof => ({
						id: prof.id,
						name: prof.name,
						specialty: prof.specialty,
						avatar: prof.avatar || 'https://ui.shadcn.com/avatars/01.png',
						lastVisit: prof.lastVisit,
					}));
					setRecentDoctors(professionals);
				}

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
		</>
	);
};

export default PatientDashboardPage;