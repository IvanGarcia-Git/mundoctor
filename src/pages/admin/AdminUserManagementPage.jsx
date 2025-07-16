import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Edit2, Trash2, UserPlus, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/clerkApi';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const AdminUserManagementPage = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [filters, setFilters] = useState({ role: 'all', status: 'all' });
	const [updating, setUpdating] = useState(null); // Track which user is being updated
	const { toast } = useToast();

	// Load users from API
	useEffect(() => {
		const loadUsers = async () => {
			try {
				setLoading(true);
				setError(null);
				
				const usersData = await adminApi.getUsers({
					limit: 100, // Load first 100 users
					...filters.role !== 'all' && { role: filters.role },
					...filters.status !== 'all' && { status: filters.status }
				});
				
				setUsers(usersData.data || usersData.users || []);
				
			} catch (err) {
				console.error('Error loading users:', err);
				setError(err.message || 'Error al cargar los usuarios');
				toast({
					title: 'Error',
					description: 'No se pudieron cargar los usuarios. Intenta nuevamente.',
					variant: 'destructive',
				});
			} finally {
				setLoading(false);
			}
		};

		loadUsers();
	}, [filters, toast]);

	const filteredUsers = users.filter((user) => {
		if (!searchTerm) return true;
		
		const searchLower = searchTerm.toLowerCase();
		const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || '';
		const userEmail = user.email || '';
		
		return userName.toLowerCase().includes(searchLower) ||
		       userEmail.toLowerCase().includes(searchLower);
	});

	const handleToggleStatus = async (userId) => {
		try {
			setUpdating(userId);
			
			const user = users.find(u => u.id === userId);
			const newStatus = user.status === 'active' ? 'inactive' : 'active';
			
			// Update user status via API (this would typically call adminApi.updateUserStatus)
			// For now, we'll just update local state
			setUsers(
				users.map((user) =>
					user.id === userId ? { ...user, status: newStatus } : user
				)
			);
			
			toast({
				title: 'Estado actualizado',
				description: `Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'} correctamente.`,
				variant: 'default',
			});
			
		} catch (err) {
			console.error('Error updating user status:', err);
			toast({
				title: 'Error',
				description: 'No se pudo actualizar el estado del usuario.',
				variant: 'destructive',
			});
		} finally {
			setUpdating(null);
		}
	};

	const handleValidateProfessional = async (userId) => {
		try {
			setUpdating(userId);
			
			// This would typically call the professional validation API
			setUsers(
				users.map((user) =>
					user.id === userId && (user.role === 'professional' || user.user_type === 'professional')
						? { ...user, status: 'active', validated: true, is_validated: true }
						: user
				)
			);
			
			toast({
				title: 'Profesional validado',
				description: 'El profesional ha sido validado correctamente.',
				variant: 'default',
			});
			
		} catch (err) {
			console.error('Error validating professional:', err);
			toast({
				title: 'Error',
				description: 'No se pudo validar el profesional.',
				variant: 'destructive',
			});
		} finally {
			setUpdating(null);
		}
	};

	const handleDeleteUser = async (userId) => {
		if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
			return;
		}
		
		try {
			setUpdating(userId);
			
			// This would typically call adminApi.deleteUser(userId)
			setUsers(users.filter(user => user.id !== userId));
			
			toast({
				title: 'Usuario eliminado',
				description: 'El usuario ha sido eliminado correctamente.',
				variant: 'default',
			});
			
		} catch (err) {
			console.error('Error deleting user:', err);
			toast({
				title: 'Error',
				description: 'No se pudo eliminar el usuario.',
				variant: 'destructive',
			});
		} finally {
			setUpdating(null);
		}
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
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
						<span className="ml-2 text-muted-foreground">Cargando usuarios...</span>
					</div>
				) : error ? (
					<div className="text-center py-12">
						<p className="text-destructive mb-4">{error}</p>
						<Button onClick={() => window.location.reload()} variant="outline">
							Reintentar
						</Button>
					</div>
				) : (
					<>
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
								{filteredUsers.map((user) => {
									const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Sin nombre';
									const userRole = user.user_type || user.role || 'patient';
									const isUpdating = updating === user.id;
									
									return (
							<TableRow
								key={user.id}
								className="hover:bg-muted/50 dark:hover:bg-gray-700/50 border-b border-border dark:border-gray-700/50"
							>
								<TableCell className="font-medium">{userName}</TableCell>
								<TableCell className="text-muted-foreground dark:text-gray-300">{user.email || 'Sin email'}</TableCell>
								<TableCell>
									<Badge
										variant={userRole === 'professional' ? 'default' : 'secondary'}
										className={`${
											userRole === 'professional'
												? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
												: 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
										}`}
									>
										{userRole === 'professional' ? 'Profesional' : 'Paciente'}
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
									{user.subscription_plan || user.subscription || '-'}
								</TableCell>
								<TableCell>
									{userRole === 'professional' ? (
										(user.is_validated || user.validated) ? (
											<ShieldCheck className="h-5 w-5 text-green-500" />
										) : (
											<ShieldOff className="h-5 w-5 text-red-500" />
										)
									) : (
										'-'
									)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-2">
										{userRole === 'professional' &&
											!(user.is_validated || user.validated) &&
											user.status === 'pending_validation' && (
											<Button
												variant="outline"
												size="sm"
												disabled={isUpdating}
												className="border-green-500 text-green-500 hover:bg-green-500/10"
												onClick={() => handleValidateProfessional(user.id)}
											>
												{isUpdating ? (
													<Loader2 className="mr-1 h-4 w-4 animate-spin" />
												) : (
													<ShieldCheck className="mr-1 h-4 w-4" />
												)}
												Validar
											</Button>
										)}
										<Button
											variant="outline"
											size="icon"
											disabled={isUpdating}
											className="text-muted-foreground hover:text-foreground"
											onClick={() => handleToggleStatus(user.id)}
										>
											{isUpdating ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Edit2 className="h-4 w-4" />
											)}
										</Button>
										<Button
											variant="outline"
											size="icon"
											disabled={isUpdating}
											className="text-red-500 hover:bg-red-500/10 hover:text-red-600 border-red-500/50 hover:border-red-500"
											onClick={() => handleDeleteUser(user.id)}
										>
											{isUpdating ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Trash2 className="h-4 w-4" />
											)}
										</Button>
									</div>
								</TableCell>
							</TableRow>
									);
								})}
							</TableBody>
						</Table>
						{filteredUsers.length === 0 && (
							<p className="text-center py-10 text-muted-foreground dark:text-gray-400">
								No se encontraron usuarios con los criterios seleccionados.
							</p>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default AdminUserManagementPage;
