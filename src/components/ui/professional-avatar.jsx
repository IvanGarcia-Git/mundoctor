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
  const [isLoading, setIsLoading] = useState(false);

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-32 h-32",
    xl: "w-40 h-40"
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageStart = () => {
    setIsLoading(true);
    setImageError(false);
  };

  // Default fallback image URL - professional medical setting
  const defaultImageUrl = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80";
  
  // Use provided imageUrl, or fallback to default, or show User icon if all fail
  const displayImageUrl = imageUrl || defaultImageUrl;

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {displayImageUrl && !imageError ? (
        <AvatarImage
          src={displayImageUrl}
          alt={`Foto de perfil de ${name}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          onLoadStart={handleImageStart}
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
