/**
 * React Components for Universal DJ Layer
 * 
 * Pre-built components for common DJ Layer patterns and UI controls.
 */

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { DJEngine, ControlResult } from '../../core/dj-engine';
import { StateManager } from '../../core/state-manager';
import { AuditLog } from '../../audit/audit-log';
import { useFeatureFlag, useTheme, useControlAPI, useAuditLog } from './hooks';

// Context for DJ Engine
const DJEngineContext = createContext<DJEngine | null>(null);
const StateManagerContext = createContext<StateManager | null>(null);
const AuditLogContext = createContext<AuditLog | null>(null);

/**
 * Provider component to inject DJ Engine into React tree
 * @example
 * <DJEngineProvider djEngine={djEngine}>
 *   <App />
 * </DJEngineProvider>
 */
export function DJEngineProvider({ 
  djEngine, 
  stateManager,
  auditLog,
  children 
}: { 
  djEngine: DJEngine;
  stateManager?: StateManager;
  auditLog?: AuditLog;
  children: ReactNode;
}) {
  return (
    <DJEngineContext.Provider value={djEngine}>
      <StateManagerContext.Provider value={stateManager || null}>
        <AuditLogContext.Provider value={auditLog || null}>
          {children}
        </AuditLogContext.Provider>
      </StateManagerContext.Provider>
    </DJEngineContext.Provider>
  );
}

/**
 * Hook to access DJ Engine from context
 */
export function useDJEngine() {
  const djEngine = useContext(DJEngineContext);
  if (!djEngine) {
    throw new Error('useDJEngine must be used within DJEngineProvider');
  }
  return djEngine;
}

/**
 * Hook to access StateManager from context
 */
export function useStateManager() {
  const stateManager = useContext(StateManagerContext);
  if (!stateManager) {
    throw new Error('useStateManager must be used within DJEngineProvider with stateManager prop');
  }
  return stateManager;
}

/**
 * Hook to access AuditLog from context
 */
export function useAuditLogContext() {
  const auditLog = useContext(AuditLogContext);
  if (!auditLog) {
    throw new Error('useAuditLogContext must be used within DJEngineProvider with auditLog prop');
  }
  return auditLog;
}

/**
 * Component for conditional rendering based on feature flags
 * @example
 * <FeatureToggle feature="dark-mode">
 *   <DarkModeUI />
 * </FeatureToggle>
 */
