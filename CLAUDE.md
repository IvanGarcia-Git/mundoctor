# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- `npm run dev` - Start development server with Vite
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally

**Note:** No linting or testing commands are configured in package.json

## Project Architecture

This is a React healthcare platform called "Mundoctor" built with Vite, featuring role-based authentication and multi-user dashboards.

### Tech Stack
- **Frontend:** React 18 + Vite + TailwindCSS
- **UI Components:** Radix UI primitives with custom styling
- **Backend:** Supabase (database and auth)
- **Routing:** React Router v6 with protected routes
- **Maps:** Leaflet for location services
- **Charts:** Recharts for analytics
- **Animations:** Framer Motion

### Application Structure

**Main Entry Points:**
- `src/main.jsx` - Application bootstrap
- `src/App.jsx` - Root component with providers
- `src/AppRouter.jsx` - Router setup with Layout
- `src/AppRoutes.jsx` - Route definitions and protection logic

**User Roles & Dashboards:**
- **Admin:** User management, subscriptions, validation, support tickets
- **Professional:** Appointments, patients, analytics, services, schedule management
- **Patient:** Appointments, profile, reviews

**Key Architecture Patterns:**

1. **Authentication:** Context-based auth using localStorage for persistence (`src/contexts/AuthContext.jsx`)
2. **Route Protection:** `ProtectedRoute` component with role-based access control
3. **Layout System:** Authenticated vs public layouts with role-specific sidebars
4. **Component Organization:** Feature-based folder structure (admin/, professional/, patient/)

### Important Files

**Core Configuration:**
- `src/lib/supabase.js` - Supabase client configuration
- `vite.config.js` - Includes custom error handling and path aliases (@/ → src/)
- `tailwind.config.js` - Custom design system with CSS variables

**Data & State:**
- `src/contexts/AuthContext.jsx` - Authentication state management
- `src/data/` - Static data files for professionals, appointments
- `src/lib/api.js` - API utilities

**Key Components:**
- `src/components/layout/` - Layout system and navigation
- `src/components/ui/` - Reusable UI primitives (shadcn/ui style)
- `src/pages/` - Page components organized by user role

### Development Notes

- Uses `@/` alias for src/ imports (configured in vite.config.js)
- Mix of .jsx and .tsx files (migrating to TypeScript)
- Supabase credentials are currently hardcoded (not environment variables)
- Authentication uses localStorage instead of Supabase auth
- Custom Vite configuration for error handling and CORS