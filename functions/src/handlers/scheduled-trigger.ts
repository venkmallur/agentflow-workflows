import { Request, Response } from 'express';
import { query } from '../utils/hasura-client';
import { executeWorkflowSteps } from '../utils/workflow-executor';

export default async (req: Request, res: Response) => {
  try {
    const triggersQuery = `
      query GetScheduledTriggers {
        workflow_triggers(where: {type: {_eq: "scheduled"}, enabled: {_eq: true}}) {
          id
          workflow_id
          config
          workflow {
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
      }
    `;
    const triggersData = await query(triggersQuery);
    const triggers = triggersData.workflow_triggers || [];

    for (const trigger of triggers) {
      const workflow = trigger.workflow;
      
      // In a real system, you'd check if trigger.config.schedule matches current time
      // For simplicity here, we assume if Hasura called it, it's time to run
      
      if (workflow.organization.quota_used >= workflow.organization.quota_limit) {
        console.warn(`Quota exhausted for org ${workflow.org_id}`);
        continue;
      }

      const createRunMutation = `
        mutation CreateRun($workflowId: uuid!) {
          insert_workflow_runs_one(object: {
            workflow_id: $workflowId,
            status: "running",
            trigger_type: "scheduled"
          }) {
            id
          }
        }
      `;
      const runResult = await query(createRunMutation, { workflowId: trigger.workflow_id });
      const runId = runResult.insert_workflow_runs_one.id;

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
    }

    return res.status(200).json({ success: true, message: `Processed ${triggers.length} triggers` });
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ message: err.message || 'Error processing scheduled triggers' });
  }
};
