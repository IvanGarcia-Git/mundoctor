
import React from 'react';
import { motion } from 'framer-motion';
import FeatureCard from '@/components/professionals/common/FeatureCard';

const ProfessionalsFeatures = ({ features }) => {
  return (
    <section className="py-20 md:py-28 bg-background dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground dark:text-white">Herramientas diseñadas para tu éxito</h2>
          <p className="text-lg text-muted-foreground dark:text-gray-300 max-w-2xl mx-auto">
            Todo lo que necesitas para optimizar tu consulta, atraer más pacientes y ofrecer un servicio excepcional.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
             <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
             >
                <FeatureCard 
                    icon={feature.icon} 
                    title={feature.title} 
                    description={feature.description} 
                />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProfessionalsFeatures;
