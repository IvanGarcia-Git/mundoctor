import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Save } from 'lucide-react';

const PatientProfilePage = () => {
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
                <AvatarImage src="https://ui.shadcn.com/avatars/01.png" />
                <AvatarFallback>CN</AvatarFallback>
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
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="text-foreground dark:text-gray-300">
                      Nombre Completo
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-muted-foreground" size={16} />
                      <Input
                        id="name"
                        className="pl-9 bg-background dark:bg-slate-700 border-border dark:border-gray-600"
                        placeholder="Tu nombre completo"
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
                        type="email"
                        className="pl-9 bg-background dark:bg-slate-700 border-border dark:border-gray-600"
                        placeholder="tu@email.com"
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
                        type="tel"
                        className="pl-9 bg-background dark:bg-slate-700 border-border dark:border-gray-600"
                        placeholder="Tu número de teléfono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Save size={16} className="mr-2" /> Guardar Cambios
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
