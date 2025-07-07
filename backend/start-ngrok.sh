#!/bin/bash

# Script para iniciar ngrok en segundo plano
echo "🚀 Iniciando ngrok para exponer puerto 8000..."

# Matar cualquier proceso ngrok existente
pkill -f ngrok

# Iniciar ngrok en segundo plano
./ngrok http 8000 --log=stdout --log-level=info &

# Esperar un poco para que ngrok se inicie
sleep 3

# Obtener la URL pública
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep https | cut -d'"' -f4)

if [ -n "$NGROK_URL" ]; then
    echo "✅ Ngrok iniciado exitosamente!"
    echo "🌐 URL pública: $NGROK_URL"
    echo "🔗 Webhook URL: $NGROK_URL/api/auth/webhook"
    echo ""
    echo "📋 Configuración para Clerk Dashboard:"
    echo "   1. Ve a clerk.com → Tu proyecto → Webhooks"
    echo "   2. Añade endpoint: $NGROK_URL/api/auth/webhook"
    echo "   3. Eventos: user.created, user.updated, user.deleted"
    echo "   4. Verifica el webhook secret en .env"
    echo ""
    echo "🎯 Panel de ngrok: http://localhost:4040"
    echo "💡 Para detener ngrok: pkill -f ngrok"
else
    echo "❌ Error: No se pudo obtener la URL de ngrok"
    echo "🔍 Verifica que ngrok esté funcionando: curl http://localhost:4040"
fi