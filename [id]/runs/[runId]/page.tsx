'use client';

import { useSubscription, useMutation } from '@apollo/client';
import { WATCH_STEP_RUNS, WATCH_WORKFLOW_RUN } from '@/graphql/subscriptions';
import { APPROVE_STEP } from '@/graphql/mutations';
import { STEP_TYPES, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useOrg } from '@/context/OrgContext';

export default function RunMonitor({ params }: { params: { id: string, runId: string } }) {
  const { currentOrg } = useOrg();
  const endOfListRef = useRef<HTMLDivElement>(null);

  const { data: stepRunsData, loading: stepsLoading } = useSubscription(WATCH_STEP_RUNS, {
    variables: { runId: params.runId }
  });
  
  const { data: runData, loading: runLoading } = useSubscription(WATCH_WORKFLOW_RUN, {
    variables: { runId: params.runId }
  });

  const [approveStep, { loading: approving }] = useMutation(APPROVE_STEP);

  const stepRuns = stepRunsData?.step_runs || [];
  const runStatus = runData?.workflow_runs_by_pk?.status;

  useEffect(() => {
    endOfListRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stepRuns]);

  const handleApprove = async (stepRunId: string, approved: boolean) => {
    try {
      await approveStep({ variables: { stepRunId, approved } });
    } catch (e) {
      console.error(e);
      alert('Failed to submit approval');
    }
  };

  if (stepsLoading || runLoading) return <div className="pulse-animation" style={{ color: 'var(--accent-blue)' }}>Loading run data...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      <header className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>Run Monitor</h1>
          <p style={{ color: 'var(--text-secondary)' }}>ID: {params.runId}</p>
        </div>
        <div>
          <span className={`badge badge-${runStatus}`} style={{ fontSize: '14px', padding: '6px 12px' }}>
            {STATUS_LABELS[runStatus as keyof typeof STATUS_LABELS] || runStatus}
          </span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <AnimatePresence>
          {stepRuns.map((stepRun: any) => {
            const step = stepRun.step;
            const typeInfo = STEP_TYPES[step.type as keyof typeof STEP_TYPES] || { icon: 'âš™ï¸', label: step.type };
            const isRunning = stepRun.status === 'running';
            const isPaused = stepRun.status === 'paused_approval';
            const statusColor = STATUS_COLORS[stepRun.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
            
            return (
              <motion.div 
                key={stepRun.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`glass-card ${isRunning ? 'pulse-animation' : ''}`}
                style={{ 
                  borderLeft: `4px solid ${statusColor}`,
                  boxShadow: isRunning ? `0 0 15px ${statusColor}40` : isPaused ? `0 0 15px ${statusColor}40` : 'none' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>{typeInfo.icon}</div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{step.step_order}. {step.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{typeInfo.label}</div>
                    </div>
                  </div>
                  <span className={`badge badge-${stepRun.status}`}>{STATUS_LABELS[stepRun.status as keyof typeof STATUS_LABELS] || stepRun.status}</span>
                </div>
                
                {stepRun.output && (
                  <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--text-secondary)', overflowX: 'auto', border: '1px solid var(--border-glass)', marginTop: '12px' }}>
                    <pre style={{ margin: 0, fontFamily: 'monospace' }}>{JSON.stringify(stepRun.output, null, 2)}</pre>
                  </div>
                )}
                
                {stepRun.error && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.3)', marginTop: '12px' }}>
                    {stepRun.error}
                  </div>
                )}
                
                {isPaused && (currentOrg?.role === 'owner' || currentOrg?.role === 'admin' || currentOrg?.role === 'editor') && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
                    <button className="btn btn-primary" onClick={() => handleApprove(stepRun.id, true)} disabled={approving} style={{ flex: 1 }}>
                      âœ“ Approve
                    </button>
                    <button className="btn btn-danger" onClick={() => handleApprove(stepRun.id, false)} disabled={approving} style={{ flex: 1 }}>
                      âœ— Reject
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={endOfListRef} />
      </div>
    </div>
  );
}
