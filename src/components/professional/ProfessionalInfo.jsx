import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Star, CheckCircle, Award } from 'lucide-react';
import { insuranceCompanies } from '@/types/insurance';
import ProfessionalAvatar from '@/components/ui/professional-avatar';

const ProfessionalInfo = ({ professional }) => {
  return (
    <div className="space-y-6">
      {/* Header con información básica */}      <div className="flex gap-6 items-start">
        <ProfessionalAvatar
          imageUrl={professional.image}
          name={professional.name}
          size="lg"
          className="border-2 border-primary/10"
        />
        <div>
          <h1 className="text-2xl font-semibold mb-1">{professional.name}</h1>
          <p className="text-gray-600 mb-2">{professional.specialty}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="font-medium">{professional.rating}</span>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Nº Colegiado: {professional.licenseNumber}
            </Badge>
          </div>
        </div>
      </div>

      {/* Información de contacto y ubicación */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-500" />
          <span>{professional.city}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-gray-500" />
          <span>{professional.contact.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-500" />
          <span>{professional.contact.email}</span>
        </div>
      </Card>

      {/* Aseguradoras */}
      {professional.insurance?.worksWithInsurance && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Aseguradoras</h2>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {professional.insurance.insuranceCompanies.map(companyId => {
                const company = insuranceCompanies.find(c => c.id === companyId);
                return company ? (
                  <Badge key={company.id} variant="secondary">
                    {company.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Especialidades */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Especialidades</h2>
        <div className="flex flex-wrap gap-2">
          {professional.services.map((service, index) => (
            <Badge key={index} variant="secondary">
              {service}
            </Badge>
          ))}
        </div>
      </div>

      {/* Formación */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Formación</h2>
        <ul className="space-y-2">
          {professional.education.map((edu, index) => (
            <li key={index} className="flex items-start gap-2">
              <Award className="w-5 h-5 text-gray-500 mt-1" />
              <span>{edu}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Experiencia */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Experiencia</h2>
        <ul className="space-y-2">
          {professional.experience.map((exp, index) => (
            <li key={index} className="ml-5 list-disc">
              {exp}
            </li>
          ))}
        </ul>
      </div>

      {/* Reseñas */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            Reseñas de Pacientes
          </h2>
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400 fill-current" />
            <span className="text-xl font-bold">{professional.rating}</span>
            <span className="text-gray-500">({professional.reviews} reseñas)</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {professional.opinions.map((opinion, index) => (
            <Card key={index} className="p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {opinion.user.charAt(0)}
                  </div>
                  <div>
                    <span className="font-medium block">{opinion.user}</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{opinion.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300">{opinion.comment}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalInfo;
