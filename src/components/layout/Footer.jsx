
import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import { Facebook, Instagram, Linkedin, Navigation } from 'lucide-react';
import { FaTiktok } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: 'Plataforma',
      links: [
        { name: 'Para Pacientes', path: '/buscar' },
        { name: 'Para Profesionales', path: '/profesionales' },
        { name: 'Especialidades', path: '/buscar' },
        { name: 'Blog', path: '/blog' },
      ]
    },
    {
      title: 'Compañía',
      links: [
        { name: 'Sobre Nosotros', path: '/contacto' }, // Asumiendo que Contacto puede tener info "Sobre Nosotros"
        { name: 'Carreras', path: '/coming-soon/carreras' }, // Placeholder
        { name: 'Prensa', path: '/coming-soon/prensa' }, // Placeholder
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Términos y Condiciones', path: '/terminos' },
        { name: 'Política de Privacidad', path: '/privacidad' },
        { name: 'Política de Cookies', path: '/cookies' },
      ]
    },
    {
      title: 'Soporte',
      links: [
        { name: 'Centro de Ayuda', path: '/contacto' },
        { name: 'Contacto', path: '/contacto' },
        { name: 'Preguntas Frecuentes', path: '/coming-soon/faq' }, // Placeholder
      ]
    },
    {
      title: 'Administración',
      links: [
        { name: 'Dashboard', path: '/admin/dashboard' },
        { name: 'Usuarios', path: '/admin/usuarios' },
        { name: 'Validaciones', path: '/admin/validaciones' },
        { name: 'Suscripciones', path: '/admin/suscripciones' },
      ],
      adminOnly: true,
    }
  ];

  const socialLinks = [
    { name: 'Facebook', icon: <Facebook size={20} />, path: 'https://facebook.com' },
    { name: 'Instagram', icon: <Instagram size={20} />, path: 'https://instagram.com' },
    { name: 'TikTok', icon: <FaTiktok size={20} />, path: 'https://tiktok.com' },
    { name: 'LinkedIn', icon: <Linkedin size={20} />, path: 'https://linkedin.com' },
  ];

  return (
    <footer className="bg-card dark:bg-slate-900 border-t border-border dark:border-gray-800 text-card-foreground dark:text-gray-300">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-10">
          <div className="col-span-2 mb-6 md:mb-0">
            <Link to="/" className="flex items-center mb-4">
              <Logo className="h-8 w-auto mr-2" />
            </Link>
            <p className="text-sm text-muted-foreground dark:text-gray-400 max-w-xs">
              Conectando pacientes con profesionales de la salud. Tu bienestar, nuestra prioridad.
            </p>
          </div>
          {/* {sections.map((section) => (
            <div key={section.title}>
              <p className="font-semibold text-foreground dark:text-white mb-4">{section.title}</p>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link to={link.path} className="text-sm text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
                      {link.name}
                    </Link>
                    {section.adminOnly && <span className="text-xs text-yellow-500 ml-1">(Admin)</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))} */}
        </div>

        <div className="border-t border-border dark:border-gray-700/50 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4 md:mb-0">
            &copy; {currentYear} Mundoctor. Todos los derechos reservados.
          </p>
          <div className="flex space-x-4">
            {socialLinks.map((social) => (
              <a key={social.name} href={social.path} target="_blank" rel="noopener noreferrer" 
                 className="text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors"
                 aria-label={social.name}>
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
