import React, { useState, useEffect } from 'react';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Info, ArrowRight } from 'lucide-react';

const MigrationHelper = () => {
  const {
    loading,
    isAuthenticated,
    user,
    authMethod,
    legacyUser,
    clerkUser,
    migrateToClerk,
    clearLegacyData,
    debug
  } = useHybridAuth();

  const [migrationStatus, setMigrationStatus] = useState('none'); // 'none', 'migrating', 'success', 'error'
  const [migrationMessage, setMigrationMessage] = useState('');

  // Show migration helper only if there's legacy data and user is signed in with Clerk
  const shouldShowMigration = legacyUser && debug.isSignedIn && authMethod === 'clerk';

  const handleMigration = async () => {
    setMigrationStatus('migrating');
    setMigrationMessage('Migrando datos de usuario...');

    try {
      const success = await migrateToClerk();
      
      if (success) {
        setMigrationStatus('success');
        setMigrationMessage('¡Migración completada exitosamente! Tus datos han sido transferidos a tu cuenta Clerk.');
      } else {
        setMigrationStatus('error');
        setMigrationMessage('Error durante la migración. Por favor, intenta de nuevo.');
      }
    } catch (error) {
      setMigrationStatus('error');
      setMigrationMessage(`Error: ${error.message}`);
    }
  };

  const handleSkipMigration = () => {
    clearLegacyData();
    setMigrationStatus('success');
    setMigrationMessage('Datos locales eliminados. Ahora usas únicamente tu cuenta Clerk.');
  };

  if (loading || !shouldShowMigration) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Migración de Datos
          </CardTitle>
          <CardDescription>
            Hemos detectado datos de tu sesión anterior. ¿Quieres migrarlos a tu nueva cuenta?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Info Comparison */}
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800/30">
              <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                Datos locales encontrados:
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                <strong>Nombre:</strong> {legacyUser?.name}<br />
                <strong>Email:</strong> {legacyUser?.email}<br />
                <strong>Rol:</strong> {legacyUser?.role}
              </p>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/30">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                Tu cuenta Clerk actual:
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>Nombre:</strong> {clerkUser?.firstName} {clerkUser?.lastName}<br />
                <strong>Email:</strong> {clerkUser?.emailAddresses?.[0]?.emailAddress}<br />
                <strong>Rol:</strong> {clerkUser?.publicMetadata?.role || 'Sin asignar'}
              </p>
            </div>
          </div>

          {/* Migration Status */}
          {migrationStatus !== 'none' && (
            <Alert className={
              migrationStatus === 'success' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
              migrationStatus === 'error' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
              'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
            }>
              {migrationStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
              {migrationStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
              {migrationStatus === 'migrating' && <Info className="h-4 w-4 text-blue-600 animate-spin" />}
              <AlertDescription className={
                migrationStatus === 'success' ? 'text-green-800 dark:text-green-200' :
                migrationStatus === 'error' ? 'text-red-800 dark:text-red-200' :
                'text-blue-800 dark:text-blue-200'
              }>
                {migrationMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {migrationStatus === 'none' && (
            <div className="flex gap-2">
              <Button 
                onClick={handleMigration}
                className="flex-1"
                disabled={migrationStatus === 'migrating'}
              >
                {migrationStatus === 'migrating' ? 'Migrando...' : 'Migrar Datos'}
              </Button>
              <Button 
                onClick={handleSkipMigration}
                variant="outline"
                className="flex-1"
                disabled={migrationStatus === 'migrating'}
              >
                Omitir
              </Button>
            </div>
          )}

          {migrationStatus === 'success' && (
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Continuar
            </Button>
          )}

          {migrationStatus === 'error' && (
            <div className="flex gap-2">
              <Button 
                onClick={handleMigration}
                className="flex-1"
              >
                Reintentar
              </Button>
              <Button 
                onClick={handleSkipMigration}
                variant="outline"
                className="flex-1"
              >
                Continuar sin migrar
              </Button>
            </div>
          )}

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Debug Info</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationHelper;