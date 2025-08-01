# Bot-Denúncia Dependency Matrix

## Module Import/Export Matrix

### Configuration Files

#### `/config/whatsappRobustConfig.js`
**Exports:**
- `ROBUST_CLIENT_CONFIG` - Object with Puppeteer and WhatsApp client settings
- `RELIABILITY_CONFIG` - Object with timeout and reliability settings
- `MONITORING_CONFIG` - Object with monitoring configuration
- `ENVIRONMENT_CONFIGS` - Environment-specific configurations
- `LOGGING_CONFIG` - Logging configuration
- `getRobustConfig()` - Function to get environment-specific config
- `validateConfig()` - Function to validate configuration

**Does NOT Export:**
- ❌ RobustReconnectionManager (class)
- ❌ WhatsAppHealthMonitor (class)
- ❌ SmartRateLimiter (class)
- ❌ RELIABILITY_CONSTANTS (object)

### Service Files

#### `/services/whatsappStabilityEngine.js`
**Exports:**
- `WhatsAppStabilityEngine` - Main stability management class
- `RobustReconnectionManager` - Reconnection management class
- `WhatsAppHealthMonitor` - Health monitoring class
- `SmartRateLimiter` - Rate limiting class
- `ResilientMessageQueue` - Message queue class
- `RELIABILITY_CONSTANTS` - Constants for reliability settings

**Imports:**
- EventEmitter from 'events'
- logger from '../utils/logger'
- No imports from whatsappRobustConfig.js

#### `/services/whatsappService-robust.js`
**Current Imports (INCORRECT):**
```javascript
const {
    ROBUST_CLIENT_CONFIG,           // ✅ Available in source
    RobustReconnectionManager,      // ❌ NOT in whatsappRobustConfig
    WhatsAppHealthMonitor,          // ❌ NOT in whatsappRobustConfig
    SmartRateLimiter,              // ❌ NOT in whatsappRobustConfig
    RELIABILITY_CONSTANTS          // ❌ NOT in whatsappRobustConfig
} = require('../config/whatsappRobustConfig');
```

**Required Imports (CORRECT):**
```javascript
const { ROBUST_CLIENT_CONFIG } = require('../config/whatsappRobustConfig');
const {
    RobustReconnectionManager,
    WhatsAppHealthMonitor,
    SmartRateLimiter,
    RELIABILITY_CONSTANTS
} = require('./whatsappStabilityEngine');
```

## Critical Dependencies

### External NPM Packages

#### WhatsApp Integration
- **whatsapp-web.js** (^1.x)
  - Purpose: WhatsApp Web automation
  - Critical: Yes
  - Dependencies: Puppeteer, Chrome/Chromium

#### Instagram Integration
- **instagram-private-api** (^1.46.1)
  - Purpose: Instagram posting and interaction
  - Critical: Yes
  - Risk: Unofficial API, subject to breaking changes

#### Database
- **@prisma/client** (^5.x)
  - Purpose: PostgreSQL ORM
  - Critical: Yes
  - Configuration: DATABASE_URL environment variable

#### Queue Management
- **bull** (^4.x) & **bullmq** (^5.x)
  - Purpose: Job queue management
  - Critical: Yes
  - Dependency: Redis (ioredis ^5.x)

#### State Management
- **xstate** (^5.20.1)
  - Purpose: Conversation state machine
  - Critical: Yes for conversation flow

#### Image Processing
- **sharp** (^0.34.3)
  - Purpose: Image optimization and processing
  - Critical: Yes for photo handling
- **jimp** (^1.6.0)
  - Purpose: Alternative image processing
  - Secondary option

### Internal Module Dependencies

#### Core Flow
```
index.js
  └── integratedFlowController.js
      ├── masterFlowOrchestrator.js
      ├── errorRecoveryEngine.js
      ├── performanceAuditSystem.js
      ├── queueManager.js
      └── whatsappService-robust.js ❌ (Import Error Here)
          ├── whatsappRobustConfig.js
          └── whatsappStabilityEngine.js (Should import from here)
```

#### Service Dependencies
```
masterFlowOrchestrator.js
  ├── whatsappService-robust.js
  ├── instagramHumanizationEngine.js
  ├── smartAnalysisService.js
  ├── textFilterService.js
  ├── vereadorService.js
  └── queueManager.js

instagramHumanizationEngine.js
  ├── instagramService.js
  └── humanizationConfig.js

queueManager.js
  ├── processQueue.js
  └── publishQueue.js
```

## Environment Variables Required

### Critical Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# WhatsApp
WHATSAPP_SESSION_PATH=./instagram-session.json

# Instagram
INSTAGRAM_USERNAME=username
INSTAGRAM_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# Application
PORT=3355
NODE_ENV=development|production
JWT_SECRET=secret_key

# Admin Panel
FRONTEND_URL=http://localhost:3007
ADMIN_PANEL_URL=http://localhost:3007
```

## Import Resolution Order

1. **Node.js built-in modules** (e.g., 'events', 'fs', 'path')
2. **NPM packages** from node_modules
3. **Local modules** using relative paths
   - '../config/' for configuration files
   - './services/' for service files
   - '../utils/' for utilities
   - '../models/' for data models

## Common Import Patterns

### Configuration Import
```javascript
const { ROBUST_CLIENT_CONFIG, RELIABILITY_CONFIG } = require('../config/whatsappRobustConfig');
const { DATABASE_URL } = process.env;
```

### Service Import
```javascript
const whatsappService = require('./whatsappService-robust');
const instagramService = require('./instagramService');
```

### Utility Import
```javascript
const logger = require('../utils/logger');
const { validateStatus } = require('../utils/statusValidator');
```

### Model Import
```javascript
const Denuncia = require('../models/Denuncia');
const prisma = require('../config/database');
```

## Circular Dependency Risks

### Potential Circular Dependencies
1. **integratedFlowController** ↔ **whatsappService-robust**
   - Risk: Low (one-way dependency if properly structured)

2. **masterFlowOrchestrator** ↔ **queueManager**
   - Risk: Medium (both may reference each other)

3. **errorRecoveryEngine** ↔ **service modules**
   - Risk: Low (error handler should be independent)

## Module Loading Sequence

### Startup Sequence
1. Load environment variables (dotenv)
2. Initialize database connection (Prisma)
3. Initialize Redis connection
4. Load configuration modules
5. Initialize service modules
6. Initialize queue system
7. Start Express server
8. Initialize WhatsApp connection
9. Start health monitoring

### Critical Path
```
index.js
  → integratedFlowController.initialize()
    → queueManager.initialize()
    → performanceAuditSystem.initialize()
    → masterFlowOrchestrator.initialize()
      → whatsappService.initialize() ❌ (Fails here due to import error)
```

## Fix Implementation Guide

### Step 1: Update whatsappService-robust.js imports
```javascript
// OLD (line 3-9)
const {
    ROBUST_CLIENT_CONFIG,
    RobustReconnectionManager,
    WhatsAppHealthMonitor,
    SmartRateLimiter,
    RELIABILITY_CONSTANTS
} = require('../config/whatsappRobustConfig');

// NEW
const { ROBUST_CLIENT_CONFIG } = require('../config/whatsappRobustConfig');
const {
    RobustReconnectionManager,
    WhatsAppHealthMonitor,
    SmartRateLimiter,
    RELIABILITY_CONSTANTS
} = require('./whatsappStabilityEngine');
```

### Step 2: Verify all class instantiations work
- Line ~75: `this.reconnectionManager = new RobustReconnectionManager();`
- Line ~77: `this.rateLimiter = new SmartRateLimiter();`

### Step 3: Test initialization sequence
```bash
npm run dev  # Should start without constructor errors
```

## Monitoring Import Health

### Tools for Import Verification
1. **madge** - Visualize module dependencies
2. **depcheck** - Find unused dependencies
3. **npm-check** - Check for outdated packages

### Commands
```bash
# Install tools
npm install -g madge depcheck npm-check

# Check circular dependencies
madge --circular src/

# Check unused dependencies
depcheck

# Check outdated packages
npm-check -u
```