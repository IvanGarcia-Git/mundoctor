
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme} 
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
      className="text-foreground/80 hover:text-primary hover:bg-accent transition-all duration-200"
      title={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-transform duration-200 rotate-0 hover:rotate-12" />
      ) : (
        <Moon className="h-5 w-5 transition-transform duration-200 rotate-0 hover:-rotate-12" />
      )}
    </Button>
  );
};

export default ThemeToggle;
