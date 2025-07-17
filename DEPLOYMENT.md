# MunDoctor Production Deployment Guide

## 🚀 Deployment Overview

This guide explains how to deploy the MunDoctor healthcare platform to production using Docker Compose with Traefik as a reverse proxy.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Domain `pre-mundoctor.garaywebs.com` pointing to your server
- Server with at least 2GB RAM and 20GB storage
- Firewall configured to allow ports 80 and 443

## 🏗️ Architecture

```
Internet
    ↓
Traefik (Port 80/443)
    ↓
┌─────────────────────┬─────────────────────┐
│   Frontend (Nginx)  │   Backend (Node.js) │
│   React + Vite      │   Express API       │
└─────────────────────┴─────────────────────┘
            ↓                    ↓
    ┌─────────────────────┬─────────────────────┐
    │   PostgreSQL        │      Redis          │
    │   Database          │      Cache          │
    └─────────────────────┴─────────────────────┘
```

## 🔧 Configuration

### 1. Environment Variables

Copy and configure the environment file:

```bash
cp .env.prod .env.prod.local
```

Edit `.env.prod.local` with your actual values:

```bash
# Database Configuration
DATABASE_URL=postgresql://mundoctor_user:secure_password@postgres:5432/mundoctor_prod
POSTGRES_USER=mundoctor_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=mundoctor_prod

# Redis Configuration
REDIS_PASSWORD=redis_secure_password

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Stripe Payment Processing
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 2. SSL Certificates

Traefik will automatically generate SSL certificates using Let's Encrypt. The certificates will be stored in the `./letsencrypt` directory.

### 3. Domain Configuration

The deployment configures the following domains:

- **Frontend**: `https://pre-mundoctor.garaywebs.com`
- **Backend API**: `https://api.pre-mundoctor.garaywebs.com`
- **Traefik Dashboard**: `https://traefik.pre-mundoctor.garaywebs.com`
- **Database Admin**: `https://db.pre-mundoctor.garaywebs.com`

## 🚀 Deployment Steps

### 1. Quick Deployment

```bash
# Clone the repository
git clone <repository-url>
cd mundoctor

# Configure environment variables
cp .env.prod .env.prod.local
# Edit .env.prod.local with your values

# Run deployment script
./deploy.sh
```

### 2. Manual Deployment

```bash
# Create external network
docker network create web

# Create necessary directories
mkdir -p letsencrypt traefik-logs backend/uploads

# Start services
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Verify Deployment

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl -f https://pre-mundoctor.garaywebs.com/health
curl -f https://api.pre-mundoctor.garaywebs.com/api/health
```

## 🔐 Security Features

### Traefik Security
- Automatic HTTPS with Let's Encrypt
- HTTP to HTTPS redirects
- Security headers (HSTS, CSP, etc.)
- Basic authentication for admin panels

### Application Security
- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

### Network Security
- Internal network isolation
- Database not exposed externally
- Firewall-ready configuration

## 📊 Monitoring & Maintenance

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Traefik access logs
tail -f traefik-logs/access.log
```

### Health Checks
```bash
# Frontend health
curl https://pre-mundoctor.garaywebs.com/health

# Backend health
curl https://api.pre-mundoctor.garaywebs.com/api/health
```

### Database Backup
```bash
# Create backup
docker exec mundoctor-postgres pg_dump -U mundoctor_user mundoctor_prod > backup.sql

# Restore backup
docker exec -i mundoctor-postgres psql -U mundoctor_user mundoctor_prod < backup.sql
```

### Updates
```bash
# Update and rebuild services
./deploy.sh

# Or manually
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🛠️ Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   - Check domain DNS configuration
   - Verify ports 80/443 are open
   - Check Let's Encrypt rate limits

2. **Service Not Starting**
   - Check environment variables
   - Verify Docker network exists
   - Check service logs

3. **Database Connection Issues**
   - Verify database credentials
   - Check PostgreSQL logs
   - Ensure database is running

### Debug Commands

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View specific service logs
docker-compose -f docker-compose.prod.yml logs backend

# Execute commands in container
docker-compose -f docker-compose.prod.yml exec backend sh

# Check network connectivity
docker network inspect web
```

## 📚 Service Details

### Frontend Service
- **Image**: Custom Nginx with React build
- **Port**: 80 (internal)
- **Health Check**: `/health` endpoint

### Backend Service
- **Image**: Custom Node.js application
- **Port**: 8000 (internal)
- **Health Check**: `/api/health` endpoint

### Database Service
- **Image**: PostgreSQL 15 Alpine
- **Port**: 5432 (internal only)
- **Persistence**: Docker volume

### Redis Service
- **Image**: Redis 7 Alpine
- **Port**: 6379 (internal only)
- **Persistence**: Docker volume

## 🔄 Backup Strategy

### Automated Backups
Create a backup script and schedule it with cron:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker exec mundoctor-postgres pg_dump -U mundoctor_user mundoctor_prod > "backup_${DATE}.sql"
gzip "backup_${DATE}.sql"
```

### File Backups
```bash
# Backup uploaded files
tar -czf uploads_backup.tar.gz backend/uploads/

# Backup SSL certificates
tar -czf ssl_backup.tar.gz letsencrypt/
```

## 🚨 Emergency Procedures

### Rolling Back
```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Use previous image version
docker-compose -f docker-compose.prod.yml up -d
```

### Emergency Shutdown
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove everything
docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans
```

## 📞 Support

For deployment issues:
1. Check the logs first
2. Verify environment configuration
3. Ensure all required services are running
4. Check domain DNS configuration

---

**Remember**: Always test in a staging environment before deploying to production!