'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_WORKFLOW } from '@/graphql/queries';
import { TRIGGER_WORKFLOW_RUN } from '@/graphql/mutations';
import { STEP_TYPES } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function WorkflowEditor({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, loading, error } = useQuery(GET_WORKFLOW, {
    variables: { id: params.id }
  });
  
  const [triggerRun, { loading: triggering }] = useMutation(TRIGGER_WORKFLOW_RUN);

  if (loading) return <div className="pulse-animation" style={{ color: 'var(--accent-blue)' }}>Loading workflow...</div>;
  if (error) return <div style={{ color: 'var(--accent-red)' }}>Error loading workflow.</div>;

  const workflow = data?.workflows_by_pk;
  if (!workflow) return <div>Workflow not found.</div>;

  const handleRun = async () => {
    try {
      const res = await triggerRun({ variables: { workflowId: workflow.id, inputPayload: {} } });
      if (res.data?.triggerWorkflowRun?.run_id) {
        router.push(`/dashboard/workflows/${workflow.id}/runs/${res.data.triggerWorkflowRun.run_id}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to trigger run');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      <header className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>{workflow.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{workflow.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary">Save Changes</button>
          <button className="btn btn-primary" onClick={handleRun} disabled={triggering}>
            {triggering ? 'Starting...' : 'â–¶ Run Workflow'}
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', gap: '24px', overflow: 'hidden' }}>
        {/* Builder Area */}
        <div style={{ flex: 2, overflowY: 'auto', paddingRight: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: '600px' }}>
            {workflow.steps.map((step: any, idx: number) => {
              const typeInfo = STEP_TYPES[step.type as keyof typeof STEP_TYPES] || { icon: 'âš™ï¸', label: step.type };
              
              return (
                <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <motion.div 
                    className="glass-card" 
                    style={{ width: '100%', padding: '16px', cursor: 'pointer', borderLeft: '4px solid var(--accent-blue)' }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '24px' }}>{typeInfo.icon}</div>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{step.step_order}. {step.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{typeInfo.label}</div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {idx < workflow.steps.length - 1 && (
                    <div style={{ height: '30px', width: '2px', background: 'var(--border-glass)', margin: '4px 0' }} />
                  )}
                </div>
              );
            })}
            
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
              <button className="btn btn-secondary" style={{ borderRadius: '50%', width: '48px', height: '48px', fontSize: '24px' }}>+</button>
            </div>
          </div>
        </div>
        
        {/* Run History Sidebar */}
        <div className="glass-card" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>Recent Runs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {workflow.runs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No runs yet.</div>
            ) : (
              workflow.runs.map((run: any) => (
                <Link href={`/dashboard/workflows/${workflow.id}/runs/${run.id}`} key={run.id} style={{ textDecoration: 'none' }}>
                  <div className="glass-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                      {new Date(run.created_at).toLocaleString()}
                    </div>
                    <span className={`badge badge-${run.status}`}>{run.status}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
