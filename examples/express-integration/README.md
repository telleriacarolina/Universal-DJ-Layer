# Express.js Integration

Complete Express.js integration showing how to integrate the Universal DJ Layer with a web application.

## Features

- 🔌 **REST API**: Complete REST endpoints for control management
- 🔐 **Authentication**: Middleware for actor identification
- 🎯 **Feature Flags**: HTTP endpoints for feature flag management
- 🎨 **Theme Management**: API for theme customization
- 📊 **Real-time Status**: Check feature status for users
- 🛡️ **Error Handling**: Comprehensive error responses

## Installation

```bash
npm install express
npm install --save-dev @types/express
```

## Quick Start

```typescript
import { createControlServer, startServer } from './examples/express-integration/server';

// Start the server
startServer(3000);
```

Or run directly:

```bash
npx ts-node examples/express-integration/server.ts
```

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-18T12:00:00.000Z"
}
```

### Apply Control

```http
POST /api/controls/apply
Content-Type: application/json
Authorization: Bearer <token>
X-User-Id: admin
X-User-Role: ADMIN
```

**Request Body:**
```json
{
  "discType": "feature-flag",
  "config": {
    "features": {
      "new-search": {
        "enabled": true,
        "rolloutPercentage": 50
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "controlId": "feature-flag-1234567890",
  "timestamp": "2024-01-18T12:00:00.000Z"
}
```

### Get Configuration

```http
GET /api/controls/:discType/config
```

**Response:**
```json
{
  "discType": "feature-flag",
  "config": {
    "features": {
      "new-search": {
        "enabled": true,
        "rolloutPercentage": 50
      }
    }
  }
}
```

### Create Feature Flag

```http
POST /api/features
Content-Type: application/json
X-User-Id: admin
X-User-Role: ADMIN
```

**Request Body:**
```json
{
  "name": "new-search",
  "enabled": true,
  "rolloutPercentage": 50,
  "userWhitelist": ["user-001"],
  "userBlacklist": []
}
```

**Response:**
```json
{
  "success": true,
  "feature": "new-search"
}
```

### List All Features

```http
GET /api/features
```

**Response:**
```json
{
  "features": {
    "new-search": {
      "enabled": true,
      "rolloutPercentage": 50,
      "userWhitelist": ["user-001"],
      "userBlacklist": [],
      "createdAt": "2024-01-18T12:00:00.000Z",
      "createdBy": "admin"
    }
  }
}
```

### Check Feature Status

```http
GET /api/features/:name/status?userId=user-123
```

**Response:**
```json
{
  "feature": "new-search",
  "userId": "user-123",
  "enabled": true
}
```

### Update Theme

```http
POST /api/theme
Content-Type: application/json
X-User-Id: admin
```

**Request Body:**
```json
{
  "primaryColor": "#007bff",
  "secondaryColor": "#6c757d",
  "darkMode": false,
  "fontSize": "medium",
  "fontFamily": "Arial, sans-serif"
}
```

**Response:**
```json
{
  "success": true,
  "theme": {
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "darkMode": false,
    "fontSize": "medium",
    "fontFamily": "Arial, sans-serif"
  }
}
```

### Get Current Theme

```http
GET /api/theme
```

**Response:**
```json
{
  "theme": {
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "darkMode": false,
    "fontSize": "medium",
    "fontFamily": "Arial, sans-serif"
  }
}
```

## Authentication

The server uses a middleware to extract actor information from requests:

```typescript
import { actorMiddleware } from './examples/express-integration/server';

app.use(actorMiddleware);
```

Pass actor information via headers:
- `Authorization: Bearer <token>` (optional, for future JWT integration)
- `X-User-Id: <userId>` (user identifier)
- `X-User-Role: <role>` (CREATOR, ADMIN, MODERATOR, etc.)

## Integration Example

### Basic Express App

```typescript
import express from 'express';
import { ControlAPI, actorMiddleware } from './examples/express-integration/server';

const app = express();
const api = new ControlAPI();

app.use(express.json());
app.use(actorMiddleware);

// Your routes
app.get('/', async (req, res) => {
  const userId = req.actor?.id || 'anonymous';
  
  // Check feature flags
  const useNewUI = await api.isFeatureEnabled('new-ui', userId);
  
  if (useNewUI) {
    res.send('<h1>New UI</h1>');
  } else {
    res.send('<h1>Legacy UI</h1>');
  }
});

app.listen(3000);
```

### Feature Flag Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

function featureMiddleware(featureName: string) {
  return async (req: any, res: Response, next: NextFunction) => {
    const userId = req.actor?.id || 'anonymous';
    const enabled = await api.isFeatureEnabled(featureName, userId);
    
    if (enabled) {
      next();
    } else {
      res.status(403).json({ error: 'Feature not enabled' });
    }
  };
}

// Use middleware
app.get('/beta-feature', 
  featureMiddleware('beta-feature'),
  (req, res) => {
    res.json({ message: 'Beta feature enabled!' });
  }
);
```

### Dynamic Theme Endpoint

```typescript
app.get('/styles.css', async (req, res) => {
  await api.initializeDisc('theme');
  const disc = api.getDisc('theme');
  const theme = disc.getConfig();
  
  const css = generateCSS(theme);
  
  res.setHeader('Content-Type', 'text/css');
  res.send(css);
});
```

## Testing with curl

```bash
# Create a feature flag
curl -X POST http://localhost:3000/api/features \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin" \
  -H "X-User-Role: ADMIN" \
  -d '{
    "name": "dark-mode",
    "enabled": true,
    "rolloutPercentage": 50
  }'

# Check feature status
curl http://localhost:3000/api/features/dark-mode/status?userId=user-123

# Get all features
curl http://localhost:3000/api/features

# Update theme
curl -X POST http://localhost:3000/api/theme \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin" \
  -d '{
    "darkMode": true,
    "primaryColor": "#0d6efd"
  }'
```

## Advanced Usage

### Custom Disc Registration

```typescript
import { ControlAPI } from './examples/express-integration/server';

class CustomControlAPI extends ControlAPI {
  async initializeDisc(discType: string): Promise<void> {
    if (discType === 'custom-disc') {
      // Register your custom disc
      const disc = new CustomDisc();
      await disc.initialize();
      this.discs.set(discType, disc);
    } else {
      await super.initializeDisc(discType);
    }
  }
}
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Error Handling

```typescript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});
```

## Production Considerations

1. **Authentication**: Replace mock auth with real JWT validation
2. **Database**: Persist disc state to database
3. **Caching**: Cache feature flag lookups with Redis
4. **Monitoring**: Add logging and metrics
5. **CORS**: Configure CORS for frontend access
6. **Rate Limiting**: Protect API endpoints
7. **HTTPS**: Use TLS in production

## Related Examples

- [Feature Flags](../feature-flags/README.md)
- [Theme Switcher](../theme-switcher/README.md)
- [React Integration](../react-integration/README.md)

## Learn More

- [Integration Guide](../../docs/INTEGRATION.md)
- [API Reference](../../docs/API.md)
- [Security Guide](../../docs/SECURITY.md)
