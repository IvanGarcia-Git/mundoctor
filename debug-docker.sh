#!/bin/bash

# Script de diagnóstico para Docker Compose en producción
# Autor: Claude AI para MunDoctor

echo "🔍 Diagnóstico Docker Compose - MunDoctor"
echo "========================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar estado
show_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

# Verificar Docker
echo -e "\n${YELLOW}🐳 Verificando Docker...${NC}"
docker --version
show_status "Docker instalado"

docker-compose --version 2>/dev/null || docker compose version
show_status "Docker Compose instalado"

# Verificar archivos necesarios
echo -e "\n${YELLOW}📁 Verificando archivos necesarios...${NC}"
[ -f "docker-compose.prod.yml" ] && echo -e "${GREEN}✅ docker-compose.prod.yml existe${NC}" || echo -e "${RED}❌ docker-compose.prod.yml no existe${NC}"
[ -f "Dockerfile" ] && echo -e "${GREEN}✅ Dockerfile (frontend) existe${NC}" || echo -e "${RED}❌ Dockerfile (frontend) no existe${NC}"
[ -f "backend/Dockerfile" ] && echo -e "${GREEN}✅ backend/Dockerfile existe${NC}" || echo -e "${RED}❌ backend/Dockerfile no existe${NC}"
[ -f "nginx.conf" ] && echo -e "${GREEN}✅ nginx.conf existe${NC}" || echo -e "${RED}❌ nginx.conf no existe${NC}"

# Verificar directorios
echo -e "\n${YELLOW}📂 Verificando directorios...${NC}"
[ -d "backend" ] && echo -e "${GREEN}✅ Directorio backend existe${NC}" || echo -e "${RED}❌ Directorio backend no existe${NC}"
[ -d "src" ] && echo -e "${GREEN}✅ Directorio src existe${NC}" || echo -e "${RED}❌ Directorio src no existe${NC}"
[ -d "backend/migrations-consolidated" ] && echo -e "${GREEN}✅ Directorio migrations-consolidated existe${NC}" || echo -e "${RED}❌ Directorio migrations-consolidated no existe${NC}"

# Crear directorios necesarios
echo -e "\n${YELLOW}🛠️ Creando directorios necesarios...${NC}"
mkdir -p letsencrypt
mkdir -p traefik-logs
mkdir -p backend/uploads
echo -e "${GREEN}✅ Directorios creados${NC}"

# Verificar variables de entorno
echo -e "\n${YELLOW}🔐 Verificando variables de entorno...${NC}"
if [ -f ".env.prod" ]; then
    echo -e "${GREEN}✅ Archivo .env.prod existe${NC}"
    echo "Variables encontradas:"
    grep -E "^[A-Z_]+=" .env.prod | head -10
else
    echo -e "${RED}❌ Archivo .env.prod no existe${NC}"
    echo "Creando archivo .env.prod básico..."
    cat > .env.prod << EOF
# Variables básicas para desarrollo
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mundoctor
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mundoctor
REDIS_PASSWORD=defaultredispassword
VITE_CLERK_PUBLISHABLE_KEY=pk_test_c2FjcmVkLXBhcnJvdC03Mi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_NxM4E97lcL0aSnq0ffLQ7zZjf36215bFhvPYN7OkHG
EOF
    echo -e "${GREEN}✅ Archivo .env.prod creado con valores básicos${NC}"
fi

# Verificar redes Docker
echo -e "\n${YELLOW}🌐 Verificando redes Docker...${NC}"
docker network ls | grep app-network
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Red app-network existe${NC}"
else
    echo -e "${YELLOW}⚠️ Red app-network no existe, se creará automáticamente${NC}"
fi

# Verificar servicios en ejecución
echo -e "\n${YELLOW}🚀 Verificando servicios en ejecución...${NC}"
docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "No hay servicios ejecutándose"

# Verificar logs recientes
echo -e "\n${YELLOW}📋 Logs recientes de servicios...${NC}"
echo "Traefik:"
docker logs traefik --tail 5 2>/dev/null || echo "Traefik no está ejecutándose"
echo ""
echo "Frontend:"
docker logs mundoctor-frontend --tail 5 2>/dev/null || echo "Frontend no está ejecutándose"
echo ""
echo "Backend:"
docker logs mundoctor-backend --tail 5 2>/dev/null || echo "Backend no está ejecutándose"
echo ""
echo "PostgreSQL:"
docker logs mundoctor-postgres --tail 5 2>/dev/null || echo "PostgreSQL no está ejecutándose"

# Verificar puertos
echo -e "\n${YELLOW}🔌 Verificando puertos...${NC}"
netstat -tlnp | grep -E ":(80|443|8000|5432)" || echo "No se encontraron puertos ocupados"

# Verificar espacio en disco
echo -e "\n${YELLOW}💾 Verificando espacio en disco...${NC}"
df -h . | tail -1

# Verificar permisos
echo -e "\n${YELLOW}🔒 Verificando permisos...${NC}"
ls -la letsencrypt/ 2>/dev/null || echo "Directorio letsencrypt no existe"
ls -la traefik-logs/ 2>/dev/null || echo "Directorio traefik-logs no existe"

# Sugerencias
echo -e "\n${YELLOW}💡 Sugerencias para resolver problemas:${NC}"
echo "1. Revisar logs específicos: docker-compose -f docker-compose.prod.yml logs [servicio]"
echo "2. Reconstruir servicios: docker-compose -f docker-compose.prod.yml up --build -d"
echo "3. Verificar conectividad: docker-compose -f docker-compose.prod.yml exec backend ping postgres"
echo "4. Limpiar containers: docker-compose -f docker-compose.prod.yml down && docker system prune"
echo "5. Verificar variables de entorno: docker-compose -f docker-compose.prod.yml config"

echo -e "\n${GREEN}🎉 Diagnóstico completado${NC}"