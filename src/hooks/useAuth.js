// Alias temporal para mantener compatibilidad con código existente
// Este archivo permite usar import { useAuth } desde cualquier lugar
// y obtendrá automáticamente la funcionalidad de Clerk

export { useClerkAuth as useAuth } from './useClerkAuth.js';