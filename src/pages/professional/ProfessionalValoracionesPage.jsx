import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Search, MessageSquare, Calendar, Filter, TrendingUp, ThumbsUp, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Datos de ejemplo de valoraciones
const sampleReviews = [
	{
		id: 'r1',
		patientName: 'María González',
		patientAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
		rating: 5,
		comment: 'Excelente profesional, muy atento y detallado en sus explicaciones. El tratamiento fue muy efectivo.',
		date: '2024-12-10',
		appointmentType: 'Consulta presencial',
		specialty: 'Cardiología',
		responded: false,
		response: null,
		verified: true
	},
	{
		id: 'r2',
		patientName: 'Carlos Ruiz',
		patientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
		rating: 4,
		comment: 'Muy buen doctor, aunque la cita se retrasó un poco. El diagnóstico fue certero.',
		date: '2024-12-08',
		appointmentType: 'Videoconsulta',
		specialty: 'Cardiología',
		responded: true,
		response: 'Gracias por tu valoración, Carlos. Lamento el retraso y trabajaré para mejorar la puntualidad.',
		responseDate: '2024-12-09',
		verified: true
	},
	{
		id: 'r3',
		patientName: 'Ana Martín',
		patientAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b4d0',
		rating: 5,
		comment: 'Increíble experiencia. El doctor me explicó todo muy claramente y el seguimiento post-consulta fue excelente.',
		date: '2024-12-05',
		appointmentType: 'Consulta presencial',
		specialty: 'Cardiología',
		responded: true,
		response: 'Muchas gracias Ana, es un placer poder ayudarte en tu tratamiento.',
		responseDate: '2024-12-06',
		verified: true
	},
	{
		id: 'r4',
		patientName: 'Roberto Silva',
		patientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
		rating: 3,
		comment: 'El tratamiento funcionó, pero esperaba más comunicación durante el proceso.',
		date: '2024-12-02',
		appointmentType: 'Videoconsulta',
		specialty: 'Cardiología',
		responded: false,
		response: null,
		verified: true
	},
	{
		id: 'r5',
		patientName: 'Elena Navarro',
		patientAvatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb',
		rating: 5,
		comment: 'Profesional excepcional. Su dedicación y conocimiento son impresionantes. Totalmente recomendado.',
		date: '2024-11-28',
		appointmentType: 'Consulta presencial',
		specialty: 'Cardiología',
		responded: true,
		response: '¡Muchas gracias Elena! Me alegra saber que el tratamiento está funcionando bien.',
		responseDate: '2024-11-29',
		verified: true
	}
];

