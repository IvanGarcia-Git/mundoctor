import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Edit2, Trash2, UserPlus, ShieldCheck, ShieldOff } from 'lucide-react';

const sampleUsers = [
	{
		id: 'usr_001',
		name: 'Ana Pérez',
		email: 'ana.perez@example.com',
		role: 'patient',
		status: 'active',
		joined: '2023-01-15',
	},
	{
		id: 'usr_002',
		name: 'Dr. Carlos Soler',
		email: 'c.soler@clinic.com',
		role: 'professional',
		status: 'active',
		subscription: 'Profesional',
		joined: '2023-02-20',
		validated: true,
	},
	{
		id: 'usr_003',
		name: 'Laura Vidal',
		email: 'laura.v@example.com',
		role: 'patient',
		status: 'inactive',
		joined: '2023-03-01',
	},
	{
		id: 'usr_004',
		name: 'Dra. Elena Marco',
		email: 'elena.marco@mail.net',
		role: 'professional',
		status: 'pending_validation',
		subscription: 'Básico',
		joined: '2023-04-10',
		validated: false,
	},
	{
		id: 'usr_005',
		name: 'Pedro Gómez',
		email: 'pedro.gomez@work.com',
		role: 'patient',
		status: 'active',
		joined: '2023-05-22',
	},
];

const AdminUserManagementPage = () => {
	const [users, setUsers] = useState(sampleUsers);
	const [searchTerm, setSearchTerm] = useState('');
	const [filters, setFilters] = useState({ role: 'all', status: 'all' });

	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesRole = filters.role === 'all' || user.role === filters.role;
		const matchesStatus = filters.status === 'all' || user.status === filters.status;
		return matchesSearch && matchesRole && matchesStatus;
	});

	const handleToggleStatus = (userId) => {
		setUsers(
			users.map((user) =>
				user.id === userId ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' } : user
			)
		);
	};

	const handleValidateProfessional = (userId) => {
		setUsers(
			users.map((user) =>
				user.id === userId && user.role === 'professional'
					? { ...user, status: 'active', validated: true }
					: user
			)
		);
	};

	return (
		<div className="space-y-6">
			<header className="mb-8">
				<h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
				<p className="text-muted-foreground dark:text-gray-400">Administra todos los usuarios de la plataforma.</p>
			</header>

			<div className="mb-6 p-4 bg-card dark:bg-gray-800/60 backdrop-blur-md rounded-xl border border-border dark:border-gray-700/50 shadow-md">
				<div className="flex flex-col md:flex-row gap-4 items-center">
					<div className="relative flex-grow w-full md:w-auto">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground dark:text-gray-400" />
						<Input
							type="text"
							placeholder="Buscar por nombre o email..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10 bg-input dark:bg-gray-900/70 border-border dark:border-gray-700"
						/>
					</div>
					<Button variant="outline">
						<Filter className="mr-2 h-4 w-4" />
						Filtros Avanzados
					</Button>
					<Button className="bg-green-600 hover:bg-green-700 text-white">
						<UserPlus className="mr-2 h-4 w-4" /> Añadir Usuario
					</Button>
				</div>
			</div>

			<div className="bg-card dark:bg-gray-800/60 backdrop-blur-md rounded-xl border border-border dark:border-gray-700/50 shadow-lg overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-muted/30 dark:hover:bg-gray-700/30">
							<TableHead className="text-foreground dark:text-white">Nombre</TableHead>
							<TableHead className="text-foreground dark:text-white">Email</TableHead>
							<TableHead className="text-foreground dark:text-white">Rol</TableHead>
							<TableHead className="text-foreground dark:text-white">Estado</TableHead>
							<TableHead className="text-foreground dark:text-white">Suscripción</TableHead>
							<TableHead className="text-foreground dark:text-white">Validado</TableHead>
							<TableHead className="text-foreground dark:text-white text-right">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredUsers.map((user) => (
							<TableRow
								key={user.id}
								className="hover:bg-muted/50 dark:hover:bg-gray-700/50 border-b border-border dark:border-gray-700/50"
							>
								<TableCell className="font-medium">{user.name}</TableCell>
								<TableCell className="text-muted-foreground dark:text-gray-300">{user.email}</TableCell>
								<TableCell>
									<Badge
										variant={user.role === 'professional' ? 'default' : 'secondary'}
										className={`${
											user.role === 'professional'
												? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
												: 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
										}`}
									>
										{user.role === 'professional' ? 'Profesional' : 'Paciente'}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge
										variant={
											user.status === 'active'
												? 'success'
												: user.status === 'pending_validation'
												? 'warning'
												: 'destructive'
										}
										className={`
                            ${
															user.status === 'active'
																? 'bg-green-500/20 text-green-700 dark:text-green-300'
																: ''
														}
                            ${
															user.status === 'inactive'
																? 'bg-red-500/20 text-red-700 dark:text-red-300'
																: ''
														}
                            ${
															user.status === 'pending_validation'
																? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
																: ''
														}
                           `}
									>
										{user.status === 'active'
											? 'Activo'
											: user.status === 'pending_validation'
											? 'Pend. Validar'
											: 'Inactivo'}
									</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground dark:text-gray-300">
									{user.subscription || '-'}
								</TableCell>
								<TableCell>
									{user.role === 'professional' ? (
										user.validated ? (
											<ShieldCheck className="h-5 w-5 text-green-500" />
										) : (
											<ShieldOff className="h-5 w-5 text-red-500" />
										)
									) : (
										'-'
									)}
								</TableCell>
								<TableCell className="text-right">
									{user.role === 'professional' &&
										!user.validated &&
										user.status === 'pending_validation' && (
											<Button
												variant="outline"
												size="sm"
												className="mr-2 border-green-500 text-green-500 hover:bg-green-500/10"
												onClick={() => handleValidateProfessional(user.id)}
											>
												<ShieldCheck className="mr-1 h-4 w-4" /> Validar
											</Button>
										)}
									<Button
										variant="outline"
										size="icon"
										className="mr-2 text-muted-foreground hover:text-foreground"
									>
										<Edit2 className="h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										size="icon"
										className="text-red-500 hover:bg-red-500/10 hover:text-red-600 border-red-500/50 hover:border-red-500"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{filteredUsers.length === 0 && (
					<p className="text-center py-10 text-muted-foreground dark:text-gray-400">
						No se encontraron usuarios con los criterios seleccionados.
					</p>
				)}
			</div>
		</div>
	);
};

export default AdminUserManagementPage;
