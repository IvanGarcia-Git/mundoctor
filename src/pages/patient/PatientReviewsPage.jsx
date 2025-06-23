import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Star, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const sampleReviews = [
	{
		id: 'r1',
		professional: 'Dr. Carlos Soler',
		specialty: 'Cardiología',
		rating: 5,
		comment: 'Excelente atención, muy profesional y dedicado. Resolvió todas mis dudas.',
		date: '2025-05-20',
	},
	{
		id: 'r2',
		professional: 'Dra. Ana García',
		specialty: 'Dermatología',
		rating: 4,
		comment: 'Buena experiencia en general. El tratamiento fue efectivo.',
		date: '2025-04-15',
	},
];

const ReviewCard = ({ review }) => {
	return (
		<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-md">
			<CardContent className="p-6">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h3 className="font-semibold text-foreground dark:text-white mb-1">
							{review.professional}
						</h3>
						<p className="text-sm text-muted-foreground dark:text-gray-400">
							{review.specialty}
						</p>
					</div>
					<Badge
						variant="outline"
						className="bg-primary/10 text-primary dark:text-blue-400 border-primary/20"
					>
						<Star className="w-3 h-3 mr-1 fill-current" />
						{review.rating}/5
					</Badge>
				</div>
				<p className="text-muted-foreground dark:text-gray-300 mb-3">
					{review.comment}
				</p>
				<p className="text-sm text-muted-foreground dark:text-gray-400">
					Fecha: {review.date}
				</p>
			</CardContent>
		</Card>
	);
};

const PatientReviewsPage = () => {
	return (
		<>
			<header className="mb-8">
				<h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">
					Mis Reseñas
				</h1>
				<p className="text-muted-foreground dark:text-gray-400">
					Gestiona tus valoraciones y comentarios sobre profesionales.
				</p>
			</header>

			<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg mb-8">
				<CardHeader>
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<CardTitle className="text-foreground dark:text-white">
								Mis Valoraciones
							</CardTitle>
							<CardDescription className="text-muted-foreground dark:text-gray-400">
								Tus reseñas sobre los profesionales que has visitado
							</CardDescription>
						</div>
						<div className="relative w-full sm:w-auto">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
							<Input
								placeholder="Buscar reseña..."
								className="pl-10 w-full sm:w-[300px] bg-background dark:bg-slate-700 border-border dark:border-gray-600"
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6">
						{sampleReviews.map((review) => (
							<ReviewCard key={review.id} review={review} />
						))}
					</div>
				</CardContent>
			</Card>

			<div className="text-center text-muted-foreground dark:text-gray-400">
				<p>
					Las reseñas ayudan a otros pacientes a encontrar los mejores
					profesionales.
				</p>
			</div>
		</>
	);
};

export default PatientReviewsPage;
