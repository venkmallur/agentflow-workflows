import { Request, Response } from 'express';
import { query } from '../src/utils/hasura-client';
import { executeWorkflowSteps } from '../src/utils/workflow-executor';

export default async (req: Request, res: Response) => {
  try {
    const eventBody = req.body.event;
    if (!eventBody || !eventBody.data || !eventBody.data.new) {
      return res.status(400).json({ message: 'Invalid event payload' });
    }

    const newData = eventBody.data.new;
    const triggerWorkflowId = newData.trigger_workflow_id;
    const table = req.body.table?.name;

    let workflowsToRun: any[] = [];

    if (triggerWorkflowId) {
      // Explicit trigger
      const wfQuery = `
        query GetExplicitWorkflow($id: uuid!) {
          workflows_by_pk(id: $id) {
            id
            org_id
            organization { quota_used quota_limit }
            steps { id order type config }
          }
        }
      `;
      const wfData = await query(wfQuery, { id: triggerWorkflowId });
      if (wfData.workflows_by_pk) {
        workflowsToRun.push(wfData.workflows_by_pk);
      }
    } else if (table) {
      // Look for DB event triggers on this table
      const triggersQuery = `
        query GetDbTriggers($table: String!) {
          workflow_triggers(where: {type: {_eq: "database_event"}, enabled: {_eq: true}}) {
            workflow {
              id
              org_id
              organization { quota_used quota_limit }
              steps { id order type config }
            }
            config
          }
        }
      `;
      const triggersData = await query(triggersQuery, { table });
      const triggers = triggersData.workflow_triggers || [];
      
      for (const t of triggers) {
        if (t.config?.table_name === table) {
          workflowsToRun.push(t.workflow);
        }
      }
    }

    for (const workflow of workflowsToRun) {
      if (workflow.organization.quota_used >= workflow.organization.quota_limit) {
        console.warn(`Quota exhausted for org ${workflow.org_id}`);
        continue;
      }

      const createRunMutation = `
        mutation CreateRun($workflowId: uuid!) {
          insert_workflow_runs_one(object: {
            workflow_id: $workflowId,
            status: "running",
            trigger_type: "database_event"
          }) {
            id
          }
        }
      `;
      const runResult = await query(createRunMutation, { workflowId: workflow.id });
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

    return res.status(200).json({ success: true, message: `Triggered ${workflowsToRun.length} workflows` });
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ message: err.message || 'Error processing event trigger' });
  }
};
