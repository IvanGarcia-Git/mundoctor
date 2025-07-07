# Guía de Configuración de Webhooks Clerk

## 📋 Resumen
Esta guía te ayudará a configurar los webhooks de Clerk para sincronizar automáticamente los usuarios con la base de datos PostgreSQL.

## 🚀 Paso 1: Acceder al Dashboard de Clerk

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com/)
2. Selecciona tu aplicación de proyecto
3. En el menú lateral, busca **"Webhooks"**

## ⚙️ Paso 2: Crear Nuevo Webhook

1. Haz clic en **"Add Endpoint"** o **"Create Webhook"**
2. Configura los siguientes datos:

### URL del Endpoint
```
https://tu-dominio.com/api/webhooks/clerk
```
**Para desarrollo local (con ngrok):**
```
https://abc123.ngrok-free.app/api/webhooks/clerk
```

### Eventos a Suscribir
Selecciona los siguientes eventos:

#### 📧 Eventos de Usuario (Obligatorios)
- ✅ `user.created` - Cuando se crea un nuevo usuario
- ✅ `user.updated` - Cuando se actualiza un usuario  
- ✅ `user.deleted` - Cuando se elimina un usuario

#### 📱 Eventos de Sesión (Opcionales)
- ⚡ `session.created` - Nueva sesión iniciada
- ⚡ `session.ended` - Sesión terminada
- ⚡ `session.removed` - Sesión removida
- ⚡ `session.revoked` - Sesión revocada

#### 📞 Eventos de Contacto (Opcionales)
- ⚡ `email.created` - Nuevo email añadido
- ⚡ `sms.created` - Nuevo SMS añadido

### Configuración de Seguridad
- **Método:** POST
- **Versión:** Usar la más reciente disponible
- **Rate Limiting:** Activado (recomendado)

## 🔐 Paso 3: Obtener el Secret del Webhook

1. Después de crear el webhook, Clerk te proporcionará un **Webhook Secret**
2. Copia este secret (empezará con `whsec_...`)
3. Actualiza tu archivo `.env` del backend:

```env
CLERK_WEBHOOK_SECRET=whsec_tu_secret_real_aqui
```

## 🌐 Paso 4: Configurar Ngrok (Para Desarrollo Local)

Si estás trabajando en desarrollo local, necesitarás exponer tu servidor:

### Instalar Ngrok
```bash
# Via npm
npm install -g ngrok

# O descargar desde https://ngrok.com/
```

### Exponer el Puerto del Backend
```bash
# Exponer puerto 8001 (donde corre nuestro backend)
ngrok http 8001
```

### Copiar la URL Pública
Ngrok te dará una URL como: `https://abc123.ngrok-free.app`

Usa esta URL en la configuración del webhook:
```
https://abc123.ngrok-free.app/api/webhooks/clerk
```

## 🧪 Paso 5: Probar el Webhook

### 1. Verificar Servidor Backend
```bash
# Asegúrate de que el backend esté corriendo
cd backend
npm run dev
```

### 2. Probar Endpoint de Health
```bash
curl http://localhost:8001/api/webhooks/health
```

Deberías ver:
```json
{
  "status": "healthy",
  "service": "webhooks",
  "timestamp": "2025-07-01T12:00:00.000Z"
}
```

### 3. Probar Webhook de Desarrollo (Opcional)
```bash
curl -X POST http://localhost:8001/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user.created",
    "data": {
      "id": "user_test123",
      "email_addresses": [{"email_address": "test@example.com"}],
      "first_name": "Usuario",
      "last_name": "Prueba"
    }
  }'
```

## ✅ Paso 6: Verificar Configuración

### Verificar Variables de Entorno
Asegúrate de que tu `backend/.env` contenga:
```env
CLERK_SECRET_KEY=sk_test_tu_secret_key
CLERK_WEBHOOK_SECRET=whsec_tu_webhook_secret
DB_HOST=localhost
DB_NAME=mundoctor
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432
```

### Verificar Funcionamiento
1. Crea un usuario de prueba en tu aplicación
2. Revisa los logs del backend para confirmar que el webhook se ejecutó
3. Verifica en la base de datos que el usuario se creó:

```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;
```

## 🔍 Logs de Webhooks en Clerk

En el Dashboard de Clerk:
1. Ve a la sección **"Webhooks"**
2. Haz clic en tu webhook configurado
3. Revisa la pestaña **"Logs"** para ver:
   - ✅ Requests exitosos (200)
   - ❌ Requests fallidos (400, 500)
   - 🔄 Reintentos automáticos

## 🚨 Solución de Problemas

### Error: "Missing svix headers"
- Verifica que el webhook esté configurado en Clerk Dashboard
- Asegúrate de que la URL del endpoint sea correcta

### Error: "Webhook verification failed"
- Verifica que `CLERK_WEBHOOK_SECRET` sea correcto
- Asegúrate de que no haya espacios extra en el .env

### Error: "Database connection failed"
- Verifica que PostgreSQL esté corriendo
- Ejecuta `docker compose up -d postgres`

### Error: "User already exists"
- Este es normal - el webhook detecta usuarios duplicados
- El sistema los omite automáticamente

## 📝 Siguiente Paso

Una vez configurados los webhooks, puedes continuar con la **FASE 3** del plan de migración: migrar el frontend para usar Clerk en lugar de localStorage.

## 🆘 URLs de Referencia

- [Documentación de Webhooks Clerk](https://clerk.com/docs/integrations/webhooks)
- [Ngrok Setup Guide](https://ngrok.com/docs/getting-started/)
- [SVIX Webhook Verification](https://docs.svix.com/receiving/verifying-payloads/how)