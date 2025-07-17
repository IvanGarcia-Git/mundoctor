#!/bin/bash

# MunDoctor Production Deployment Script
# This script deploys the MunDoctor application to production using Docker Compose and Traefik

set -e

echo "🚀 Starting MunDoctor Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Please do not run this script as root${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p letsencrypt
mkdir -p traefik-logs
mkdir -p backend/uploads

# Set proper permissions
chmod 600 letsencrypt 2>/dev/null || true
chmod 755 traefik-logs
chmod 755 backend/uploads

# Create network if it doesn't exist
echo -e "${YELLOW}🌐 Creating network 'app-network'...${NC}"
docker network create app-network 2>/dev/null || echo "Network 'app-network' already exists"

# Load environment variables
if [ -f .env.prod ]; then
    set -a
    source .env.prod
    set +a
    echo -e "${GREEN}✅ Variables de entorno cargadas desde .env.prod${NC}"
else
    echo -e "${YELLOW}⚠️ Archivo .env.prod no encontrado, usando valores por defecto${NC}"
    export DATABASE_URL="postgresql://postgres:postgres@postgres:5432/mundoctor"
    export POSTGRES_USER="postgres"
    export POSTGRES_PASSWORD="postgres"
    export POSTGRES_DB="mundoctor"
    export REDIS_PASSWORD="defaultredispassword"
    export VITE_CLERK_PUBLISHABLE_KEY="pk_test_c2FjcmVkLXBhcnJvdC03Mi5jbGVyay5hY2NvdW50cy5kZXYk"
    export CLERK_SECRET_KEY="sk_test_NxM4E97lcL0aSnq0ffLQ7zZjf36215bFhvPYN7OkHG"
fi

# Validate required environment variables
required_vars=(
    "DATABASE_URL"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
)

echo -e "${YELLOW}🔍 Validando variables de entorno...${NC}"
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Variable de entorno requerida $var no está configurada${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ $var configurada${NC}"
    fi
done

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Pull latest images
echo -e "${YELLOW}📦 Pulling latest images...${NC}"
docker-compose -f docker-compose.prod.yml pull

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 30

# Check if services are running
echo -e "${YELLOW}🔍 Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Test connectivity
echo -e "${YELLOW}🧪 Testing connectivity...${NC}"
if curl -f -s https://pre-mundoctor.garaywebs.com/health > /dev/null; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

if curl -f -s https://api.pre-mundoctor.garaywebs.com/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Display useful information
echo -e "\n${GREEN}🎉 Deployment completed!${NC}"
echo -e "\n${YELLOW}📋 Service URLs:${NC}"
echo -e "Frontend: https://pre-mundoctor.garaywebs.com"
echo -e "Backend API: https://api.pre-mundoctor.garaywebs.com"
echo -e "Traefik Dashboard: https://traefik.pre-mundoctor.garaywebs.com"
echo -e "Database Admin: https://db.pre-mundoctor.garaywebs.com"
echo -e "\n${YELLOW}🔧 Useful commands:${NC}"
echo -e "View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo -e "Stop services: docker-compose -f docker-compose.prod.yml down"
echo -e "Update services: ./deploy.sh"
echo -e "\n${YELLOW}📚 Default credentials:${NC}"
echo -e "Traefik Dashboard: admin / admin123"
echo -e "Database Admin: admin / admin123"
echo -e "\n${RED}⚠️  Remember to change default passwords!${NC}"

echo -e "\n${GREEN}✅ Deployment script completed successfully!${NC}"