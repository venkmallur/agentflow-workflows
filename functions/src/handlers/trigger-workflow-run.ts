import { Request, Response } from 'express';
import { query } from '../utils/hasura-client';
import { getOrgMembership, canTriggerRun } from '../utils/permissions';
import { executeWorkflowSteps } from '../utils/workflow-executor';

export default async (req: Request, res: Response) => {
  try {
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    const { workflow_id } = req.body.input || {};

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!workflow_id) return res.status(400).json({ message: 'workflow_id is required' });

    // Get workflow details
    const wfQuery = `
      query GetWorkflow($id: uuid!) {
        workflows_by_pk(id: $id) {
          id
          org_id
          organization {
            quota_used
            quota_limit
          }
          steps {
            id
            order
            type
            config
          }
        }
      }
    `;
    const wfData = await query(wfQuery, { id: workflow_id });
    const workflow = wfData.workflows_by_pk;

    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    // Check permissions
    const membership = await getOrgMembership(userId, workflow.org_id);
    if (!membership || !canTriggerRun(membership.role)) {
      return res.status(403).json({ message: 'Permission denied: must be owner or editor' });
    }

    // Check quota
    if (workflow.organization.quota_used >= workflow.organization.quota_limit) {
      return res.status(400).json({ message: 'Quota exhausted' });
    }

    // Create workflow run
    const createRunMutation = `
      mutation CreateRun($workflowId: uuid!, $userId: uuid!) {
        insert_workflow_runs_one(object: {
          workflow_id: $workflowId,
          status: "running",
          triggered_by: $userId,
          trigger_type: "manual"
        }) {
          id
        }
      }
    `;
    const runResult = await query(createRunMutation, { workflowId: workflow_id, userId });
    const runId = runResult.insert_workflow_runs_one.id;

    // Create step runs
    const stepRuns = workflow.steps.map((s: any) => ({
      workflow_run_id: runId,
      step_id: s.id,
      status: 'pending'
    }));
    
    if (stepRuns.length > 0) {
      await query(`
        mutation InsertStepRuns($objects: [step_runs_insert_input!]!) {
          insert_step_runs(objects: $objects) {
            affected_rows
          }
        }
      `, { objects: stepRuns });
    }

    // Start execution asynchronously (do not block the response)
    executeWorkflowSteps(runId, workflow.steps, 0).then(async (result) => {
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
        `, { id: runId, orgId: workflow.org_id });
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

    return res.status(200).json({ workflow_run_id: runId, success: true });
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ message: err.message || 'Error executing workflow' });
  }
};
