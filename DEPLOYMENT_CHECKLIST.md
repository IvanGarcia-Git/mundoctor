# 📋 MunDoctor Deployment Checklist - todostore.es

## 🎯 Pre-Deployment Checklist

### ✅ **Completed Tasks**
- [x] Domain updated to todostore.es
- [x] Docker Compose configuration updated
- [x] Traefik configuration updated
- [x] Environment variables configured
- [x] Production environment file created
- [x] Directory structure created
- [x] Scripts created and made executable
- [x] ACME file created with proper permissions
- [x] Backup and update scripts configured
- [x] Deployment plan documentation updated

### 🔧 **VPS Setup Requirements**
- [ ] VPS with Ubuntu 22.04 LTS
- [ ] Docker and Docker Compose installed
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] SSH key authentication set up
- [ ] Minimum 10GB disk space available

### 🌐 **DNS Configuration**
- [ ] **Main domain**: todostore.es → VPS_IP
- [ ] **API subdomain**: api.todostore.es → VPS_IP
- [ ] **Database admin**: db.todostore.es → VPS_IP
- [ ] **Traefik dashboard**: traefik.todostore.es → VPS_IP
- [ ] DNS propagation verified

### 🔐 **Security Setup**
- [ ] Replace default passwords in `.env.production`
- [ ] Update Clerk production keys
- [ ] Update Stripe production keys
- [ ] Configure SMTP email settings
- [ ] Configure Twilio SMS settings
- [ ] Set up Sentry error tracking (optional)

### 📧 **Third-Party Services**
- [ ] **Clerk**: Production keys configured
- [ ] **Stripe**: Production keys configured
- [ ] **Email SMTP**: Gmail app password or other provider
- [ ] **Twilio**: SMS service configured
- [ ] **Domain**: DNS properly configured

## 🚀 **Deployment Steps**

### 1. **VPS Preparation**
```bash
# Connect to VPS
ssh root@YOUR_VPS_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo apt-get install docker-compose-plugin -y

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2. **Project Upload**
```bash
# Create project directory
mkdir -p /opt/mundoctor
cd /opt/mundoctor

# Upload project files (use scp, rsync, or git)
# Option 1: Using git
git clone https://github.com/your-repo/mundoctor.git .

# Option 2: Using scp
scp -r ./mundoctor/* root@YOUR_VPS_IP:/opt/mundoctor/

# Set proper ownership
chown -R $USER:$USER /opt/mundoctor
```

### 3. **Environment Configuration**
```bash
# Copy production environment
cp .env.production .env

# Edit with your actual values
nano .env

# Verify configuration
docker compose config --quiet
```

### 4. **Quick Deployment**
```bash
# Make scripts executable
chmod +x deployment/scripts/*.sh

# Run deployment script
./deployment/scripts/deploy.sh
```

### 5. **Manual Deployment** (Alternative)
```bash
# Pull and build images
docker compose pull
docker compose build --no-cache

# Deploy infrastructure
docker compose up -d traefik postgres redis

# Wait for databases to be ready
sleep 30

# Deploy application
docker compose up -d backend frontend adminer

# Check status
docker compose ps
```

### 6. **Post-Deployment Verification**
```bash
# Check all services are running
docker compose ps

# Verify health endpoints
curl -I https://todostore.es
curl -I https://api.todostore.es/health
curl -I https://traefik.todostore.es
curl -I https://db.todostore.es

# Check SSL certificates
openssl s_client -connect todostore.es:443 -servername todostore.es
```

## 🧪 **Testing Checklist**

### ✅ **Functional Tests**
- [ ] Main website loads (https://todostore.es)
- [ ] API health endpoint responds (https://api.todostore.es/health)
- [ ] Traefik dashboard accessible (https://traefik.todostore.es)
- [ ] Database admin accessible (https://db.todostore.es)
- [ ] SSL certificates valid for all domains
- [ ] HTTP redirects to HTTPS automatically

### ✅ **Security Tests**
- [ ] All endpoints use HTTPS
- [ ] Database not accessible from outside
- [ ] Firewall blocking unnecessary ports
- [ ] Basic auth on sensitive endpoints
- [ ] CORS configured correctly

### ✅ **Performance Tests**
- [ ] Page load times acceptable
- [ ] API response times acceptable
- [ ] Database queries optimized
- [ ] Redis cache working

## 🔄 **Maintenance Tasks**

### ✅ **Daily Tasks**
- [ ] Check service health
- [ ] Review logs for errors
- [ ] Monitor disk space
- [ ] Verify backup completion

### ✅ **Weekly Tasks**
- [ ] Update system packages
- [ ] Check SSL certificate expiry
- [ ] Review performance metrics
- [ ] Test backup restoration

### ✅ **Monthly Tasks**
- [ ] Update Docker images
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Performance optimization

## 📊 **Monitoring & Alerts**

### ✅ **Health Checks**
- [ ] Automated health checks configured
- [ ] Uptime monitoring set up
- [ ] SSL certificate monitoring
- [ ] Database performance monitoring

### ✅ **Log Management**
- [ ] Log rotation configured
- [ ] Error logs monitored
- [ ] Access logs analyzed
- [ ] Security logs reviewed

### ✅ **Backup Strategy**
- [ ] Daily automated backups
- [ ] Backup verification
- [ ] Offsite backup storage
- [ ] Disaster recovery plan

## 📞 **Support & Documentation**

### ✅ **Documentation**
- [ ] Deployment documentation updated
- [ ] User manuals created
- [ ] API documentation published
- [ ] Troubleshooting guide available

### ✅ **Team Training**
- [ ] Deployment process documented
- [ ] Team trained on maintenance
- [ ] Emergency procedures defined
- [ ] Contact information updated

## 🚨 **Troubleshooting**

### Common Issues
1. **Certificate generation fails**
   - Check DNS propagation
   - Verify firewall settings
   - Review Traefik logs

2. **Services not starting**
   - Check Docker daemon
   - Verify environment variables
   - Review service logs

3. **Database connection issues**
   - Check database container
   - Verify connection string
   - Check network configuration

### Emergency Contacts
- **System Administrator**: [Your Contact]
- **Developer Team**: [Team Contact]
- **Hosting Provider**: [Hostinger Support]
- **Domain Provider**: [DonDominio Support]

---

## 🎉 **Go-Live Checklist**

### ✅ **Final Pre-Launch**
- [ ] All tests passed
- [ ] Team notification sent
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] Backup verified

### ✅ **Launch Day**
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Verify all functionality
- [ ] Send launch notification
- [ ] Update status page

### ✅ **Post-Launch**
- [ ] Monitor for 24 hours
- [ ] Address any issues
- [ ] Performance optimization
- [ ] User feedback collection
- [ ] Success celebration! 🎊

---

**Project**: MunDoctor Healthcare Platform  
**Domain**: todostore.es  
**Environment**: Production  
**Date**: $(date)  

*This checklist ensures a smooth and secure deployment of the MunDoctor healthcare platform.*