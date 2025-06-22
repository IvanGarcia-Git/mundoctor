
import React from 'react';
import { Stethoscope } from 'lucide-react';

const Logo = () => {
  return (
    <div className="flex items-center">
      <Stethoscope className="h-8 w-8 text-blue-500 mr-2" />
      <span className="text-2xl font-bold text-white">Mundoctor</span>
    </div>
  );
};

export default Logo;
