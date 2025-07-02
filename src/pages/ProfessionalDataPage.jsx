import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Image, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { registerProfessional } from '@/hooks/useProfessionalValidations';

export default function ProfessionalDataPage() {
  const [formData, setFormData] = useState({
    collegiateNumber: '',
    dni: '',
    dniImage: null,
    universityDegree: null,
    collegiationCertificate: null
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: 'Solo se permiten archivos JPG, PNG o PDF'
        }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: 'El archivo no puede ser mayor a 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
      
      // Clear error
      if (errors[fieldName]) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: null
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.collegiateNumber.trim()) {
      newErrors.collegiateNumber = 'El número de colegiado es obligatorio';
    }

    if (!formData.dni.trim()) {
      newErrors.dni = 'El DNI es obligatorio';
    } else if (!/^\d{8}[A-Za-z]$/.test(formData.dni.trim())) {
      newErrors.dni = 'El formato del DNI no es válido (ej: 12345678A)';
    }

    if (!formData.dniImage) {
      newErrors.dniImage = 'La imagen del DNI es obligatoria';
    }

    if (!formData.universityDegree) {
      newErrors.universityDegree = 'La imagen de la titulación universitaria es obligatoria';
    }

    if (!formData.collegiationCertificate) {
      newErrors.collegiationCertificate = 'El certificado de colegiación es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // In a real implementation, you would upload files to storage (Supabase, S3, etc.)
      // and save the URLs along with the professional data
      
      // Register professional in the validation system
      registerProfessional(user, formData);
      
      // Update user metadata with the form data
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          professionalData: {
            collegiateNumber: formData.collegiateNumber,
            dni: formData.dni,
            documentsUploaded: true,
            verificationStatus: 'pending', // pending, approved, rejected
            submittedAt: new Date().toISOString()
          }
        }
      });

      // Set role to professional
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          role: 'professional'
        }
      });

      navigate('/profesional/verificacion-pendiente');
    } catch (error) {
      console.error('Error submitting professional data:', error);
      setErrors({ 
        submit: 'Hubo un error al enviar los datos. Por favor, inténtalo de nuevo.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const FileUploadField = ({ name, label, description, icon: Icon, accept = "image/*,.pdf" }) => (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <input
          id={name}
          type="file"
          accept={accept}
          onChange={(e) => handleFileChange(e, name)}
          className="hidden"
        />
        <label
          htmlFor={name}
          className={`
            flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
            transition-colors duration-200
            ${formData[name] 
              ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20' 
              : errors[name] 
                ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' 
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-slate-700/50 dark:hover:bg-slate-600/50'
            }
          `}
        >
          <div className="text-center">
            {formData[name] ? (
              <>
                <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  {formData[name].name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Archivo cargado correctamente
                </p>
              </>
            ) : (
              <>
                <Icon className="w-8 h-8 text-gray-400 dark:text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  Hacer clic para subir archivo
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              </>
            )}
          </div>
        </label>
      </div>
      {errors[name] && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Datos Profesionales</CardTitle>
          <CardDescription>
            Completa tu perfil profesional para verificar tu cuenta
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collegiateNumber">Número de Colegiado *</Label>
                <Input
                  id="collegiateNumber"
                  name="collegiateNumber"
                  value={formData.collegiateNumber}
                  onChange={handleInputChange}
                  placeholder="Ej: 12345"
                  className={errors.collegiateNumber ? 'border-red-300' : ''}
                />
                {errors.collegiateNumber && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.collegiateNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dni">DNI *</Label>
                <Input
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleInputChange}
                  placeholder="Ej: 12345678A"
                  className={errors.dni ? 'border-red-300' : ''}
                />
                {errors.dni && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.dni}</p>
                )}
              </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Documentos Requeridos
              </h3>

              <FileUploadField
                name="dniImage"
                label="Imagen del DNI *"
                description="Foto clara de ambas caras del DNI (JPG, PNG o PDF, máx. 5MB)"
                icon={Image}
              />

              <FileUploadField
                name="universityDegree"
                label="Titulación Universitaria *"
                description="Diploma o certificado universitario (JPG, PNG o PDF, máx. 5MB)"
                icon={FileText}
              />

              <FileUploadField
                name="collegiationCertificate"
                label="Certificado de Colegiación *"
                description="Documento oficial del colegio profesional (JPG, PNG o PDF, máx. 5MB)"
                icon={FileText}
              />
            </div>

            {/* Information Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Los documentos serán revisados por nuestro equipo. El proceso de verificación 
                puede tomar entre 24-48 horas. Te notificaremos por email cuando esté completo.
              </AlertDescription>
            </Alert>

            {/* Submit Error */}
            {errors.submit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.submit}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Enviando documentos...
                </div>
              ) : (
                <div className="flex items-center">
                  Completar Registro
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}