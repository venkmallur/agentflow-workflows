'use client';

import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_USER_ORGS } from '@/graphql/queries';
import { useOrg } from '@/context/OrgContext';
import { useRouter } from 'next/navigation';

export default function DashboardHome() {
  const { data, loading, error } = useQuery(GET_USER_ORGS);
  const { currentOrg, setCurrentOrg } = useOrg();
  const router = useRouter();

  useEffect(() => {
    if (data?.org_members && data.org_members.length > 0 && !currentOrg) {
      const member = data.org_members[0];
      setCurrentOrg({
        id: member.organization.id,
        name: member.organization.name,
        slug: member.organization.slug,
        role: member.role
      });
    }
  }, [data, currentOrg, setCurrentOrg]);

  useEffect(() => {
    if (currentOrg) {
      router.push('/dashboard/workflows');
    }
  }, [currentOrg, router]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading organizations...</div>;
  if (error) return <div style={{ color: 'var(--accent-red)' }}>Error: {error.message}</div>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Select an Organization</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {data?.org_members.map((member: any) => (
          <div 
            key={member.organization.id} 
            className="glass-card" 
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setCurrentOrg({
                id: member.organization.id,
                name: member.organization.name,
                slug: member.organization.slug,
                role: member.role
              });
              router.push('/dashboard/workflows');
            }}
          >
            <h3>{member.organization.name}</h3>
            <span className="badge badge-completed" style={{ marginTop: '8px' }}>{member.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
