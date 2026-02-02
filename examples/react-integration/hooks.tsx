/**
 * React Hooks for Universal DJ Layer
 * 
 * Custom hooks for integrating DJ Layer controls into React applications.
 * Provides reactive state management and automatic updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StateManager, StateSnapshot } from '../../core/state-manager';
import { AuditLog } from '../../audit/audit-log';
import { DJEngine, ControlResult } from '../../core/dj-engine';

/**
 * Hook for managing feature flags with DJ Layer
 * @param djEngine - DJEngine instance
 * @param featureKey - Feature flag key to track
 * @returns Object with feature state and update function
 * @example
 * const { enabled, toggle, loading } = useFeatureFlag(dj, 'dark-mode');
 */
export function useFeatureFlag(djEngine: DJEngine, featureKey: string) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadFeatureState = async () => {
      try {
        setLoading(true);
        // Query current state from DJ Engine
        const controls = await djEngine.listControls({ discType: 'feature' });
        const featureControl = controls.find(c => 
          c.affectedSystems.includes(featureKey)
        );
        setEnabled(!!featureControl);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadFeatureState();
  }, [djEngine, featureKey]);

  const toggle = useCallback(async () => {
    try {
      setLoading(true);
      // Toggle feature via DJ Engine
      // Implementation depends on your feature disc setup
      setEnabled(prev => !prev);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [djEngine, featureKey]);

  return { enabled, toggle, loading, error };
}

/**
 * Hook for theme management with DJ Layer
 * @param djEngine - DJEngine instance
 * @returns Object with current theme and setter function
 * @example
 * const { theme, setTheme, loading } = useTheme(dj);
 * setTheme('dark');
 */
export function useTheme(djEngine: DJEngine) {
  const [theme, setThemeState] = useState<string>('light');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        setLoading(true);
        const controls = await djEngine.listControls({ discType: 'ui' });
        const themeControl = controls.find(c => 
          c.affectedSystems.includes('theme')
        );
        if (themeControl) {
          // Extract theme from control metadata
          // Implementation depends on your UI disc setup
        }
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [djEngine]);

  const setTheme = useCallback(async (newTheme: string) => {
    try {
      setLoading(true);
      // Apply theme via DJ Engine
      // Implementation depends on your UI disc setup
      setThemeState(newTheme);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [djEngine]);

  return { theme, setTheme, loading, error };
}

/**
 * Hook for accessing DJ Engine control API
 * @param djEngine - DJEngine instance
 * @returns Object with control methods and state
 * @example
 * const { applyControl, revertControl, controls, loading } = useControlAPI(dj);
 */
export function useControlAPI(djEngine: DJEngine) {
  const [controls, setControls] = useState<ControlResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshControls = useCallback(async () => {
    try {
      setLoading(true);
      const activeControls = await djEngine.listControls({ status: 'active' });
      setControls(activeControls);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [djEngine]);

  useEffect(() => {
    refreshControls();
  }, [refreshControls]);

  const applyControl = useCallback(async (disc: any, role: any) => {
    try {
      setLoading(true);
      const result = await djEngine.applyControl(disc, role);
      await refreshControls();
      setError(null);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [djEngine, refreshControls]);

  const revertControl = useCallback(async (controlId: string, role: any) => {
    try {
      setLoading(true);
      await djEngine.revertControl(controlId, role);
      await refreshControls();
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [djEngine, refreshControls]);

  const previewControl = useCallback(async (disc: any, role: any) => {
    try {
      setLoading(true);
      const preview = await djEngine.previewControl(disc, role);
      setError(null);
      return preview;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [djEngine]);

  return {
    controls,
    loading,
    error,
    applyControl,
    revertControl,
    previewControl,
    refreshControls,
  };
}

/**
 * Hook for state snapshots
 * @param stateManager - StateManager instance
 * @returns Object with snapshot methods and state
 * @example
 * const { createSnapshot, rollback, snapshots } = useStateSnapshots(stateManager);
 */
export function useStateSnapshots(stateManager: StateManager) {
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const loadSnapshots = useCallback(async () => {
    try {
      setLoading(true);
      const allSnapshots = await stateManager.listSnapshots();
      setSnapshots(allSnapshots);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [stateManager]);

  useEffect(() => {
    loadSnapshots();

    // Listen for snapshot events
    const handleSnapshot = () => loadSnapshots();
    stateManager.on('snapshot-created', handleSnapshot);
    stateManager.on('snapshot-deleted', handleSnapshot);
    stateManager.on('snapshot-restored', handleSnapshot);

    return () => {
      stateManager.off('snapshot-created', handleSnapshot);
      stateManager.off('snapshot-deleted', handleSnapshot);
      stateManager.off('snapshot-restored', handleSnapshot);
    };
  }, [stateManager, loadSnapshots]);

  const createSnapshot = useCallback(async (metadata?: Record<string, any>) => {
    try {
      setLoading(true);
      const snapshot = await stateManager.createSnapshot(metadata);
      setError(null);
      return snapshot;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [stateManager]);

  const rollback = useCallback(async (snapshotId: string) => {
    try {
      setLoading(true);
      await stateManager.rollbackToSnapshot(snapshotId);
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [stateManager]);

  return {
    snapshots,
    loading,
    error,
    createSnapshot,
    rollback,
    loadSnapshots,
  };
}

/**
 * Hook for audit log streaming
 * @param auditLog - AuditLog instance
 * @returns Real-time audit entries
 * @example
 * const { entries, loading } = useAuditLog(auditLog, { actorId: 'user-123' });
 */
export function useAuditLog(auditLog: AuditLog, options?: any) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loadAndStreamAudit = async () => {
      try {
        setLoading(true);
        
        // Load initial entries
        const initialEntries = await auditLog.query(options);
        setEntries(initialEntries);

        // Stream new entries
        const unsubscribe = await auditLog.stream((entry) => {
          setEntries(prev => [entry, ...prev]);
        });
        unsubscribeRef.current = unsubscribe;

        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadAndStreamAudit();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [auditLog, options]);

  return { entries, loading, error };
}

/**
 * Hook for DJ Engine state
 * @param djEngine - DJEngine instance
 * @returns Current DJ Engine state and refresh function
 * @example
 * const { state, loading, refresh } = useDJState(dj);
 */
export function useDJState(djEngine: DJEngine) {
  const [state, setState] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      // Get current state from DJ Engine
      // Implementation depends on your setup
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [djEngine]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, loading, error, refresh };
}
