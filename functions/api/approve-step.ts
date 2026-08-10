import { Request, Response } from 'express';
import { query } from '../src/utils/hasura-client';
import { getOrgMembership, canApproveStep } from '../src/utils/permissions';
import { executeWorkflowSteps } from '../src/utils/workflow-executor';

export default async (req: Request, res: Response) => {
  try {
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    const { step_run_id } = req.body.input || {};

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!step_run_id) return res.status(400).json({ message: 'step_run_id is required' });

    // Get step_run info
    const srQuery = `
      query GetStepRun($id: uuid!) {
        step_runs_by_pk(id: $id) {
          id
          status
          step {
            order
          }
          workflow_run {
            id
            workflow {
              org_id
              steps {
                id
                order
                type
                config
              }
            }
          }
        }
      }
    `;
    const srData = await query(srQuery, { id: step_run_id });
    const stepRun = srData.step_runs_by_pk;

    if (!stepRun) return res.status(404).json({ message: 'Step run not found' });
    if (stepRun.status !== 'paused_approval') return res.status(400).json({ message: 'Step run is not paused for approval' });

    const orgId = stepRun.workflow_run.workflow.org_id;
    const runId = stepRun.workflow_run.id;
    const currentOrder = stepRun.step.order;
    const steps = stepRun.workflow_run.workflow.steps;

    // Check permissions
    const membership = await getOrgMembership(userId, orgId);
    if (!membership || !canApproveStep(membership.role)) {
      return res.status(403).json({ message: 'Permission denied: must be owner or editor to approve' });
    }

    // Update step_run and workflow_run
    await query(`
      mutation ApproveStep($stepRunId: uuid!, $userId: uuid!, $runId: uuid!) {
        update_step_runs_by_pk(pk_columns: {id: $stepRunId}, _set: {status: "approved", approved_by: $userId, approved_at: "now()"}) {
          id
        }
        update_workflow_runs_by_pk(pk_columns: {id: $runId}, _set: {status: "running"}) {
          id
        }
      }
    `, { stepRunId: step_run_id, userId, runId });

    // Resume execution asynchronously
    executeWorkflowSteps(runId, steps, currentOrder + 1).then(async (result) => {
      if (result.completed) {
        await query(`
          mutation CompleteRun($id: uuid!, $orgId: uuid!) {
            update_workflow_runs_by_pk(pk_columns: {id: $id}, _set: {status: "completed", completed_at: "now()"}) {
              id
            }
            update_organizations_by_pk(pk_columns: {id: $orgId}, _inc: {quota_used: 1}) {
              id
            }
          }
        `, { id: runId, orgId });
      } else if (result.error) {
        await query(`
          mutation FailRun($id: uuid!) {
            update_workflow_runs_by_pk(pk_columns: {id: $id}, _set: {status: "failed", completed_at: "now()"}) {
              id
            }
          }
        `, { id: runId });
      }
    }).catch(console.error);

    return res.status(200).json({ success: true, workflow_run_id: runId });
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ message: err.message || 'Error approving step' });
  }
};
