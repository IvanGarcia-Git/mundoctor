import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Edit2, FileText, DollarSign, CalendarDays } from 'lucide-react';

const sampleSubscriptions = [
	{
		id: 'sub_001',
		userName: 'Dr. Carlos Soler',
		plan: 'Profesional',
		status: 'active',
		startDate: '2023-02-20',
		endDate: '2024-02-20',
		amount: '39.95€/mes',
	},
	{
		id: 'sub_002',
		userName: 'Dra. Elena Marco',
		plan: 'Básico',
		status: 'active',
		startDate: '2023-04-10',
		endDate: '2024-04-10',
		amount: '24.95€/mes',
	},
	{
		id: 'sub_003',
		userName: 'Dr. Luis Peña',
		plan: 'Profesional',
		status: 'cancelled',
		startDate: '2022-11-01',
		endDate: '2023-11-01',
		amount: '39.95€/mes',
	},
	{
		id: 'sub_004',
		userName: 'Dra. Sara Sanz',
		plan: 'Gratuito',
		status: 'active',
		startDate: '2023-06-01',
		endDate: '-',
		amount: '0€/mes',
	},
];

const AdminSubscriptionManagementPage = () => {
	const [subscriptions] = useState(sampleSubscriptions);
	const [searchTerm, setSearchTerm] = useState('');

	const filteredSubscriptions = subscriptions.filter((sub) =>
		sub.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
		sub.plan.toLowerCase().includes(searchTerm.toLowerCase())
	);

	return (
		<div className="space-y-6">
			<header className="mb-8">
				<h1 className="text-3xl font-bold">Gestión de Suscripciones</h1>
				<p className="text-muted-foreground dark:text-gray-400">
					Visualiza y administra las suscripciones de los profesionales.
				</p>
			</header>

			<div className="mb-6 p-4 bg-card dark:bg-gray-800/60 backdrop-blur-md rounded-xl border border-border dark:border-gray-700/50 shadow-md">
				<div className="flex flex-col md:flex-row gap-4 items-center">
					<div className="relative flex-grow w-full md:w-auto">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground dark:text-gray-400" />
						<Input
							type="text"
							placeholder="Buscar por profesional o plan..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10 bg-input dark:bg-gray-900/70 border-border dark:border-gray-700"
						/>
					</div>
					<Button variant="outline">
						<Filter className="mr-2 h-4 w-4" />
						Filtrar por Estado
					</Button>
				</div>
			</div>

			<div className="bg-card dark:bg-gray-800/60 backdrop-blur-md rounded-xl border border-border dark:border-gray-700/50 shadow-lg overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-muted/30 dark:hover:bg-gray-700/30">
							<TableHead className="text-foreground dark:text-white">
								Profesional
							</TableHead>
							<TableHead className="text-foreground dark:text-white">
								Plan
							</TableHead>
							<TableHead className="text-foreground dark:text-white">
								Estado
							</TableHead>
							<TableHead className="text-foreground dark:text-white">
								<CalendarDays size={16} className="inline mr-1" /> Inicio
							</TableHead>
							<TableHead className="text-foreground dark:text-white">
								<CalendarDays size={16} className="inline mr-1" /> Fin / Próx. Pago
							</TableHead>
							<TableHead className="text-foreground dark:text-white">
								<DollarSign size={16} className="inline mr-1" /> Importe
							</TableHead>
							<TableHead className="text-foreground dark:text-white text-right">
								Acciones
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredSubscriptions.map((sub) => (
							<TableRow
								key={sub.id}
								className="hover:bg-muted/50 dark:hover:bg-gray-700/50 border-b border-border dark:border-gray-700/50"
							>
								<TableCell className="font-medium">{sub.userName}</TableCell>
								<TableCell>
									<Badge
										variant={
											sub.plan === 'Profesional'
												? 'default'
												: sub.plan === 'Básico'
												? 'outline'
												: 'secondary'
										}
										className={`
                            ${
															sub.plan === 'Profesional'
																? 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30'
																: ''
														}
                            ${
															sub.plan === 'Básico'
																? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
																: ''
														}
                            ${
															sub.plan === 'Gratuito'
																? 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30'
																: ''
														}
                           `}
									>
										{sub.plan}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge
										variant={
											sub.status === 'active' ? 'success' : 'destructive'
										}
										className={`
                            ${
															sub.status === 'active'
																? 'bg-green-500/20 text-green-700 dark:text-green-300'
																: ''
														}
                            ${
															sub.status !== 'active'
																? 'bg-red-500/20 text-red-700 dark:text-red-300'
																: ''
														}
                         `}
									>
										{sub.status === 'active' ? 'Activa' : 'Cancelada'}
									</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground dark:text-gray-300">
									{sub.startDate}
								</TableCell>
								<TableCell className="text-muted-foreground dark:text-gray-300">
									{sub.endDate}
								</TableCell>
								<TableCell className="text-muted-foreground dark:text-gray-300">
									{sub.amount}
								</TableCell>
								<TableCell className="text-right">
									<Button
										variant="outline"
										size="icon"
										className="mr-2 text-muted-foreground hover:text-foreground"
									>
										<FileText className="h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										size="icon"
										className="text-muted-foreground hover:text-foreground"
									>
										<Edit2 className="h-4 w-4" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{filteredSubscriptions.length === 0 && (
					<p className="text-center py-10 text-muted-foreground dark:text-gray-400">
						No se encontraron suscripciones.
					</p>
				)}
			</div>
		</div>
	);
};

export default AdminSubscriptionManagementPage;
