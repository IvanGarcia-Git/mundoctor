# 🚨 Docker Troubleshooting Guide

## Quick Fix Commands

### 1. Verify Docker is Running
```bash
docker --version
docker-compose --version
docker info
```

### 2. Reset and Start PostgreSQL
```bash
# Stop everything
docker-compose down

# Remove old volumes (optional - will delete data)
docker-compose down -v

# Start only PostgreSQL
docker-compose up -d postgres

# Check if it's running
docker-compose ps
```

### 3. Check PostgreSQL Logs
```bash
# View logs
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f postgres
```

### 4. Test Database Connection
```bash
# Wait for PostgreSQL to start (15-30 seconds)
sleep 15

# Test connection manually
docker exec -it mundoctor-postgres-1 psql -U postgres -d mundoctor -c "SELECT NOW();"
```

### 5. Run Migrations
```bash
cd backend
npm run migrate
```

## Common Issues

### Issue 1: "ECONNREFUSED 127.0.0.1:5432"
**Solution:**
```bash
docker-compose up -d postgres
sleep 15
cd backend && npm run migrate
```

### Issue 2: "No such container"
**Solution:**
```bash
docker-compose down
docker-compose up -d postgres
```

### Issue 3: "Port already in use"
**Solution:**
```bash
# Find what's using port 5432
sudo lsof -ti:5432

# Kill the process
sudo lsof -ti:5432 | xargs kill -9

# Or use different port in docker-compose.yml
```

### Issue 4: Permission Denied
**Solution:**
```bash
# Fix Docker permissions
sudo chown -R $USER:$USER .
```

## PostgreSQL Commands

### Connect to Database
```bash
# Using Docker
docker exec -it mundoctor-postgres-1 psql -U postgres -d mundoctor

# Direct connection (if PostgreSQL is running)
psql -h localhost -U postgres -d mundoctor
```

### Check Tables
```sql
-- List all tables
\dt

-- Check users table
SELECT * FROM users LIMIT 5;

-- Check specialties
SELECT * FROM specialties;
```

## Alternative: Local PostgreSQL

If Docker continues to fail, install PostgreSQL locally:

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb mundoctor
```

### Update backend/.env
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mundoctor
DB_USER=postgres
DB_PASSWORD=your_password
```

## Need Help?

1. Check PostgreSQL is running: `docker-compose ps`
2. View logs: `docker-compose logs postgres`
3. Try the automated script: `./start-dev.sh`
4. Reset everything: `docker-compose down -v && docker-compose up -d postgres`