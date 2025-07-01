# Plan de Migración: LocalStorage → PostgreSQL + Clerk OAuth

## Estado Actual del Proyecto

**✅ Elementos ya configurados:**
- Clerk React SDK instalado (`@clerk/clerk-react: ^5.32.2`)
- Clerk Express SDK instalado (`@clerk/express: ^1.7.1`)
- PostgreSQL configurado con schema completo
- Schema de BD preparado para Clerk (`users.clerk_id`)
- Backend con Express + configuración de base de datos

**❌ Elementos por migrar:**
- Frontend usa localStorage para auth (`AuthContext.jsx`)
- Login manual con credenciales hardcodeadas
- Datos de usuario almacenados en localStorage
- No hay sincronización con backend PostgreSQL

---

## FASE 1: Configuración Base de Clerk
**Objetivo:** Completar la configuración de Clerk en frontend y backend

### Tareas Frontend
- [x] **1.1** Configurar variables de entorno Clerk
  - ✅ Crear/actualizar `.env` con `VITE_CLERK_PUBLISHABLE_KEY`
  - ✅ Verificar configuración en `main.jsx`
  - Archivo: `src/main.jsx:10-14`

- [x] **1.2** Configurar rutas de autenticación
  - ✅ Configurar `signInUrl="/login"` y `signUpUrl="/registro"`
  - Archivo: `src/main.jsx:18-22`

### Tareas Backend
- [x] **1.3** Configurar middleware de Clerk
  - ✅ Configurar `@clerk/express` en servidor
  - ✅ Añadir middleware de autenticación
  - Archivo: `backend/src/middleware/auth.js`

- [x] **1.4** Configurar variables de entorno backend
  - ✅ Añadir `CLERK_SECRET_KEY` al `.env`
  - ✅ Configurar webhook secrets
  - Archivo: `backend/.env`

### Tareas Base de Datos
- [x] **1.5** Verificar schema PostgreSQL
  - ✅ Confirmar tabla `users` con `clerk_id`
  - ✅ Verificar migraciones aplicadas (requiere PostgreSQL ejecutándose)
  - Archivo: `backend/migrations/001_initial_schema.sql:15-27`

---

## FASE 2: Implementación de Webhooks Clerk
**Objetivo:** Sincronizar usuarios de Clerk con PostgreSQL

### Tareas Backend
- [x] **2.1** Crear endpoint de webhooks
  - ✅ Implementar `/api/webhooks/clerk`
  - ✅ Manejar eventos: `user.created`, `user.updated`, `user.deleted`
  - Archivo: `backend/src/routes/webhooks.js`

- [x] **2.2** Implementar funciones de synchronización
  - ✅ `createUserInDB()` - crear usuario en PostgreSQL
  - ✅ `updateUserInDB()` - actualizar datos usuario
  - ✅ `deleteUserFromDB()` - eliminar usuario
  - Archivo: `backend/src/controllers/userController.js`

- [x] **2.3** Configurar webhooks en Clerk Dashboard
  - ✅ Guía creada: `WEBHOOK_SETUP_GUIDE.md`
  - ✅ Variables de entorno preparadas
  - ✅ Endpoint `/api/webhooks/clerk` listo

### Tareas de Validación
- [x] **2.4** Crear middleware de validación Clerk
  - ✅ Validar tokens JWT de Clerk
  - ✅ Verificar permisos por rol
  - ✅ Middleware completo con funciones helper
  - Archivo: `backend/src/middleware/clerkAuth.js`

---

## FASE 3: Migración del Frontend
**Objetivo:** Reemplazar localStorage + AuthContext con Clerk hooks

### Tareas de Refactoring
- [x] **3.1** Crear nuevo AuthContext con Clerk
  - ✅ `ClerkAuthContext.jsx` - Context híbrido compatible
  - ✅ Mantener interfaz compatible con `useAuth()`
  - ✅ Integrado en `AppProviders.jsx`
  - Archivo: `src/contexts/ClerkAuthContext.jsx`

- [x] **3.2** Migrar componentes de autenticación
  - ✅ `LoginPageClerk.jsx` - Nuevo login con `<SignIn />`
  - ✅ `RegisterPageClerk.jsx` - Nuevo registro con `<SignUp />`
  - ✅ AppRoutes ya usa `useUser` de Clerk
  - Archivos: `src/pages/LoginPageClerk.jsx`, `src/pages/RegisterPageClerk.jsx`

- [x] **3.3** Configurar componentes Clerk UI
  - ✅ Componentes `<SignIn />` y `<SignUp />` personalizados
  - ✅ Estilos TailwindCSS integrados
  - ✅ Redirecciones configuradas
  - Archivos: `src/pages/LoginPageClerk.jsx`, `src/pages/RegisterPageClerk.jsx`

### Tareas de Migración de Datos
- [x] **3.4** Implementar migración gradual
  - ✅ Hook `useHybridAuth()` con soporte localStorage + Clerk
  - ✅ Componente `MigrationHelper.jsx` para migración automática
  - ✅ Funciones de migración y limpieza de datos
  - Archivo: `src/hooks/useHybridAuth.js`, `src/components/MigrationHelper.jsx`

- [ ] **3.5** Actualizar navegación y layouts
  - Reemplazar botones logout con `<UserButton />`
  - Actualizar verificación de roles
  - Archivos: `src/components/layout/`

---

