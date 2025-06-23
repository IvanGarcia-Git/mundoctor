export interface InsuranceCompany {
  id: string;
  name: string;
  logo?: string;
}

export interface ProfessionalInsurance {
  companyId: string;
  policyNumber?: string;
  details?: string;
}

export const insuranceCompanies: InsuranceCompany[] = [
  { id: 'sanitas', name: 'Sanitas' },
  { id: 'adeslas', name: 'Adeslas' },
  { id: 'dkv', name: 'DKV' },
  { id: 'asisa', name: 'Asisa' },
  { id: 'mapfre', name: 'Mapfre' },
  { id: 'axa', name: 'AXA Seguros' },
  { id: 'caser', name: 'Caser' },
  { id: 'divina_pastora', name: 'Divina Pastora' },
  { id: 'generali', name: 'Generali' },
  { id: 'cigna', name: 'Cigna' }
];
