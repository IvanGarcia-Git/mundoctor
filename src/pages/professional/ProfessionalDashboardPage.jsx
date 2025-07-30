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
    </>
  );
};

export default ProfessionalDashboardPage;