export function FeatureToggle({
  feature,
  children,
  fallback = null,
}: {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const djEngine = useDJEngine();
  const { enabled, loading } = useFeatureFlag(djEngine, feature);

  if (loading) {
    return <>{fallback}</>;
  }

  return <>{enabled ? children : fallback}</>;
}

/**
 * Theme provider that syncs with DJ Layer
 * @example
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const djEngine = useDJEngine();
  const { theme, loading } = useTheme(djEngine);

  useEffect(() => {
    // Apply theme to document
    if (!loading) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, loading]);

  return <>{children}</>;
}

/**
 * Control panel for managing DJ Layer controls
 * @example
 * <ControlPanel role={adminRole} />
 */
export function ControlPanel({ role }: { role: any }) {
  const djEngine = useDJEngine();
  const { controls, loading, error, revertControl } = useControlAPI(djEngine);
  const [selectedControl, setSelectedControl] = useState<string | null>(null);

  if (loading) {
    return <div className="control-panel loading">Loading controls...</div>;
  }

  if (error) {
    return <div className="control-panel error">Error: {error.message}</div>;
  }

  return (
    <div className="control-panel">
      <h2>Active Controls</h2>
      <div className="controls-list">
        {controls.length === 0 ? (
          <p>No active controls</p>
        ) : (
          controls.map((control) => (
            <div 
              key={control.controlId} 
              className={`control-item ${selectedControl === control.controlId ? 'selected' : ''}`}
              onClick={() => setSelectedControl(control.controlId)}
            >
              <div className="control-header">
                <span className="control-id">{control.controlId}</span>
                <span className={`control-status ${control.status}`}>
                  {control.status}
                </span>
              </div>
              <div className="control-info">
                <span>Applied: {new Date(control.timestamp).toLocaleString()}</span>
                <span>Systems: {control.affectedSystems.join(', ')}</span>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(`Revert control ${control.controlId}?`)) {
                    await revertControl(control.controlId, role);
                  }
                }}
                className="revert-button"
              >
                Revert
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Audit log viewer component
 * @example
 * <AuditLogViewer actorId="user-123" limit={50} />
 */
export function AuditLogViewer({ 
  actorId, 
  limit = 50 
}: { 
  actorId?: string; 
  limit?: number;
}) {
  const auditLog = useAuditLogContext();
  const { entries, loading, error } = useAuditLog(auditLog, { actorId, limit });

  if (loading) {
    return <div className="audit-log loading">Loading audit log...</div>;
  }

  if (error) {
    return <div className="audit-log error">Error: {error.message}</div>;
  }

  return (
    <div className="audit-log">
      <h2>Audit Log</h2>
      <div className="audit-entries">
        {entries.length === 0 ? (
          <p>No audit entries</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.entryId} className="audit-entry">
              <div className="entry-header">
                <span className="entry-timestamp">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <span className={`entry-action ${entry.action}`}>
                  {entry.action}
                </span>
                <span className={`entry-result ${entry.result}`}>
                  {entry.result}
                </span>
              </div>
              <div className="entry-details">
                <span>Actor: {entry.actorId} ({entry.actorRole})</span>
                {entry.controlId && <span>Control: {entry.controlId}</span>}
                {entry.discType && <span>Type: {entry.discType}</span>}
              </div>
              {entry.error && (
                <div className="entry-error">{entry.error}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Snapshot viewer and manager
 * @example
 * <SnapshotManager />
 */
export function SnapshotManager() {
  const stateManager = useStateManager();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSnapshots = async () => {
      try {
        const allSnapshots = await stateManager.listSnapshots();
        setSnapshots(allSnapshots);
      } finally {
        setLoading(false);
      }
    };

    loadSnapshots();

    // Listen for snapshot events
    const handleUpdate = () => loadSnapshots();
    stateManager.on('snapshot-created', handleUpdate);
    stateManager.on('snapshot-restored', handleUpdate);
    stateManager.on('snapshot-deleted', handleUpdate);

    return () => {
      stateManager.off('snapshot-created', handleUpdate);
      stateManager.off('snapshot-restored', handleUpdate);
      stateManager.off('snapshot-deleted', handleUpdate);
    };
  }, [stateManager]);

  const handleCreateSnapshot = async () => {
    const reason = prompt('Snapshot reason:');
    if (reason) {
      await stateManager.createSnapshot({ reason });
    }
  };

  const handleRollback = async (snapshotId: string) => {
    if (confirm(`Rollback to snapshot ${snapshotId}?`)) {
      await stateManager.rollbackToSnapshot(snapshotId);
    }
  };

  if (loading) {
    return <div className="snapshot-manager loading">Loading snapshots...</div>;
  }

  return (
    <div className="snapshot-manager">
      <div className="snapshot-header">
        <h2>State Snapshots</h2>
        <button onClick={handleCreateSnapshot} className="create-button">
          Create Snapshot
        </button>
      </div>
      <div className="snapshots-list">
        {snapshots.length === 0 ? (
          <p>No snapshots</p>
        ) : (
          snapshots.map((snapshot) => (
            <div key={snapshot.snapshotId} className="snapshot-item">
              <div className="snapshot-info">
                <span className="snapshot-id">{snapshot.snapshotId}</span>
                <span className="snapshot-time">
                  {new Date(snapshot.timestamp).toLocaleString()}
                </span>
                <span className="snapshot-controls">
                  Controls: {snapshot.activeControls.length}
                </span>
              </div>
              {snapshot.metadata?.reason && (
                <div className="snapshot-reason">{snapshot.metadata.reason}</div>
              )}
              <button
                onClick={() => handleRollback(snapshot.snapshotId)}
                className="rollback-button"
              >
                Rollback
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Control preview component
 * @example
 * <ControlPreview disc={featureDisc} role={userRole} />
 */
export function ControlPreview({ 
  disc, 
  role,
  onApply,
  onCancel,
}: { 
  disc: any; 
  role: any;
  onApply?: () => void;
  onCancel?: () => void;
}) {
  const djEngine = useDJEngine();
  const { previewControl } = useControlAPI(djEngine);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const result = await previewControl(disc, role);
        setPreview(result);
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [disc, role, previewControl]);

  if (loading) {
    return <div className="control-preview loading">Calculating preview...</div>;
  }

  return (
    <div className={`control-preview ${preview?.safe ? 'safe' : 'unsafe'}`}>
      <h3>Preview: {disc.metadata.name}</h3>
      
      <div className="preview-status">
        <span className={`safety ${preview?.safe ? 'safe' : 'unsafe'}`}>
          {preview?.safe ? '✓ Safe to apply' : '⚠ Potential issues'}
        </span>
      </div>

      <div className="preview-section">
        <h4>Affected Systems</h4>
        <ul>
          {preview?.affectedSystems.map((system: string) => (
            <li key={system}>{system}</li>
          ))}
        </ul>
      </div>

      {preview?.potentialIssues && preview.potentialIssues.length > 0 && (
        <div className="preview-section issues">
          <h4>Potential Issues</h4>
          <ul>
            {preview.potentialIssues.map((issue: string, idx: number) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {preview?.diff && (
        <div className="preview-section diff">
          <h4>Changes</h4>
          <pre>{JSON.stringify(preview.diff, null, 2)}</pre>
        </div>
      )}

      <div className="preview-actions">
        <button onClick={onApply} disabled={!preview?.safe}>
          Apply Control
        </button>
        <button onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
