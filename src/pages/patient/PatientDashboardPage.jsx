import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CalendarClock, Star, MessageSquare, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const stats = [
	{
		title: 'Próxima Cita',
		value: '15 Junio',
		description: 'Dr. Carlos Soler - Cardiología',
		icon: <CalendarClock className="text-blue-500" />,
		color: 'blue',
		link: '/paciente/citas',
	},
	{
		title: 'Reseñas Realizadas',
		value: '5',
		description: 'Valoraciones enviadas',
		icon: <Star className="text-yellow-500" />,
		color: 'yellow',
		link: '/paciente/resenas',
	},
];

const recentDoctors = [
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

const PatientDashboardPage = () => {
	const { user } = useAuth();

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
						<div className="text-center text-muted-foreground dark:text-gray-400 py-8">
							Próximamente: Calendario de citas
						</div>
					</CardContent>
				</Card>
			</div>
		</>
	);
};

export default PatientDashboardPage;
