
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2, Users, CalendarClock, Star, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, LineChart, Line } from 'recharts';

const sampleMonthlyAppointments = [
  { name: 'Ene', citas: 65, ingresos: 3250 }, { name: 'Feb', citas: 59, ingresos: 2950 },
  { name: 'Mar', citas: 80, ingresos: 4000 }, { name: 'Abr', citas: 81, ingresos: 4050 },
  { name: 'May', citas: 56, ingresos: 2800 }, { name: 'Jun', citas: 70, ingresos: 3500 },
];

const samplePatientDemographics = [
  { name: '0-18', value: 15 }, { name: '19-35', value: 40 },
  { name: '36-55', value: 30 }, { name: '55+', value: 15 },
];

const sampleRatingTrend = [
  { month: 'Ene', rating: 4.5 }, { month: 'Feb', rating: 4.6 },
  { month: 'Mar', rating: 4.8 }, { month: 'Abr', rating: 4.7 },
  { month: 'May', rating: 4.9 }, { month: 'Jun', rating: 4.85 },
];

const StatDisplayCard = ({ title, value, icon, trend, description, colorClass = "text-primary dark:text-blue-400" }) => {
  const IconComponent = icon;
  return (
    <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">{title}</CardTitle>
        <IconComponent size={20} className={colorClass} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground dark:text-white">{value}</div>
        {trend && <p className={`text-xs ${trend.startsWith('+') ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{trend}</p>}
        {description && <p className="text-xs text-muted-foreground dark:text-gray-500 mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

const ProfessionalAnalyticsPage = () => {
  return (
    <div className="container mx-auto p-4 md:p-8 bg-background dark:bg-slate-900 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">Estadísticas y Rendimiento</h1>
        <p className="text-muted-foreground dark:text-gray-400">Analiza tus métricas clave para optimizar tu consulta.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatDisplayCard title="Total Pacientes" value="125" icon={Users} trend="+5 este mes" description="Número total de pacientes activos." colorClass="text-indigo-500 dark:text-indigo-400"/>
        <StatDisplayCard title="Citas este Mes" value="70" icon={CalendarClock} trend="+12% vs mes anterior" description="Citas completadas en el mes actual." colorClass="text-sky-500 dark:text-sky-400"/>
        <StatDisplayCard title="Valoración Media" value="4.85" icon={Star} trend="+0.05" description="Basado en 62 valoraciones." colorClass="text-amber-500 dark:text-amber-400"/>
        <StatDisplayCard title="Ingresos Estimados (Mes)" value="€3,500" icon={DollarSign} trend="-€200 vs mes anterior" description="Estimación basada en citas completadas." colorClass="text-emerald-500 dark:text-emerald-400"/>
      </div>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
        <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white flex items-center"><BarChart2 size={20} className="mr-2 text-primary dark:text-blue-400" /> Citas e Ingresos Mensuales</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">Evolución de citas e ingresos en los últimos 6 meses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleMonthlyAppointments} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-gray-700" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--muted-foreground))' }} className="dark:fill-gray-400 dark:stroke-gray-600" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fill: '#8884d8' }} tickLine={{ stroke: '#8884d8' }} label={{ value: 'Citas', angle: -90, position: 'insideLeft', fill: '#8884d8' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fill: '#82ca9d' }} tickLine={{ stroke: '#82ca9d' }} label={{ value: 'Ingresos (€)', angle: -90, position: 'insideRight', fill: '#82ca9d' }} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))' 
                  }}
                  itemStyle={{color: 'hsl(var(--foreground))'}}
                  labelStyle={{color: 'hsl(var(--foreground))', fontWeight: 'bold'}}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                <Bar yAxisId="left" dataKey="citas" fill="#8884d8" name="Nº Citas" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="ingresos" fill="#82ca9d" name="Ingresos (€)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white flex items-center"><Activity size={20} className="mr-2 text-primary dark:text-blue-400" /> Tendencia de Valoración Media</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">Evolución de tu puntuación media mensual.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sampleRatingTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-gray-700" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--muted-foreground))' }} className="dark:fill-gray-400 dark:stroke-gray-600" />
                <YAxis domain={[4, 5]} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--muted-foreground))' }} className="dark:fill-gray-400 dark:stroke-gray-600" />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))' 
                    }}
                    itemStyle={{color: 'hsl(var(--foreground))'}}
                    labelStyle={{color: 'hsl(var(--foreground))', fontWeight: 'bold'}}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
                <Line type="monotone" dataKey="rating" name="Valoración Media" stroke="#ffc658" strokeWidth={2} dot={{ r: 4, fill: '#ffc658' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Placeholder para más gráficos, como demografía de pacientes */}
        <Card className="lg:col-span-2 bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
            <CardHeader>
                <CardTitle className="text-foreground dark:text-white flex items-center"><Users size={20} className="mr-2 text-primary dark:text-blue-400" /> Demografía de Pacientes </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-gray-400">Distribución por edad</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground dark:text-gray-500">No hay datos para mostrar todavía</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfessionalAnalyticsPage;
