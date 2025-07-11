# MunDoctor Healthcare Platform - AI Assistant Guidelines

## 🏥 Project Overview
**MunDoctor** is a comprehensive healthcare platform that connects patients with healthcare professionals. The application includes:
- **Frontend**: React.js + Vite with TypeScript support
- **Backend**: Node.js + Express API with PostgreSQL database
- **Authentication**: Clerk for secure user management
- **Real-time Features**: WebSocket notifications, live appointment updates
- **Payment Processing**: Stripe integration for subscriptions and payments
- **Compliance**: HIPAA-compliant architecture for handling protected health information (PHI)

## 🔄 Project Awareness & Context
- **Always understand the healthcare context** - this is a medical platform handling sensitive patient data
- **HIPAA Compliance is mandatory** - all code must maintain privacy and security standards
- **Multi-role system**: Patients, Healthcare Professionals, and Administrators with different permissions
- **Real-time requirements**: Appointments, notifications, and updates must be handled in real-time
- **Security-first approach**: All features must implement proper authentication and authorization

## 🏗️ Application Architecture

### Frontend Structure (`/src`)
- **Pages**: Role-based dashboards (Patient, Professional, Admin)
- **Components**: Reusable UI components with healthcare-specific features
- **Hooks**: Custom React hooks for authentication and data management
- **Services**: API communication and business logic
- **Types**: TypeScript definitions for healthcare entities

### Backend Structure (`/backend/src`)
- **Routes**: RESTful API endpoints organized by feature
- **Services**: Business logic for healthcare operations
- **Models**: Database schemas for medical entities
- **Middleware**: Authentication, authorization, and security
- **Controllers**: Request handling and response formatting

### Database Schema (PostgreSQL)
- **Users**: Main user table with Clerk integration
- **Patient/Professional Profiles**: Role-specific health information
- **Appointments**: Complete appointment management system
- **Validations**: Professional credential verification
- **Audit Logs**: HIPAA-compliant activity tracking

## 🔐 Security & Compliance Requirements

### Authentication (Clerk Integration)
- **All routes must be protected** with Clerk authentication
- **Role-based access control** (RBAC) for different user types
- **JWT tokens** for API authentication
- **Webhook integration** for real-time user synchronization

### Data Protection
- **Encrypt sensitive data** at rest and in transit
- **Audit logging** for all data access and modifications
- **Input validation** using Zod schemas
- **Rate limiting** to prevent abuse

### Healthcare Compliance
- **No logging of PHI** in application logs
- **Secure file upload** for medical documents
- **Data retention policies** for patient records
- **Professional verification** system for healthcare providers

## 🧱 Code Structure & Standards

### File Organization
- **Never create files longer than 500 lines** - refactor into modules
- **Feature-based structure** - group related functionality together
- **Clear naming conventions** - use descriptive names for healthcare context
- **Consistent imports** - prefer relative imports within packages

### Backend Development
- **Use Node.js 20** with ES modules
- **Express.js** for API routes with middleware
- **PostgreSQL** with connection pooling
- **Environment variables** for configuration
- **Comprehensive error handling** with proper HTTP status codes

### Frontend Development
- **React 18** with modern hooks and functional components
- **TypeScript** for type safety
- **Tailwind CSS** for consistent styling
- **Radix UI** components for accessibility
- **React Router** for navigation

## 🧪 Testing & Quality Assurance

### Testing Requirements
- **Unit tests** for all new business logic
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Security testing** for authentication and authorization

### Code Quality
- **ESLint** for code linting
- **Prettier** for code formatting
- **Type checking** with TypeScript
- **Security scanning** for vulnerabilities

## 📋 Healthcare-Specific Features

### Patient Management
- **Patient profiles** with medical history
- **Appointment booking** and management
- **Prescription tracking** and medication management
- **Emergency contacts** and insurance information

### Professional Features
- **Professional verification** with document upload
- **Schedule management** with availability settings
- **Service offerings** and pricing
- **Patient communication** and consultation notes

### Administrative Functions
- **User management** and role assignments
- **Professional verification** approval workflow
- **System monitoring** and analytics
- **Compliance reporting** and audit trails

## 💻 Development Environment

### Local Development
- **Docker support** for consistent environments
- **Environment configuration** for different stages
- **Database migrations** for schema management
- **Real-time development** with hot reload

### Third-Party Integrations
- **Clerk**: Authentication and user management
- **Stripe**: Payment processing and subscriptions
- **Twilio**: SMS notifications and communications
- **Nodemailer**: Email notifications and reminders
- **Socket.io**: Real-time features and notifications

