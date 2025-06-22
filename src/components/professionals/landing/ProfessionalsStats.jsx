
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Users, CalendarDays, Smile } from 'lucide-react';

const ProfessionalsStats = ({ stats }) => {
  const iconMap = {
    BarChart: <BarChart size={32} className="text-primary dark:text-blue-400" />,
    Users: <Users size={32} className="text-primary dark:text-blue-400" />,
    CalendarDays: <CalendarDays size={32} className="text-primary dark:text-blue-400" />,
    Smile: <Smile size={32} className="text-primary dark:text-blue-400" />
  };

  return (
    <section className="py-16 md:py-24 bg-secondary/50 dark:bg-slate-800/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 bg-background dark:bg-slate-800 rounded-xl shadow-lg text-center flex flex-col items-center"
            >
              <div className="mb-4 p-3 bg-primary/10 dark:bg-blue-500/20 rounded-full">
                {iconMap[stat.icon] || <BarChart size={32} className="text-primary dark:text-blue-400" />}
              </div>
              <h3 className="text-3xl font-bold text-primary dark:text-blue-400 mb-1">{stat.value}</h3>
              <p className="text-muted-foreground dark:text-gray-300">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProfessionalsStats;
