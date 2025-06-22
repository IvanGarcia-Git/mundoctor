
import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, UserCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sampleBlogPosts = [
  {
    id: 1,
    title: '5 Consejos para Mantener un Corazón Saludable',
    category: 'Cardiología',
    author: 'Dr. Alejandro Pérez',
    date: '2024-05-15',
    excerpt: 'Descubre hábitos sencillos que puedes incorporar en tu día a día para cuidar tu salud cardiovascular y prevenir enfermedades...',
    imageDesc: 'Corazón abstracto con elementos de salud',
    slug: '5-consejos-corazon-saludable'
  },
  {
    id: 2,
    title: 'La Importancia de la Protección Solar Diaria',
    category: 'Dermatología',
    author: 'Dra. Laura Gómez',
    date: '2024-05-10',
    excerpt: 'El sol es vital, pero la exposición sin protección puede ser dañina. Aprende por qué y cómo proteger tu piel todos los días...',
    imageDesc: 'Persona aplicándose protector solar en la playa',
    slug: 'importancia-proteccion-solar-diaria'
  },
  {
    id: 3,
    title: 'Guía de Vacunación Infantil: Todo lo que Debes Saber',
    category: 'Pediatría',
    author: 'Dr. Carlos Fernández',
    date: '2024-05-05',
    excerpt: 'Las vacunas son clave para la salud de tus hijos. Resolvemos tus dudas sobre el calendario de vacunación y sus beneficios...',
    imageDesc: 'Bebé sonriente recibiendo una vacuna de un pediatra',
    slug: 'guia-vacunacion-infantil'
  },
  {
    id: 4,
    title: 'Manejando la Ansiedad en Tiempos Modernos',
    category: 'Psicología',
    author: 'Dr. Javier Ruiz',
    date: '2024-04-28',
    excerpt: 'La ansiedad es común, pero hay estrategias efectivas para manejarla. Te ofrecemos herramientas prácticas para mejorar tu bienestar emocional...',
    imageDesc: 'Persona meditando en un entorno tranquilo',
    slug: 'manejando-ansiedad-tiempos-modernos'
  }
];

const BlogPostCard = ({ post }) => {
  return (
    <article className="bg-card dark:bg-gray-800/60 backdrop-blur-md border border-border dark:border-gray-700/50 rounded-xl overflow-hidden shadow-lg hover:shadow-primary/10 dark:hover:shadow-blue-500/10 transition-all duration-300 flex flex-col">
      <Link to={`/blog/${post.slug}`} className="block aspect-[16/9] overflow-hidden">
        <img  alt={post.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" src="https://images.unsplash.com/photo-1675023112817-52b789fd2ef0" />
      </Link>
      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-2">
          <Link to={`/blog/categoria/${post.category.toLowerCase()}`} className="text-xs font-semibold text-primary dark:text-blue-400 uppercase hover:underline">
            {post.category}
          </Link>
        </div>
        <h2 className="text-xl font-bold text-foreground dark:text-white mb-3">
          <Link to={`/blog/${post.slug}`} className="hover:text-primary dark:hover:text-blue-400 transition-colors">
            {post.title}
          </Link>
        </h2>
        <p className="text-muted-foreground dark:text-gray-300 text-sm mb-4 flex-grow">{post.excerpt}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-gray-400 border-t border-border dark:border-gray-700/50 pt-4 mt-auto">
          <div className="flex items-center">
            <UserCircle size={14} className="mr-1.5" /> {post.author}
          </div>
          <div className="flex items-center">
            <CalendarDays size={14} className="mr-1.5" /> {new Date(post.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link to={`/blog/${post.slug}`}>Leer más <ChevronRight size={16} className="ml-1.5" /></Link>
        </Button>
      </div>
    </article>
  );
};

const BlogPage = () => {
  // For now, using sample posts. Later, this would fetch posts.
  const posts = sampleBlogPosts;

  return (
    <div className="bg-background dark:bg-slate-900 text-foreground dark:text-white min-h-screen">
      <section className="py-12 md:py-16 bg-gradient-to-b from-primary/5 via-background to-background dark:from-blue-900/20 dark:via-slate-900 dark:to-slate-900">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Nuestro Blog de Salud</h1>
          <p className="text-lg text-muted-foreground dark:text-gray-300 max-w-2xl mx-auto">
            Artículos, consejos y novedades del mundo de la salud, escritos por nuestros profesionales.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {posts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map(post => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <h2 className="text-2xl font-semibold mb-4">Próximamente</h2>
              <p className="text-muted-foreground dark:text-gray-400">Estamos trabajando en nuevos artículos interesantes. ¡Vuelve pronto!</p>
            </div>
          )}

          {posts.length > 0 && (
            <div className="mt-12 text-center">
              <Button size="lg" variant="outline">Cargar más artículos</Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
