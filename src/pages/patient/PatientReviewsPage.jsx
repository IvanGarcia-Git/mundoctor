import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Star, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useToast } from '@/components/ui/use-toast';

const ReviewCard = ({ review }) => {
	return (
		<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-md">
			<CardContent className="p-6">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h3 className="font-semibold text-foreground dark:text-white mb-1">
							{review.professional_name}
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
					Fecha: {new Date(review.date).toLocaleDateString()}
				</p>
			</CardContent>
		</Card>
	);
};

const PatientReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { getReviews } = usePatientApi();
  const { toast } = useToast();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getReviews();
        setReviews(result.data || []);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError(err.message || 'Error al cargar las reseñas');
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las reseñas. Intenta nuevamente.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [getReviews, toast]);

  const filteredReviews = reviews.filter(review => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      review.professional_name.toLowerCase().includes(searchLower) ||
      review.specialty.toLowerCase().includes(searchLower) ||
      review.comment.toLowerCase().includes(searchLower)
    );
  });

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
              <span className="ml-2 text-muted-foreground">Cargando reseñas...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Reintentar
              </Button>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron reseñas que coincidan con la búsqueda.' : 'Aún no has escrito ninguna reseña.'}
              </p>
            </div>
          ) : (
  					<div className="grid gap-6">
						{filteredReviews.map((review) => (
							<ReviewCard key={review.id} review={review} />
						))}
					</div>
          )}
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