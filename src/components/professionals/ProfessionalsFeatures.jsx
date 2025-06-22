
import React from 'react';
import { CheckCircle, CalendarDays, UserCircle, FileText, BarChart3, MessageSquare, ShieldCheck } from 'lucide-react';
import { motion, useInView } from 'framer-motion';

const FeatureItem = ({ feature, index }) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <motion.div 
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={`flex flex-col md:flex-row items-center gap-10 md:gap-16 ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
    >
      <div className="md:w-1/2">
        <div className="inline-flex items-center justify-center p-3 bg-background dark:bg-gray-800/50 rounded-xl mb-4 border border-border dark:border-gray-700 shadow-md">
          {feature.icon}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground dark:text-white">{feature.title}</h3>
        <p className="text-muted-foreground dark:text-gray-300 mb-6">{feature.description}</p>
        <ul className="space-y-2">
          {feature.details.map((detail, i) => (
            <li key={i} className="flex items-center text-foreground/90 dark:text-gray-200">
              <CheckCircle size={18} className="text-green-500 dark:text-green-400 mr-3 flex-shrink-0" />
              {detail}
            </li>
          ))}
        </ul>
      </div>
      <div className="md:w-1/2">
        <div className="border rounded-xl border-border dark:border-gray-700 shadow-2xl aspect-video flex items-center justify-center overflow-hidden">
          <img  alt={feature.imageAlt} className="w-full h-auto object-contain rounded-xl transition-transform duration-500 hover:scale-105" src={feature.imageSrc} />
        </div>
      </div>
    </motion.div>
  );
};


const ProfessionalsFeatures = ({ features }) => {
  return (
    <section className="py-20 md:py-28 bg-background dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground dark:text-white">Todo lo que necesitas para gestionar tu consulta</h2>
          <p className="text-lg text-muted-foreground dark:text-gray-300 max-w-xl mx-auto">
            Descubre todas las herramientas que ponemos a tu disposición para hacer crecer tu práctica médica.
          </p>
        </motion.div>
        <div className="space-y-16 md:space-y-24">
          {features.map((feature, index) => (
            <FeatureItem key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};


export default ProfessionalsFeatures;
