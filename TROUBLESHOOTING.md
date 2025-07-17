# Troubleshooting Docker Compose - MunDoctor

## 🚨 Problema: Solo se inicia Traefik

### Síntomas
- `docker-compose up` solo muestra Traefik ejecutándose
- Los demás servicios no se inician o fallan silenciosamente

### Soluciones

#### 1. Ejecutar diagnóstico
```bash
./debug-docker.sh
```

#### 2. Verificar logs específicos
```bash
# Ver logs de todos los servicios
docker-compose -f docker-compose.prod.yml logs

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs postgres
```

#### 3. Verificar estado de servicios
```bash
# Ver estado actual
docker-compose -f docker-compose.prod.yml ps

# Ver servicios que fallaron
docker-compose -f docker-compose.prod.yml ps -a
```

#### 4. Probar configuración simplificada
```bash
# Usar configuración sin SSL/Traefik complejo
docker-compose -f docker-compose.simple.yml up -d

# Si funciona, el problema está en la configuración de Traefik
```

#### 5. Verificar Dockerfiles
```bash
# Construir manualmente para ver errores
docker build -t mundoctor-frontend .
docker build -t mundoctor-backend ./backend
```

#### 6. Limpiar y reconstruir
```bash
# Limpiar containers y volúmenes
docker-compose -f docker-compose.prod.yml down -v
docker system prune -f

# Reconstruir sin cache
docker-compose -f docker-compose.prod.yml up --build --no-cache
```

## 🔧 Problemas Comunes

### Error: "network app-network not found"
```bash
# Crear la red manualmente
docker network create app-network
```

### Error: "build context not found"
```bash
# Verificar que los Dockerfiles existen
ls -la Dockerfile backend/Dockerfile

# Si no existen, usar versiones de desarrollo
cp Dockerfile.dev Dockerfile
cp backend/Dockerfile.dev backend/Dockerfile
```

### Error: Variables de entorno no definidas
```bash
# Crear archivo .env.prod
cp .env.prod.example .env.prod

# O usar valores por defecto
export DATABASE_URL="postgresql://postgres:postgres@postgres:5432/mundoctor"
export POSTGRES_USER="postgres"
export POSTGRES_PASSWORD="postgres"
export POSTGRES_DB="mundoctor"
```

### Error: Puerto ya en uso
```bash
# Ver qué proceso usa el puerto
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# Parar servicios que usen los puertos
sudo systemctl stop nginx
sudo systemctl stop apache2
```

### Error: Permisos en directorios
```bash
# Crear y dar permisos a directorios
mkdir -p letsencrypt traefik-logs backend/uploads
chmod 755 letsencrypt traefik-logs backend/uploads
```

## 🐛 Debugging Avanzado

### Verificar conectividad entre containers
```bash
# Ejecutar comando dentro del container
docker-compose -f docker-compose.prod.yml exec backend ping postgres
docker-compose -f docker-compose.prod.yml exec backend nslookup postgres
```

### Verificar variables de entorno
```bash
# Ver configuración final
docker-compose -f docker-compose.prod.yml config

# Ver variables en un container
docker-compose -f docker-compose.prod.yml exec backend env
```

### Verificar construcción de imágenes
```bash
# Ver imágenes construidas
docker images | grep mundoctor

# Reconstruir imagen específica
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml build backend
```

## 📋 Checklist de Verificación

- [ ] Docker y Docker Compose instalados
- [ ] Archivos Dockerfile existen
- [ ] Directorio backend/ existe
- [ ] Archivo nginx.conf existe
- [ ] Red app-network creada
- [ ] Variables de entorno configuradas
- [ ] Puertos 80 y 443 libres
- [ ] Permisos correctos en directorios
- [ ] Suficiente espacio en disco

## 🚀 Comandos Útiles

```bash
# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Ejecutar comando en container
docker-compose -f docker-compose.prod.yml exec backend bash

# Verificar salud de servicios
docker-compose -f docker-compose.prod.yml exec backend curl http://localhost:8000/api/health

# Limpiar todo y empezar de nuevo
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a
docker volume prune
```

## 📞 Soporte Adicional

Si los problemas persisten:

1. Ejecutar `./debug-docker.sh` y compartir el output
2. Verificar logs específicos con `docker-compose logs [servicio]`
3. Probar configuración simplificada con `docker-compose.simple.yml`
4. Verificar que el dominio apunte correctamente al servidor