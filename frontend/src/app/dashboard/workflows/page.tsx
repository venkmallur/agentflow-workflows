'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_ORG_WORKFLOWS } from '@/graphql/queries';
import { INSERT_WORKFLOW } from '@/graphql/mutations';
import { useOrg } from '@/context/OrgContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WorkflowsList() {
  const { currentOrg } = useOrg();
  const router = useRouter();
  
  const [insertWorkflow, { loading: isCreating }] = useMutation(INSERT_WORKFLOW);
  
  const { data, loading, error } = useQuery(GET_ORG_WORKFLOWS, {
    variables: { orgId: currentOrg?.id },
    skip: !currentOrg?.id,
  });

  if (!currentOrg) return <div>No organization selected.</div>;
  if (loading) return <div className="pulse-animation" style={{ color: 'var(--accent-blue)' }}>Loading workflows...</div>;
  if (error) return <div style={{ color: 'var(--accent-red)' }}>Error loading workflows.</div>;

  const workflows = data?.workflows || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Workflows</h1>
        {(currentOrg.role === 'owner' || currentOrg.role === 'admin' || currentOrg.role === 'editor') && (
          <button 
            className="btn btn-primary" 
            onClick={async () => {
              try {
                const { data } = await insertWorkflow({
                  variables: {
                    orgId: currentOrg.id,
                    name: 'My New AI Workflow',
                    description: 'A brand new workflow ready to be configured.',
                  },
                });
                if (data?.insert_workflows_one?.id) {
                  router.push(`/dashboard/workflows/${data.insert_workflows_one.id}`);
                }
              } catch (err) {
                console.error(err);
                alert('Failed to create workflow');
              }
            }}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : '+ New Workflow'}
          </button>
        )}
      </div>

      {workflows.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '64px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
          <h2 style={{ marginBottom: '8px' }}>No workflows yet</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Create your first AI workflow to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {workflows.map((wf: any, i: number) => (
            <Link href={`/dashboard/workflows/${wf.id}`} key={wf.id} style={{ textDecoration: 'none' }}>
              <motion.div 
                className="glass-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>{wf.name}</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', flex: 1 }}>{wf.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{wf.steps_aggregate?.aggregate?.count || 0} steps</span>
                  {wf.runs && wf.runs.length > 0 && (
                    <span className={`badge badge-${wf.runs[0].status}`}>{wf.runs[0].status}</span>
                  )}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
