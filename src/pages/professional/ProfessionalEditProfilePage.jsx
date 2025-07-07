import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Briefcase, Link as LinkIcon, Shield, MapPin, Clock, Phone, Mail, Globe, Settings, Save, Image as ImageIcon, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/ClerkAuthContext';
import { useToast } from "@/components/ui/use-toast";
import ProfessionalInfo from '@/components/professional/ProfessionalInfo';
import { Badge } from '@/components/ui/badge';

const ProfessionalEditProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState({
    fullName: user?.name || 'Dr. Ejemplo Por Defecto',
    email: user?.email || 'ejemplo@example.com',
    phone: '600123456',
    specialty: 'Cardiología',
    licenseNumber: '2828XXXXX',
    bio: 'Especialista con más de 10 años de experiencia en el diagnóstico y tratamiento de enfermedades cardiovasculares. Comprometido con el bienestar del paciente.',
    services: 'Consulta, ECG, Ecocardiograma, Prueba de esfuerzo',
    officeAddress: 'Calle Falsa 123, Consultorio 5, Madrid',
    officeHours: 'L-V: 9:00-14:00, 16:00-20:00',
    website: 'https://www.drejemplo.com',
    languages: 'Español, Inglés',
    profileImage: '',
    bannerImage: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e, fieldName) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileData(prev => ({ ...prev, [fieldName]: event.target.result }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Perfil guardado:", profileData);
    toast({
      title: "Perfil Actualizado",
      description: "Tu información de perfil público ha sido guardada con éxito.",
    });
  };

  const InputField = ({ id, label, icon, type = "text", value, onChange, placeholder, name, ...props }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground dark:text-gray-300 flex items-center">
        {React.cloneElement(icon, { size: 16, className: "mr-2 text-muted-foreground dark:text-gray-400" })}
        {label}
      </Label>
      {type === 'textarea' ? (
        <Textarea id={id} name={name || id} placeholder={placeholder} value={value} onChange={onChange} rows={4} className="bg-input dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-500" {...props} />
      ) : (
        <Input id={id} name={name || id} type={type} placeholder={placeholder} value={value} onChange={onChange} className="bg-input dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-500" {...props} />
      )}
    </div>
  );
  
  const ImageUploadField = ({ id, label, currentImage, onChange }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground dark:text-gray-300 flex items-center">
        <ImageIcon size={16} className="mr-2 text-muted-foreground dark:text-gray-400" />
        {label}
      </Label>
      <div className="flex items-center gap-4">
        {currentImage && <img-replace src={currentImage} alt="Previsualización" className="w-20 h-20 rounded-md object-cover border dark:border-gray-600" />}
        <Input id={id} type="file" accept="image/*" onChange={(e) => onChange(e, id)} className="bg-input dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white file:text-primary file:font-medium file:mr-2" />
      </div>
    </div>
  );


  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">Editar Perfil Público</h1>
        <p className="text-muted-foreground dark:text-gray-400">Mantén tu información actualizada para tus pacientes.</p>
      </header>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6 bg-muted dark:bg-slate-800 text-muted-foreground dark:text-gray-400">
            <TabsTrigger value="personal" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Info Personal</TabsTrigger>
            <TabsTrigger value="professional" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Info Profesional</TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Contacto y Horarios</TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white">Multimedia</TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 data-[state=active]:text-foreground dark:data-[state=active]:text-white flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              Vista Previa
            </TabsTrigger>
          </TabsList>

          <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
            <CardContent className="pt-6">
              <TabsContent value="personal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField id="fullName" name="fullName" label="Nombre Completo" icon={<User />} value={profileData.fullName} onChange={handleChange} placeholder="Tu nombre completo" />
                  <InputField id="email" name="email" label="Email Público" icon={<Mail />} type="email" value={profileData.email} onChange={handleChange} placeholder="tu@email.com" disabled />
                  <InputField id="phone" name="phone" label="Teléfono Público" icon={<Phone />} type="tel" value={profileData.phone} onChange={handleChange} placeholder="Ej: +34 600123456" />
                  <InputField id="languages" name="languages" label="Idiomas Hablados" icon={<Globe />} value={profileData.languages} onChange={handleChange} placeholder="Español, Inglés, Francés..." />
                </div>
              </TabsContent>

              <TabsContent value="professional">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField id="specialty" name="specialty" label="Especialidad Principal" icon={<Briefcase />} value={profileData.specialty} onChange={handleChange} placeholder="Ej: Cardiología" />
                  <InputField id="licenseNumber" name="licenseNumber" label="Número de Colegiado" icon={<Shield />} value={profileData.licenseNumber} onChange={handleChange} placeholder="Ej: 2828XXXXX" />
                </div>
                <div className="mt-6">
                  <InputField id="bio" name="bio" label="Biografía / Sobre mí" icon={<User />} type="textarea" value={profileData.bio} onChange={handleChange} placeholder="Comparte tu experiencia y enfoque profesional..." />
                </div>
                 <div className="mt-6">
                  <InputField id="services" name="services" label="Servicios Ofrecidos" icon={<Settings />} type="textarea" value={profileData.services} onChange={handleChange} placeholder="Listado de servicios, separados por comas. Ej: Consulta, ECG, Pruebas..." />
                </div>
              </TabsContent>

              <TabsContent value="contact">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField id="officeAddress" name="officeAddress" label="Dirección de la Consulta" icon={<MapPin />} value={profileData.officeAddress} onChange={handleChange} placeholder="Calle, Número, Ciudad" />
                  <InputField id="officeHours" name="officeHours" label="Horario de Atención" icon={<Clock />} value={profileData.officeHours} onChange={handleChange} placeholder="Ej: L-V 9:00-18:00" />
                  <InputField id="website" name="website" label="Página Web (Opcional)" icon={<LinkIcon />} type="url" value={profileData.website} onChange={handleChange} placeholder="https://tuweb.com" />
                </div>
              </TabsContent>
              
              <TabsContent value="media">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ImageUploadField id="profileImage" label="Foto de Perfil" currentImage={profileData.profileImage} onChange={handleImageChange} />
                    <ImageUploadField id="bannerImage" label="Imagen de Cabecera (Opcional)" currentImage={profileData.bannerImage} onChange={handleImageChange} />
                 </div>
              </TabsContent>

              <TabsContent value="preview">
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Vista Previa del Perfil</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Así es como los pacientes verán tu perfil público. Las aseguradoras mostradas provienen de tu configuración en la pestaña "Aseguradoras" de Configuración.
                    </p>
                  </div>
                  
                  <ProfessionalInfo 
                    professional={{
                      ...profileData,
                      name: profileData.fullName,
                      image: profileData.profileImage || 'https://via.placeholder.com/150',
                      imageAlt: `${profileData.fullName} - ${profileData.specialty}`,
                      city: profileData.officeAddress,
                      rating: 4.8,
                      reviews: 0,
                      licenseNumber: profileData.licenseNumber,
                      contact: {
                        phone: profileData.phone,
                        email: profileData.email
                      },
                      services: profileData.services.split(',').map(s => s.trim()).filter(s => s.length > 0),
                      education: ['Información de formación desde la configuración'],
                      experience: ['Información de experiencia desde la configuración'],
                      opinions: [],
                      insurance: user?.insuranceData || { worksWithInsurance: false, insuranceCompanies: [] }
                    }}
                  />
                </div>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
        
        <div className="mt-8 flex justify-end">
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save size={18} className="mr-2" /> Guardar Cambios
          </Button>
        </div>
      </form>
    </>
  );
};

export default ProfessionalEditProfilePage;
