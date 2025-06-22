
import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from "@/components/ui/slider";
import { Star, MapPin, Users, CalendarCheck, Filter, Search as SearchIcon, X, Tag, Eye as ViewIcon } from 'lucide-react';
import InteractiveMap from '@/components/search/InteractiveMap';

const sampleProfessionals = [
  { id: 1, name: 'Dr. Alejandro Pérez', specialty: 'Cardiología', city: 'Madrid', rating: 4.8, reviews: 132, availability: 'Mañana', imageAlt: "Dr. Alejandro Pérez", imageDesc: "Cardiólogo sonriente", priceRange: [80, 120], online: true, presencial: true, lat: 40.416775, lng: -3.703790, services: ['ECG', 'Ecocardiograma', 'Prueba de esfuerzo'], biography: 'Amplia experiencia en el diagnóstico y tratamiento de enfermedades cardiovasculares. Comprometido con el cuidado integral del paciente.', consultationTypes: ['Consulta presencial', 'Videoconsulta'], contact: {phone: '912345678', email: 'alejandro.perez@example.com'}, officeHours: 'L-V: 9:00-14:00, 16:00-20:00' },
  { id: 2, name: 'Dra. Laura Gómez', specialty: 'Dermatología', city: 'Barcelona', rating: 4.9, reviews: 98, availability: 'Próxima semana', imageAlt: "Dra. Laura Gómez", imageDesc: "Dermatóloga profesional", priceRange: [70, 100], online: true, presencial: false, lat: 41.385063, lng: 2.173404, services: ['Dermatoscopia', 'Tratamiento acné', 'Peeling químico'], biography: 'Especialista en dermatología clínica y estética. Enfoque personalizado para cada paciente.', consultationTypes: ['Videoconsulta'], contact: {phone: '934567890', email: 'laura.gomez@example.com'}, officeHours: 'M-J: 10:00-18:00' },
  { id: 3, name: 'Dr. Carlos Fernández', specialty: 'Pediatría', city: 'Valencia', rating: 4.7, reviews: 210, availability: 'Hoy', imageAlt: "Dr. Carlos Fernández", imageDesc: "Pediatra amigable", priceRange: [60, 90], online: false, presencial: true, lat: 39.469907, lng: -0.376288, services: ['Revisión niño sano', 'Vacunación', 'Urgencias pediátricas'], biography: 'Dedicado al cuidado de la salud infantil desde el nacimiento hasta la adolescencia.', consultationTypes: ['Consulta presencial'], contact: {phone: '967890123', email: 'carlos.fernandez@example.com'}, officeHours: 'L-V: 9:00-13:00, 17:00-19:00' },
  { id: 4, name: 'Dra. Sofía Martín', specialty: 'Ginecología', city: 'Sevilla', rating: 4.6, reviews: 75, availability: 'Mañana', imageAlt: "Dra. Sofía Martín", imageDesc: "Ginecóloga experimentada", priceRange: [90, 150], online: true, presencial: true, lat: 37.389092, lng: -5.984459, services: ['Revisión ginecológica', 'Ecografía', 'Planificación familiar'], biography: 'Atención integral a la salud de la mujer en todas las etapas de la vida.', consultationTypes: ['Consulta presencial', 'Videoconsulta'], contact: {phone: '956789012', email: 'sofia.martin@example.com'}, officeHours: 'L-J: 10:00-14:00, 16:00-19:00' },
  { id: 5, name: 'Dr. Javier Ruiz', specialty: 'Psicología', city: 'Madrid', rating: 5.0, reviews: 150, availability: 'Hoy', imageAlt: "Dr. Javier Ruiz", imageDesc: "Psicólogo atento", priceRange: [50, 80], online: true, presencial: true, lat: 40.420000, lng: -3.700000, services: ['Terapia individual', 'Terapia de pareja', 'Ansiedad y estrés'], biography: 'Psicólogo con enfoque cognitivo-conductual. Ayudando a mejorar el bienestar emocional.', consultationTypes: ['Consulta presencial', 'Videoconsulta'], contact: {phone: '912345679', email: 'javier.ruiz@example.com'}, officeHours: 'L-V: 10:00-20:00' },
];

const SearchResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({ specialty: '', city: '' });
  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [filters, setFilters] = useState({ availability: 'any', consultationType: 'any', rating: 0, price: [0, 200] });
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          console.warn("No se pudo obtener la ubicación del usuario. Usando ubicación por defecto.");
          setUserLocation({ lat: 40.416775, lng: -3.703790 }); 
        }
      );
    } else {
      console.warn("Geolocalización no soportada. Usando ubicación por defecto.");
      setUserLocation({ lat: 40.416775, lng: -3.703790 });
    }
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const specialty = queryParams.get('especialidad') || '';
    const city = queryParams.get('ciudad') || '';
    setSearchParams({ specialty, city });

    const storedProfessionals = localStorage.getItem('professionals');
    if (storedProfessionals) {
        setProfessionals(JSON.parse(storedProfessionals));
    } else {
        localStorage.setItem('professionals', JSON.stringify(sampleProfessionals));
        setProfessionals(sampleProfessionals);
    }

  }, [location.search]);

  useEffect(() => {
    let results = professionals;
    if (searchParams.specialty) {
      results = results.filter(p => p.specialty.toLowerCase().includes(searchParams.specialty.toLowerCase()));
    }
    if (searchParams.city) {
      results = results.filter(p => p.city.toLowerCase().includes(searchParams.city.toLowerCase()));
    }

    if (filters.availability !== 'any') {
       results = results.filter(p => p.availability.toLowerCase().replace(' ', '') === filters.availability);
    }
    if (filters.consultationType === 'online') {
        results = results.filter(p => p.online);
    }
    if (filters.consultationType === 'presencial') {
        results = results.filter(p => p.presencial);
    }
    results = results.filter(p => p.rating >= filters.rating);
    results = results.filter(p => p.priceRange[0] >= filters.price[0] && p.priceRange[1] <= filters.price[1]);

    setFilteredProfessionals(results);
  }, [searchParams, professionals, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const ProfessionalCard = ({ professional }) => (
    <div className="bg-card/80 dark:bg-gray-800/60 backdrop-blur-md border border-border dark:border-gray-700/50 rounded-xl p-4 hover:border-primary/70 dark:hover:border-blue-500/70 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-primary/20 dark:hover:shadow-blue-500/20">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-24 h-32 sm:h-24 flex-shrink-0">
          <img  alt={`Foto de ${professional.name}, ${professional.specialty}`} className="w-full h-full object-cover rounded-lg" src="https://images.unsplash.com/photo-1675270714610-11a5cadcc7b3" />
        </div>
        <div className="flex-grow">
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-0.5">{professional.name}</h2>
          <p className="text-primary dark:text-blue-400 font-semibold mb-1 text-sm">{professional.specialty}</p>
          <div className="flex items-center text-muted-foreground dark:text-gray-400 mb-0.5 text-xs">
            <MapPin size={14} className="mr-1.5" /> {professional.city}
          </div>
          <div className="flex items-center text-yellow-500 dark:text-yellow-400 mb-2 text-xs">
            <Star size={14} className="mr-1 fill-current" /> {professional.rating.toFixed(1)}
            <span className="text-muted-foreground dark:text-gray-500 ml-1.5">({professional.reviews} opiniones)</span>
          </div>
        </div>
        <div className="sm:text-right mt-2 sm:mt-0 flex-shrink-0">
            <div className="bg-primary/10 dark:bg-blue-500/20 text-primary dark:text-blue-300 px-3 py-1.5 rounded-lg text-center">
                <p className="text-xs font-medium">Precio consulta</p>
                <p className="text-lg font-bold">{professional.priceRange[0]}€ - {professional.priceRange[1]}€</p>
            </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground dark:text-gray-300 my-3 pt-3 border-t border-border dark:border-gray-700/50">
          <p>Modalidad: {professional.online && 'Online'}{professional.online && professional.presencial && ', '}{professional.presencial && 'Presencial'}</p>
          <p className="text-green-600 dark:text-green-400">Disponible: {professional.availability}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 text-xs">
          <Link to={`/profesional/${professional.id}`}>
            <CalendarCheck size={14} className="mr-1.5" /> Ver Disponibilidad
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1 text-xs">
          <Link to={`/profesional/${professional.id}`}>
            <ViewIcon size={14} className="mr-1.5" /> Ver Perfil
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="bg-background dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <div className="py-6 sticky top-[68px] z-30 bg-background/80 dark:bg-gray-950/80 backdrop-blur-md">
            <div className="p-4 bg-card/90 dark:bg-gray-800/70 backdrop-blur-md rounded-xl border border-border dark:border-gray-700/50">
                <div className="flex flex-col md:flex-row gap-3 items-center">
                    <Input 
                    type="text" 
                    placeholder="Especialidad, enfermedad..." 
                    value={searchParams.specialty}
                    onChange={(e) => setSearchParams(prev => ({...prev, specialty: e.target.value}))}
                    className="bg-input dark:bg-gray-900/70 border-border dark:border-gray-700 text-foreground dark:text-white placeholder-muted-foreground dark:placeholder-gray-500 h-11 flex-grow" 
                    />
                    <Input 
                    type="text" 
                    placeholder="Ciudad o código postal" 
                    value={searchParams.city}
                    onChange={(e) => setSearchParams(prev => ({...prev, city: e.target.value}))}
                    className="bg-input dark:bg-gray-900/70 border-border dark:border-gray-700 text-foreground dark:text-white placeholder-muted-foreground dark:placeholder-gray-500 h-11 flex-grow" 
                    />
                    <Button 
                    onClick={() => {
                        const query = new URLSearchParams();
                        if (searchParams.specialty) query.set('especialidad', searchParams.specialty);
                        if (searchParams.city) query.set('ciudad', searchParams.city);
                        navigate(`/buscar?${query.toString()}`); 
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-5 w-full md:w-auto text-sm"
                    >
                    <SearchIcon size={16} className="mr-2" /> Buscar
                    </Button>
                    <Button 
                    variant="outline" 
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-11 px-5 w-full md:w-auto text-sm"
                    >
                    <Filter size={16} className="mr-2" /> {showFilters ? 'Ocultar' : 'Filtros'}
                    </Button>
                </div>
            </div>

            {showFilters && (
            <div className="mt-4 p-4 bg-card/90 dark:bg-gray-800/70 backdrop-blur-md rounded-xl border border-border dark:border-gray-700/50 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                <Label className="text-muted-foreground dark:text-gray-300 text-xs mb-1.5 block">Disponibilidad</Label>
                <Select value={filters.availability} onValueChange={(value) => handleFilterChange('availability', value)}>
                    <SelectTrigger className="bg-input dark:bg-gray-900/70 border-border dark:border-gray-700 text-foreground dark:text-white h-10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover dark:bg-gray-800 border-border dark:border-gray-700 text-popover-foreground dark:text-white">
                    <SelectItem value="any" className="text-xs">Cualquiera</SelectItem>
                    <SelectItem value="hoy" className="text-xs">Hoy</SelectItem>
                    <SelectItem value="mañana" className="text-xs">Mañana</SelectItem>
                    <SelectItem value="próximasemana" className="text-xs">Próxima semana</SelectItem>
                    </SelectContent>
                </Select>
                </div>
                <div>
                <Label className="text-muted-foreground dark:text-gray-300 text-xs mb-1.5 block">Tipo de consulta</Label>
                <Select value={filters.consultationType} onValueChange={(value) => handleFilterChange('consultationType', value)}>
                    <SelectTrigger className="bg-input dark:bg-gray-900/70 border-border dark:border-gray-700 text-foreground dark:text-white h-10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover dark:bg-gray-800 border-border dark:border-gray-700 text-popover-foreground dark:text-white">
                    <SelectItem value="any" className="text-xs">Cualquiera</SelectItem>
                    <SelectItem value="online" className="text-xs">Online</SelectItem>
                    <SelectItem value="presencial" className="text-xs">Presencial</SelectItem>
                    </SelectContent>
                </Select>
                </div>
                <div>
                <Label className="text-muted-foreground dark:text-gray-300 text-xs mb-1.5 block">Valoración (mín. {filters.rating.toFixed(1)})</Label>
                <Slider defaultValue={[filters.rating]} max={5} step={0.1} onValueChange={(value) => handleFilterChange('rating', value[0])} className="[&>span:first-child]:h-1 [&>span:first-child]:bg-primary py-2.5"/>
                </div>
                <div>
                <Label className="text-muted-foreground dark:text-gray-300 text-xs mb-1.5 block">Precio (€{filters.price[0]} - €{filters.price[1]})</Label>
                <Slider defaultValue={filters.price} max={200} step={10} onValueChange={(value) => handleFilterChange('price', value)} className="[&>span:first-child]:h-1 [&>span:first-child]:bg-primary py-2.5"/>
                </div>
            </div>
            )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 pb-12">
          <div className="lg:w-1/2 xl:w-2/5">
            <p className="text-muted-foreground dark:text-gray-400 mb-4 text-sm">
            {filteredProfessionals.length > 0 
                ? `Mostrando ${filteredProfessionals.length} profesionales ${searchParams.specialty ? `de ${searchParams.specialty}` : ''} ${searchParams.city ? `en ${searchParams.city}` : ''}`
                : `No se encontraron profesionales ${searchParams.specialty ? `de ${searchParams.specialty}` : ''} ${searchParams.city ? `en ${searchParams.city}` : ''}. Intenta ampliar tu búsqueda.`}
            </p>

            {filteredProfessionals.length > 0 ? (
            <div className="space-y-4 max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                {filteredProfessionals.map(prof => <ProfessionalCard key={prof.id} professional={prof} />)}
            </div>
            ) : (
            <div className="text-center py-10">
                <Users size={48} className="mx-auto text-muted-foreground dark:text-gray-600 mb-3" />
                <h3 className="text-xl font-semibold text-foreground dark:text-white mb-1.5">No hay resultados</h3>
                <p className="text-muted-foreground dark:text-gray-400 mb-4 text-sm">Prueba a cambiar los filtros o términos de búsqueda.</p>
                <Button onClick={() => {
                    setSearchParams({specialty: '', city: ''});
                    setFilters({ availability: 'any', consultationType: 'any', rating: 0, price: [0,200] });
                    navigate(`/buscar`); 
                }} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
                    <X size={16} className="mr-1.5" /> Limpiar Búsqueda
                </Button>
            </div>
            )}
          </div>
          <div className="lg:w-1/2 xl:w-3/5 lg:sticky lg:top-[calc(68px+150px)] h-[calc(100vh-120px)] lg:h-auto lg:max-h-[calc(100vh-88px-60px-env(safe-area-inset-bottom))] rounded-xl overflow-hidden border border-border dark:border-gray-700/50 shadow-xl">
             {userLocation && <InteractiveMap userLocation={userLocation} professionals={filteredProfessionals} />}
             {!userLocation && <div className="w-full h-full bg-card dark:bg-gray-800 flex items-center justify-center"><p className="text-foreground dark:text-white">Cargando mapa...</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
