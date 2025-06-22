import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { insuranceCompanies } from '@/types/insurance';
import { Plus, X } from 'lucide-react';

interface InsuranceManagerProps {
  worksWithInsurance: boolean;
  insuranceCompanies: string[];
  onUpdateInsurance: (data: { worksWithInsurance: boolean; insuranceCompanies: string[] }) => void;
}

const InsuranceManager: React.FC<InsuranceManagerProps> = ({
  worksWithInsurance,
  insuranceCompanies: selectedCompanies,
  onUpdateInsurance,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localWorksWithInsurance, setLocalWorksWithInsurance] = useState(worksWithInsurance);
  const [localSelectedCompanies, setLocalSelectedCompanies] = useState<string[]>(selectedCompanies);

  const handleSave = () => {
    onUpdateInsurance({
      worksWithInsurance: localWorksWithInsurance,
      insuranceCompanies: localSelectedCompanies,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalWorksWithInsurance(worksWithInsurance);
    setLocalSelectedCompanies(selectedCompanies);
    setIsEditing(false);
  };

  const toggleCompany = (companyId: string) => {
    setLocalSelectedCompanies(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Aseguradoras</CardTitle>
            <CardDescription>Gestiona las aseguradoras con las que trabajas</CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <>
            <div className="flex items-center space-x-2 mb-6">
              <Switch
                id="works-with-insurance"
                checked={localWorksWithInsurance}
                onCheckedChange={setLocalWorksWithInsurance}
              />
              <Label htmlFor="works-with-insurance">Trabajo con aseguradoras médicas</Label>
            </div>

            {localWorksWithInsurance && (
              <ScrollArea className="h-[300px] border rounded-md p-4">
                <div className="space-y-4">
                  {insuranceCompanies.map(company => (
                    <div key={company.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={company.id}
                        checked={localSelectedCompanies.includes(company.id)}
                        onCheckedChange={() => toggleCompany(company.id)}
                      />
                      <Label htmlFor={company.id}>{company.name}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Guardar cambios
              </Button>
            </div>
          </>
        ) : (
          <div>
            {!worksWithInsurance ? (
              <p className="text-muted-foreground">No trabajas con aseguradoras médicas</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Trabajas con las siguientes aseguradoras:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedCompanies.map(companyId => {
                    const company = insuranceCompanies.find(c => c.id === companyId);
                    return company ? (
                      <Badge key={company.id} variant="secondary">
                        {company.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InsuranceManager;