const ProfessionalValoracionesPage = () => {
	const [reviews, setReviews] = useState(sampleReviews);
	const [filteredReviews, setFilteredReviews] = useState(sampleReviews);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterRating, setFilterRating] = useState('all');
	const [filterResponse, setFilterResponse] = useState('all');
	const [selectedReview, setSelectedReview] = useState(null);
	const [responseText, setResponseText] = useState('');
	const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);

	// Calcular estadísticas
	const stats = {
		total: reviews.length,
		average: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length,
		distribution: {
			5: reviews.filter(r => r.rating === 5).length,
			4: reviews.filter(r => r.rating === 4).length,
			3: reviews.filter(r => r.rating === 3).length,
			2: reviews.filter(r => r.rating === 2).length,
			1: reviews.filter(r => r.rating === 1).length,
		},
		responseRate: (reviews.filter(r => r.responded).length / reviews.length) * 100
	};

	// Filtrar valoraciones
	useEffect(() => {
		let filtered = reviews;

		if (searchTerm) {
			filtered = filtered.filter(review => 
				review.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
				review.comment.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		if (filterRating !== 'all') {
			filtered = filtered.filter(review => review.rating === parseInt(filterRating));
		}

		if (filterResponse === 'responded') {
			filtered = filtered.filter(review => review.responded);
		} else if (filterResponse === 'pending') {
			filtered = filtered.filter(review => !review.responded);
		}

		setFilteredReviews(filtered);
	}, [searchTerm, filterRating, filterResponse, reviews]);

	const handleResponse = (review) => {
		setSelectedReview(review);
		setResponseText(review.response || '');
		setIsResponseDialogOpen(true);
	};

	const submitResponse = () => {
		if (selectedReview && responseText.trim()) {
			setReviews(prevReviews => 
				prevReviews.map(review => 
					review.id === selectedReview.id 
						? { 
							...review, 
							responded: true, 
							response: responseText,
							responseDate: new Date().toISOString().split('T')[0]
						}
						: review
				)
			);
			setIsResponseDialogOpen(false);
			setResponseText('');
			setSelectedReview(null);
		}
	};

	const renderStars = (rating) => {
		return Array.from({ length: 5 }, (_, i) => (
			<Star
				key={i}
				size={16}
				className={`${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
			/>
		));
	};

	const getRatingColor = (rating) => {
		if (rating >= 4) return 'text-green-600 dark:text-green-400';
		if (rating >= 3) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-600 dark:text-red-400';
	};

	return (
		<>
			<header className="mb-8">
				<h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">Valoraciones de Pacientes</h1>
				<p className="text-muted-foreground dark:text-gray-400">Consulta y gestiona las valoraciones que han dejado tus pacientes.</p>
			</header>

			{/* Estadísticas */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground dark:text-gray-400">Total Valoraciones</p>
								<p className="text-2xl font-bold text-foreground dark:text-white">{stats.total}</p>
							</div>
							<MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground dark:text-gray-400">Valoración Media</p>
								<div className="flex items-center gap-2">
									<p className="text-2xl font-bold text-foreground dark:text-white">{stats.average.toFixed(1)}</p>
									<div className="flex">{renderStars(Math.round(stats.average))}</div>
								</div>
							</div>
							<Star className="h-8 w-8 text-yellow-500" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground dark:text-gray-400">Tasa de Respuesta</p>
								<p className="text-2xl font-bold text-foreground dark:text-white">{stats.responseRate.toFixed(0)}%</p>
							</div>
							<TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground dark:text-gray-400">Valoraciones 5★</p>
								<p className="text-2xl font-bold text-foreground dark:text-white">{stats.distribution[5]}</p>
							</div>
							<ThumbsUp className="h-8 w-8 text-green-600 dark:text-green-400" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Distribución por estrellas */}
			<Card className="mb-8 bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50">
				<CardHeader>
					<CardTitle className="text-foreground dark:text-white">Distribución de Valoraciones</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[5, 4, 3, 2, 1].map(rating => (
							<div key={rating} className="flex items-center gap-2">
								<div className="flex items-center gap-1 w-12">
									<span className="text-sm text-foreground dark:text-white">{rating}</span>
									<Star size={14} className="fill-yellow-400 text-yellow-400" />
								</div>
								<div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div 
										className="bg-yellow-400 h-2 rounded-full" 
										style={{ width: `${stats.total ? (stats.distribution[rating] / stats.total) * 100 : 0}%` }}
									/>
								</div>
								<span className="text-sm text-muted-foreground dark:text-gray-400 w-8 text-right">
									{stats.distribution[rating]}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Filtros y búsqueda */}
			<Card className="mb-8 bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50">
				<CardHeader>
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<CardTitle className="text-foreground dark:text-white">Listado de Valoraciones</CardTitle>
							<CardDescription className="text-muted-foreground dark:text-gray-400">
								{filteredReviews.length} de {reviews.length} valoraciones
							</CardDescription>
						</div>
						<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
							<div className="relative flex-grow sm:flex-grow-0 sm:w-64">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
								<Input
									type="text"
									placeholder="Buscar valoración..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
								/>
							</div>
							<Select value={filterRating} onValueChange={setFilterRating}>
								<SelectTrigger className="w-full sm:w-32 bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-popover dark:bg-slate-800 border-border dark:border-gray-700">
									<SelectItem value="all">Todas ★</SelectItem>
									<SelectItem value="5">5 ★</SelectItem>
									<SelectItem value="4">4 ★</SelectItem>
									<SelectItem value="3">3 ★</SelectItem>
									<SelectItem value="2">2 ★</SelectItem>
									<SelectItem value="1">1 ★</SelectItem>
								</SelectContent>
							</Select>
							<Select value={filterResponse} onValueChange={setFilterResponse}>
								<SelectTrigger className="w-full sm:w-36 bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-popover dark:bg-slate-800 border-border dark:border-gray-700">
									<SelectItem value="all">Todas</SelectItem>
									<SelectItem value="responded">Respondidas</SelectItem>
									<SelectItem value="pending">Pendientes</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						{filteredReviews.length > 0 ? filteredReviews.map(review => (
							<div key={review.id} className="border border-border dark:border-gray-700/50 rounded-lg p-4 bg-background/50 dark:bg-gray-900/50">
								<div className="flex items-start gap-4">
									<Avatar className="h-12 w-12">
										<AvatarImage src={review.patientAvatar} />
										<AvatarFallback className="bg-primary/10 text-primary">
											{review.patientName.split(' ').map(n => n[0]).join('')}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-3">
												<h3 className="font-semibold text-foreground dark:text-white">{review.patientName}</h3>
												{review.verified && (
													<Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
														Verificada
													</Badge>
												)}
											</div>
											<div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
												<Calendar size={14} />
												{new Date(review.date).toLocaleDateString('es-ES')}
											</div>
										</div>
										<div className="flex items-center gap-2 mb-3">
											<div className="flex">{renderStars(review.rating)}</div>
											<span className={`font-semibold ${getRatingColor(review.rating)}`}>
												{review.rating}.0
											</span>
											<Badge variant="outline" className="text-xs">
												{review.appointmentType}
											</Badge>
										</div>
										<p className="text-foreground dark:text-gray-300 mb-4 leading-relaxed">
											{review.comment}
										</p>
										
										{review.responded && review.response && (
											<div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mb-4">
												<div className="flex items-center gap-2 mb-2">
													<MessageSquare size={14} className="text-blue-600 dark:text-blue-400" />
													<span className="text-sm font-medium text-blue-700 dark:text-blue-300">Tu respuesta</span>
													<span className="text-xs text-muted-foreground dark:text-gray-500">
														{new Date(review.responseDate).toLocaleDateString('es-ES')}
													</span>
												</div>
												<p className="text-sm text-blue-800 dark:text-blue-200">
													{review.response}
												</p>
											</div>
										)}
										
										<div className="flex justify-end">
											<Button
												variant={review.responded ? "outline" : "default"}
												size="sm"
												onClick={() => handleResponse(review)}
												className={review.responded ? "" : "bg-primary hover:bg-primary/90"}
											>
												<MessageSquare size={14} className="mr-2" />
												{review.responded ? 'Editar respuesta' : 'Responder'}
											</Button>
										</div>
									</div>
								</div>
							</div>
						)) : (
							<div className="text-center py-12">
								<AlertCircle size={48} className="mx-auto text-muted-foreground dark:text-gray-600 mb-3" />
								<h3 className="text-xl font-semibold text-foreground dark:text-white mb-2">No hay valoraciones</h3>
								<p className="text-muted-foreground dark:text-gray-400">
									No se encontraron valoraciones que coincidan con los filtros seleccionados.
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Dialog para responder */}
			<Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
				<DialogContent className="sm:max-w-[500px] bg-card dark:bg-gray-800 border-border dark:border-gray-700">
					<DialogHeader>
						<DialogTitle className="text-foreground dark:text-white">
							{selectedReview?.responded ? 'Editar respuesta' : 'Responder valoración'}
						</DialogTitle>
						<DialogDescription className="text-muted-foreground dark:text-gray-400">
							Responde a la valoración de {selectedReview?.patientName}
						</DialogDescription>
					</DialogHeader>
					{selectedReview && (
						<div className="py-4">
							<div className="mb-4 p-3 bg-muted/50 dark:bg-gray-900/50 rounded-lg">
								<div className="flex items-center gap-2 mb-2">
									<div className="flex">{renderStars(selectedReview.rating)}</div>
									<span className="font-semibold text-foreground dark:text-white">
										{selectedReview.patientName}
									</span>
								</div>
								<p className="text-sm text-muted-foreground dark:text-gray-400">
									"{selectedReview.comment}"
								</p>
							</div>
							<div>
								<Label htmlFor="response" className="text-foreground dark:text-gray-300">Tu respuesta</Label>
								<Textarea
									id="response"
									value={responseText}
									onChange={(e) => setResponseText(e.target.value)}
									placeholder="Escribe tu respuesta aquí..."
									className="mt-2 bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
									rows={4}
								/>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsResponseDialogOpen(false)}
							className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
						>
							Cancelar
						</Button>
						<Button
							onClick={submitResponse}
							disabled={!responseText.trim()}
							className="bg-primary hover:bg-primary/90 text-primary-foreground"
						>
							{selectedReview?.responded ? 'Actualizar respuesta' : 'Enviar respuesta'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default ProfessionalValoracionesPage;