## FASE 4: Integración con PostgreSQL
**Objetivo:** Conectar frontend con backend PostgreSQL

### Tareas API
- [ ] **4.1** Crear cliente API con autenticación Clerk
  - Implementar interceptor con tokens Clerk
  - Reemplazar `localStorage` por API calls
  - Archivo: `src/lib/clerkApi.js`

- [ ] **4.2** Implementar endpoints de datos
  - GET `/api/users/profile` - obtener perfil usuario
  - PUT `/api/users/profile` - actualizar perfil
  - GET `/api/users/preferences` - preferencias usuario
  - Archivos: `backend/src/routes/users.js`

- [ ] **4.3** Migrar datos de usuario
  - Crear funciones para sincronizar datos existentes
  - Implementar script de migración de localStorage
  - Archivo: `src/utils/migrateUserData.js`

### Tareas de Roles y Permisos
- [ ] **4.4** Implementar gestión de roles
  - Configurar roles en Clerk (`patient`, `professional`, `admin`)
  - Implementar middleware de autorización
  - Archivo: `backend/src/middleware/roleAuth.js`

- [ ] **4.5** Migrar dashboards por rol
  - Actualizar `ProfessionalDashboardPage.jsx` para usar API
  - Actualizar rutas protegidas por rol
  - Archivos: `src/pages/professional/`, `src/pages/admin/`, `src/pages/patient/`

---

## FASE 5: OAuth Social y Configuración Avanzada
**Objetivo:** Implementar OAuth providers y características avanzadas

### Tareas OAuth
- [ ] **5.1** Configurar OAuth providers
  - Habilitar Google OAuth en Clerk Dashboard
  - Habilitar Facebook OAuth en Clerk Dashboard
  - Configurar scopes adicionales si necesario

- [ ] **5.2** Personalizar flujo de OAuth
  - Configurar redirecciones post-login por rol
  - Implementar `afterSignInUrl` dinámico
  - Archivo: `src/components/ClerkProviderWrapper.jsx`

### Tareas de Personalización
- [ ] **5.3** Personalizar UI de Clerk
  - Crear tema personalizado para componentes Clerk
  - Mantener diseño consistente con TailwindCSS
  - Archivo: `src/styles/clerkTheme.js`

- [ ] **5.4** Implementar preferencias avanzadas
  - Sincronizar preferencias de tema con BD
  - Implementar notificaciones personalizadas
  - Archivo: `src/hooks/useUserPreferences.js`

---

## FASE 6: Testing y Limpieza
**Objetivo:** Probar sistema completo y limpiar código legacy

### Tareas de Testing
- [ ] **6.1** Testing de autenticación
  - Probar login/logout con Clerk
  - Probar OAuth con Google/Facebook
  - Probar navegación entre roles

- [ ] **6.2** Testing de sincronización
  - Probar webhooks Clerk → PostgreSQL
  - Probar actualización de perfiles
  - Probar gestión de roles

- [ ] **6.3** Testing de migración
  - Probar flujo de migración desde localStorage
  - Verificar integridad de datos
  - Probar fallback scenarios

### Tareas de Limpieza
- [ ] **6.4** Eliminar código legacy
  - Eliminar `AuthContext.jsx` original
  - Eliminar funciones de localStorage
  - Limpiar imports y dependencias obsoletas

- [ ] **6.5** Actualizar documentación
  - Actualizar `README.md` con nueva arquitectura
  - Documentar variables de entorno necesarias
  - Actualizar `CLAUDE.md` con nueva estructura

---

## FASE 7: Deploy y Monitoreo
**Objetivo:** Desplegar sistema y configurar monitoreo

### Tareas de Deploy
- [ ] **7.1** Configurar variables de entorno producción
  - Configurar Clerk keys para producción
  - Configurar PostgreSQL conexión
  - Configurar webhooks URLs

- [ ] **7.2** Deploy y verificación
  - Desplegar backend con nuevas rutas
  - Desplegar frontend con Clerk
  - Verificar funcionamiento end-to-end

### Tareas de Monitoreo
- [ ] **7.3** Implementar logging
  - Configurar logs de autenticación
  - Configurar logs de webhooks
  - Configurar alertas de errores

- [ ] **7.4** Métricas y monitoreo
  - Configurar métricas de uso
  - Configurar monitoreo de performance
  - Configurar backup de PostgreSQL

---

## Checklist de Variables de Entorno

### Frontend (.env)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Backend (.env)
```bash
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
DB_HOST=localhost
DB_NAME=mundoctor
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432
```

---

## Comandos Importantes

### Desarrollo
```bash
# Frontend
npm run dev

# Backend
npm run dev

# Migraciones BD
npm run migrate
npm run seed
```

### Testing
```bash
# Probar conexión BD
curl http://localhost:3001/api/health

# Probar webhook
curl -X POST http://localhost:3001/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{"type": "user.created", "data": {...}}'
```

---

## Notas de Implementación

1. **Migración Gradual**: Implementar soporte dual para evitar downtime
2. **Backup de Datos**: Crear backup de datos localStorage antes de migrar
3. **Rollback Plan**: Mantener capacidad de rollback a sistema anterior
4. **Testing Exhaustivo**: Probar todos los flujos críticos antes de producción
5. **Documentación**: Mantener documentación actualizada durante todo el proceso

---

*Plan creado el: 2025-07-01*  
*Estado: En progreso - Fase 1*  
*Última actualización: 2025-07-01*