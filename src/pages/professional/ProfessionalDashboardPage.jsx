import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Calendar, 
  Star, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CalendarClock, 
  ChevronRight,
  List
} from 'lucide-react';
import { Link } from 'react-router-dom';
const MonthlyIncomeChart = React.lazy(() => import('@/components/professional/dashboard/MonthlyIncomeChart'));
const AppointmentsCalendarView = React.lazy(() => import('@/components/professional/appointments/AppointmentsCalendarView'));
import { userApi } from '@/lib/clerkApi';
import { useToast } from "@/components/ui/use-toast";

const ProfessionalDashboardPage = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalPatients: 0,
    monthlyAppointments: 0,
    averageRating: 0,
    monthlyIncome: 0,
    trends: {
      patients: '0%',
      appointments: '0%',
      rating: '0',
      income: '0%'
    }
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        // Load data from API
        const [statsResponse, appointmentsResponse, reviewsResponse] = await Promise.all([
          userApi.getDashboardStats(),
          userApi.getDashboardAppointments(3),
          userApi.getDashboardReviews(3)
        ]);

        if (statsResponse.success) {
          setStats(statsResponse.data);
        }

        if (appointmentsResponse.success) {
          setUpcomingAppointments(appointmentsResponse.data);
        }

        if (reviewsResponse.success) {
          setRecentReviews(reviewsResponse.data);
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del dashboard. Intenta recargar la página.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadDashboardData();
    }
  }, [user, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Format stats for display
  const displayStats = [
    {
      title: "Total Pacientes",
      value: stats.totalPatients.toLocaleString(),
      trend: stats.trends.patients,
      icon: <Users className="w-5 h-5 text-blue-500" />,
      description: "vs. mes anterior"
    },
    {
      title: "Citas del Mes",
      value: stats.monthlyAppointments.toLocaleString(),
      trend: stats.trends.appointments,
      icon: <Calendar className="w-5 h-5 text-green-500" />,
      description: "vs. mes anterior"
    },
    {
      title: "Valoración Media",
      value: stats.averageRating,
      trend: stats.trends.rating,
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      description: "últimos 30 días"
    },
    {
      title: "Ingresos",
      value: `€${stats.monthlyIncome.toLocaleString()}`,
      trend: stats.trends.income,
      icon: <DollarSign className="w-5 h-5 text-emerald-500" />,
      description: "vs. mes anterior"
    }
  ];

  return (
    <>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white">Panel de Control</h1>
          <p className="mt-1 text-muted-foreground dark:text-gray-400">
            Bienvenido de nuevo, {user?.firstName} {user?.lastName || 'Dr. Usuario'}
          </p>
        </div>
        <Button asChild>
          <Link to="/profesionales/citas">
            <CalendarClock className="mr-2 h-4 w-4" />
            Nueva Cita
          </Link>
        </Button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {displayStats.map((stat, index) => (
          <Card key={index} className="p-6 bg-white dark:bg-gray-800 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                {stat.icon}
              </div>
              <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                {stat.trend}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stat.value}
            </h3>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.description}</p>
            </div>
            {/* Hover effect background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Card>
        ))}
      </div>

      {/* Monthly Income Chart */}
      <div className="mb-8">
        <React.Suspense fallback={
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <MonthlyIncomeChart />
        </React.Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Appointments */}
        <Card className="bg-white dark:bg-gray-800 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Citas de Hoy</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profesionales/citas" className="text-primary hover:text-primary/90">
                  Ver todas <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={appointment.patientImage} />
                      <AvatarFallback>{appointment.patientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{appointment.patientName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-primary" />
                      <span className="text-sm font-medium">{appointment.time}</span>
                    </div>
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      appointment.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Recent Reviews */}
        <Card className="bg-white dark:bg-gray-800 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Valoraciones Recientes</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profesionales/valoraciones" className="text-primary hover:text-primary/90">
                  Ver todas <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <div key={review.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={review.patientImage} />
                      <AvatarFallback>{review.patientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{review.patientName}</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{review.date}</span>
                      </div>
                      <div className="flex mb-2">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar and List View */}
      <div className="grid gap-6 mb-8">
        <div className="grid gap-4 md:grid-cols-4">
          {/* Stats cards ... */}
        </div>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Vista Calendario
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              Vista Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <React.Suspense fallback={
              <div className="h-96 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }>
              <AppointmentsCalendarView
                appointments={upcomingAppointments}
                onDaySelect={(date) => {
                  toast({
                    title: "Citas para " + date.toLocaleDateString(),
                    description: "Aquí podrás ver los detalles de las citas para este día"
                  });
                  // TODO: Implementar modal o navegación a vista detallada del día
                }}
              />
            </React.Suspense>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <div className="divide-y divide-border dark:divide-gray-800">
                {/* Lista de citas existente... */}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Gráficos y otros widgets... */}
        </div>
      </div>
    </>
  );
};

export default ProfessionalDashboardPage;
