import { gql } from '@apollo/client';

export const WATCH_STEP_RUNS = gql`
  subscription WatchStepRuns($runId: uuid!) {
    step_runs(
      where: { workflow_run_id: { _eq: $runId } }
      order_by: { step: { step_order: asc } }
    ) {
      id
      status
      started_at
      completed_at
      output
      error
      step {
        name
        type
        step_order
      }
    }
  }
`;

export const WATCH_WORKFLOW_RUN = gql`
  subscription WatchWorkflowRun($runId: uuid!) {
    workflow_runs_by_pk(id: $runId) {
      id
      status
      started_at
      completed_at
    }
  }
`;
