import { Request, Response } from 'express';
import { query } from '../utils/hasura-client';
import { executeWorkflowSteps } from '../utils/workflow-executor';

export default async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    if (!workflowId) return res.status(400).json({ message: 'workflowId parameter is required' });

    // Check workflow and webhook trigger
    const wfQuery = `
      query GetWorkflowWithWebhook($id: uuid!) {
        workflows_by_pk(id: $id) {
          id
          org_id
          organization {
            quota_used
            quota_limit
          }
          triggers(where: {type: {_eq: "webhook"}, enabled: {_eq: true}}) {
            id
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
    const wfData = await query(wfQuery, { id: workflowId });
    const workflow = wfData.workflows_by_pk;

    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
    if (!workflow.triggers || workflow.triggers.length === 0) {
      return res.status(404).json({ message: 'Workflow does not have an enabled webhook trigger' });
    }

    if (workflow.organization.quota_used >= workflow.organization.quota_limit) {
      return res.status(400).json({ message: 'Quota exhausted' });
    }

    // Create run
    const createRunMutation = `
      mutation CreateRun($workflowId: uuid!) {
        insert_workflow_runs_one(object: {
          workflow_id: $workflowId,
          status: "running",
          trigger_type: "webhook"
        }) {
          id
        }
      }
    `;
    const runResult = await query(createRunMutation, { workflowId });
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

    // Execute asynchronously
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

    return res.status(200).json({ success: true, workflow_run_id: runId });
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ message: err.message || 'Error executing webhook trigger' });
  }
};
