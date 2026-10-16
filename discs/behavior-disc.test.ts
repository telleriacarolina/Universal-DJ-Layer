import { BehaviorDisc, BehaviorConfig, BehaviorRule, BehaviorStrategy } from './behavior-disc';

describe('BehaviorDisc', () => {
  describe('Constructor and Metadata', () => {
    test('creates disc with correct metadata', () => {
      const config: BehaviorConfig = {
        name: 'test-behaviors',
      };

      const disc = new BehaviorDisc(config);

      expect(disc.metadata.name).toBe('test-behaviors');
      expect(disc.metadata.type).toBe('behavior');
      expect(disc.metadata.version).toBe('1.0.0');
      expect(disc.metadata.id).toContain('behavior-');
      expect(disc.metadata.createdAt).toBeLessThanOrEqual(Date.now());
    });

    test('generates unique IDs for different instances', () => {
      const config: BehaviorConfig = {
        name: 'test',
      };

      const disc1 = new BehaviorDisc(config);
      const disc2 = new BehaviorDisc(config);

      expect(disc1.metadata.id).not.toBe(disc2.metadata.id);
    });

    test('initializes with rules from config', () => {
      const config: BehaviorConfig = {
        name: 'test',
        rules: {
          rule1: {
            id: 'rule1',
            name: 'Test Rule',
            condition: () => true,
            action: () => 'result',
          },
        },
      };

      const disc = new BehaviorDisc(config);
      const matchingRules = disc.evaluateRules({});

      expect(matchingRules.length).toBe(1);
      expect(matchingRules[0].id).toBe('rule1');
    });

    test('initializes with strategies from config', () => {
      const config: BehaviorConfig = {
        name: 'test',
        strategies: {
          strategy1: {
            name: 'strategy1',
            type: 'sorting',
            config: { algorithm: 'quicksort' },
          },
        },
      };

      const disc = new BehaviorDisc(config);
      const strategy = disc.getStrategy('strategy1');

      expect(strategy).not.toBeNull();
      expect(strategy!.type).toBe('sorting');
    });
  });

  describe('Algorithm Swapping', () => {
    test('sets and gets algorithm implementations', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const sortAlgo = (arr: number[]) => [...arr].sort((a, b) => a - b);

      disc.setAlgorithm('sort', sortAlgo);
      const retrieved = disc.getAlgorithm('sort');

      expect(retrieved).toBe(sortAlgo);
    });

    test('returns null for non-existent algorithm', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.getAlgorithm('nonexistent')).toBeNull();
    });

    test('replaces existing algorithm', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const algo1 = (arr: number[]) => arr;
      const algo2 = (arr: number[]) => [...arr].reverse();

      disc.setAlgorithm('sort', algo1);
      disc.setAlgorithm('sort', algo2);

      const retrieved = disc.getAlgorithm('sort');
      expect(retrieved).toBe(algo2);
    });

    test('throws error if implementation is not a function', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(() => {
        disc.setAlgorithm('sort', 'not a function' as any);
      }).toThrow('Implementation must be a function');
    });

    test('supports multiple algorithms', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const sortAlgo = (arr: number[]) => arr.sort();
      const filterAlgo = (arr: number[]) => arr.filter(x => x > 0);
      const mapAlgo = (arr: number[]) => arr.map(x => x * 2);

      disc.setAlgorithm('sort', sortAlgo);
      disc.setAlgorithm('filter', filterAlgo);
      disc.setAlgorithm('map', mapAlgo);

      expect(disc.getAlgorithm('sort')).toBe(sortAlgo);
      expect(disc.getAlgorithm('filter')).toBe(filterAlgo);
      expect(disc.getAlgorithm('map')).toBe(mapAlgo);
    });

    test('algorithm can be executed correctly', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const recommendAlgo = (items: string[], userId: string) => {
        return items.filter(item => item.includes(userId));
      };

      disc.setAlgorithm('recommend', recommendAlgo);
      const algo = disc.getAlgorithm('recommend')!;
      
      const result = algo(['user1-item', 'user2-item', 'user1-special'], 'user1');
      expect(result).toEqual(['user1-item', 'user1-special']);
    });

    test('updates timestamp when setting algorithm', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const before = Date.now();
      
      disc.setAlgorithm('algo', () => {});
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Behavior Variants (A/B Testing)', () => {
    test('sets and gets experiment variants', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.setVariant('checkout-flow', 'variant-B');
      const variant = disc.getVariant('checkout-flow');

      expect(variant).toBe('variant-B');
    });

    test('returns null for non-existent experiment', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.getVariant('nonexistent')).toBeNull();
    });

    test('supports multiple experiments', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.setVariant('checkout-flow', 'variant-B');
      disc.setVariant('ui-theme', 'dark');
      disc.setVariant('recommendation-algo', 'collaborative');

      expect(disc.getVariant('checkout-flow')).toBe('variant-B');
      expect(disc.getVariant('ui-theme')).toBe('dark');
      expect(disc.getVariant('recommendation-algo')).toBe('collaborative');
    });

    test('updates variant for existing experiment', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.setVariant('test-exp', 'control');
      disc.setVariant('test-exp', 'variant-A');

      expect(disc.getVariant('test-exp')).toBe('variant-A');
    });

    test('updates timestamp when setting variant', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const before = Date.now();
      
      disc.setVariant('exp1', 'A');
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Parameter Tuning', () => {
    test('sets and gets behavior parameters', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.setBehaviorParam('threshold', 0.85);
      const value = disc.getBehaviorParam('threshold');

      expect(value).toBe(0.85);
    });

    test('returns undefined for non-existent parameter', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.getBehaviorParam('nonexistent')).toBeUndefined();
    });

    test('supports different parameter types', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.setBehaviorParam('threshold', 0.85);
      disc.setBehaviorParam('maxRetries', 3);
      disc.setBehaviorParam('enabled', true);
      disc.setBehaviorParam('message', 'Hello');
      disc.setBehaviorParam('config', { key: 'value' });
      disc.setBehaviorParam('tags', ['tag1', 'tag2']);

      expect(disc.getBehaviorParam('threshold')).toBe(0.85);
      expect(disc.getBehaviorParam('maxRetries')).toBe(3);
      expect(disc.getBehaviorParam('enabled')).toBe(true);
      expect(disc.getBehaviorParam('message')).toBe('Hello');
      expect(disc.getBehaviorParam('config')).toEqual({ key: 'value' });
      expect(disc.getBehaviorParam('tags')).toEqual(['tag1', 'tag2']);
    });

    test('updates existing parameter', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.setBehaviorParam('threshold', 0.5);
      disc.setBehaviorParam('threshold', 0.9);

      expect(disc.getBehaviorParam('threshold')).toBe(0.9);
    });

    test('updates timestamp when setting parameter', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const before = Date.now();
      
      disc.setBehaviorParam('param1', 'value');
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Logic Gates (Enable/Disable Behaviors)', () => {
    test('enables and checks behavior', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.enableBehavior('premium-features');

      expect(disc.isBehaviorEnabled('premium-features')).toBe(true);
    });

    test('disables and checks behavior', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.disableBehavior('legacy-mode');

      expect(disc.isBehaviorEnabled('legacy-mode')).toBe(false);
    });

    test('returns true by default for unset behavior', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.isBehaviorEnabled('never-set')).toBe(true);
    });

    test('toggles behavior state', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.enableBehavior('feature');
      expect(disc.isBehaviorEnabled('feature')).toBe(true);

      disc.disableBehavior('feature');
      expect(disc.isBehaviorEnabled('feature')).toBe(false);

      disc.enableBehavior('feature');
      expect(disc.isBehaviorEnabled('feature')).toBe(true);
    });

    test('supports multiple behaviors', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.enableBehavior('feature1');
      disc.disableBehavior('feature2');
      disc.enableBehavior('feature3');

      expect(disc.isBehaviorEnabled('feature1')).toBe(true);
      expect(disc.isBehaviorEnabled('feature2')).toBe(false);
      expect(disc.isBehaviorEnabled('feature3')).toBe(true);
    });

    test('updates timestamp when enabling behavior', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const before = Date.now();
      
      disc.enableBehavior('feature1');
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });

    test('updates timestamp when disabling behavior', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const before = Date.now();
      
      disc.disableBehavior('feature1');
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Function Wrapping/Interception', () => {
    test('wraps function with before and after hooks', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const beforeCalls: any[] = [];
      const afterCalls: any[] = [];
      const original = (x: number) => x * 2;
      
      disc.wrapFunction(
        'double',
        original,
        (args: any) => beforeCalls.push(args),
        (result: any) => afterCalls.push(result)
      );

      const wrapped = disc.getWrappedFunction('double')!;
      const result = wrapped(5);

      expect(result).toBe(10);
      expect(beforeCalls.length).toBe(1);
      expect(beforeCalls[0]).toEqual([5]);
      expect(afterCalls.length).toBe(1);
      expect(afterCalls[0]).toBe(10);
    });

    test('wraps function without hooks', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const original = (x: number) => x * 2;
      
      disc.wrapFunction('double', original);

      const wrapped = disc.getWrappedFunction('double')!;
      expect(wrapped(5)).toBe(10);
    });

    test('unwraps function and returns original', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const original = (x: number) => x * 2;
      
      disc.wrapFunction('double', original);
      const unwrapped = disc.unwrapFunction('double');

      expect(unwrapped).toBe(original);
      expect(disc.getWrappedFunction('double')).toBeNull();
    });

    test('returns null when unwrapping non-existent function', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.unwrapFunction('nonexistent')).toBeNull();
    });

    test('returns null when getting non-existent wrapped function', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.getWrappedFunction('nonexistent')).toBeNull();
    });

    test('throws error if original is not a function', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(() => {
        disc.wrapFunction('test', 'not a function' as any);
      }).toThrow('originalFunction must be a function');
    });

    test('before hook can modify arguments', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      let modifiedArgs: any[] = [];
      
      const original = (...args: number[]) => args.reduce((a, b) => a + b, 0);
      
      disc.wrapFunction(
        'sum',
        original,
        (args: any) => { modifiedArgs = args; }
      );

      const wrapped = disc.getWrappedFunction('sum')!;
      wrapped(1, 2, 3);

      expect(modifiedArgs).toEqual([1, 2, 3]);
    });

    test('updates timestamp when wrapping function', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const before = Date.now();
      
      disc.wrapFunction('func', () => {});
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });

    test('updates timestamp when unwrapping function', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.wrapFunction('func', () => {});
      const before = Date.now();
      disc.unwrapFunction('func');
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Rule Engine', () => {
    test('adds and evaluates rule with function condition', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const rule: BehaviorRule = {
        id: 'premium-discount',
        name: 'Premium Discount',
        condition: (ctx: any) => ctx.user.isPremium,
        action: (ctx: any) => { ctx.discount = 0.2; },
        priority: 10,
      };

      disc.addRule(rule);
      const matchingRules = disc.evaluateRules({ user: { isPremium: true } });

      expect(matchingRules.length).toBe(1);
      expect(matchingRules[0].id).toBe('premium-discount');
    });

    test('rule with false condition does not match', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const rule: BehaviorRule = {
        id: 'test',
        name: 'Test',
        condition: (ctx: any) => ctx.user.isPremium,
        action: () => {},
      };

      disc.addRule(rule);
      const matchingRules = disc.evaluateRules({ user: { isPremium: false } });

      expect(matchingRules.length).toBe(0);
    });

    test('sorts rules by priority', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'low',
        name: 'Low Priority',
        condition: () => true,
        action: () => {},
        priority: 1,
      });
      
      disc.addRule({
        id: 'high',
        name: 'High Priority',
        condition: () => true,
        action: () => {},
        priority: 10,
      });
      
      disc.addRule({
        id: 'medium',
        name: 'Medium Priority',
        condition: () => true,
        action: () => {},
        priority: 5,
      });

      const matchingRules = disc.evaluateRules({});

      expect(matchingRules[0].id).toBe('high');
      expect(matchingRules[1].id).toBe('medium');
      expect(matchingRules[2].id).toBe('low');
    });

    test('handles rules without priority', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'no-priority',
        name: 'No Priority',
        condition: () => true,
        action: () => {},
      });

      const matchingRules = disc.evaluateRules({});

      expect(matchingRules.length).toBe(1);
      expect(matchingRules[0].id).toBe('no-priority');
    });

    test('executes rule action and returns result', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const context = { discount: 0 };
      
      disc.addRule({
        id: 'discount',
        name: 'Apply Discount',
        condition: () => true,
        action: (ctx: any) => {
          ctx.discount = 0.15;
          return ctx.discount;
        },
      });

      const result = disc.executeRuleAction('discount', context);

      expect(result).toBe(0.15);
      expect(context.discount).toBe(0.15);
    });

    test('throws error when executing non-existent rule', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(() => {
        disc.executeRuleAction('nonexistent', {});
      }).toThrow("Rule 'nonexistent' not found");
    });

    test('removes rule successfully', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'test',
        name: 'Test',
        condition: () => true,
        action: () => {},
      });

      const removed = disc.removeRule('test');
      const matchingRules = disc.evaluateRules({});

      expect(removed).toBe(true);
      expect(matchingRules.length).toBe(0);
    });

    test('returns false when removing non-existent rule', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.removeRule('nonexistent')).toBe(false);
    });

    test('throws error when adding duplicate rule', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      const rule: BehaviorRule = {
        id: 'test',
        name: 'Test',
        condition: () => true,
        action: () => {},
      };

      disc.addRule(rule);

      expect(() => {
        disc.addRule(rule);
      }).toThrow("Rule with ID 'test' already exists");
    });

    test('handles string condition as always matching', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'string-condition',
        name: 'String Condition',
        condition: 'always match',
        action: () => 'result',
      });

      const matchingRules = disc.evaluateRules({});

      expect(matchingRules.length).toBe(1);
      expect(matchingRules[0].id).toBe('string-condition');
    });

    test('handles string action', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'string-action',
        name: 'String Action',
        condition: () => true,
        action: 'action result',
      });

      const result = disc.executeRuleAction('string-action', {});

      expect(result).toBe('action result');
    });

    test('skips rules that throw errors during evaluation', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'error',
        name: 'Error Rule',
        condition: () => { throw new Error('Test error'); },
        action: () => {},
      });
      
      disc.addRule({
        id: 'valid',
        name: 'Valid Rule',
        condition: () => true,
        action: () => {},
      });

      const matchingRules = disc.evaluateRules({});

      expect(matchingRules.length).toBe(1);
      expect(matchingRules[0].id).toBe('valid');
    });

    test('updates timestamp when adding rule', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const before = Date.now();
      
      disc.addRule({
        id: 'rule1',
        name: 'Rule 1',
        condition: () => true,
        action: () => {},
      });
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });

    test('updates timestamp when removing rule', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'rule1',
        name: 'Rule 1',
        condition: () => true,
        action: () => {},
      });
      
      const before = Date.now();
      disc.removeRule('rule1');
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Strategy Pattern', () => {
    test('adds and gets strategy', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const strategy: BehaviorStrategy = {
        name: 'fast-sort',
        type: 'sorting',
        config: { algorithm: 'quicksort', threshold: 100 },
        contexts: ['large-datasets'],
      };

      disc.addStrategy(strategy);
      const retrieved = disc.getStrategy('fast-sort');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.type).toBe('sorting');
      expect(retrieved!.config.algorithm).toBe('quicksort');
      expect(retrieved!.contexts).toEqual(['large-datasets']);
    });

    test('returns null for non-existent strategy', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.getStrategy('nonexistent')).toBeNull();
    });

    test('removes strategy successfully', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addStrategy({
        name: 'test-strategy',
        type: 'test',
        config: {},
      });

      const removed = disc.removeStrategy('test-strategy');

      expect(removed).toBe(true);
      expect(disc.getStrategy('test-strategy')).toBeNull();
    });

    test('returns false when removing non-existent strategy', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.removeStrategy('nonexistent')).toBe(false);
    });

    test('throws error when adding duplicate strategy', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      const strategy: BehaviorStrategy = {
        name: 'test',
        type: 'test',
        config: {},
      };

      disc.addStrategy(strategy);

      expect(() => {
        disc.addStrategy(strategy);
      }).toThrow("Strategy with name 'test' already exists");
    });

    test('supports multiple strategies', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.addStrategy({
        name: 'strategy1',
        type: 'sorting',
        config: { algo: 'quicksort' },
      });

      disc.addStrategy({
        name: 'strategy2',
        type: 'caching',
        config: { ttl: 300 },
      });

      disc.addStrategy({
        name: 'strategy3',
        type: 'routing',
        config: { method: 'round-robin' },
      });

      expect(disc.getStrategy('strategy1')).not.toBeNull();
      expect(disc.getStrategy('strategy2')).not.toBeNull();
      expect(disc.getStrategy('strategy3')).not.toBeNull();
    });

    test('updates timestamp when adding strategy', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const before = Date.now();
      
      disc.addStrategy({
        name: 'strategy1',
        type: 'test',
        config: {},
      });
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });

    test('updates timestamp when removing strategy', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addStrategy({
        name: 'strategy1',
        type: 'test',
        config: {},
      });
      
      const before = Date.now();
      disc.removeStrategy('strategy1');
      
      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Apply, Revert, and Preview', () => {
    test('applies behaviors to context', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.setAlgorithm('sort', (arr: any[]) => arr.sort());
      disc.setVariant('exp1', 'variant-A');
      disc.setBehaviorParam('threshold', 0.8);
      disc.enableBehavior('feature1');
      disc.addRule({
        id: 'rule1',
        name: 'Rule 1',
        condition: () => true,
        action: () => {},
      });
      disc.addStrategy({
        name: 'strategy1',
        type: 'test',
        config: {},
      });

      const context = await disc.apply({ behaviors: {} });

      expect(context.behaviors.algorithms.sort).toEqual({ registered: true });
      expect(context.behaviors.variants.exp1).toBe('variant-A');
      expect(context.behaviors.parameters.threshold).toBe(0.8);
      expect(context.behaviors.enabled.feature1).toBe(true);
      expect(context.behaviors.rules).toContain('rule1');
      expect(context.behaviors.strategies).toContain('strategy1');
    });

    test('throws error when applying to invalid context', async () => {
      const disc = new BehaviorDisc({ name: 'test' });

      await expect(disc.apply(null)).rejects.toThrow('Invalid context: must be an object');
      await expect(disc.apply('string')).rejects.toThrow('Invalid context: must be an object');
    });

    test('initializes behaviors object if not present', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      disc.setAlgorithm('algo1', () => {});

      const context = await disc.apply({});

      expect(context.behaviors).toBeDefined();
      expect(context.behaviors.algorithms).toBeDefined();
    });

    test('stores previous state for revert', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const context = {
        behaviors: {
          algorithms: { existing: { registered: true } },
          variants: { existing: 'A' },
        },
      };

      await disc.apply(context);
      await disc.revert(context);

      expect(context.behaviors.algorithms.existing).toEqual({ registered: true });
      expect(context.behaviors.variants.existing).toBe('A');
    });

    test('reverts to previous state', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      const originalContext = {
        behaviors: {
          algorithms: { old: { registered: true } },
        },
      };

      await disc.apply(originalContext);
      
      const reverted = await disc.revert(originalContext);

      expect(reverted.behaviors.algorithms.old).toEqual({ registered: true });
    });

    test('throws error when reverting without previous state', async () => {
      const disc = new BehaviorDisc({ name: 'test' });

      await expect(disc.revert({})).rejects.toThrow('No previous state to revert to');
    });

    test('throws error when reverting with invalid context', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      await disc.apply({});

      await expect(disc.revert(null)).rejects.toThrow('Invalid context: must be an object');
    });

    test('previews behavior changes', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.setAlgorithm('sort', () => {});
      disc.setVariant('exp1', 'variant-B');
      disc.setBehaviorParam('threshold', 0.9);
      disc.addRule({
        id: 'rule1',
        name: 'Rule 1',
        condition: () => true,
        action: () => {},
      });
      disc.addStrategy({
        name: 'strategy1',
        type: 'test',
        config: {},
      });

      const preview = await disc.preview({});

      expect(preview.discName).toBe('test');
      expect(preview.changesCount).toBeGreaterThan(0);
      expect(preview.changes.algorithms).toBeDefined();
      expect(preview.changes.variants).toBeDefined();
      expect(preview.changes.parameters).toBeDefined();
      expect(preview.changes.rules).toBeDefined();
      expect(preview.changes.strategies).toBeDefined();
    });

    test('preview shows variant changes', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.setVariant('exp1', 'variant-B');
      
      const context = {
        behaviors: {
          variants: { exp1: 'variant-A' },
        },
      };

      const preview = await disc.preview(context);

      expect(preview.changes.variants.exp1.current).toBe('variant-A');
      expect(preview.changes.variants.exp1.proposed).toBe('variant-B');
    });

    test('preview shows parameter changes', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.setBehaviorParam('threshold', 0.9);
      
      const context = {
        behaviors: {
          parameters: { threshold: 0.5 },
        },
      };

      const preview = await disc.preview(context);

      expect(preview.changes.parameters.threshold.current).toBe(0.5);
      expect(preview.changes.parameters.threshold.proposed).toBe(0.9);
    });

    test('preview handles empty context', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      disc.setAlgorithm('algo1', () => {});

      const preview = await disc.preview({});

      expect(preview.changes).toBeDefined();
    });
  });

  describe('Validation', () => {
    test('validates successfully with valid configuration', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.setAlgorithm('algo1', () => {});
      disc.addRule({
        id: 'rule1',
        name: 'Rule 1',
        condition: () => true,
        action: () => {},
        priority: 10,
      });
      disc.addStrategy({
        name: 'strategy1',
        type: 'test',
        config: { key: 'value' },
      });

      const isValid = await disc.validate();

      expect(isValid).toBe(true);
    });

    test('throws error for rule without id or name', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: '',
        name: '',
        condition: () => true,
        action: () => {},
      });

      await expect(disc.validate()).rejects.toThrow("must have id and name");
    });

    test('throws error for rule with invalid condition', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'test',
        name: 'Test',
        condition: 123 as any,
        action: () => {},
      });

      await expect(disc.validate()).rejects.toThrow("condition must be a function or string");
    });

    test('throws error for rule with invalid action', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'test',
        name: 'Test',
        condition: () => true,
        action: null as any,
      });

      await expect(disc.validate()).rejects.toThrow("action must be a function or string");
    });

    test('throws error for rule with invalid priority', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addRule({
        id: 'test',
        name: 'Test',
        condition: () => true,
        action: () => {},
        priority: 'high' as any,
      });

      await expect(disc.validate()).rejects.toThrow("priority must be a number");
    });

    test('throws error for incomplete strategy', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      disc.addStrategy({
        name: '',
        type: '',
        config: null as any,
      });

      await expect(disc.validate()).rejects.toThrow("must have name, type, and config");
    });

    test('throws error for non-function algorithm', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      // Bypass type checking to test runtime validation
      (disc as any).algorithms.set('invalid', 'not a function');

      await expect(disc.validate()).rejects.toThrow("must be a function");
    });

    test('throws error for invalid wrapped function', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      // Bypass type checking to test runtime validation
      (disc as any).wrappedFunctions.set('invalid', {
        original: 'not a function',
        wrapped: () => {},
      });

      await expect(disc.validate()).rejects.toThrow("original must be a function");
    });

    test('throws error for invalid before hook', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      (disc as any).wrappedFunctions.set('invalid', {
        original: () => {},
        wrapped: () => {},
        before: 'not a function',
      });

      await expect(disc.validate()).rejects.toThrow("before hook must be a function");
    });

    test('throws error for invalid after hook', async () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      (disc as any).wrappedFunctions.set('invalid', {
        original: () => {},
        wrapped: () => {},
        after: 'not a function',
      });

      await expect(disc.validate()).rejects.toThrow("after hook must be a function");
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles empty configuration', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      expect(disc.metadata.name).toBe('test');
      expect(disc.getAlgorithm('any')).toBeNull();
      expect(disc.getVariant('any')).toBeNull();
      expect(disc.getBehaviorParam('any')).toBeUndefined();
    });

    test('handles null parameter values', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.setBehaviorParam('nullable', null);

      expect(disc.getBehaviorParam('nullable')).toBeNull();
    });

    test('handles undefined parameter values', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.setBehaviorParam('undefinable', undefined);

      expect(disc.getBehaviorParam('undefinable')).toBeUndefined();
    });

    test('evaluates multiple matching rules correctly', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      disc.addRule({
        id: 'rule1',
        name: 'Rule 1',
        condition: (ctx: any) => ctx.score > 50,
        action: () => {},
        priority: 5,
      });

      disc.addRule({
        id: 'rule2',
        name: 'Rule 2',
        condition: (ctx: any) => ctx.score > 30,
        action: () => {},
        priority: 10,
      });

      disc.addRule({
        id: 'rule3',
        name: 'Rule 3',
        condition: (ctx: any) => ctx.score > 70,
        action: () => {},
        priority: 1,
      });

      const matchingRules = disc.evaluateRules({ score: 60 });

      expect(matchingRules.length).toBe(2);
      expect(matchingRules[0].id).toBe('rule2');
      expect(matchingRules[1].id).toBe('rule1');
    });

    test('handles complex algorithm execution', () => {
      const disc = new BehaviorDisc({ name: 'test' });

      const complexAlgo = (data: any[], options: any) => {
        return data
          .filter(item => item.score > options.threshold)
          .sort((a, b) => b.score - a.score)
          .slice(0, options.limit);
      };

      disc.setAlgorithm('recommend', complexAlgo);

      const algo = disc.getAlgorithm('recommend')!;
      const result = algo(
        [
          { id: 1, score: 85 },
          { id: 2, score: 45 },
          { id: 3, score: 95 },
          { id: 4, score: 65 },
        ],
        { threshold: 50, limit: 2 }
      );

      expect(result).toEqual([
        { id: 3, score: 95 },
        { id: 1, score: 85 },
      ]);
    });

    test('wrapped function preserves this context', () => {
      const disc = new BehaviorDisc({ name: 'test' });
      
      const obj = {
        value: 42,
        getValue: function() { return this.value; }
      };

      disc.wrapFunction('getValue', obj.getValue);
      const wrapped = disc.getWrappedFunction('getValue')!;

      const result = wrapped.call(obj);
      expect(result).toBe(42);
    });
  });
});
