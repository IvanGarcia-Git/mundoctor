
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { Phone, Mail, MapPin, Send, User, MessageSquare } from 'lucide-react';

const ContactPage = () => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Contact form submission:', { name, email, subject, message });
    toast({
      title: "Mensaje Enviado (Simulación)",
      description: "Gracias por contactarnos. Te responderemos pronto.",
    });
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
  };

  return (
    <div className="py-16 md:py-24 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-blue-900/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 dark:from-white dark:via-gray-300 dark:to-gray-400">
            Ponte en Contacto
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-400 max-w-xl mx-auto">
            ¿Tienes alguna pregunta o necesitas ayuda? Estamos aquí para asistirte.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          <div className="bg-white/90 dark:bg-gray-800/60 backdrop-blur-md shadow-2xl rounded-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Envíanos un mensaje</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Nombre</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
                    <Input id="name" type="text" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} required className="bg-white dark:bg-gray-900/70 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 pl-10 h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
                    <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white dark:bg-gray-900/70 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 pl-10 h-12" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-gray-700 dark:text-gray-300">Asunto</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
                  <Input id="subject" type="text" placeholder="Asunto de tu mensaje" value={subject} onChange={(e) => setSubject(e.target.value)} required className="bg-white dark:bg-gray-900/70 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 pl-10 h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-gray-700 dark:text-gray-300">Mensaje</Label>
                <Textarea
                  id="message"
                  placeholder="Escribe tu mensaje aquí..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="bg-white dark:bg-gray-900/70 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 min-h-[120px] p-3"
                  rows={5}
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base">
                <Send size={18} className="mr-2" /> Enviar Mensaje
              </Button>
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-white/90 dark:bg-gray-800/60 backdrop-blur-md shadow-xl rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <Phone size={22} className="text-blue-600 dark:text-blue-400 mr-3" />
                Teléfono
              </h3>
              <a href="tel:+34900123456" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-lg">+34 900 123 456</a>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Lunes a Viernes, 9am - 6pm</p>
            </div>
            <div className="bg-white/90 dark:bg-gray-800/60 backdrop-blur-md shadow-xl rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <Mail size={22} className="text-blue-600 dark:text-blue-400 mr-3" />
                Correo Electrónico
              </h3>
              <a href="mailto:soporte@doctores.com" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-lg">soporte@doctores.com</a>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Te responderemos en 24 horas</p>
            </div>
            <div className="bg-white/90 dark:bg-gray-800/60 backdrop-blur-md shadow-xl rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <MapPin size={22} className="text-blue-600 dark:text-blue-400 mr-3" />
                Oficina Central
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-lg">Calle Ficticia 123, Madrid, España</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Visitas con cita previa</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
