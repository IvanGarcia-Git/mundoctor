
import React from 'react';
import { Button } from '@/components/ui/button';

const professionals = [
  {
    name: "Dr. Elena Rodríguez",
    specialty: "Cardiología",
    rating: 4.9,
    reviews: 120,
    imageAlt: "Portrait of Dr. Elena Rodriguez, cardiologist",
    imageDesc: "Female cardiologist smiling confidently",
    imageSrc: "https://pixel-p2.s3.eu-central-1.amazonaws.com/doctor/avatar/c2737d07/c2737d07-a9e0-40f5-8b81-48faaad945fd_large.jpg"
  },
  {
    name: "Dr. Carlos Vega",
    specialty: "Pediatría",
    rating: 4.8,
    reviews: 95,
    imageAlt: "Portrait of Dr. Carlos Vega, pediatrician",
    imageDesc: "Male pediatrician with a friendly expression",
    imageSrc: "https://s3-eu-west-1.amazonaws.com/doctoralia.es/doctor/38b1c6/38b1c6eaec9c73b573b11971565b078e_large.jpg"
  },
  {
    name: "Dra. Sofía Navarro",
    specialty: "Dermatología",
    rating: 4.7,
    reviews: 88,
    imageAlt: "Portrait of Dra. Sofia Navarro, dermatologist",
    imageDesc: "Female dermatologist in a modern clinic setting",
    imageSrc: "https://pixel-p2.s3.eu-central-1.amazonaws.com/doctor/avatar/b349449c/b349449c-9774-45aa-b91f-663e9d1ec918_large.jpg"
  },
  {
    name: "Dr. Javier Alonso",
    specialty: "Fisioterapia",
    rating: 4.9,
    reviews: 150,
    imageAlt: "Portrait of Dr. Javier Alonso, physiotherapist",
    imageDesc: "Male physiotherapist demonstrating an exercise",
    imageSrc: "https://pixel-p2.s3.eu-central-1.amazonaws.com/doctor/avatar/83ae545f/83ae545f-48cd-4463-b7f1-770eecc60cd5_large.jpg"
  }
];

const FeaturedProfessionals = () => {
  return (
    <section className="py-16 md:py-20 bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Profesionales Destacados
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {professionals.map((prof, index) => (
            <div key={index} className="bg-white dark:bg-gray-900/70 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50 group hover:border-blue-500/70 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-blue-500/20">
              <div className="aspect-[4/3] relative overflow-hidden">
                <img 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={prof.imageAlt}
                 src={prof.imageSrc} />
              </div>
              <div className="p-5 md:p-6">
                <h3 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">{prof.name}</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">{prof.specialty}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-yellow-400">★</span>
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">{prof.rating}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">({prof.reviews} opiniones)</span>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  Ver Profesional
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProfessionals;
