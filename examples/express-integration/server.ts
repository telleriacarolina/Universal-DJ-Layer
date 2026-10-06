import express, { Request, Response, NextFunction, Application } from 'express';
import { DJEngine } from '../../src/engine/DJEngine';
import { FeatureFlagDisc } from '../../src/discs/feature-flag-disc';
import { ThemeDisc } from '../../src/discs/theme-disc';
import { Role } from '../../src/core/types';

/**
 * Actor information attached to request
 */
interface ActorInfo {
  id: string;
  role: Role;
  permissions: string[];
}

/**
 * Extended Express Request with actor information
 */
interface AuthenticatedRequest extends Request {
  actor?: ActorInfo;
}

/**
 * Middleware to extract actor information from request
 * In production, this would integrate with your authentication system
 */
export function actorMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // In production, extract from JWT token, session, etc.
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Simplified: In production, verify JWT and extract claims
    const token = authHeader.substring(7);
    
    // Mock actor extraction
    req.actor = {
      id: req.headers['x-user-id'] as string || 'anonymous',
      role: (req.headers['x-user-role'] as Role) || Role.USER,
      permissions: []
    };
  } else {
    // Default anonymous actor
    req.actor = {
      id: 'anonymous',
      role: Role.USER,
      permissions: []
    };
  }

  next();
}

/**
 * Control API for Express.js integration
 */
export class ControlAPI {
  private engines: Map<string, DJEngine>;
  private discs: Map<string, any>;

  constructor() {
    this.engines = new Map();
    this.discs = new Map();
  }

  /**
   * Get or create DJ Engine for an actor
   */
  private getEngine(actorId: string, role: Role): DJEngine {
    const key = `${actorId}-${role}`;
    
    if (!this.engines.has(key)) {
      const engine = new DJEngine(actorId, role);
      this.engines.set(key, engine);
    }

    return this.engines.get(key)!;
  }

  /**
   * Initialize a disc
   */
  async initializeDisc(discType: string): Promise<void> {
    if (!this.discs.has(discType)) {
      let disc;
      
      switch (discType) {
        case 'feature-flag':
          disc = new FeatureFlagDisc();
          break;
        case 'theme':
          disc = new ThemeDisc();
          break;
        default:
          throw new Error(`Unknown disc type: ${discType}`);
      }

      await disc.initialize();
      this.discs.set(discType, disc);
    }
  }

  /**
   * Get a disc instance
   */
  getDisc(discType: string): any {
    const disc = this.discs.get(discType);
    if (!disc) {
      throw new Error(`Disc "${discType}" not initialized`);
    }
    return disc;
  }

  /**
   * Apply a control
   */
  async apply(
    discType: string,
    config: any,
    actor: ActorInfo
  ): Promise<{ success: boolean; controlId: string; timestamp: Date }> {
    await this.initializeDisc(discType);
    const disc = this.getDisc(discType);
    
    // Enable disc if not already enabled
    if (!disc.isEnabled()) {
      disc.enable(actor.id);
    }

    // Update configuration
    disc.updateConfig(config, actor.id);

    return {
      success: true,
      controlId: `${discType}-${Date.now()}`,
      timestamp: new Date()
    };
  }

  /**
   * Get current configuration
   */
  async getConfig(discType: string): Promise<any> {
    await this.initializeDisc(discType);
    const disc = this.getDisc(discType);
    return disc.getConfig();
  }

  /**
   * Check if feature is enabled
   */
  async isFeatureEnabled(featureName: string, userId: string): Promise<boolean> {
    await this.initializeDisc('feature-flag');
    const disc = this.getDisc('feature-flag') as FeatureFlagDisc;
    return disc.isFeatureEnabled(featureName, userId);
  }
}

/**
 * Create Express application with DJ Control Layer integration
 */
export function createControlServer(): Application {
  const app = express();
  const api = new ControlAPI();

  // Middleware
  app.use(express.json());
  app.use(actorMiddleware);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  // Apply control
  app.post('/api/controls/apply', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { discType, config } = req.body;

      if (!discType || !config) {
        return res.status(400).json({
          error: 'discType and config are required'
        });
      }

      const result = await api.apply(discType, config, req.actor!);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get configuration
  app.get('/api/controls/:discType/config', async (req: Request, res: Response) => {
    try {
      const { discType } = req.params;
      const config = await api.getConfig(discType);
      res.json({ discType, config });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  // Feature flag endpoints
  app.post('/api/features', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, enabled, rolloutPercentage, userWhitelist, userBlacklist } = req.body;

      await api.initializeDisc('feature-flag');
      const disc = api.getDisc('feature-flag') as FeatureFlagDisc;

      disc.setFeatureFlag(name, enabled, req.actor!.id, {
        rolloutPercentage,
        userWhitelist,
        userBlacklist
      });

      res.json({ success: true, feature: name });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/features', async (req: Request, res: Response) => {
    try {
      await api.initializeDisc('feature-flag');
      const disc = api.getDisc('feature-flag') as FeatureFlagDisc;
      const features = disc.getAllFeatures();
      res.json({ features });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/features/:name/status', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      const userId = req.query.userId as string || req.actor!.id;

      const enabled = await api.isFeatureEnabled(name, userId);
      res.json({ feature: name, userId, enabled });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Theme endpoints
  app.post('/api/theme', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const theme = req.body;

      await api.initializeDisc('theme');
      const disc = api.getDisc('theme') as ThemeDisc;

      const valid = await disc.validate(theme);
      if (!valid) {
        return res.status(400).json({ error: 'Invalid theme configuration' });
      }

      disc.updateConfig(theme, req.actor!.id);
      res.json({ success: true, theme });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/theme', async (req: Request, res: Response) => {
    try {
      await api.initializeDisc('theme');
      const disc = api.getDisc('theme') as ThemeDisc;
      const theme = disc.getConfig();
      res.json({ theme });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}

/**
 * Start the server
 */
export function startServer(port: number = 3000): void {
  const app = createControlServer();

  app.listen(port, () => {
    console.log(`🚀 DJ Control Layer API running on http://localhost:${port}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  /health');
    console.log('  POST /api/controls/apply');
    console.log('  GET  /api/controls/:discType/config');
    console.log('  POST /api/features');
    console.log('  GET  /api/features');
    console.log('  GET  /api/features/:name/status');
    console.log('  POST /api/theme');
    console.log('  GET  /api/theme');
  });
}

// Run server if this file is executed directly
if (require.main === module) {
  startServer();
}
