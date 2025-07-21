
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const FeaturedProfessionals = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeaturedProfessionals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/professionals/featured?limit=4`);
        
        if (!response.ok) {
          throw new Error('Error al cargar profesionales destacados');
        }
        
        const data = await response.json();
        setProfessionals(data.data || data.professionals || []);
      } catch (err) {
        console.error('Error fetching featured professionals:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProfessionals();
  }, []);

  if (loading) {
    return (
      <section className="py-16 md:py-20 bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Profesionales Destacados
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-900/70 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50 animate-pulse">
                <div className="aspect-[4/3] bg-gray-300 dark:bg-gray-700"></div>
                <div className="p-5 md:p-6">
                  <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 md:py-20 bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Profesionales Destacados
          </h2>
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="border-gray-300 hover:border-blue-500"
            >
              Reintentar
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Profesionales Destacados
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {professionals.map((prof, index) => (
            <div key={prof.id || index} className="bg-white dark:bg-gray-900/70 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50 group hover:border-blue-500/70 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-blue-500/20">
              <div className="aspect-[4/3] relative overflow-hidden">
                <img 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={`Foto de ${prof.name || 'Profesional'}`}
                  src={prof.avatar_url || prof.image || '/default-avatar.png'}
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                  }}
                />
              </div>
              <div className="p-5 md:p-6">
                <h3 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">
                  {prof.name || 'Nombre no disponible'}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                  {prof.specialty_name || prof.specialty || 'Especialidad no especificada'}
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-yellow-400">★</span>
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">
                    {prof.rating ? Number(prof.rating).toFixed(1) : 'Sin rating'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                    ({prof.total_reviews || prof.reviews || 0} opiniones)
                  </span>
                </div>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  <Link to={`/profesionales/${prof.id || prof.user_id}`}>
                    Ver Profesional
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProfessionals;
