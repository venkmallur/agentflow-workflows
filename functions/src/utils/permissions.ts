import { query } from './hasura-client';

export const getOrgMembership = async (userId: string, orgId: string) => {
  const q = `
    query GetOrgMembership($userId: uuid!, $orgId: uuid!) {
      org_members(where: {user_id: {_eq: $userId}, org_id: {_eq: $orgId}}) {
        role
        org_id
      }
    }
  `;
  const result = await query<{ org_members: { role: string; org_id: string }[] }>(q, { userId, orgId });
  return result.org_members[0] || null;
};

export const getOrgMembershipForWorkflow = async (userId: string, workflowId: string) => {
  const q = `
    query GetOrgMembershipForWorkflow($userId: uuid!, $workflowId: uuid!) {
      workflows_by_pk(id: $workflowId) {
        organization {
          org_members(where: {user_id: {_eq: $userId}}) {
            role
            org_id
          }
        }
      }
    }
  `;
  const result = await query(q, { userId, workflowId });
  const members = result?.workflows_by_pk?.organization?.org_members;
  return members && members.length > 0 ? members[0] : null;
};

export const canManageWorkflow = (role: string) => role === 'owner' || role === 'editor';
export const canTriggerRun = (role: string) => role === 'owner' || role === 'editor';
export const canApproveStep = (role: string) => role === 'owner' || role === 'editor';
export const isOwnerOnly = (role: string) => role === 'owner';

export const OWNER_ONLY_STEP_TYPES = ['db_write', 'notify'];
export const OWNER_ONLY_TRIGGER_TYPES = ['webhook'];

export const checkStepTypePermission = (role: string, stepType: string) => {
  if (OWNER_ONLY_STEP_TYPES.includes(stepType) && !isOwnerOnly(role)) {
    throw new Error(`Permission denied: Only owners can create or edit ${stepType} steps.`);
  }
};

export const checkTriggerTypePermission = (role: string, triggerType: string) => {
  if (OWNER_ONLY_TRIGGER_TYPES.includes(triggerType) && !isOwnerOnly(role)) {
    throw new Error(`Permission denied: Only owners can create or edit ${triggerType} triggers.`);
  }
};
