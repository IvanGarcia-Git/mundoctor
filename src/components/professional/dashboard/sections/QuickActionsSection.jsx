
import React from 'react';
import QuickLinkCard from '@/components/professional/dashboard/QuickLinkCard';

const QuickActionsSection = ({ quickLinks }) => {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-semibold mb-6">Acciones Rápidas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {quickLinks.map(link => (
          <QuickLinkCard key={link.name} {...link} />
        ))}
      </div>
    </section>
  );
};

export default QuickActionsSection;
