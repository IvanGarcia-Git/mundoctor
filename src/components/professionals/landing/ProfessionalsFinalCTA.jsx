
import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Rocket, UserPlus } from 'lucide-react';

const ProfessionalsFinalCTA = () => {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 dark:from-blue-700 dark:via-purple-700 dark:to-pink-700 text-white">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
        >
          <Rocket size={48} className="mx-auto mb-6 text-yellow-300" />
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            ¿Listo para llevar tu consulta al siguiente nivel?
          </h2>
          <p className="text-lg md:text-xl text-blue-100 dark:text-purple-200 mb-10 max-w-2xl mx-auto">
            Únete a miles de profesionales que ya están transformando su manera de trabajar con Mundoctor. Digitaliza, crece y fideliza.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 dark:bg-gray-100 dark:text-purple-700 hover:bg-gray-200 dark:hover:bg-gray-300 px-10 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <UserPlus size={20} className="mr-2" /> Empieza tu prueba gratuita
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 dark:border-gray-200 dark:text-gray-100 dark:hover:bg-white/20 px-10 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Contactar con ventas
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProfessionalsFinalCTA;
