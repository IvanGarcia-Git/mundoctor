
import React, { useEffect, useRef } from 'react';
import { motion, useInView, animate } from 'framer-motion';

const Counter = ({ from = 0, to, duration = 2 }) => {
  const nodeRef = useRef();
  const isInView = useInView(nodeRef, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      const node = nodeRef.current;
      const controls = animate(from, to, {
        duration: duration,
        onUpdate(value) {
          node.textContent = Math.round(value).toLocaleString('es-ES');
        },
      });
      return () => controls.stop();
    }
  }, [from, to, duration, isInView]);
  
  const initialText = typeof from === 'number' ? from.toLocaleString('es-ES') : from;

  return <span ref={nodeRef}>{initialText}</span>;
};


const ProfessionalsStats = ({ stats }) => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  return (
    <section ref={containerRef} className="py-16 bg-secondary dark:bg-secondary/80">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div 
              key={index} 
              className="p-4 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: isInView ? index * 0.2 : 0 }}
            >
              <p className="text-3xl md:text-4xl font-bold text-primary dark:text-blue-400 mb-2">
                {typeof stat.value === 'number' ? (
                  <>
                    <Counter to={stat.value} />
                    {stat.suffix || '+'}
                  </>
                ) : (
                  stat.value 
                )}
              </p>
              <p className="text-sm text-muted-foreground dark:text-gray-300">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProfessionalsStats;
