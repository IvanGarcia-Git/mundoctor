
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CategoriesSection = () => {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/professionals/specialties?limit=10&active=true`);
        
        if (!response.ok) {
          throw new Error('Error al cargar especialidades');
        }
        
        const data = await response.json();
        setSpecialties(data.data || data.specialties || []);
      } catch (err) {
        console.error('Error fetching specialties:', err);
        setError(err.message);
        // Fallback to static data in case of error
        setSpecialties([
          { id: 'medicos', name: 'Médicos' },
          { id: 'enfermeros', name: 'Enfermeros' },
          { id: 'dentistas', name: 'Dentistas' },
          { id: 'fisioterapeutas', name: 'Fisioterapeutas' },
          { id: 'psicologos', name: 'Psicólogos' },
          { id: 'opticos', name: 'Ópticos' },
          { id: 'farmaceuticos', name: 'Farmacéuticos' },
          { id: 'nutricionistas', name: 'Nutricionistas' },
          { id: 'podologos', name: 'Podólogos' },
          { id: 'logopedas', name: 'Logopedas' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialties();
  }, []);

  if (loading) {
    return (
      <section className="py-16 md:py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Categorías de Profesionales
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {[...Array(10)].map((_, index) => (
              <div
                key={index}
                className="p-4 md:p-6 text-center rounded-lg bg-gray-50 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-700/50 animate-pulse"
              >
                <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded mx-auto w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Categorías de Profesionales
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {specialties.map((specialty) => (
            <Link
              key={specialty.id || specialty.name}
              to={`/buscar?especialidad=${encodeURIComponent(specialty.name)}`}
              className="p-4 md:p-6 text-center rounded-lg bg-gray-50 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-700/50 hover:border-blue-500/70 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-all duration-300 group block"
            >
              <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white text-sm md:text-base font-medium transition-colors">
                {specialty.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
