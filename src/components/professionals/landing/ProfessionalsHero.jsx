
import React from 'react';
import { Button } from '@/components/ui/button';
import { Star, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const ProfessionalsHero = () => {
  return (
    <section className="relative py-20 md:py-28 bg-slate-900 dark:bg-background text-white dark:text-foreground overflow-hidden">
      {/* Background blur gradient */}
      <div
        className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] via-[#8b5cf6] to-[#ec4899] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      {/* Background image using img-replace */}
      <div className="absolute inset-0 -z-20">
        <img 
            alt="Equipo médico colaborando en una consulta moderna y luminosa, simbolizando la eficiencia y tecnología en la atención sanitaria."
            className="w-full h-full object-cover opacity-20 dark:opacity-10"
         src="https://images.unsplash.com/photo-1576091160550-2173dba999ef" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center rounded-full bg-blue-500/10 dark:bg-blue-500/20 px-4 py-1.5 text-sm font-semibold leading-6 text-blue-400 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20 dark:ring-blue-500/30 mb-6">
              <Star size={16} className="mr-2 text-yellow-400" />
              <span>Transforma tu práctica profesional</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              La plataforma líder para profesionales de la salud
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300 dark:text-gray-400">
              Optimiza tu gestión, atrae más pacientes y ofrece un servicio de excelencia con Mundoctor. Herramientas intuitivas, seguras y diseñadas para ti.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button
                size="lg"
                className="bg-white text-blue-600 dark:bg-gray-100 dark:text-purple-700 hover:bg-gray-200 dark:hover:bg-gray-300 px-8 py-3 text-base font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                <Zap size={18} className="mr-2" />
                Comenzar ahora
              </Button>
              <Button
                size="lg"
                variant="link"
                className="text-white dark:text-gray-200 hover:text-gray-300 dark:hover:text-gray-400 px-8 py-3 text-base font-semibold"
              >
                Ver demostración <ChevronRight size={18} className="ml-1" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalsHero;
