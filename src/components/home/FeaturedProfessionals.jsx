
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { professionalApi } from '@/lib/clerkApi';
import { useToast } from "@/components/ui/use-toast";

const FeaturedProfessionals = () => {
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedProfessionals = async () => {
      try {
        setIsLoading(true);
        const response = await professionalApi.getFeaturedProfessionals();
        if (response.success) {
          setProfessionals(response.data);
        } else {
          throw new Error(response.message || 'Failed to load featured professionals');
        }
      } catch (error) {
        console.error('Error loading featured professionals:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los profesionales destacados.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFeaturedProfessionals();
  }, [toast]);

  if (isLoading) {
    return (
      <section className="py-16 md:py-20 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
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
            <div key={index} className="bg-white dark:bg-gray-900/70 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50 group hover:border-blue-500/70 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-blue-500/20">
              <div className="aspect-[4/3] relative overflow-hidden">
                <img 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={prof.name}
                 src={prof.avatar_url || 'https://via.placeholder.com/300x225.png?text=No+Image'} />
              </div>
              <div className="p-5 md:p-6">
                <h3 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">{prof.name}</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">{prof.specialty_name || 'Especialidad no definida'}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-yellow-400">★</span>
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">{prof.rating ? prof.rating.toFixed(1) : 'N/A'}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">({prof.total_reviews || 0} opiniones)</span>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  Ver Profesional
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
