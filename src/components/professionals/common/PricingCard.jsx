
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const PricingCard = ({ plan }) => {
  return (
    <div className={`rounded-xl p-8 border flex flex-col relative ${plan.borderColor} ${plan.bgColor} ${plan.popular ? 'ring-2 ring-blue-400 shadow-2xl' : 'shadow-lg'}`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-400 text-white text-xs font-semibold px-3 py-1 rounded-full">Más popular</div>
      )}
      <h3 className={`text-2xl font-semibold mb-2 ${plan.textColor}`}>{plan.name}</h3>
      <div className="mb-1">
        <span className={`text-4xl font-bold ${plan.textColor}`}>{plan.price}</span>
        {plan.originalPrice && <span className="text-sm text-gray-400 line-through ml-1">{plan.originalPrice}</span>}
        <span className="text-gray-400">{plan.period}</span>
      </div>
      <p className="text-gray-400 mb-6 text-sm">{plan.description}</p>
      <ul className="space-y-3 mb-8 flex-grow">
        {plan.features.map((feature, i) => (
          <li key={i} className={`flex items-center ${plan.textColor === 'text-white' ? 'text-gray-300' : 'text-gray-600'}`}>
            <CheckCircle size={18} className={`${plan.textColor === 'text-white' ? 'text-green-400' : 'text-green-600'} mr-3 flex-shrink-0`} />
            {feature}
          </li>
        ))}
      </ul>
      <Button className={`w-full ${plan.buttonClass} ${plan.textColor === 'text-white' ? 'text-white' : 'text-blue-600'} py-3 text-base font-semibold transition-colors`}>
        {plan.buttonText}
      </Button>
    </div>
  );
};

export default PricingCard;
