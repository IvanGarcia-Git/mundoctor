import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

const ProfessionalAvatar = ({ 
  imageUrl, 
  name, 
  size = "lg",
  className = "" 
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-32 h-32",
    xl: "w-40 h-40"
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {imageUrl && !imageError ? (
        <AvatarImage
          src={imageUrl}
          alt={`Foto de perfil de ${name}`}
          onError={handleImageError}
          className="object-cover"
        />
      ) : (
        <AvatarFallback className="bg-primary/10">
          <User className="w-1/2 h-1/2 text-primary" />
        </AvatarFallback>
      )}
    </Avatar>
  );
};

export default ProfessionalAvatar;
