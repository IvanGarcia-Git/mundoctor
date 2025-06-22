
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, BadgePercent } from 'lucide-react';
import { motion } from 'framer-motion';

const PricingCard = ({ plan, index }) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.5, delay: index * 0.15, ease: "easeOut" }
    }
  };

  const isBasicPlan = plan.name.toLowerCase() === 'básico';
  const currentPopular = !isBasicPlan && plan.popular; 
  const currentBorderColor = isBasicPlan ? 'border-border dark:border-gray-700' : plan.borderColor;
  const currentRing = !isBasicPlan && plan.popular ? 'ring-4 ring-offset-2 ring-offset-background dark:ring-offset-slate-900 ring-yellow-400 dark:ring-yellow-500' : '';
  
  let buttonClass = plan.buttonClass || '';
  if (plan.name.toLowerCase() === 'gratis' || plan.name.toLowerCase() === 'profesional') {
    buttonClass = `bg-primary hover:bg-primary/90 text-primary-foreground ${buttonClass}`;
  } else if (isBasicPlan) {
     buttonClass = `bg-secondary hover:bg-secondary/80 text-secondary-foreground dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white ${buttonClass}`;
  }


  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className={`rounded-2xl p-6 md:p-8 border-2 flex flex-col relative overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 ${currentBorderColor} ${plan.bgColor} ${currentRing}`}
    >
      {currentPopular && (
        <div className="absolute top-0 -right-10 transform rotate-45 bg-yellow-400 dark:bg-yellow-500 text-center text-xs font-semibold py-1.5 px-10 text-slate-900">
          Popular
        </div>
      )}
      <div className="flex-grow">
        <h3 className={`text-2xl font-semibold mb-2 ${plan.textColor}`}>{plan.name}</h3>
        <div className="mb-1">
          <span className={`text-4xl font-bold ${plan.textColor}`}>{plan.price}</span>
          {plan.originalPrice && <span className="text-sm text-muted-foreground dark:text-gray-400 line-through ml-1">{plan.originalPrice}</span>}
          <span className={`text-muted-foreground dark:text-gray-400 ${plan.textColor === 'text-white' || plan.textColor.includes('dark:text-white') ? 'opacity-80' : ''}`}>{plan.period}</span>
        </div>
        <p className={`${plan.textColor === 'text-white' || plan.textColor.includes('dark:text-white') ? 'text-gray-300' : 'text-muted-foreground'} mb-6 text-sm h-10`}>{plan.description}</p>
        <ul className="space-y-3 mb-8 flex-grow">
          {plan.features.map((feature, i) => (
            <li key={i} className={`flex items-start ${plan.textColor === 'text-white' || plan.textColor.includes('dark:text-white') ? 'text-gray-200' : 'text-foreground/90'}`}>
              <CheckCircle size={18} className={`${currentPopular ? 'text-yellow-400 dark:text-yellow-500' : 'text-green-500 dark:text-green-400'} mr-3 mt-0.5 flex-shrink-0`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <Button className={`w-full ${buttonClass} text-base font-semibold py-3 transition-transform duration-200 hover:scale-105 ${plan.name === 'Profesional' ? 'shadow-lg shadow-green-500/30' : ''} ${currentPopular ? 'shadow-lg shadow-primary/30 dark:shadow-blue-500/30' : ''}`}>
        {plan.buttonText}
      </Button>
    </motion.div>
  );
};


const ProfessionalsPricing = ({ plans }) => {
  const [billingCycle, setBillingCycle] = React.useState('monthly');

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-background via-secondary/30 to-background dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground dark:text-white">Planes flexibles para cada profesional</h2>
          <p className="text-lg text-muted-foreground dark:text-gray-300 max-w-xl mx-auto">
            Elige la suscripción que mejor se adapta a tus necesidades y escala a medida que creces.
          </p>
          <div className="mt-8">
            <span className="isolate inline-flex rounded-lg shadow-sm bg-background dark:bg-gray-800 p-1">
              <button 
                type="button" 
                onClick={() => setBillingCycle('monthly')}
                className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-200
                  ${billingCycle === 'monthly' ? 'bg-primary text-primary-foreground dark:bg-blue-600 dark:text-white' : 'text-muted-foreground dark:text-gray-300 hover:bg-muted/50 dark:hover:bg-gray-700/50'}`}
              >
                Mensual
              </button>
              <button 
                type="button" 
                onClick={() => setBillingCycle('annually')}
                className={`relative -ml-px inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-200
                  ${billingCycle === 'annually' ? 'bg-primary text-primary-foreground dark:bg-blue-600 dark:text-white' : 'text-muted-foreground dark:text-gray-300 hover:bg-muted/50 dark:hover:bg-gray-700/50'}`}
              >
                Anual <BadgePercent size={16} className="ml-1.5 text-green-400 dark:text-green-300" />
                <span className="ml-1.5 hidden sm:inline-block bg-green-500/20 dark:bg-green-500/30 text-green-600 dark:text-green-300 text-xs font-bold px-1.5 py-0.5 rounded-full">Ahorra 2 meses</span>
              </button>
            </span>
            {billingCycle === 'annually' && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-3">
                    ¡Paga anualmente y obtén dos meses gratis!
                </p>
            )}
          </div>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 items-stretch">
          {plans.map((plan, index) => (
            <PricingCard key={plan.name} plan={plan} index={index} />
          ))}
        </div>
         <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
            className="mt-16 text-center text-muted-foreground dark:text-gray-400 text-sm"
          >
            <p>¿Necesitas un plan personalizado o tienes preguntas? <a href="/contacto" className="text-primary dark:text-blue-400 hover:underline font-semibold">Contacta con nosotros</a>.</p>
            <p>Todos los precios se muestran en EUR. Puedes cancelar tu suscripción en cualquier momento.</p>
        </motion.div>
      </div>
    </section>
  );
};

export default ProfessionalsPricing;
