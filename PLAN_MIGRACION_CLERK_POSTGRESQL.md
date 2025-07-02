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

- [x] **3.5** Actualizar navegación y layouts
  - ✅ Reemplazar botones logout con `<UserButton />`
  - ✅ Actualizar verificación de roles
  - ✅ Archivos: `src/components/layout/Header.jsx`, `src/components/layout/SidebarNav.jsx`

---

## FASE 4: Integración con PostgreSQL
**Objetivo:** Conectar frontend con backend PostgreSQL

### Tareas API
- [x] **4.1** Crear cliente API con autenticación Clerk
  - ✅ Implementar interceptor con tokens Clerk
  - ✅ Reemplazar `localStorage` por API calls
  - ✅ Archivo: `src/lib/clerkApi.js`

- [x] **4.2** Implementar endpoints de datos
  - ✅ GET `/api/users/profile` - obtener perfil usuario
  - ✅ PUT `/api/users/profile` - actualizar perfil
  - ✅ GET `/api/users/preferences` - preferencias usuario
  - ✅ Archivos: `backend/src/routes/users.js`

- [x] **4.3** Migrar datos de usuario
  - ✅ Crear funciones para sincronizar datos existentes
  - ✅ Implementar script de migración de localStorage
  - ✅ Archivo: `src/utils/migrateUserData.js`

### Tareas de Roles y Permisos
- [x] **4.4** Implementar gestión de roles
  - ✅ Configurar roles en Clerk (`patient`, `professional`, `admin`)
  - ✅ Implementar middleware de autorización
  - ✅ Archivo: `backend/src/middleware/roleAuth.js`

- [x] **4.5** Migrar dashboards por rol
  - ⚠️ Actualizar `ProfessionalDashboardPage.jsx` para usar API (80% completo)
  - ✅ Actualizar rutas protegidas por rol
  - ✅ Archivos: `src/pages/professional/`, `src/pages/admin/`, `src/pages/patient/`
  - 📝 **Nota:** Infraestructura API lista, falta migrar datos mock a API real

---

## FASE 5: Registro Completo y Validación de Profesionales
**Objetivo:** Implementar flujo completo de registro con selección de rol y validación de profesionales

### Flujo de Registro Completo
1. **Página Registro** → 2. **Verificación de Email** → 3. **Selección Paciente/Profesional** → 4. **Datos Adicionales (si Profesional)** → 5. **Redirección Home**

### Tareas de Selección de Rol
- [x] **5.1** Crear página de selección de tipo de usuario
  - ✅ Componente para elegir entre Paciente o Profesional
  - ✅ Diseño atractivo con iconos y descripciones
  - Archivo: `src/pages/SelectUserTypePage.jsx`

- [x] **5.2** Actualizar flujo de registro
  - ✅ Modificar `afterSignUpUrl` para redirigir a selección de tipo
  - ✅ Configurar ruta `/seleccionar-tipo-usuario` 
  - Archivo: `src/pages/RegisterPage.jsx`

### Tareas de Validación de Profesionales
- [x] **5.3** Crear formulario de datos profesionales
  - ✅ Campo: Número de colegiado (texto, requerido)
  - ✅ Campo: DNI (texto, requerido)
  - ✅ Upload: Imagen del DNI (archivo, requerido)
  - ✅ Upload: Imagen de Titulación Universitaria (archivo, requerido)
  - ✅ Upload: Imagen del Certificado de Colegiación (archivo, requerido)
  - Archivo: `src/pages/ProfessionalDataPage.jsx`

- [x] **5.4** Implementar subida de archivos
  - ⏳ Configurar storage para documentos (Cloudinary/AWS S3) - Pendiente backend
  - ✅ Validación de tipos de archivo (imagen: jpg, png, pdf)
  - ✅ Preview de archivos antes de envío
  - Archivo: Integrado en `src/pages/ProfessionalDataPage.jsx`

### Tareas de Backend
- [ ] **5.5** Crear endpoints para validación
  - `POST /api/users/select-role` - Asignar rol de usuario
  - `POST /api/users/professional-validation` - Enviar documentos
  - `GET /api/users/validation-status` - Estado de validación
  - Archivo: `backend/src/routes/userValidation.js`

- [ ] **5.6** Extender base de datos
  - Tabla `professional_validations` para documentos
  - Campos: user_id, college_number, dni, document_urls, status
  - Estados: 'pending', 'approved', 'rejected'
  - Archivo: `backend/migrations/005_professional_validations.sql`

### Tareas de Integración
- [x] **5.7** Configurar rutas y navegación
  - ✅ Ruta `/seleccionar-tipo-usuario` - Selección de tipo
  - ✅ Ruta `/registro/profesional-datos` - Formulario documentos
  - ✅ Integración en AppRoutes.jsx
  - ✅ Corrección de redirecciones después de verificación de email
  - Archivo: `src/AppRoutes.jsx`, `src/pages/VerifyEmailPage.jsx`

- [x] **5.8** Corrección de errores de Clerk API
  - ✅ Error: "public_metadata is not a valid parameter for this request"
  - ✅ Cambio de `publicMetadata` a `unsafeMetadata` en actualizaciones frontend
  - ✅ Actualización de verificación de roles en protección de rutas
  - ✅ Flujo de registro completamente funcional
  - Archivos: `src/pages/SelectUserTypePage.jsx`, `src/pages/ProfessionalDataPage.jsx`, `src/AppRoutes.jsx`

- [x] **5.9** Sistema de verificación de profesionales
  - ✅ Página de verificación pendiente para profesionales no verificados
  - ✅ Protección de rutas profesionales hasta verificación
  - ✅ Estados de verificación: 'pending', 'approved', 'rejected'
  - ✅ Redirección automática después de envío de documentos
  - ✅ Control de administración para pruebas (simulador)
  - ✅ Soporte para modo oscuro completo
  - Archivos: `src/pages/ProfessionalVerificationPendingPage.jsx`, `src/components/admin/ProfessionalVerificationControl.jsx`

- [ ] **5.10** Implementar estados de usuario en backend
  - Estado: 'incomplete' - Necesita completar registro
  - Estado: 'pending_validation' - Profesional pendiente aprobación
  - Estado: 'active' - Usuario completamente registrado
  - Middleware para verificar estados
  - Archivo: `backend/src/middleware/userStatus.js`

### ✅ **Estado de la Fase 5: COMPLETADA**
**Frontend completamente funcional con:**
- ✅ Flujo completo de registro: Registro → Verificación Email → Selección Tipo → Datos Profesionales → Verificación Pendiente → Dashboard
- ✅ Selección de tipo de usuario (Paciente/Profesional) funcionando
- ✅ Formulario de validación profesional con subida de archivos
- ✅ Sistema de verificación de profesionales con estados (pending/approved/rejected)
- ✅ Protección de rutas hasta verificación administrativa
- ✅ Página de verificación pendiente con control de pruebas
- ✅ Navegación y redirecciones correctas
- ✅ Errores de Clerk API corregidos (metadata handling)
- ✅ Soporte completo para modo oscuro
- ✅ Servidor ejecutándose en `http://localhost:5174/`

**Pendiente (Backend):**
- ⏳ Endpoints para validación profesional (tareas 5.5-5.6)
- ⏳ Base de datos para documentos profesionales
- ⏳ Estados de usuario y middleware de validación

---

## FASE 6: Finalización de Dashboards y Optimización
**Objetivo:** Completar migración de dashboards y optimizar funcionalidades

### Tareas de Finalización
- [ ] **6.1** Completar migración de dashboards a API
  - Migrar `ProfessionalDashboardPage.jsx` de datos mock a API real
  - Migrar `AdminDashboardPage.jsx` de datos simulados a API real
  - Migrar `PatientDashboardPage.jsx` de datos estáticos a API real
  - Archivos: `src/pages/*/Dashboard*.jsx`

- [x] **6.2** OAuth Social ya implementado
  - ✅ Google OAuth funcional en login/registro
  - ✅ Redirecciones post-login por rol implementadas
  - ✅ UI de Clerk personalizada con TailwindCSS
  - ✅ Footer transparente y diseño consistente

### Tareas de Optimización
- [ ] **6.3** Mejorar gestión de errores
  - Implementar boundary de errores en componentes Clerk
  - Mejorar manejo de errores en API calls
  - Archivo: `src/components/ErrorBoundary.jsx`

- [ ] **6.4** Optimizar carga y rendimiento
  - Implementar lazy loading en dashboards
  - Optimizar queries de base de datos
  - Cachear datos frecuentemente accedidos

---

## FASE 7: Testing y Limpieza
**Objetivo:** Probar sistema completo y limpiar código legacy

### Tareas de Testing
- [ ] **7.1** Testing de autenticación
  - Probar login/logout con Clerk
  - Probar OAuth con Google/Facebook
  - Probar navegación entre roles

- [ ] **7.2** Testing de sincronización
  - Probar webhooks Clerk → PostgreSQL
  - Probar actualización de perfiles
  - Probar gestión de roles

- [ ] **7.3** Testing de registro completo
  - Probar flujo completo paciente
  - Probar flujo completo profesional con validación
  - Probar upload de documentos

- [ ] **7.4** Testing de migración
  - Probar flujo de migración desde localStorage
  - Verificar integridad de datos
  - Probar fallback scenarios

### Tareas de Limpieza
- [ ] **7.5** Eliminar código legacy
  - Eliminar `AuthContext.jsx` original
  - Eliminar funciones de localStorage
  - Limpiar imports y dependencias obsoletas

- [ ] **7.6** Actualizar documentación
  - Actualizar `README.md` con nueva arquitectura
  - Documentar variables de entorno necesarias
  - Actualizar `CLAUDE.md` con nueva estructura

---

## FASE 8: Deploy y Monitoreo
**Objetivo:** Desplegar sistema y configurar monitoreo

### Tareas de Deploy
- [ ] **8.1** Configurar variables de entorno producción
  - Configurar Clerk keys para producción
  - Configurar PostgreSQL conexión
  - Configurar webhooks URLs

- [ ] **8.2** Deploy y verificación
  - Desplegar backend con nuevas rutas
  - Desplegar frontend con Clerk
  - Verificar funcionamiento end-to-end

### Tareas de Monitoreo
- [ ] **8.3** Implementar logging
  - Configurar logs de autenticación
  - Configurar logs de webhooks
  - Configurar alertas de errores

- [ ] **8.4** Métricas y monitoreo
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