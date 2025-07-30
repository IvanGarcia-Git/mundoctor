
import React from 'react';
import { useTheme } from '@/components/ThemeProvider';

const Logo = () => {
  const { theme } = useTheme();

  const logoSrc = theme === 'dark' ? '/logo_dark.png' : '/logo_light.png';

  return (
    <img src={logoSrc} alt="Mundoctor Logo" className="h-8 w-auto" />
  );
};

export default Logo;
