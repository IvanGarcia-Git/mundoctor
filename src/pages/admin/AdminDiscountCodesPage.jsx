import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Tag, CalendarClock, Check, X, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const sampleDiscounts = [
	{
		id: 'd1',
		code: 'VERANO2025',
		discount: 25,
		type: 'percentage',
		status: 'active',
		usageCount: 12,
		maxUses: 100,
		validUntil: '2025-08-31',
	},
	{
		id: 'd2',
		code: 'BIENVENIDA',
		discount: 15,
		type: 'percentage',
		status: 'active',
		usageCount: 45,
		maxUses: 50,
		validUntil: '2025-12-31',
	},
	{
		id: 'd3',
		code: 'PREMIUM50',
		discount: 50,
		type: 'percentage',
		status: 'inactive',
		usageCount: 100,
		maxUses: 100,
		validUntil: '2025-05-30',
	},
];

const AdminDiscountCodesPage = () => {
	const [discounts] = useState(sampleDiscounts);
	const [searchTerm, setSearchTerm] = useState('');

	const filteredDiscounts = discounts.filter((discount) =>
		discount.code.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const copyToClipboard = (code) => {
		navigator.clipboard.writeText(code);
		// Aquí podrías añadir una notificación de éxito
	};

	const getStatusBadge = (status) => {
		if (status === 'active') {
			return (
				<Badge className="bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30">
					Activo
				</Badge>
			);
		}
		return (
			<Badge variant="secondary" className="bg-gray-500/20 text-gray-600 dark:text-gray-400">
				Inactivo
			</Badge>
		);
	};

	return (
		<div className="space-y-6">
			<header className="mb-8">
				<h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">
					Códigos de Descuento
				</h1>
				<p className="text-muted-foreground dark:text-gray-400">
					Gestiona los códigos de descuento para tus usuarios.
				</p>
			</header>

			<Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
				<CardHeader>
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<CardTitle className="text-foreground dark:text-white">
								Listado de Códigos
							</CardTitle>
							<CardDescription className="text-muted-foreground dark:text-gray-400">
								Visualiza y gestiona todos los códigos de descuento.
							</CardDescription>
						</div>
						<div className="flex gap-2 w-full sm:w-auto">
							<div className="relative flex-grow sm:flex-grow-0">
								<Search
									className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
									size={18}
								/>
								<Input
									type="text"
									placeholder="Buscar código..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 w-full bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
								/>
							</div>
							<Button
								asChild
								className="bg-primary hover:bg-primary/90 text-primary-foreground"
							>
								<Link to="/admin/descuentos/crear">
									<PlusCircle size={18} className="mr-2" /> Crear Descuento
								</Link>
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow className="dark:border-gray-700">
								<TableHead className="text-muted-foreground dark:text-gray-400">
									<Tag size={16} className="inline mr-1" /> Código
								</TableHead>
								<TableHead className="text-muted-foreground dark:text-gray-400">
									Descuento
								</TableHead>
								<TableHead className="text-muted-foreground dark:text-gray-400">
									Estado
								</TableHead>
								<TableHead className="text-muted-foreground dark:text-gray-400">
									<CalendarClock size={16} className="inline mr-1" /> Válido hasta
								</TableHead>
								<TableHead className="text-muted-foreground dark:text-gray-400">
									Usos
								</TableHead>
								<TableHead className="text-right text-muted-foreground dark:text-gray-400">
									Acciones
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredDiscounts.length > 0 ? (
								filteredDiscounts.map((discount) => (
									<TableRow key={discount.id} className="dark:border-gray-700">
										<TableCell className="font-medium text-foreground dark:text-white">
											{discount.code}
										</TableCell>
										<TableCell className="text-muted-foreground dark:text-gray-300">
											{discount.discount}%
										</TableCell>
										<TableCell>{getStatusBadge(discount.status)}</TableCell>
										<TableCell className="text-muted-foreground dark:text-gray-300">
											{discount.validUntil}
										</TableCell>
										<TableCell className="text-muted-foreground dark:text-gray-300">
											{discount.usageCount}/{discount.maxUses}
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => copyToClipboard(discount.code)}
												className="h-8 w-8 p-0 text-muted-foreground hover:text-primary dark:text-gray-400 dark:hover:text-blue-400"
											>
												<Copy className="h-4 w-4" />
												<span className="sr-only">Copiar código</span>
											</Button>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={6}
										className="h-24 text-center text-muted-foreground dark:text-gray-400"
									>
										No se encontraron códigos de descuento.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
};

export default AdminDiscountCodesPage;
