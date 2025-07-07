#!/bin/bash

echo "🚀 Starting Mundoctor Development Environment"
echo "============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "🐳 Starting PostgreSQL with Docker..."
docker-compose down > /dev/null 2>&1
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 15

echo "🔄 Running database migrations..."
cd backend
export LOG_DB_ERRORS=false
npm run migrate
if [ $? -ne 0 ]; then
    echo "❌ Migration failed. Checking PostgreSQL status..."
    docker-compose logs postgres --tail=20
    exit 1
fi
cd ..

echo "✅ Database ready!"
echo ""
echo "🎉 Setup complete! Now run these commands in separate terminals:"
echo ""
echo "Terminal 1 (Frontend):"
echo "npm run dev"
echo ""
echo "Terminal 2 (Backend):"
echo "cd backend && npm run dev"
echo ""
echo "📱 URLs:"
echo "- Frontend: http://localhost:5173"
echo "- Backend: http://localhost:8000"
echo "- Adminer: http://localhost:8080"