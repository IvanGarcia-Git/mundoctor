
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, CalendarCheck, MessageSquare, ShieldCheck, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tools = [
  { name: 'Estadísticas Avanzadas', description: 'Analiza el rendimiento de tu consulta con informes detallados.', icon: <BarChart3 className="w-10 h-10 text-blue-500 dark:text-blue-400" /> },
  { name: 'Gestión de Pacientes (CRM)', description: 'Historiales, notas y seguimiento personalizado de tus pacientes.', icon: <Users className="w-10 h-10 text-green-500 dark:text-green-400" /> },
  { name: 'Agenda Inteligente', description: 'Optimiza tu tiempo con recordatorios automáticos y gestión de disponibilidad.', icon: <CalendarCheck className="w-10 h-10 text-purple-500 dark:text-purple-400" /> },
  { name: 'Comunicación Segura', description: 'Mensajería interna encriptada para una comunicación fluida.', icon: <MessageSquare className="w-10 h-10 text-red-500 dark:text-red-400" /> },
  { name: 'Cumplimiento RGPD', description: 'Plataforma segura que garantiza la protección de datos de tus pacientes.', icon: <ShieldCheck className="w-10 h-10 text-yellow-500 dark:text-yellow-400" /> },
  { name: 'Configuración Personalizada', description: 'Adapta la plataforma a tu flujo de trabajo y especialidad.', icon: <Settings2 className="w-10 h-10 text-indigo-500 dark:text-indigo-400" /> },
];

const ProfessionalsAdvancedTools = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <section className="py-20 md:py-28 bg-secondary/30 dark:bg-slate-800/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white mb-4">
            Potencia Tu Práctica con Herramientas Avanzadas
          </h2>
          <p className="text-lg text-muted-foreground dark:text-gray-300 max-w-2xl mx-auto">
            Descubre funcionalidades diseñadas para profesionales que buscan la excelencia y la eficiencia.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {tools.map((tool, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-background dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-start"
            >
              <div className="p-3 rounded-full bg-primary/10 dark:bg-slate-700 mb-4">
                {tool.icon}
              </div>
              <h3 className="text-xl font-semibold text-foreground dark:text-white mb-2">{tool.name}</h3>
              <p className="text-muted-foreground dark:text-gray-400 text-sm flex-grow">{tool.description}</p>
              <Button variant="link" className="mt-4 p-0 text-primary dark:text-blue-400 hover:text-primary/80 dark:hover:text-blue-300">
                Saber más &rarr;
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ProfessionalsAdvancedTools;
