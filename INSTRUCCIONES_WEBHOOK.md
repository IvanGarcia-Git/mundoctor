# 🚀 Instrucciones para Completar Configuración de Webhooks

## Estado Actual:
✅ Servidor backend ejecutándose en puerto 8001  
✅ Endpoint `/api/webhooks/clerk` funcionando  
✅ Base de datos PostgreSQL conectada  

## Próximos Pasos:

### 1. Configurar ngrok
```bash
# 1. Ve a: https://dashboard.ngrok.com/signup
# 2. Crea cuenta gratuita
# 3. Obtén authtoken desde: https://dashboard.ngrok.com/get-started/your-authtoken
# 4. Ejecuta:
npx ngrok config add-authtoken TU_AUTHTOKEN_AQUI
npx ngrok http 8001

# 5. Copia la URL que te da (ej: https://abc123.ngrok-free.app)
```

### 2. Configurar en Clerk Dashboard
```
1. Ve a: https://dashboard.clerk.com/
2. Selecciona tu proyecto
3. Menú lateral → "Webhooks"
4. "Add Endpoint" o "Create Webhook"
5. URL: https://TU-URL-DE-NGROK.ngrok-free.app/api/webhooks/clerk
6. Eventos: user.created, user.updated, user.deleted
7. Copia el "Webhook Secret" (empieza con whsec_...)
```

### 3. Actualizar variables de entorno
Una vez tengas el webhook secret, reemplaza en `backend/.env`:
```env
CLERK_WEBHOOK_SECRET=whsec_tu_secret_real_aqui
```

### 4. Probar configuración
```bash
# Reiniciar servidor backend
# En Clerk Dashboard → Test webhook
# Verificar logs en terminal
```

## Datos de tu configuración actual:
- **Backend:** http://localhost:8001
- **Webhook endpoint:** /api/webhooks/clerk
- **Health check:** ✅ Funcionando
- **Clerk Secret Key:** ✅ Configurado
- **Base de datos:** ✅ Conectada

## Siguiente fase:
Una vez configurados los webhooks, continuaremos con **FASE 3**: Migrar frontend de localStorage a Clerk hooks.