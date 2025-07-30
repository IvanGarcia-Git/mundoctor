# Docker + Clerk Themes Configuration

## Issue Resolution: @clerk/themes Import Error

When running the application in Docker containers, you may encounter this error:
```
Failed to resolve import "@clerk/themes" from "src/components/ClerkThemeProvider.jsx". Does the file exist?
```

## Root Cause
This occurs because Docker containers have their own `node_modules` that may be out of sync with your local installation, especially when using volume mounts that exclude `node_modules`.

## Solutions

### Solution A: Rebuild Docker Container (Recommended)
```bash
# Stop containers and rebuild with latest dependencies
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Solution B: Install Dependencies at Runtime
Update your `docker-compose.yml` to install dependencies at runtime:

```yaml
services:
  frontend:
    # ... other config
    command: sh -c "npm install && npm run dev"
    # or for production:
    # command: sh -c "npm install && npm run build && npm run preview"
```

### Solution C: Update Dockerfile
Ensure your `Dockerfile` properly handles dependencies:

```dockerfile
# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Ensure @clerk/themes is installed
RUN npm list @clerk/themes || npm install @clerk/themes
```

### Solution D: Use Docker Volume Exclusion
Add a named volume for `node_modules` in your `docker-compose.yml`:

```yaml
services:
  frontend:
    # ... other config
    volumes:
      - .:/app
      - /app/node_modules  # Exclude node_modules from volume mount
```

## Alternative Implementation (Current Solution)

The current codebase uses a **custom theme implementation** that doesn't rely on `@clerk/themes`, providing:

- ✅ **Docker Compatibility**: No external theme dependencies
- ✅ **Full Theme Control**: Custom variables and styling
- ✅ **Better Performance**: Reduced bundle size
- ✅ **Healthcare Compliance**: Tailored colors for medical applications

## Switching Back to @clerk/themes

If you prefer to use the official `@clerk/themes` package:

1. **Install the package:**
   ```bash
   npm install @clerk/themes
   ```

2. **Update ClerkThemeProvider.jsx:**
   ```javascript
   import { dark } from '@clerk/themes';
   
   // Change baseTheme line:
   baseTheme: isDarkMode ? dark : undefined,
   ```

3. **Rebuild Docker containers:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up
   ```

## Verification

To verify the theme is working correctly:

1. **Check Browser Console**: No import errors should appear
2. **Test Theme Toggle**: Switch between light/dark modes
3. **Inspect Clerk Components**: UserButton and UserProfile should reflect theme changes
4. **Docker Logs**: No "module not found" errors in container logs

## Healthcare Platform Considerations

For the MunDoctor healthcare platform, the current custom implementation provides:

- **Professional Color Scheme**: Blue-based colors appropriate for medical settings
- **HIPAA Compliance**: No external theme dependencies reduce security surface
- **Accessibility**: High contrast ratios for better readability
- **Consistency**: Matches overall application design system

---

**Last Updated**: 2025-07-24  
**Status**: ✅ Resolved with custom implementation