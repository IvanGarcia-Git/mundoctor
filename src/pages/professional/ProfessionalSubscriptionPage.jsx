import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, Edit, ShieldCheck, BadgePercent, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pricingPlansData } from '@/data/professionalsPageData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ProfessionalSubscriptionPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Simular el plan actual del usuario. En una app real, esto vendría del backend/AuthContext.
  const [currentPlanId, setCurrentPlanId] = useState(user?.subscriptionPlanId || 'basic'); 
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const currentPlan = pricingPlansData.find(plan => plan.id === currentPlanId);
  const availablePlans = pricingPlansData; // Podrías filtrar para no mostrar el plan actual como opción de mejora si es el más alto.

  const handleBillingCycleChange = (checked) => {
    setBillingCycle(checked ? 'annual' : 'monthly');
  };

  const calculateDiscount = (originalPrice, currentPrice) => {
    if (!originalPrice || !currentPrice) return 0;
    const original = parseFloat(originalPrice.replace('€', ''));
    const current = parseFloat(currentPrice.replace('€', ''));
    return Math.round(((original - current) / original) * 100);
  };

  const handleUpgradePlan = (plan) => {
    setSelectedPlanToUpgrade(plan);
    setIsUpgradeDialogOpen(true);
  };

  const confirmUpgrade = () => {
    // Simulación de mejora de plan
    console.log("Mejorando a plan:", selectedPlanToUpgrade.name);
    setCurrentPlanId(selectedPlanToUpgrade.id); // Actualizar el plan actual (simulado)
    toast({
      title: "Suscripción Actualizada",
      description: `Has cambiado tu plan a ${selectedPlanToUpgrade.name}.`,
    });
    setIsUpgradeDialogOpen(false);
    setSelectedPlanToUpgrade(null);
  };

  const confirmCancelSubscription = () => {
    // Simulación de cancelación
    console.log("Cancelando suscripción...");
    setCurrentPlanId('free'); // Simular cambio a plan gratuito
    toast({
      title: "Suscripción Cancelada",
      description: "Tu suscripción ha sido cancelada. Ahora estás en el plan Gratuito.",
      variant: "destructive"
    });
    setIsCancelDialogOpen(false);
  };

  if (!currentPlan) {
    return (
      <div className="container mx-auto p-4 md:p-8 bg-background dark:bg-slate-900 min-h-screen">
        <p className="text-destructive">Error: No se pudo cargar la información de tu suscripción.</p>
      </div>
    );
  }

  const getPriceDisplay = (plan) => {
    if (plan.id === 'free') {
      return {
        mainPrice: '0€',
        period: '/mes',
        originalPrice: null,
        discountBadge: null,
        saving: null
      };
    }

    if (billingCycle === 'annual') {
      const annualPrice = plan.annualPrice;
      const annualOriginal = plan.annualOriginalPrice;
      const discount = calculateDiscount(annualOriginal, annualPrice);
      const monthlyEquivalent = (parseFloat(annualPrice.replace('€', '')) / 12).toFixed(2);
      const saving = (parseFloat(annualOriginal.replace('€', '')) - parseFloat(annualPrice.replace('€', ''))).toFixed(2);

      return {
        mainPrice: annualPrice,
        period: '/año',
        originalPrice: annualOriginal,
        discountBadge: discount ? `${discount}% dto.` : null,
        saving: `Equivale a ${monthlyEquivalent}€/mes. Ahorro de ${saving}€`,
      };
    } else {
      const monthlyPrice = plan.price;
      const monthlyOriginal = plan.originalPrice;
      const discount = calculateDiscount(monthlyOriginal, monthlyPrice);

      return {
        mainPrice: monthlyPrice,
        period: '/mes',
        originalPrice: monthlyOriginal,
        discountBadge: discount ? `${discount}% dto.` : null,
        saving: null
      };
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 bg-background dark:bg-slate-900 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">Gestionar Suscripción</h1>
        <p className="text-muted-foreground dark:text-gray-400">Consulta los detalles de tu plan actual y explora otras opciones.</p>
      </header>

      <div className="flex items-center justify-end gap-2 mb-6">
        <Label htmlFor="billing-toggle" className={billingCycle === 'monthly' ? 'text-muted-foreground' : 'text-foreground font-medium'}>Facturación mensual</Label>
        <Switch
          id="billing-toggle"
          checked={billingCycle === 'annual'}
          onCheckedChange={handleBillingCycleChange}
        />
        <Label htmlFor="billing-toggle" className={billingCycle === 'annual' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
          Facturación anual
          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            2 meses gratis
          </Badge>
        </Label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tarjeta del Plan Actual */}
        <div className="lg:col-span-1">
          <Card className={`shadow-xl border-2 ${currentPlan.borderColor} ${currentPlan.bgColor} relative overflow-hidden`}>
            {currentPlan.popular && (
              <div className="absolute top-0 -right-10 transform rotate-45 bg-yellow-400 dark:bg-yellow-500 text-center text-xs font-semibold py-1.5 px-10 text-slate-900">
                Popular
              </div>
            )}
            <CardHeader>
              <CardTitle className={`text-2xl font-bold ${currentPlan.textColor}`}>Tu Plan Actual</CardTitle>
              <CardDescription className={`${currentPlan.textColor === 'text-white' || currentPlan.textColor.includes('dark:text-white') ? 'text-gray-300' : 'text-muted-foreground'}`}>
                Estás suscrito al plan {currentPlan.name}
              </CardDescription>
            </CardHeader>
            <CardContent className={`${currentPlan.textColor}`}>
              <div className="mb-4 relative">
                {getPriceDisplay(currentPlan).discountBadge && (
                  <Badge className="absolute -top-3 -left-2 bg-yellow-400 text-yellow-900">
                    {getPriceDisplay(currentPlan).discountBadge}
                  </Badge>
                )}
                <div className="flex items-baseline gap-2">
                  {getPriceDisplay(currentPlan).originalPrice && (
                    <span className="text-lg line-through opacity-70">
                      {getPriceDisplay(currentPlan).originalPrice}
                    </span>
                  )}
                  <span className="text-4xl font-extrabold">
                    {getPriceDisplay(currentPlan).mainPrice}
                  </span>
                  <span className="opacity-80">{getPriceDisplay(currentPlan).period}</span>
                </div>
                {getPriceDisplay(currentPlan).saving && (
                  <p className="text-sm mt-1 text-green-600 dark:text-green-400">
                    {getPriceDisplay(currentPlan).saving}
                  </p>
                )}
              </div>

              <p className={`mb-6 text-sm ${currentPlan.textColor === 'text-white' || currentPlan.textColor.includes('dark:text-white') ? 'text-gray-300' : 'text-muted-foreground'}`}>
                {currentPlan.description}
              </p>

              <ul className="space-y-2 mb-6">
                {currentPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <CheckCircle size={16} className={`${currentPlan.popular ? 'text-yellow-400 dark:text-yellow-500' : 'text-green-500 dark:text-green-400'} mr-2 flex-shrink-0`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs opacity-70 mb-2">
                Próxima fecha de facturación: 26 de Junio, 2025 (simulado)
              </p>

              {currentPlan.id !== 'free' && (
                <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full mt-4">
                      Cancelar suscripción
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>¿Seguro que quieres cancelar?</DialogTitle>
                      <DialogDescription>
                        Al cancelar tu suscripción perderás acceso a todas las funcionalidades premium al final del período actual.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button variant="destructive" onClick={confirmCancelSubscription}>
                        Confirmar cancelación
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
               {currentPlan.id === 'free' && (
                 <p className="text-sm text-center mt-4 p-3 bg-green-500/10 text-green-700 dark:text-green-300 dark:bg-green-500/20 rounded-md">
                    Estás en el plan Gratuito. ¡Considera mejorar para acceder a más funcionalidades!
                 </p>
               )}
            </CardContent>
          </Card>
        </div>

        {/* Opciones de Planes */}
        <div className="lg:col-span-2">
          <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground dark:text-white">Explora Otros Planes</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400">Encuentra el plan que mejor se adapte a tus necesidades actuales.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              {availablePlans.map((plan) => (
                plan.id !== currentPlanId && (
                  <Card key={plan.id} className={`flex flex-col justify-between p-6 rounded-lg border-2 hover:shadow-xl transition-shadow duration-300 ${plan.borderColor} ${plan.bgColor}`}>
                    <div>
                      <h3 className={`text-xl font-semibold mb-1 ${plan.textColor}`}>{plan.name}</h3>
                      <div className="mb-1">
                        <span className={`text-3xl font-bold ${plan.textColor}`}>{plan.price}</span>
                        <span className={`text-sm ${plan.textColor === 'text-white' || plan.textColor.includes('dark:text-white') ? 'text-gray-300' : 'text-muted-foreground'} opacity-80`}>{plan.period}</span>
                      </div>
                      <p className={`text-xs mb-4 h-10 ${plan.textColor === 'text-white' || plan.textColor.includes('dark:text-white') ? 'text-gray-300' : 'text-muted-foreground'}`}>{plan.description}</p>
                      <ul className="space-y-1.5 mb-4 text-xs">
                        {plan.features.slice(0, 3).map((feature, i) => ( // Mostrar solo algunas características
                          <li key={i} className={`flex items-center ${plan.textColor === 'text-white' || plan.textColor.includes('dark:text-white') ? 'text-gray-200' : 'text-foreground/90'}`}>
                            <CheckCircle size={14} className={`${plan.popular ? 'text-yellow-400 dark:text-yellow-500' : 'text-green-500 dark:text-green-400'} mr-2 flex-shrink-0`} />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {plan.features.length > 3 && <li className={`text-xs ${plan.textColor === 'text-white' || plan.textColor.includes('dark:text-white') ? 'text-gray-300' : 'text-muted-foreground'} opacity-80`}>...y más</li>}
                      </ul>
                    </div>
                    <Button 
                      onClick={() => handleUpgradePlan(plan)} 
                      className={`w-full mt-auto ${plan.buttonClass} ${plan.name === 'Profesional' ? 'shadow-md shadow-green-500/20' : ''} ${plan.popular ? 'shadow-md shadow-primary/20 dark:shadow-blue-500/20' : ''}`}
                    >
                      {currentPlan.price.replace('€','') < plan.price.replace('€','') || currentPlan.id === 'free' ? 'Mejorar a ' : 'Cambiar a '} {plan.name}
                    </Button>
                  </Card>
                )
              ))}
            </CardContent>
          </Card>
          <div className="mt-8 p-6 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-primary dark:text-blue-300 mb-2 flex items-center justify-center">
                <BadgePercent size={20} className="mr-2"/> ¿Buscas un plan anual con descuento?
            </h3>
            <p className="text-sm text-muted-foreground dark:text-gray-300 mb-3">
                Ofrecemos descuentos significativos para suscripciones anuales. ¡Ahorra hasta 2 meses!
            </p>
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-400/20">
                <Link to="/profesionales#pricing">Ver Opciones Anuales</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Mejora */}
      {selectedPlanToUpgrade && (
        <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
          <DialogContent className="bg-card dark:bg-gray-800 border-border dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-foreground dark:text-white">Confirmar Cambio de Plan</DialogTitle>
              <DialogDescription className="text-muted-foreground dark:text-gray-400">
                Estás a punto de cambiar tu plan a <span className="font-semibold text-primary dark:text-blue-400">{selectedPlanToUpgrade.name}</span> por {selectedPlanToUpgrade.price}{selectedPlanToUpgrade.period}.
                Se aplicarán los cargos correspondientes. ¿Deseas continuar?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-between gap-2">
              <DialogClose asChild><Button variant="outline" className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">Cancelar</Button></DialogClose>
              <Button onClick={confirmUpgrade} className="bg-primary hover:bg-primary/90 text-primary-foreground">Confirmar y Cambiar Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ProfessionalSubscriptionPage;
