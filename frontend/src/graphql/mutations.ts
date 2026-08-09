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
