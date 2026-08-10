export const STEP_TYPES = {
  llm_call: { label: 'LLM Call', icon: '🤖' },
  http_request: { label: 'HTTP Request', icon: '🌐' },
  db_write: { label: 'DB Write', icon: '💾' },
  notify: { label: 'Notify', icon: '🔔' },
  conditional_branch: { label: 'Condition', icon: '🔀' },
  approval_gate: { label: 'Approval', icon: '✋' }
};

export const STATUS_COLORS = {
  pending: 'var(--text-muted)',
  running: 'var(--accent-blue)',
  completed: 'var(--accent-emerald)',
  failed: 'var(--accent-red)',
  paused_approval: 'var(--accent-amber)',
  paused: 'var(--accent-amber)'
};

export const STATUS_LABELS = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  paused_approval: 'Awaiting Approval',
  paused: 'Paused'
};
