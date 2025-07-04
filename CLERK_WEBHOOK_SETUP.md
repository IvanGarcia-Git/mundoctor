# Configuración de Webhooks de Clerk

## Problema Identificado ✅

El registro de usuarios no se estaba sincronizando automáticamente con PostgreSQL porque:

1. **Webhooks no configurados correctamente** en el dashboard de Clerk
2. **Manejo de errores mejorado** puede haber interferido con la sincronización
3. **Falta de verificación** del estado de sincronización

## Solución Implementada 🔧

### 1. Webhooks Corregidos
- ✅ Endpoint `/api/webhooks/clerk` configurado
- ✅ Verificación de firma Svix implementada
- ✅ Manejo de eventos `user.created`, `user.updated`, `user.deleted`
- ✅ Raw body parsing para verificación de firmas

### 2. API Client Mejorado
- ✅ Revertido a 1 reintento (era 2)
- ✅ Mejor manejo de errores 404 vs otros errores
- ✅ Manejo graceful de usuarios no encontrados

### 3. Backend Robusto
- ✅ Sincronización automática en `/users/profile`
- ✅ Logging mejorado para debugging
- ✅ Error handling específico para sync failures

## Configuración Paso a Paso 📋

### Paso 1: Variables de Entorno
```bash
# En backend/.env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # ← Este es crítico
```

### Paso 2: Configurar Webhook en Clerk Dashboard

1. **Ir a Clerk Dashboard**: https://dashboard.clerk.com
2. **Seleccionar aplicación**
3. **Ir a "Webhooks"** en sidebar
4. **Hacer clic "Add Endpoint"**
5. **Configurar**:
   - **URL**: `https://your-domain.com/api/webhooks/clerk`
   - **Events**: 
     - ✅ `user.created`
     - ✅ `user.updated` 
     - ✅ `user.deleted`
6. **Copiar "Signing Secret"** → `CLERK_WEBHOOK_SECRET`

### Paso 3: Desarrollo Local (ngrok)

```bash
# Instalar ngrok
npm install -g @ngrok/ngrok

# Exponer servidor local
ngrok http 8000

# Usar URL de ngrok en Clerk Dashboard
# Ejemplo: https://abc123.ngrok.io/api/webhooks/clerk
```

## Testing y Diagnóstico 🔍

### Script de Diagnóstico
```bash
# Backend
cd backend

# Test configuración general
node src/scripts/testWebhookSetup.js

# Diagnosticar usuario específico
node src/scripts/diagnoseUserSync.js <clerk-user-id>
```

### Endpoints de Debug
```bash
# Verificar webhook endpoint
GET /api/webhooks/clerk

# Sincronización manual
POST /api/webhooks/sync-user/{clerkId}

# Validar sincronización
GET /api/webhooks/validate-user/{clerkId}
```

### Logs a Monitorear
```bash
# Servidor backend
🔄 User {userId} not found in database, syncing from Clerk...
✅ User {userId} synced successfully
📥 Received Clerk webhook: user.created
✅ User created: user@example.com

# Cliente frontend
User not found in database, backend will sync from Clerk...
```

## Flujo de Registro Completo 🔄

### 1. Usuario se Registra en Clerk
```
Frontend → Clerk → Usuario Creado
```

### 2. Webhook Automático (Ideal)
```
Clerk → Webhook → Backend → PostgreSQL
```

### 3. Fallback Manual (Si webhook falla)
```
Frontend → /api/users/profile → syncUserFromClerk() → PostgreSQL
```

## Troubleshooting 🐛

### Problema: Usuario no aparece en BD
**Solución**:
1. Verificar logs del webhook endpoint
2. Usar script de diagnóstico
3. Verificar CLERK_WEBHOOK_SECRET
4. Confirmar eventos seleccionados en dashboard

### Problema: Webhook 400 Error  
**Solución**:
1. Verificar formato de URL (incluir /api/webhooks/clerk)
2. Usar ngrok para desarrollo local
3. Revisar signing secret

### Problema: Datos Inconsistentes
**Solución**:
1. Usar endpoint de validación
2. Ejecutar sincronización manual
3. Verificar eventos de webhook

## Estado Actual ✅

- [x] Webhooks corregidos y optimizados
- [x] Error handling mejorado sin interferir con sync
- [x] Scripts de diagnóstico creados
- [x] Fallback robusto implementado
- [x] Documentación completa

**Próximos pasos**: Configurar webhook en Clerk Dashboard con URL de producción/ngrok.