import { gql } from '@apollo/client';

export const TRIGGER_WORKFLOW_RUN = gql`
  mutation TriggerWorkflowRun($workflowId: uuid!) {
    triggerWorkflowRun(workflow_id: $workflowId) {
      workflow_run_id
      success
      message
    }
  }
`;

export const APPROVE_STEP = gql`
  mutation ApproveStep($stepRunId: uuid!) {
    approveStep(step_run_id: $stepRunId) {
      success
      message
      workflow_run_id
    }
  }
`;

export const SAVE_WORKFLOW = gql`
  mutation SaveWorkflow($input: SaveWorkflowInput!) {
    saveWorkflow(input: $input) {
      workflow_id
      success
      message
    }
  }
`;

export const INSERT_WORKFLOW = gql`
  mutation InsertWorkflow($orgId: uuid!, $name: String!, $description: String!) {
    insert_workflows_one(object: { org_id: $orgId, name: $name, description: $description, status: "draft" }) {
      id
    }
  }
`;

export const INSERT_WORKFLOW_STEP = gql`
  mutation InsertWorkflowStep($workflowId: uuid!, $name: String!, $type: step_type!, $stepOrder: Int!) {
    insert_workflow_steps_one(object: { workflow_id: $workflowId, name: $name, type: $type, step_order: $stepOrder, config: {} }) {
      id
    }
  }
`;
