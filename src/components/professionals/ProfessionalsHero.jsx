
import React from 'react';
import { Button } from '@/components/ui/button';
import { Star, Zap, Users, CalendarClock, Smile, ShieldCheck, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const statsData = [
  { icon: <Users size={24} className="text-blue-600 dark:text-blue-400 mb-2" />, value: '10.000+', label: 'Pacientes activos' },
  { icon: <CalendarClock size={24} className="text-blue-600 dark:text-blue-400 mb-2" />, value: '50.000+', label: 'Citas gestionadas' },
  { icon: <Smile size={24} className="text-blue-600 dark:text-blue-400 mb-2" />, value: '4.9/5', label: 'Satisfacción' },
  { icon: <ShieldCheck size={24} className="text-blue-600 dark:text-blue-400 mb-2" />, value: '100%', label: 'RGPD compliant' }
];

const ProfessionalsHero = () => {
  return (
    <section className="relative py-20 md:py-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-white overflow-hidden">
      <div className="absolute inset-0 opacity-30 dark:opacity-50">
        <img-replace src="https://storage.googleapis.com/hostinger-horizons-assets-prod/55e12e24-9367-49fa-b191-6f66dd749696/dc0f2025cfae3e1bfeac0cb959baf219.png" alt="Fondo abstracto con formas suaves y gradientes azules" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-blue-50/80 to-transparent dark:from-gray-950 dark:via-gray-950/80 dark:to-transparent"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-4 py-1.5 rounded-full text-sm mb-6">
              <Star size={16} className="mr-2 text-yellow-500 dark:text-yellow-400" />
              Más de 1.000 profesionales confían en nosotros
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
              Multiplica tus pacientes y <span className="text-blue-600 dark:text-blue-400">digitaliza tu consulta</span> en minutos
            </h1>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-10 max-w-2xl">
              La plataforma todo en uno que necesitas para gestionar citas online, aumentar tu visibilidad y fidelizar pacientes. Sin complicaciones técnicas.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto">
                Prueba 30 días gratis
              </Button>
              <Button size="lg" variant="outline" className="text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white px-8 py-3 text-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto">
                Solicitar Demo <ChevronRight size={20} className="ml-2" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {statsData.map((stat, index) => (
                <motion.div 
                  key={index} 
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.15 }}
                >
                  {stat.icon}
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="hidden md:flex justify-center items-center"
          >
          <div className="hidden md:flex justify-center items-center relative mt-8 md:mt-0">
            <div className="absolute -inset-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-full blur-3xl opacity-40"></div>
            <img
              className="relative z-10 w-full max-w-md lg:max-w-lg object-contain"
              alt="Doctor revisando a una paciente joven con estetoscopio"
              src="https://storage.googleapis.com/hostinger-horizons-assets-prod/55e12e24-9367-49fa-b191-6f66dd749696/dc0f2025cfae3e1bfeac0cb959baf219.png" 
            />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalsHero;
