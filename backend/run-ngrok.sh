#!/bin/bash
echo "Iniciando ngrok..."
./ngrok http 8000 --log=stdout --log-level=info &
sleep 3
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep https | cut -d'"' -f4)
echo "URL publica: $NGROK_URL"
echo "Webhook URL: $NGROK_URL/api/auth/webhook"
echo "Panel ngrok: http://localhost:4040"