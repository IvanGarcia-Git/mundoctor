
import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from "@/components/ui/slider";
import { Star, MapPin, Users, CalendarCheck, Filter, Search as SearchIcon, X, Tag, Eye as ViewIcon, Loader2 } from 'lucide-react';
import InteractiveMap from '@/components/search/InteractiveMap';

// API Configuration  
const API_BASE_URL = 'http://localhost:8001/api';

// API functions
const searchProfessionals = async (params = {}) => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/professionals/search?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to search professionals');
  }
  
  return response.json();
};

const getSpecialties = async () => {
  const response = await fetch(`${API_BASE_URL}/professionals/specialties`);
  if (!response.ok) {
    throw new Error('Failed to fetch specialties');
  }
  
  return response.json();
};

// Transform API data to match component expectations
const transformProfessional = (prof) => ({
  id: prof.id,
  name: prof.name,
  specialty: prof.specialty?.name || prof.specialty_name || 'Medicina General',
  specialty_id: prof.specialty?.id || prof.specialty_id,
  city: prof.city || 'No especificada',
  rating: prof.rating || 0,
  reviews: prof.total_reviews || 0,
  availability: 'Consultar', // API doesn't have this field, using default
  imageAlt: `${prof.name}`,
  imageDesc: `${prof.specialty?.name || 'Profesional médico'}`,
  priceRange: [prof.consultation_fee || 50, prof.consultation_fee ? prof.consultation_fee + 30 : 80],
  online: true, // Assume all professionals can do online consultations
  presencial: true, // Assume all can do in-person consultations
  lat: prof.latitude || 40.416775, // Default to Madrid if no location
  lng: prof.longitude || -3.703790,
  services: prof.services || [],
  biography: prof.about || 'Profesional de la salud comprometido con la atención de calidad.',
  consultationTypes: ['Consulta presencial', 'Videoconsulta'],
  contact: {
    phone: prof.phone || 'No disponible',
    email: prof.email || 'No disponible'
  },
  officeHours: prof.office_hours?.display || 'Consultar horarios',
  verified: prof.verified || false,
  experience_years: prof.experience_years || 0
});

const SearchResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({ specialty: '', city: '' });
  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [filters, setFilters] = useState({ availability: 'any', consultationType: 'any', rating: 0, price: [0, 200], specialty_id: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

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

  // Load specialties on component mount
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const response = await getSpecialties();
        if (response.success) {
          setSpecialties(response.data);
        }
      } catch (error) {
        console.error('Error loading specialties:', error);
      }
    };
    
    loadSpecialties();
  }, []);

  // Handle URL search parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const specialty = queryParams.get('especialidad') || '';
    const city = queryParams.get('ciudad') || '';
    
    setSearchParams({ specialty, city });
    
    // Find specialty_id from specialty name for API call
    let specialty_id = '';
    if (specialty && specialties.length > 0) {
      const foundSpecialty = specialties.find(s => 
        s.name.toLowerCase().includes(specialty.toLowerCase())
      );
      if (foundSpecialty) {
        specialty_id = foundSpecialty.id;
      }
    }
    
    setFilters(prev => ({ ...prev, specialty_id }));
  }, [location.search, specialties]);

  // Fetch professionals from API
  const fetchProfessionals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        q: searchParams.specialty,
        city: searchParams.city,
        specialty_id: filters.specialty_id,
        rating_min: filters.rating,
        consultation_fee_max: filters.price[1] > 0 ? filters.price[1] : null,
        page: pagination.page,
        limit: pagination.limit
      };
      
      const response = await searchProfessionals(params);
      
      if (response.success) {
        const transformedProfessionals = response.data.professionals.map(transformProfessional);
        setProfessionals(transformedProfessionals);
        setFilteredProfessionals(transformedProfessionals);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || transformedProfessionals.length,
          totalPages: response.data.pagination?.totalPages || 1
        }));
      } else {
        setError('Error al buscar profesionales');
        setProfessionals([]);
        setFilteredProfessionals([]);
      }
    } catch (error) {
      console.error('Error fetching professionals:', error);
      setError('Error de conexión. Por favor, inténtalo de nuevo.');
      setProfessionals([]);
      setFilteredProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search when search parameters or filters change
  useEffect(() => {
    if (specialties.length > 0) { // Wait for specialties to load
      fetchProfessionals();
    }
  }, [searchParams, filters.specialty_id, filters.rating, filters.price, pagination.page]);

  // Apply local filters (for filters not handled by API)
  useEffect(() => {
    let results = professionals;
    
    // Apply consultation type filter locally
    if (filters.consultationType === 'online') {
      results = results.filter(p => p.online);
    }
    if (filters.consultationType === 'presencial') {
      results = results.filter(p => p.presencial);
    }
    
    // Apply availability filter locally (since API doesn't have this)
    if (filters.availability !== 'any') {
      results = results.filter(p => p.availability.toLowerCase().replace(' ', '') === filters.availability);
    }
    
    setFilteredProfessionals(results);
  }, [professionals, filters.consultationType, filters.availability]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    
    // Reset pagination when filters change
    if (['rating', 'price', 'specialty_id'].includes(filterName)) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  };
  
  const handleSearch = () => {
    const query = new URLSearchParams();
    if (searchParams.specialty) query.set('especialidad', searchParams.specialty);
    if (searchParams.city) query.set('ciudad', searchParams.city);
    navigate(`/buscar?${query.toString()}`);
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const clearSearch = () => {
    setSearchParams({ specialty: '', city: '' });
    setFilters({ availability: 'any', consultationType: 'any', rating: 0, price: [0, 200], specialty_id: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
    navigate('/buscar');
  };
  
  const ProfessionalCard = ({ professional }) => (
    <div className="bg-card/80 dark:bg-gray-800/60 backdrop-blur-md border border-border dark:border-gray-700/50 rounded-xl p-4 hover:border-primary/70 dark:hover:border-blue-500/70 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-primary/20 dark:hover:shadow-blue-500/20">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-24 h-32 sm:h-24 flex-shrink-0">
          <img 
            alt={`Foto de ${professional.name}, ${professional.specialty}`} 
            className="w-full h-full object-cover rounded-lg" 
            src={professional.avatar_url || "https://images.unsplash.com/photo-1675270714610-11a5cadcc7b3"} 
          />
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-xl font-bold text-foreground dark:text-white">{professional.name}</h2>
            {professional.verified && (
              <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs font-medium">
                ✓ Verificado
              </div>
            )}
          </div>
          <p className="text-primary dark:text-blue-400 font-semibold mb-1 text-sm">{professional.specialty}</p>
          <div className="flex items-center text-muted-foreground dark:text-gray-400 mb-0.5 text-xs">
            <MapPin size={14} className="mr-1.5" /> {professional.city}
          </div>
          <div className="flex items-center text-yellow-500 dark:text-yellow-400 mb-2 text-xs">
            <Star size={14} className="mr-1 fill-current" /> 
            {professional.rating > 0 ? professional.rating.toFixed(1) : 'Nuevo'}
            <span className="text-muted-foreground dark:text-gray-500 ml-1.5">
              ({professional.reviews} {professional.reviews === 1 ? 'opinión' : 'opiniones'})
            </span>
          </div>
          {professional.experience_years > 0 && (
            <div className="text-xs text-muted-foreground dark:text-gray-400">
              {professional.experience_years} años de experiencia
            </div>
          )}
        </div>
        <div className="sm:text-right mt-2 sm:mt-0 flex-shrink-0">
            <div className="bg-primary/10 dark:bg-blue-500/20 text-primary dark:text-blue-300 px-3 py-1.5 rounded-lg text-center">
                <p className="text-xs font-medium">Precio consulta</p>
                <p className="text-lg font-bold">{professional.priceRange[0]}€{professional.priceRange[0] !== professional.priceRange[1] ? ` - ${professional.priceRange[1]}€` : ''}</p>
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
                    onClick={handleSearch}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-5 w-full md:w-auto text-sm"
                    >
                    {loading ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <SearchIcon size={16} className="mr-2" />
                    )}
                    {loading ? 'Buscando...' : 'Buscar'}
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
            <div className="mt-4 p-4 bg-card/90 dark:bg-gray-800/70 backdrop-blur-md rounded-xl border border-border dark:border-gray-700/50 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                <Label className="text-muted-foreground dark:text-gray-300 text-xs mb-1.5 block">Especialidad</Label>
                <Select value={filters.specialty_id} onValueChange={(value) => handleFilterChange('specialty_id', value)}>
                    <SelectTrigger className="bg-input dark:bg-gray-900/70 border-border dark:border-gray-700 text-foreground dark:text-white h-10 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent className="bg-popover dark:bg-gray-800 border-border dark:border-gray-700 text-popover-foreground dark:text-white">
                    <SelectItem value="" className="text-xs">Todas las especialidades</SelectItem>
                    {specialties.map(specialty => (
                      <SelectItem key={specialty.id} value={specialty.id.toString()} className="text-xs">
                        {specialty.name} ({specialty.professionals_count})
                      </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
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
                <Slider value={[filters.rating]} max={5} step={0.1} onValueChange={(value) => handleFilterChange('rating', value[0])} className="[&>span:first-child]:h-1 [&>span:first-child]:bg-primary py-2.5"/>
                </div>
                <div>
                <Label className="text-muted-foreground dark:text-gray-300 text-xs mb-1.5 block">Precio máx. (€{filters.price[1]})</Label>
                <Slider value={filters.price} max={200} step={10} onValueChange={(value) => handleFilterChange('price', value)} className="[&>span:first-child]:h-1 [&>span:first-child]:bg-primary py-2.5"/>
                </div>
            </div>
            )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 pb-12">
          <div className="lg:w-1/2 xl:w-2/5">
            <div className="flex justify-between items-center mb-4">
              <p className="text-muted-foreground dark:text-gray-400 text-sm">
              {loading ? (
                'Buscando profesionales...'
              ) : error ? (
                <span className="text-red-600 dark:text-red-400">{error}</span>
              ) : filteredProfessionals.length > 0 ? (
                `Mostrando ${filteredProfessionals.length} de ${pagination.total} profesionales ${searchParams.specialty ? `de ${searchParams.specialty}` : ''} ${searchParams.city ? `en ${searchParams.city}` : ''}`
              ) : (
                `No se encontraron profesionales ${searchParams.specialty ? `de ${searchParams.specialty}` : ''} ${searchParams.city ? `en ${searchParams.city}` : ''}. Intenta ampliar tu búsqueda.`
              )}
              </p>
              
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Anterior
                  </Button>
                  <span className="text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-10">
                <Loader2 size={48} className="mx-auto text-muted-foreground dark:text-gray-600 mb-3 animate-spin" />
                <h3 className="text-xl font-semibold text-foreground dark:text-white mb-1.5">Buscando profesionales</h3>
                <p className="text-muted-foreground dark:text-gray-400 text-sm">Por favor espera...</p>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <Users size={48} className="mx-auto text-red-500 dark:text-red-400 mb-3" />
                <h3 className="text-xl font-semibold text-foreground dark:text-white mb-1.5">Error de conexión</h3>
                <p className="text-muted-foreground dark:text-gray-400 mb-4 text-sm">{error}</p>
                <Button onClick={fetchProfessionals} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
                  Reintentar
                </Button>
              </div>
            ) : filteredProfessionals.length > 0 ? (
            <div className="space-y-4 max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                {filteredProfessionals.map(prof => <ProfessionalCard key={prof.id} professional={prof} />)}
            </div>
            ) : (
            <div className="text-center py-10">
                <Users size={48} className="mx-auto text-muted-foreground dark:text-gray-600 mb-3" />
                <h3 className="text-xl font-semibold text-foreground dark:text-white mb-1.5">No hay resultados</h3>
                <p className="text-muted-foreground dark:text-gray-400 mb-4 text-sm">Prueba a cambiar los filtros o términos de búsqueda.</p>
                <Button onClick={clearSearch} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
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
