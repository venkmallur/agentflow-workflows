import { gql } from '@apollo/client';

export const GET_USER_ORGS = gql`
  query GetUserOrgs {
    org_members {
      id
      role
      org_id
      organization {
        id
        name
        slug
        quota_limit
        quota_used
      }
    }
  }
`;

export const GET_ORG_WORKFLOWS = gql`
  query GetOrgWorkflows($orgId: uuid!) {
    workflows(where: { org_id: { _eq: $orgId } }, order_by: { updated_at: desc }) {
      id
      name
      description
      status
      created_at
      updated_at
      steps(order_by: { step_order: asc }) {
        id
        name
        type
        step_order
      }
      triggers {
        id
        type
        config
        enabled
      }
      runs(limit: 1, order_by: { created_at: desc }) {
        id
        status
        created_at
      }
    }
  }
`;

export const GET_WORKFLOW = gql`
  query GetWorkflow($id: uuid!) {
    workflows_by_pk(id: $id) {
      id
      name
      description
      status
      org_id
      created_by
      steps(order_by: { step_order: asc }) {
        id
        name
        type
        step_order
        config
      }
      triggers {
        id
        type
        config
        enabled
      }
      runs(limit: 10, order_by: { created_at: desc }) {
        id
        status
        trigger_type
        started_at
        completed_at
        created_at
      }
    }
  }
`;

export const GET_WORKFLOW_RUN = gql`
  query GetWorkflowRun($id: uuid!) {
    workflow_runs_by_pk(id: $id) {
      id
      status
      trigger_type
      started_at
      completed_at
      error
      workflow_id
      workflow {
        name
        org_id
      }
      step_runs(order_by: { step_order: asc }) {
        id
        status
        step_order
        input
        output
        error
        attempt_count
        approved_by
        approved_at
        started_at
        completed_at
        step {
          id
          name
          type
          step_order
          config
        }
      }
    }
  }
`;

export const GET_ORG_MEMBERS = gql`
  query GetOrgMembers($orgId: uuid!) {
    org_members(where: { org_id: { _eq: $orgId } }) {
      id
      user_id
      role
      created_at
    }
  }
`;

export const GET_ORG_USAGE = gql`
  query GetOrgUsage($orgId: uuid!) {
    organizations_by_pk(id: $orgId) {
      id
      name
      quota_limit
      quota_used
      monthly_run_count
      avg_run_duration
    }
  }
`;
