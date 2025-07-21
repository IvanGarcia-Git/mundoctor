import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Star, Phone, Mail, Calendar, Clock, Shield } from 'lucide-react';
import ProfessionalAvatar from '@/components/ui/professional-avatar';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const ProfessionalProfilePage = () => {
  const { id } = useParams();
  const [professional, setProfessional] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) {
        setError('ID del profesional no encontrado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Realizar todas las peticiones en paralelo
        const [professionalResponse, reviewsResponse, servicesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/professionals/${id}`),
          fetch(`${API_BASE_URL}/reviews/professional/${id}?limit=5`),
          fetch(`${API_BASE_URL}/services/professional/${id}`)
        ]);
        
        // Procesar datos del profesional
        if (professionalResponse.ok) {
          const professionalData = await professionalResponse.json();
          if (professionalData.success) {
            setProfessional(professionalData.data);
          } else {
            throw new Error('Profesional no encontrado');
          }
        } else {
          throw new Error(`Error ${professionalResponse.status}: ${professionalResponse.statusText}`);
        }

        // Procesar reseñas (no crítico si falla)
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          if (reviewsData.success && reviewsData.data) {
            setReviews(reviewsData.data.reviews || reviewsData.data || []);
          }
        }

        // Procesar servicios (no crítico si falla)
        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json();
          if (servicesData.success && servicesData.data) {
            setServices(servicesData.data || []);
          }
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('No se pudo cargar la información del profesional');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando información del profesional...</p>
        </div>
      </div>
    );
  }

  if (error || !professional) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error || 'Profesional no encontrado'}</p>
            <Link to="/buscar">
              <Button variant="outline" className="mr-2">
                <ArrowLeft size={16} className="mr-2" />
                Volver a la búsqueda
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const defaultProfessional = {
    name: professional.name || 'Profesional',
    specialty_name: professional.specialty_name || 'Medicina General',
    city: professional.city || 'No especificado',
    avatar_url: professional.avatar_url,
    rating: professional.rating || 0,
    total_reviews: professional.total_reviews || 0,
    consultation_fee: professional.consultation_fee || 50,
    about: professional.about || 'Profesional de la salud comprometido con brindar atención de calidad.',
    verified: professional.verified || false,
    experience_years: professional.experience_years || 0,
    phone: professional.phone || 'No disponible',
    email: professional.email || 'No disponible',
    office_hours: professional.office_hours || {},
    languages: professional.languages || []
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/buscar">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft size={16} className="mr-2" />
              Volver a la búsqueda
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal - Información del profesional */}
          <div className="lg:col-span-2">
            {/* Tarjeta principal del profesional */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <ProfessionalAvatar
                    imageUrl={defaultProfessional.avatar_url}
                    name={defaultProfessional.name}
                    size="xl"
                    className="mx-auto sm:mx-0"
                  />
                </div>

                {/* Información básica */}
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                      {defaultProfessional.name}
                    </h1>
                    {defaultProfessional.verified && (
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Shield size={14} />
                        Colegiado: 12345
                      </div>
                    )}
                  </div>

                  <p className="text-lg text-primary font-semibold mb-4">
                    {defaultProfessional.specialty_name}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center mb-3">
                    <div className="flex items-center text-yellow-500 mr-3">
                      <Star size={16} className="mr-1 fill-current" />
                      <span className="font-semibold">
                        {defaultProfessional.rating > 0 ? defaultProfessional.rating.toFixed(1) : 'Nuevo'}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      ({defaultProfessional.total_reviews} {defaultProfessional.total_reviews === 1 ? 'opinión' : 'opiniones'})
                    </span>
                  </div>

                  {/* Experiencia */}
                  {defaultProfessional.experience_years > 0 && (
                    <p className="text-muted-foreground mb-4">
                      {defaultProfessional.experience_years} años de experiencia
                    </p>
                  )}

                  {/* Precio */}
                  <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg inline-block">
                    <span className="text-sm font-medium">Consulta desde </span>
                    <span className="text-lg font-bold">{defaultProfessional.consultation_fee}€</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <div className="space-y-3">
                <div className="flex items-center text-muted-foreground">
                  <MapPin size={16} className="mr-3" />
                  <span>{defaultProfessional.city}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Phone size={16} className="mr-3" />
                  <span>{defaultProfessional.phone}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Mail size={16} className="mr-3" />
                  <span>{defaultProfessional.email}</span>
                </div>
              </div>
            </div>


            {/* Servicios */}
            {services.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Servicios Ofrecidos</h2>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service.id} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <span className="text-primary font-bold text-lg">{service.base_fee}€</span>
                      </div>
                      {service.description && (
                        <p className="text-muted-foreground text-sm mb-2">{service.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {service.duration_minutes} min
                        </span>
                        {service.is_virtual_available && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Online</span>
                        )}
                        {service.is_in_person_available && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">Presencial</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formación y Experiencia */}
            {(professional.education || professional.about) && (
              <div className="bg-card rounded-xl border border-border p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Sobre el Profesional</h2>
                <div className="space-y-4">
                  {professional.about && (
                    <div>
                      <h3 className="font-medium text-primary mb-2">Información Profesional</h3>
                      <p className="text-muted-foreground">{professional.about}</p>
                    </div>
                  )}
                  
                  {professional.education && Array.isArray(professional.education) && professional.education.length > 0 && (
                    <div>
                      <h3 className="font-medium text-primary mb-2">Formación</h3>
                      <div className="space-y-2">
                        {professional.education.map((edu, index) => (
                          <div key={index} className="flex items-start">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            <div>
                              <p className="font-medium">{edu.degree || edu.title}</p>
                              {edu.institution && <p className="text-sm text-muted-foreground">{edu.institution}</p>}
                              {edu.year && <p className="text-sm text-muted-foreground">{edu.year}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {professional.experience_years > 0 && (
                    <div>
                      <h3 className="font-medium text-primary mb-2">Experiencia</h3>
                      <p className="text-muted-foreground">
                        {professional.experience_years} años de experiencia en {defaultProfessional.specialty_name}
                      </p>
                    </div>
                  )}

                  {professional.languages && professional.languages.length > 0 && (
                    <div>
                      <h3 className="font-medium text-primary mb-2">Idiomas</h3>
                      <div className="flex flex-wrap gap-2">
                        {professional.languages.map((lang, index) => (
                          <span key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reseñas de Pacientes */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Reseñas de Pacientes</h2>
                <div className="flex items-center">
                  <Star size={16} className="text-yellow-500 fill-current mr-1" />
                  <span className="font-bold text-lg">
                    {defaultProfessional.rating > 0 ? defaultProfessional.rating.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-muted-foreground text-sm ml-1">
                    ({defaultProfessional.total_reviews} {defaultProfessional.total_reviews === 1 ? 'reseña' : 'reseñas'})
                  </span>
                </div>
              </div>
              
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-secondary/20 rounded-lg p-4">
                      <div className="flex items-start mb-3">
                        <div className="bg-primary rounded-full w-8 h-8 flex items-center justify-center text-primary-foreground font-semibold text-sm mr-3">
                          {review.patient?.name?.[0] || review.patient_name?.[0] || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {review.patient?.name || review.patient_name || 'Paciente Anónimo'}
                          </p>
                          <div className="flex text-yellow-500 text-sm">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={14} 
                                className={star <= review.rating ? "fill-current" : ""}
                              />
                            ))}
                          </div>
                          {review.created_at && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-muted-foreground text-sm">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Este profesional aún no tiene reseñas de pacientes.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Columna lateral - Disponibilidad y Reservas */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Reservar Cita</h2>
              
              {/* Horarios */}
              {professional.office_hours && (
                <div className="mb-4">
                  <div className="flex items-center text-muted-foreground mb-2">
                    <Clock size={16} className="mr-2" />
                    <span className="text-sm">Horarios de atención</span>
                  </div>
                  {typeof professional.office_hours === 'object' ? (
                    Object.entries(professional.office_hours).map(([day, hours]) => (
                      <div key={day} className="text-xs text-muted-foreground">
                        {day}: {hours}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{professional.office_hours}</p>
                  )}
                </div>
              )}

              {/* Precios */}
              <div className="bg-primary/10 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Precio por consulta</p>
                  <p className="text-2xl font-bold text-primary">
                    {defaultProfessional.consultation_fee}€
                  </p>
                </div>
              </div>

              {/* Servicios disponibles */}
              {services.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Servicios disponibles:</h3>
                  <div className="space-y-2">
                    {services.slice(0, 3).map((service) => (
                      <div key={service.id} className="flex justify-between text-sm">
                        <span>{service.name}</span>
                        <span className="font-semibold">{service.base_fee}€</span>
                      </div>
                    ))}
                    {services.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{services.length - 3} servicios más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tipos de consulta */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">Modalidades disponibles:</h3>
                <div className="flex flex-wrap gap-2">
                  {services.some(s => s.is_virtual_available) && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                      Videoconsulta
                    </span>
                  )}
                  {services.some(s => s.is_in_person_available) && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                      Presencial
                    </span>
                  )}
                </div>
              </div>

              {/* Información de contacto rápida */}
              <div className="text-center space-y-2 mb-6">
                <p className="text-sm text-muted-foreground">¿Necesitas más información?</p>
                {defaultProfessional.phone !== 'No disponible' && (
                  <p className="text-xs">
                    <Phone size={12} className="inline mr-1" />
                    {defaultProfessional.phone}
                  </p>
                )}
                {defaultProfessional.email !== 'No disponible' && (
                  <p className="text-xs">
                    <Mail size={12} className="inline mr-1" />
                    {defaultProfessional.email}
                  </p>
                )}
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                <Button className="w-full" size="lg">
                  <Calendar size={16} className="mr-2" />
                  Ver Disponibilidad
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <Phone size={16} className="mr-2" />
                  Llamar Ahora
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                * Los horarios pueden variar. Confirma disponibilidad al reservar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalProfilePage;