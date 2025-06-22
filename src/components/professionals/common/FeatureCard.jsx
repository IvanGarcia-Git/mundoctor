
import React from 'react';
import { CheckCircle } from 'lucide-react';

const FeatureCard = ({ feature, index }) => {
  return (
    <div className={`flex flex-col md:flex-row items-center gap-10 md:gap-16 ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
      <div className="md:w-1/2">
        <div className="inline-flex items-center justify-center p-3 bg-gray-800/50 rounded-xl mb-4 border border-gray-700">
          {feature.icon}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">{feature.title}</h3>
        <p className="text-gray-400 mb-6">{feature.description}</p>
        <ul className="space-y-2">
          {feature.details.map((detail, i) => (
            <li key={i} className="flex items-center text-gray-300">
              <CheckCircle size={18} className="text-green-500 mr-3 flex-shrink-0" />
              {detail}
            </li>
          ))}
        </ul>
      </div>
      <div className="md:w-1/2">
        <div className="bg-gray-800/50 rounded-xl p-2 border border-gray-700 shadow-2xl aspect-video flex items-center justify-center">
          <img  alt={feature.imageAlt} className="w-full h-auto max-h-[300px] object-contain rounded-lg" src="https://images.unsplash.com/photo-1675023112817-52b789fd2ef0" />
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;
