import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-foreground mb-2">
              ¡Ups! Algo salió mal
            </h2>
            
            <p className="text-muted-foreground mb-6">
              Se ha producido un error inesperado. Por favor, intenta recargar la página.
            </p>

            <div className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Intentar de nuevo
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Recargar página
              </Button>
            </div>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Detalles del error (desarrollo)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono">
                  <div className="text-red-600 font-semibold mb-2">
                    {this.state.error.toString()}
                  </div>
                  <div className="text-gray-600 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </div>
                </div>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC version for function components
export const withErrorBoundary = (WrappedComponent, errorFallback) => {
  return function WithErrorBoundaryComponent(props) {
    return (
      <ErrorBoundary fallback={errorFallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for handling async errors in function components
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error) => {
    console.error('Async error captured:', error);
    setError(error);
  }, []);

  // Throw error to be caught by ErrorBoundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

// Clerk-specific error boundary for authentication errors
export class ClerkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Clerk error:', error, errorInfo);
    this.setState({ error });

    // Check if it's a Clerk-related error
    if (error.name === 'ClerkAPIError' || error.message?.includes('Clerk')) {
      console.error('Authentication error detected:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      // Check if it's an authentication error
      const isAuthError = this.state.error?.name === 'ClerkAPIError' || 
                          this.state.error?.message?.includes('authentication') ||
                          this.state.error?.message?.includes('Clerk');

      if (isAuthError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full p-6 text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500" />
              </div>
              
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Error de Autenticación
              </h2>
              
              <p className="text-muted-foreground mb-6">
                Ha ocurrido un problema con tu sesión. Por favor, inicia sesión nuevamente.
              </p>

              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = '/login'}
                  className="w-full"
                >
                  Ir a Iniciar Sesión
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Recargar página
                </Button>
              </div>
            </Card>
          </div>
        );
      }
    }

    return this.props.children;
  }
}

export default ErrorBoundary;