
import React from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';

const ProfessionalsFinalCTA = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
          Únete a miles de profesionales que ya confían en nosotros
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-400 mb-10 max-w-xl mx-auto">
          Empieza hoy mismo a optimizar tu consulta y ofrecer una mejor experiencia a tus pacientes.
        </p>
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg transition-colors">
          Prueba gratis durante 30 días <TrendingUp size={20} className="ml-2" />
        </Button>
      </div>
    </section>
  );
};

export default ProfessionalsFinalCTA;