## 🚀 Deployment & Operations

### Production Deployment
- **Docker containers** for consistent deployment
- **Environment-specific configurations**
- **Database connection pooling** for performance
- **Monitoring and logging** for system health

### Performance Optimization
- **Redis caching** for frequently accessed data
- **Database query optimization** with proper indexing
- **Image optimization** for profile pictures and documents
- **API rate limiting** for resource protection

## 🧠 AI Assistant Behavior

### Healthcare Context Awareness
- **Always consider patient privacy** when suggesting features
- **Verify compliance requirements** before implementing solutions
- **Understand medical workflows** when designing features
- **Prioritize security** in all code recommendations

### Development Guidelines
- **Ask clarifying questions** about healthcare requirements
- **Verify existing patterns** before creating new implementations
- **Consider real-time requirements** for appointment-related features
- **Ensure proper error handling** for critical healthcare operations

### Code Quality Standards
- **Follow established patterns** in the existing codebase
- **Maintain type safety** with TypeScript
- **Implement proper validation** for all inputs
- **Add comprehensive error handling** for edge cases

## 🎯 Common Tasks & Patterns

### Authentication Tasks
- **Protecting routes** with Clerk middleware
- **Role-based access** implementation
- **JWT token validation** for API calls
- **User synchronization** with webhooks

### Database Operations
- **CRUD operations** for medical entities
- **Transaction management** for critical operations
- **Audit logging** for compliance
- **Query optimization** for performance

### Real-time Features
- **WebSocket events** for live updates
- **Push notifications** for appointments
- **Live chat** for patient-professional communication
- **Status updates** for appointment changes

## 📚 Key Resources

### Documentation
- **Clerk Documentation**: Authentication patterns and best practices
- **PostgreSQL**: Database optimization and security
- **React Documentation**: Modern React patterns and hooks
- **Express.js**: API development and middleware

### Healthcare Standards
- **HIPAA Compliance**: Privacy and security requirements
- **Medical Data Standards**: Proper handling of health information
- **Accessibility Standards**: Ensuring medical applications are accessible

### Development Tools
- **Docker**: Containerization and deployment
- **Vite**: Frontend build tool and development server
- **Node.js**: Backend runtime and package management
- **PostgreSQL**: Database management and optimization

---

# MunDoctor Development Guidelines

## 🎯 Task Execution Principles
- **Focus on healthcare requirements** - consider patient safety and data security
- **Maintain compliance standards** - ensure HIPAA compliance in all implementations
- **Preserve existing functionality** - avoid breaking changes to critical healthcare features
- **Follow established patterns** - use existing code patterns for consistency

## 📁 File Management Rules
- **Edit existing files** rather than creating new ones unless absolutely necessary
- **Maintain file organization** - keep healthcare-related files properly grouped
- **Update documentation** only when explicitly requested
- **Preserve audit trails** - maintain existing logging and monitoring code

## 🔒 Security & Privacy Rules
- **Never log PHI** (Protected Health Information) in application logs
- **Validate all inputs** using Zod schemas or similar validation
- **Implement proper authorization** for all healthcare data access
- **Use secure communication** for all patient-professional interactions

## 🏥 Healthcare-Specific Considerations
- **Patient privacy first** - always consider privacy implications
- **Professional verification** - maintain strict verification processes
- **Appointment integrity** - ensure appointment data consistency
- **Emergency handling** - consider urgent care scenarios in feature design

## 🚀 Development Best Practices
- **Test thoroughly** - especially for critical healthcare workflows
- **Handle errors gracefully** - provide meaningful error messages
- **Monitor performance** - healthcare applications require high availability
- **Document decisions** - maintain clear reasoning for healthcare-related choices

## 🎯 MunDoctor Mission
**Connecting patients with healthcare professionals through a secure, compliant, and user-friendly platform that prioritizes patient privacy and professional excellence.**

### Core Values
- **Patient Privacy**: All features must protect patient data according to HIPAA standards
- **Professional Excellence**: Support healthcare professionals with tools that enhance patient care
- **Accessibility**: Ensure the platform is accessible to users with diverse needs
- **Reliability**: Maintain high availability for critical healthcare operations
- **Innovation**: Continuously improve healthcare delivery through technology

---

*This context is highly relevant to all MunDoctor development tasks. Consider these guidelines and requirements when working on any aspect of the healthcare platform.*