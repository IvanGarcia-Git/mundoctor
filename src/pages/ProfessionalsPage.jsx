
import React from 'react';
import ProfessionalsHero from '@/components/professionals/ProfessionalsHero';
import ProfessionalsStats from '@/components/professionals/ProfessionalsStats';
import ProfessionalsFeatures from '@/components/professionals/ProfessionalsFeatures';
import ProfessionalsPricing from '@/components/professionals/ProfessionalsPricing';
import ProfessionalsFinalCTA from '@/components/professionals/ProfessionalsFinalCTA';
import ProfessionalsAdvancedTools from '@/components/professionals/ProfessionalsAdvancedTools';
import { statsData, featuresData, pricingPlansData } from '@/data/professionalsPageData';

const ProfessionalsPage = () => {
  return (
    <div className="bg-background text-foreground">
      <ProfessionalsHero />
      <ProfessionalsStats stats={statsData} />
      <ProfessionalsFeatures features={featuresData} />
      <ProfessionalsPricing plans={pricingPlansData} />
      <ProfessionalsAdvancedTools />
      <ProfessionalsFinalCTA />
    </div>
  );
};

export default ProfessionalsPage;
