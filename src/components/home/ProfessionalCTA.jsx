
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const ProfessionalCTA = () => {
  return (
    <section className="py-16 md:py-20 bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="rounded-2xl bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800/70 dark:to-blue-900/30 border border-gray-200 dark:border-gray-700/50 p-8 md:p-12 shadow-2xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                ¿Eres especialista de la salud?<br />
                Empieza a adquirir nuevos pacientes
              </h2>
              <ul className="space-y-4 mb-8">
                {[
                  { title: "Conecta con pacientes", desc: "Conecta con pacientes que buscan especialistas en tu localidad." },
                  { title: "Gestión de citas 24/7", desc: "Permite que tus pacientes reserven cita tanto de día como de noche." },
                  { title: "Mejora tu reputación", desc: "Mejora tu reputación online consiguiendo opiniones verificadas." }
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-blue-500 dark:text-blue-400 font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3 md:py-4 transition-colors">
                <Link to="/profesionales">
                  Descubre Mundoctor Pro →
                </Link>
              </Button>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-300 dark:border-gray-700/30 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                  RM
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Dr. Rubén Morales</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Panel de Control</p>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Ingresos este mes</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">2.818€</span>
                    <span className="text-green-500 dark:text-green-400 text-sm font-medium">+4.3%</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Próxima cita</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-900 dark:text-white">María García</span>
                    <span className="text-gray-600 dark:text-gray-400">Hoy a las 11:30</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Valoración media</p>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">★</span>
                    <span className="text-gray-900 dark:text-white font-semibold">4.8</span>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">(93 opiniones)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalCTA;
