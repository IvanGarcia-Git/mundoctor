
import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Briefcase, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = React.useState('presencial');
  const [specialty, setSpecialty] = React.useState('');
  const [city, setCity] = React.useState('');

  const handleSearch = () => {
    const queryParams = new URLSearchParams();
    if (specialty) queryParams.set('especialidad', specialty);
    if (city) queryParams.set('ciudad', city);
    navigate(`/buscar?${queryParams.toString()}`);
  };

  return (
    <section className="py-16 md:py-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/5 dark:from-blue-700/20 dark:via-transparent dark:to-purple-700/10 opacity-70"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 dark:from-white dark:via-gray-300 dark:to-gray-400">
              Encuentra tu especialista y pide cita
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-400 mb-8 md:mb-10 max-w-xl mx-auto md:mx-0">
              Más de 100.000 profesionales están aquí para ayudarte. Accede a un directorio completo, gestiona tus citas y cuida tu salud.
            </p>
            <div className="bg-white/90 dark:bg-white/10 backdrop-blur-md p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
              <div className="flex mb-4 space-x-2">
                <Button
                  variant={searchType === 'presencial' ? 'default' : 'outline'}
                  onClick={() => setSearchType('presencial')}
                  className={`flex-1 h-12 ${searchType === 'presencial' 
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                    : 'text-blue-600 dark:text-blue-400 border-blue-500/50 dark:border-blue-500/50 hover:bg-blue-500/10 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 bg-white/50 dark:bg-white/5'}`}
                >
                  <Briefcase size={18} className="mr-2" />
                  Visita presencial
                </Button>
                <Button
                  variant={searchType === 'online' ? 'default' : 'outline'}
                  onClick={() => setSearchType('online')}
                  className={`flex-1 h-12 ${searchType === 'online' 
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                    : 'text-blue-600 dark:text-blue-400 border-blue-500/50 dark:border-blue-500/50 hover:bg-blue-500/10 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 bg-white/50 dark:bg-white/5'}`}
                >
                  <Video size={18} className="mr-2" />
                  Online
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Especialidad, enfermedad o nombre"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-14 text-base"
                  />
                </div>
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Ciudad o código postal"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-14 text-base"
                  />
                </div>
                <Button onClick={handleSearch} className="sm:w-auto w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-base transition-colors h-14">
                  <Search size={18} className="mr-2 sm:hidden" />
                  Buscar
                </Button>
              </div>
            </div>
          </div>
          <div className="hidden md:flex justify-center items-center relative mt-8 md:mt-0">
            <div className="absolute -inset-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-full blur-3xl opacity-30"></div>
            <img  
              className="relative z-10 w-full max-w-md lg:max-w-lg object-contain"
              alt="Ilustración de dos profesionales sanitarios con un icono de corazón y electrocardiograma"
             src="https://storage.googleapis.com/hostinger-horizons-assets-prod/55e12e24-9367-49fa-b191-6f66dd749696/8c5a3841bc382f2f40aa405a60904fb6.png" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
