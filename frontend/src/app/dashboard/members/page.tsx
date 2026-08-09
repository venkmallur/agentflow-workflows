'use client';

import { useQuery } from '@apollo/client';
import { GET_ORG_MEMBERS } from '@/graphql/queries';
import { useOrg } from '@/context/OrgContext';
import { motion } from 'framer-motion';

export default function MembersPage() {
  const { currentOrg } = useOrg();
  
  const { data, loading, error } = useQuery(GET_ORG_MEMBERS, {
    variables: { orgId: currentOrg?.id },
    skip: !currentOrg?.id,
  });

  if (!currentOrg) return <div>No organization selected.</div>;
  if (loading) return <div className="pulse-animation" style={{ color: 'var(--accent-blue)' }}>Loading members...</div>;
  if (error) return <div style={{ color: 'var(--accent-red)' }}>Error loading members.</div>;

  const members = data?.organization_members || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Organization Members</h1>
        {currentOrg.role === 'owner' && (
          <button className="btn btn-primary">Invite Member</button>
        )}
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Name</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Role</th>
              {currentOrg.role === 'owner' && <th style={{ textAlign: 'right', padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member: any, index: number) => (
              <motion.tr 
                key={member.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{ borderBottom: index < members.length - 1 ? '1px solid var(--border-glass)' : 'none' }}
              >
                <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{member.user.displayName || 'Unnamed User'}</td>
                <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{member.user.email}</td>
                <td style={{ padding: '16px' }}>
                  <span className="badge badge-completed">{member.role}</span>
                </td>
                {currentOrg.role === 'owner' && (
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>Edit</button>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
