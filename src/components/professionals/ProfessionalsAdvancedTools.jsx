
import React from 'react';
import { MessageSquare, Settings, ShieldCheck } from 'lucide-react';

const ProfessionalsAdvancedTools = () => {
  const tools = [
    { icon: <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />, text: "Chat directo con pacientes" },
    { icon: <Settings size={20} className="text-blue-600 dark:text-blue-400" />, text: "Widget integrable en tu web" },
    { icon: <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400" />, text: "Máxima seguridad y cumplimiento RGPD" },
  ];

  return (
    <section className="py-16 bg-gray-100 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Herramientas Avanzadas</h3>
            <p className="text-gray-700 dark:text-gray-400 mb-6">
              Desde marketing digital hasta integraciones con otras plataformas, te ofrecemos todo para llevar tu consulta al siguiente nivel.
            </p>
            <div className="space-y-3">
              {tools.map(item => (
                <div key={item.text} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  {item.icon}
                  <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="">
            <img  alt="Panel de control con herramientas avanzadas para profesionales de la salud" className="w-full h-auto object-contain rounded-lg" src="https://neubox.com/blog/wp-content/uploads/2023/09/Blog_Neubox_Gestio%CC%81n-de-tareas-1_Imagen-1.webp" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalsAdvancedTools;
