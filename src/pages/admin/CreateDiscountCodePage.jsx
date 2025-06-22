import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const CreateDiscountCodePage = () => {
  const [code, setCode] = useState('');
  const [type, setType] = useState('percentage');
  const [discount, setDiscount] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí iría la lógica para guardar el código de descuento
    toast({
      title: "Código de descuento creado",
      description: `El código ${code} ha sido creado exitosamente.`,
    });
    navigate('/admin/descuentos');
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Crear Código de Descuento</h1>
        <p className="text-muted-foreground dark:text-gray-400">Configura un nuevo código de descuento para tus usuarios.</p>
      </header>

      <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg max-w-2xl">
        <CardHeader>
          <CardTitle>Nuevo Código de Descuento</CardTitle>
          <CardDescription>Rellena el formulario para crear un nuevo código de descuento.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Ej: VERANO2025"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Descuento</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje</SelectItem>
                    <SelectItem value="fixed">Monto Fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="discount">Cantidad de Descuento</Label>
                <div className="relative">
                  <Input
                    id="discount"
                    type="number"
                    placeholder={type === 'percentage' ? "10" : "50"}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                  />
                  <div className="absolute right-3 top-2.5 text-muted-foreground">
                    {type === 'percentage' ? '%' : '€'}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="validUntil">Válido Hasta</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="maxUses">Usos Máximos</Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="Ilimitado si se deja vacío"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                />
              </div>
            </div>

            <Button type="submit" className="w-full">Crear Código</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateDiscountCodePage;
