
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Construction, ArrowLeft } from 'lucide-react';

const ComingSoonPage = ({ title = "Página en Construcción" }) => {
  const is404 = title.includes("404");

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-6 bg-gradient-to-br from-background to-muted dark:from-slate-900 dark:to-slate-800 text-foreground">
      {!is404 && <Construction size={64} className="text-primary dark:text-blue-400 mb-6 animate-bounce" />}
      <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
      <p className="text-lg md:text-xl text-muted-foreground dark:text-gray-400 mb-8 max-w-md">
        {is404 ? "Lo sentimos, la página que buscas no existe o ha sido movida." : "Estamos trabajando duro para traerte esta sección lo antes posible. ¡Vuelve pronto!"}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft size={18} className="mr-2" />
            Volver al Inicio
          </Link>
        </Button>
        <Button asChild>
          <Link to="/contacto">
            Contactar Soporte
          </Link>
        </Button>
      </div>
      {!is404 && (
        <div className="mt-12">
          <img  
            alt="Equipo trabajando en construcción de página web" 
            className="max-w-xs md:max-w-sm mx-auto opacity-75" 
            src="https://images.unsplash.com/photo-1572891458752-1fde7b8074b6" 
          />
        </div>
      )}
    </div>
  );
};

export default ComingSoonPage;
