import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Lock, Bell, CreditCard, ShieldCheck, Trash2, Save, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/ClerkAuthContext';
import { useToast } from "@/components/ui/use-toast";
import InsuranceManager from '@/components/professional/settings/InsuranceManager';
import WorkScheduleManager from '@/components/professional/schedule/WorkScheduleManager';

const ProfessionalSettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [notificationsData, setNotificationsData] = useState({
    emailNewAppointments: true,
    emailCancellations: true,
    emailNewMessages: false,
    pushNewAppointments: true,
  });
  const [billingData, setBillingData] = useState({
    cardNumber: '**** **** **** 1234',
    expiryDate: '12/26',
    cvc: '***',
    billingName: user?.name || 'Dr. Ejemplo',
    billingAddress: 'Calle Ficticia 123, Madrid',
  });
  const [insuranceData, setInsuranceData] = useState(
    user?.insuranceData || {
      worksWithInsurance: true,
      insuranceCompanies: ['sanitas', 'adeslas', 'dkv'],
    }
  );
  const [scheduleData, setScheduleData] = useState({
    appointmentDuration: 30,
    schedule: {
      monday: { enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
      tuesday: { enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
      wednesday: { enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
      thursday: { enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
      friday: { enabled: true, slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] },
    },
  });

  // Sincronizar con los datos del usuario cuando cambie
  useEffect(() => {
    if (user?.insuranceData) {
      setInsuranceData(user.insuranceData);
    }
  }, [user]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (name) => {
    setNotificationsData(prev => ({ ...prev, [name]: !prev[name] }));
  };
  
  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    setBillingData(prev => ({ ...prev, [name]: value }));
  };

  const handleInsuranceToggle = () => {
    setInsuranceData(prev => ({ ...prev, worksWithInsurance: !prev.worksWithInsurance }));
  };

  const handleInsuranceCompaniesChange = (companies) => {
    setInsuranceData(prev => ({ ...prev, insuranceCompanies: companies }));
  };

  const handleInsuranceUpdate = (data) => {
    setInsuranceData(data);
    
    // Actualizar también en el contexto de usuario
    updateUser({ insuranceData: data });
    
    toast({
      title: "Configuración actualizada",
      description: "La información de aseguradoras ha sido actualizada correctamente.",
    });
  };

  const handleScheduleChange = (newSchedule) => {
    setScheduleData(prev => ({
      ...prev,
      schedule: newSchedule,
    }));
    toast({
      title: "Horario Actualizado",
      description: "Tu horario laboral ha sido actualizado correctamente.",
    });
  };

  const handleAppointmentDurationChange = (duration) => {
    setScheduleData(prev => ({
      ...prev,
      appointmentDuration: duration,
    }));
    toast({
      title: "Duración Actualizada",
      description: `La duración de las citas ha sido actualizada a ${duration} minutos.`,
    });
  };

  const savePassword = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast({ title: "Error", description: "Las nuevas contraseñas no coinciden.", variant: "destructive" });
      return;
    }
    if (!passwordData.currentPassword || !passwordData.newPassword) {
         toast({ title: "Error", description: "Por favor, completa todos los campos de contraseña.", variant: "destructive" });
      return;
    }
    console.log("Guardando nueva contraseña (simulado):", passwordData);
    toast({ title: "Contraseña Actualizada", description: "Tu contraseña ha sido cambiada con éxito." });
    setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  };

  const saveNotifications = (e) => {
    e.preventDefault();
    console.log("Guardando configuración de notificaciones (simulado):", notificationsData);
    toast({ title: "Notificaciones Actualizadas", description: "Tu configuración de notificaciones ha sido guardada." });
  };

  const saveBilling = (e) => {
    e.preventDefault();
    console.log("Guardando información de facturación (simulado):", billingData);
    toast({ title: "Facturación Actualizada", description: "Tu información de facturación ha sido guardada." });
  };

  const saveInsurance = (e) => {
    e.preventDefault();
    console.log("Guardando información de aseguradora (simulado):", insuranceData);
    toast({ title: "Aseguradora Actualizada", description: "Tu información de aseguradora ha sido guardada." });
  };
  
  const InputField = ({ id, label, type = "text", value, onChange, name, placeholder, ...props }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground dark:text-gray-300">{label}</Label>
      <Input id={id} name={name || id} type={type} placeholder={placeholder} value={value} onChange={onChange} className="bg-input dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-500" {...props} />
    </div>
  );
  
  const NotificationSwitch = ({ id, label, checked, onCheckedChange, description }) => (
    <div className="flex items-center justify-between space-x-2 py-3 border-b dark:border-gray-700/50 last:border-b-0">
        <div>
            <Label htmlFor={id} className="font-medium text-foreground dark:text-gray-200">{label}</Label>
            {description && <p className="text-xs text-muted-foreground dark:text-gray-400">{description}</p>}
        </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );


  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">Configuración</h1>
        <p className="text-muted-foreground dark:text-gray-400">Gestiona la configuración de tu cuenta y preferencias.</p>
      </header>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-6 bg-muted dark:bg-slate-800 text-muted-foreground dark:text-gray-400">
          <TabsTrigger value="security" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Seguridad</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Notificaciones</TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Facturación</TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Horario</TabsTrigger>
          <TabsTrigger value="insurance" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Aseguradoras</TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Cuenta</TabsTrigger>
        </TabsList>

        <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
          <CardContent className="pt-6">
            <TabsContent value="security">
              <CardTitle className="text-xl font-semibold text-foreground dark:text-white mb-1 flex items-center"><Lock size={20} className="mr-2 text-primary dark:text-blue-400"/>Cambiar Contraseña</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400 mb-6">Actualiza tu contraseña regularmente para mayor seguridad.</CardDescription>
              <form onSubmit={savePassword} className="space-y-6">
                <InputField id="currentPassword" name="currentPassword" label="Contraseña Actual" type="password" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Tu contraseña actual" />
                <InputField id="newPassword" name="newPassword" label="Nueva Contraseña" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Mínimo 8 caracteres" />
                <InputField id="confirmNewPassword" name="confirmNewPassword" label="Confirmar Nueva Contraseña" type="password" value={passwordData.confirmNewPassword} onChange={handlePasswordChange} placeholder="Repite la nueva contraseña" />
                <div className="flex justify-end">
                  <Button type="submit"><Save size={16} className="mr-2" />Guardar Contraseña</Button>
                </div>
              </form>
              <hr className="my-8 dark:border-gray-700/50" />
              <CardTitle className="text-xl font-semibold text-foreground dark:text-white mb-1 flex items-center"><ShieldCheck size={20} className="mr-2 text-primary dark:text-blue-400"/>Autenticación de Dos Factores (2FA)</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400 mb-4">Añade una capa extra de seguridad a tu cuenta.</CardDescription>
              <Button variant="outline" className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">Configurar 2FA (Próximamente)</Button>
            </TabsContent>

            <TabsContent value="notifications">
              <CardTitle className="text-xl font-semibold text-foreground dark:text-white mb-1 flex items-center"><Bell size={20} className="mr-2 text-primary dark:text-blue-400"/>Preferencias de Notificación</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400 mb-6">Elige cómo y cuándo quieres recibir notificaciones.</CardDescription>
              <form onSubmit={saveNotifications} className="space-y-2">
                 <NotificationSwitch id="emailNewAppointments" label="Nuevas Citas por Email" checked={notificationsData.emailNewAppointments} onCheckedChange={() => handleNotificationChange('emailNewAppointments')} description="Recibe un email cuando un paciente reserve una nueva cita."/>
                 <NotificationSwitch id="emailCancellations" label="Cancelaciones por Email" checked={notificationsData.emailCancellations} onCheckedChange={() => handleNotificationChange('emailCancellations')} description="Recibe un email si una cita es cancelada."/>
                 <NotificationSwitch id="emailNewMessages" label="Nuevos Mensajes por Email" checked={notificationsData.emailNewMessages} onCheckedChange={() => handleNotificationChange('emailNewMessages')} description="Recibe un email cuando recibas un nuevo mensaje."/>
                 <NotificationSwitch id="pushNewAppointments" label="Notificaciones Push para Nuevas Citas" checked={notificationsData.pushNewAppointments} onCheckedChange={() => handleNotificationChange('pushNewAppointments')} description="Recibe notificaciones push en tu dispositivo (si está soportado)."/>
                <div className="flex justify-end pt-6">
                  <Button type="submit"><Save size={16} className="mr-2" />Guardar Preferencias</Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="billing">
              <CardTitle className="text-xl font-semibold text-foreground dark:text-white mb-1 flex items-center"><CreditCard size={20} className="mr-2 text-primary dark:text-blue-400"/>Información de Facturación</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400 mb-6">Gestiona tu método de pago y detalles de facturación para tu suscripción.</CardDescription>
               <form onSubmit={saveBilling} className="space-y-6">
                <InputField id="billingName" name="billingName" label="Nombre en la Tarjeta" value={billingData.billingName} onChange={handleBillingChange} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField id="cardNumber" name="cardNumber" label="Número de Tarjeta" value={billingData.cardNumber} onChange={handleBillingChange} placeholder="•••• •••• •••• ••••" />
                    <InputField id="expiryDate" name="expiryDate" label="Fecha Caducidad" value={billingData.expiryDate} onChange={handleBillingChange} placeholder="MM/YY" />
                    <InputField id="cvc" name="cvc" label="CVC" type="password" value={billingData.cvc} onChange={handleBillingChange} placeholder="•••" />
                </div>
                <InputField id="billingAddress" name="billingAddress" label="Dirección de Facturación" value={billingData.billingAddress} onChange={handleBillingChange} placeholder="Tu dirección completa" />
                <div className="flex justify-end">
                  <Button type="submit"><Save size={16} className="mr-2" />Guardar Información de Pago</Button>
                </div>
              </form>
               <hr className="my-8 dark:border-gray-700/50" />
               <CardTitle className="text-lg font-semibold text-foreground dark:text-white mb-2">Historial de Facturas</CardTitle>
               <p className="text-sm text-muted-foreground dark:text-gray-400">Aquí aparecería tu historial de facturas (Próximamente).</p>
            </TabsContent>

            <TabsContent value="schedule">
              <CardTitle className="text-xl font-semibold text-foreground dark:text-white mb-1 flex items-center">
                <Clock size={20} className="mr-2 text-primary dark:text-blue-400"/>
                Horario Laboral
              </CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400 mb-6">
                Configura tus horarios de trabajo y la duración de las citas
              </CardDescription>
              <WorkScheduleManager
                schedule={scheduleData.schedule}
                onScheduleChange={handleScheduleChange}
                appointmentDuration={scheduleData.appointmentDuration}
                onAppointmentDurationChange={handleAppointmentDurationChange}
              />
            </TabsContent>

            <TabsContent value="insurance">
              <InsuranceManager
                worksWithInsurance={insuranceData.worksWithInsurance}
                insuranceCompanies={insuranceData.insuranceCompanies}
                onUpdateInsurance={handleInsuranceUpdate}
              />
            </TabsContent>

            <TabsContent value="account">
              <CardTitle className="text-xl font-semibold text-foreground dark:text-white mb-1">Gestión de Cuenta</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400 mb-6">Opciones relacionadas con tu cuenta de usuario.</CardDescription>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground dark:text-gray-200">Exportar Datos</h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Descarga una copia de tus datos (Próximamente).</p>
                  <Button variant="outline" className="mt-2 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">Solicitar Exportación</Button>
                </div>
                <hr className="dark:border-gray-700/50" />
                <div>
                  <h3 className="font-medium text-destructive">Eliminar Cuenta</h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Esta acción es permanente y no se puede deshacer. Todos tus datos serán eliminados.</p>
                  <Button variant="destructive" className="mt-2">
                    <Trash2 size={16} className="mr-2" /> Solicitar Eliminación de Cuenta (Próximamente)
                  </Button>
                </div>
              </div>
            </TabsContent>

          </CardContent>
        </Card>
      </Tabs>
    </>
  );
};

export default ProfessionalSettingsPage;
