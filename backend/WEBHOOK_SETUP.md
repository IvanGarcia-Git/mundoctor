# Configuración de Webhooks de Clerk para Mundoctor

## 📋 Resumen

Este documento explica cómo configurar los webhooks de Clerk para sincronizar automáticamente usuarios registrados con la base de datos PostgreSQL de Mundoctor.

## 🎯 Objetivo

Cuando un usuario se registra en Clerk, se debe insertar automáticamente en la tabla `users` de PostgreSQL con:
- ✅ clerk_id como primary key
- ✅ Datos básicos del usuario (email, nombre, teléfono)
- ✅ Perfiles de usuario automáticos (patient/professional)
- ✅ Preferencias por defecto

## 🔧 Configuración del Dashboard de Clerk

### 1. Acceder al Dashboard de Clerk

1. Ve a [clerk.com](https://clerk.com) e inicia sesión
2. Selecciona tu proyecto "Mundoctor"
3. En el menú lateral, selecciona **"Webhooks"**

### 2. Crear un Nuevo Webhook

1. Haz clic en **"Add endpoint"**
2. Configura los siguientes campos:

#### URL del Webhook
```
https://tu-dominio.com/api/auth/webhook
```

**Para desarrollo local con ngrok:**
```
https://abc123.ngrok.io/api/auth/webhook
```

#### Eventos a Suscribir
Selecciona los siguientes eventos:
- ✅ `user.created` - Usuario registrado
- ✅ `user.updated` - Usuario actualizado
- ✅ `user.deleted` - Usuario eliminado

#### Configuración Adicional
- **Description:** "Mundoctor PostgreSQL Sync"
- **Filter events:** Dejar vacío (todos los eventos)

### 3. Obtener el Webhook Secret

1. Después de crear el webhook, copia el **Signing Secret**
2. Debe empezar con `whsec_`
3. Actualiza tu archivo `.env`:

```env
CLERK_WEBHOOK_SECRET=whsec_tu_secret_aqui
```

## 🧪 Configuración para Desarrollo Local

### Usar ngrok para Testing Local

1. **Instalar ngrok:**
```bash
npm install -g ngrok
# o
brew install ngrok  # en macOS
```

2. **Exponer tu servidor local:**
```bash
ngrok http 8000
```

3. **Copiar la URL HTTPS:**
```
https://abc123.ngrok.io
```

4. **Configurar en Clerk Dashboard:**
```
https://abc123.ngrok.io/api/auth/webhook
```

### Verificar Conexión

1. **Iniciar el servidor:**
```bash
npm run dev
```

2. **Verificar endpoint:**
```bash
curl -X GET https://abc123.ngrok.io/health
```

## 📝 Variables de Entorno Requeridas

Asegúrate de tener estas variables en tu `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mundoctor
DB_USER=postgres
DB_PASSWORD=postgres

# Clerk Configuration
CLERK_SECRET_KEY=sk_test_tu_secret_key
CLERK_PUBLISHABLE_KEY=pk_test_tu_publishable_key
CLERK_WEBHOOK_SECRET=whsec_tu_webhook_secret

# Server Configuration
PORT=8000
NODE_ENV=development
```

## 🔄 Flujo de Sincronización

### Cuando un usuario se registra en Clerk:

1. **Clerk envía webhook** → `POST /api/auth/webhook`
2. **Verificación de firma** → Svix valida autenticidad
3. **Procesamiento de evento** → Según tipo (`user.created`)
4. **Inserción en BD** → Tabla `users` con clerk_id como PK
5. **Creación de perfiles** → `user_preferences` + `patients`/`professionals`
6. **Respuesta exitosa** → HTTP 200 a Clerk

### Estructura de datos creados:

```sql
-- Tabla users (principal)
INSERT INTO users (id, email, name, role, phone, avatar_url, verified, status)
VALUES (clerk_id, email, name, 'patient', phone, image_url, false, 'incomplete');

-- Preferencias de usuario
INSERT INTO user_preferences (user_id) VALUES (clerk_id);

-- Perfil según rol
INSERT INTO patients (user_id) VALUES (clerk_id);  -- Si role = 'patient'
INSERT INTO professionals (user_id) VALUES (clerk_id);  -- Si role = 'professional'
```

## 🧪 Testing del Webhook

### 1. Test Manual con Script

```bash
node src/scripts/testWebhook.js
```

### 2. Test con Usuario Real

1. **Registrar usuario** en tu frontend
2. **Verificar logs** del servidor:
```bash
# Debería aparecer:
✅ Verified webhook with ID user_xxx and type user.created
✅ User created in database: { clerkId: 'user_xxx', email: 'test@email.com', ... }
```

3. **Verificar en base de datos:**
```sql
SELECT * FROM users WHERE id = 'user_xxx';
SELECT * FROM user_preferences WHERE user_id = 'user_xxx';
SELECT * FROM patients WHERE user_id = 'user_xxx';
```

## 🐛 Solución de Problemas

### Error: "Webhook verification failed"

**Causa:** Secret incorrecto o headers malformados

**Solución:**
1. Verificar `CLERK_WEBHOOK_SECRET` en `.env`
2. Asegurarse de usar `express.raw({ type: 'application/json' })`
3. Verificar que ngrok esté usando HTTPS

### Error: "column clerk_id does not exist"

**Causa:** Migración de base de datos incompleta

**Solución:**
```bash
node src/scripts/verifyMigration.js
```

### Usuario no aparece en base de datos

**Causa:** Webhook no se ejecutó o falló

**Solución:**
1. Verificar logs del servidor
2. Comprobar URL del webhook en Dashboard
3. Verificar que eventos estén habilitados

## 📊 Monitoreo

### Logs a Verificar

```bash
# Webhooks recibidos
✅ Verified webhook with ID user_xxx and type user.created

# Usuarios creados
✅ User created in database: { clerkId: 'user_xxx', email: 'user@email.com', name: 'User Name', role: 'patient' }

# Errores
❌ Webhook verification failed: Error: Invalid signature
❌ Database error: column "clerk_id" does not exist
```

### Dashboard de Clerk

1. Ve a **Webhooks** en el Dashboard
2. Selecciona tu webhook
3. Revisa el **"Attempts"** tab para ver entregas
4. Verifica **"Response codes"** (deben ser 200)

## ✅ Checklist de Configuración

- [ ] Webhook creado en Dashboard de Clerk
- [ ] URL correcta configurada (`/api/auth/webhook`)
- [ ] Eventos seleccionados (`user.created`, `user.updated`, `user.deleted`)
- [ ] `CLERK_WEBHOOK_SECRET` en `.env`
- [ ] ngrok funcionando (para desarrollo)
- [ ] Servidor ejecutándose en puerto 8000
- [ ] Base de datos con esquema actualizado
- [ ] Test de webhook ejecutado exitosamente

## 🎉 Resultado Final

Una vez configurado correctamente:

1. **Usuario se registra** en frontend
2. **Clerk dispara webhook** automáticamente
3. **Usuario aparece** en PostgreSQL inmediatamente
4. **Perfil completo** disponible para API calls
5. **Frontend funciona** sin errores de "user not found"

¡La sincronización automática está lista! 🚀