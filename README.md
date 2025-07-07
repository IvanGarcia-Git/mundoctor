# Mundoctor - Healthcare Platform

Healthcare platform with role-based authentication, appointment management, and professional services.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Clerk account with API keys

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Setup

Ensure these files exist with your Clerk keys:

**Frontend `.env`:**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_c2FjcmVkLXBhcnJvdC03Mi5jbGVyay5hY2NvdW50cy5kZXYk
VITE_API_URL=http://localhost:8000/api
```

**Backend `backend/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mundoctor
DB_USER=postgres
DB_PASSWORD=postgres
CLERK_SECRET_KEY=sk_test_NxM4E97lcL0aSnq0ffLQ7zZjf36215bFhvPYN7OkHG
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Start Database

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Wait a few seconds for DB to be ready, then run migrations
cd backend
npm run migrate
cd ..
```

### 4. Start Development Servers

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

### 5. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Health Check**: http://localhost:8000/health

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + TailwindCSS + Clerk Auth
- **Backend**: Node.js + Express + PostgreSQL + Clerk Webhooks
- **Database**: PostgreSQL with comprehensive healthcare schema
- **Authentication**: Clerk OAuth (Google, Facebook, Email)
- **UI Components**: Radix UI + shadcn/ui

### User Roles
- **Patient**: Book appointments, manage profile, reviews
- **Professional**: Manage appointments, patients, schedule, analytics
- **Admin**: User management, validation, support tickets

## 🗄️ Database Schema

Key tables:
- `users` - Core user data synced from Clerk
- `patients` - Patient-specific information
- `professionals` - Healthcare professional profiles
- `appointments` - Appointment management
- `ratings` - Reviews and ratings
- `specialties` - Medical specialties

## 🔐 Authentication Flow

1. **User Registration**: Clerk handles OAuth/email signup
2. **Webhook Sync**: User data automatically synced to PostgreSQL
3. **Role Assignment**: Users choose role (patient/professional)
4. **Profile Completion**: Role-specific onboarding flow
5. **Authorization**: Role-based access control throughout app

## 📱 Key Features

### For Patients
- Search and filter healthcare professionals
- Book and manage appointments
- Rate and review professionals
- Medical history management

### For Professionals
- Comprehensive dashboard with analytics
- Appointment and patient management
- Schedule configuration
- Service and pricing management
- Review management

### For Admins
- User management and validation
- Professional verification
- Support ticket system
- Platform analytics

## 🛠️ Development

### Available Scripts

**Frontend:**
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

**Backend:**
- `npm run dev` - Development server with nodemon
- `npm run start` - Production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with initial data

### Docker Services

```bash
# Start all services
docker-compose up

# Start specific services
docker-compose up -d postgres
docker-compose up -d adminer

# View logs
docker-compose logs -f
```

## 🔧 Configuration

### Clerk Dashboard Setup
1. Create Clerk application
2. Configure OAuth providers (Google, Facebook)
3. Set webhook URL: `http://localhost:8000/api/auth/webhook`
4. Add user metadata fields for roles

### Database Connection
The app connects to PostgreSQL using environment variables. Docker Compose sets up a local PostgreSQL instance automatically.

## 📦 Project Structure

```
mundoctor/
├── src/                    # Frontend React app
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components by role
│   ├── contexts/          # React contexts (deprecated)
│   └── lib/               # Utilities and helpers
├── backend/               # Node.js API server
│   ├── src/
│   │   ├── config/        # Database and app config
│   │   ├── routes/        # API route handlers
│   │   ├── middleware/    # Auth and validation middleware
│   │   └── scripts/       # Migration and seed scripts
│   └── migrations/        # SQL migration files
└── docker-compose.yml     # Development environment
```

## 🚨 Troubleshooting

### Common Issues

**1. Dependencies Installation:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**2. Database Connection:**
```bash
# Restart PostgreSQL container
docker-compose restart postgres

# Check container status
docker-compose ps
```

**3. Clerk Authentication:**
- Verify API keys in environment files
- Check Clerk dashboard webhook configuration
- Ensure webhook URL is accessible

**4. Port Conflicts:**
```bash
# Kill processes on ports 5173, 8000, 5432
sudo lsof -ti:5173 | xargs kill -9
sudo lsof -ti:8000 | xargs kill -9
```

## 📄 License

MIT License - see LICENSE file for details.