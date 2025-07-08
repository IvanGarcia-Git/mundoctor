import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X, Check } from 'lucide-react';
import ProfessionalAvatar from '@/components/ui/professional-avatar';

const AvatarUpload = ({ 
  currentAvatarUrl, 
  userName, 
  onAvatarUpdate, 
  size = "xl",
  className = "" 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const { toast } = useToast();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo debe ser menor a 2MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      // Get auth token from Clerk
      const token = await window.Clerk?.session?.getToken();
      
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const response = await fetch('http://localhost:8001/api/uploads/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'clerk-db-jwt': token
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Avatar actualizado correctamente",
          variant: "default"
        });
        
        // Call parent callback with new avatar URL
        if (onAvatarUpdate) {
          onAvatarUpdate(data.data.url);
        }
        
        // Reset state
        setSelectedFile(null);
        setPreviewUrl(null);
        
        // Reset file input
        const fileInput = document.getElementById('avatar-upload');
        if (fileInput) fileInput.value = '';
        
      } else {
        throw new Error(data.message || 'Error al subir el avatar');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Error al subir el avatar",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    
    // Reset file input
    const fileInput = document.getElementById('avatar-upload');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Avatar Preview */}
      <div className="relative">
        <ProfessionalAvatar
          imageUrl={previewUrl || currentAvatarUrl}
          name={userName}
          size={size}
          className="border-2 border-border"
        />
        
        {/* Upload overlay for hover effect */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
          <Upload className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* File Input */}
      <div className="flex flex-col items-center space-y-2">
        <Label htmlFor="avatar-upload" className="text-sm font-medium">
          Foto de perfil
        </Label>
        <Input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="w-full max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          JPG, PNG hasta 2MB
        </p>
      </div>

      {/* Action Buttons */}
      {selectedFile && (
        <div className="flex space-x-2">
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Subiendo...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Confirmar
              </>
            )}
          </Button>
          
          <Button
            onClick={handleCancel}
            disabled={isUploading}
            variant="outline"
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;