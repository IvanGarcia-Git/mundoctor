import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Save, Loader2 } from 'lucide-react';
import { userApi } from '@/lib/clerkApi';
import { useToast } from '@/components/ui/use-toast';

const PatientProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profileImage: ''
  });
  const { toast } = useToast();

  // Load user profile on component mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userProfile = await userApi.getProfile();
        setProfile(userProfile);
        
        // Update form data with loaded profile
        setFormData({
          firstName: userProfile.first_name || userProfile.firstName || '',
          lastName: userProfile.last_name || userProfile.lastName || '',
          email: userProfile.email || '',
          phone: userProfile.phone || '',
          profileImage: userProfile.profile_image_url || userProfile.profileImage || ''
        });
        
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err.message || 'Error al cargar el perfil');
        toast({
          title: 'Error',
          description: 'No se pudo cargar el perfil. Intenta nuevamente.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [toast]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const updates = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        profile_image_url: formData.profileImage
      };
      
      const updatedProfile = await userApi.updateProfile(updates);
      setProfile(updatedProfile);
      
      toast({
        title: 'Éxito',
        description: 'Tu perfil ha sido actualizado correctamente.',
        variant: 'default',
      });
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Error al actualizar el perfil');
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el perfil. Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    const firstName = formData.firstName || profile?.first_name || profile?.firstName || '';
    const lastName = formData.lastName || profile?.last_name || profile?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Cargando perfil...</span>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">Mi Perfil</h1>
        <p className="text-muted-foreground dark:text-gray-400">Gestiona tu información personal y preferencias.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white">Foto de Perfil</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400">
                Tu imagen en la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Avatar className="h-32 w-32 mb-4">
                <AvatarImage src={formData.profileImage || profile?.profile_image_url} />
                <AvatarFallback className="text-2xl font-semibold">{getUserInitials()}</AvatarFallback>
              </Avatar>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Cambiar Foto
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white">Información Personal</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400">
                Actualiza tus datos personales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName" className="text-foreground dark:text-gray-300">
                      Nombre
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-muted-foreground" size={16} />
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="pl-9 bg-background dark:bg-slate-700 border-border dark:border-gray-600"
                        placeholder="Tu nombre"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lastName" className="text-foreground dark:text-gray-300">
                      Apellido
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-muted-foreground" size={16} />
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="pl-9 bg-background dark:bg-slate-700 border-border dark:border-gray-600"
                        placeholder="Tu apellido"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-foreground dark:text-gray-300">
                      Correo Electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-muted-foreground" size={16} />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-9 bg-background dark:bg-slate-700 border-border dark:border-gray-600"
                        placeholder="tu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-foreground dark:text-gray-300">
                      Teléfono
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-muted-foreground" size={16} />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="pl-9 bg-background dark:bg-slate-700 border-border dark:border-gray-600"
                        placeholder="Tu número de teléfono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" /> Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PatientProfilePage;
