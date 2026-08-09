import { hasuraClient, query } from './hasura-client';
import { executeStep } from './step-executor';

export const executeWorkflowSteps = async (
  workflowRunId: string,
  steps: any[],
  startFromOrder: number,
) => {
  let previousOutput: any = null;
  
  // Sort steps by order
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
  
  let currentIndex = sortedSteps.findIndex(s => s.order >= startFromOrder);
  if (currentIndex === -1) {
    return { completed: true, paused: false };
  }

  while (currentIndex < sortedSteps.length) {
    const step = sortedSteps[currentIndex];
    
    // Update step_run to running
    await query(`
      mutation UpdateStepRunStart($workflowRunId: uuid!, $stepId: uuid!) {
        update_step_runs(where: {workflow_run_id: {_eq: $workflowRunId}, step_id: {_eq: $stepId}}, _set: {status: "running", started_at: "now()"}) {
          affected_rows
        }
      }
    `, { workflowRunId, stepId: step.id });
    
    try {
      const result = await executeStep(step.type, step.config, previousOutput, hasuraClient);
      
      if (result?.requires_approval) {
        // Paused for approval
        await query(`
          mutation UpdateStepRunApproval($workflowRunId: uuid!, $stepId: uuid!) {
            update_step_runs(where: {workflow_run_id: {_eq: $workflowRunId}, step_id: {_eq: $stepId}}, _set: {status: "paused_approval"}) {
              affected_rows
            }
          }
        `, { workflowRunId, stepId: step.id });
        
        await query(`
          mutation UpdateWorkflowRunPause($id: uuid!) {
            update_workflow_runs_by_pk(pk_columns: {id: $id}, _set: {status: "paused"}) {
              id
            }
          }
        `, { id: workflowRunId });
        
        return { completed: false, paused: true };
      }
      
      // Complete step
      previousOutput = result;
      const resultStr = typeof result === 'object' ? JSON.stringify(result) : String(result);
      
      await query(`
        mutation UpdateStepRunComplete($workflowRunId: uuid!, $stepId: uuid!, $output: String!) {
          update_step_runs(where: {workflow_run_id: {_eq: $workflowRunId}, step_id: {_eq: $stepId}}, _set: {status: "completed", completed_at: "now()", output: $output}) {
            affected_rows
          }
        }
      `, { workflowRunId, stepId: step.id, output: resultStr });
      
      if (step.type === 'conditional_branch' && result.skip_to) {
        // Skip intermediate steps
        const skipToOrder = result.skip_to;
        const skipToIndex = sortedSteps.findIndex(s => s.order >= skipToOrder);
        
        if (skipToIndex > currentIndex + 1) {
          const stepsToSkip = sortedSteps.slice(currentIndex + 1, skipToIndex);
          for (const s of stepsToSkip) {
            await query(`
              mutation SkipStep($workflowRunId: uuid!, $stepId: uuid!) {
                update_step_runs(where: {workflow_run_id: {_eq: $workflowRunId}, step_id: {_eq: $stepId}}, _set: {status: "skipped"}) {
                  affected_rows
                }
              }
            `, { workflowRunId, stepId: s.id });
          }
        }
        
        if (skipToIndex !== -1) {
          currentIndex = skipToIndex;
          await new Promise(r => setTimeout(r, 500));
          continue;
        } else {
          break; // skip to end
        }
      }
      
    } catch (error: any) {
      await query(`
        mutation UpdateStepRunFail($workflowRunId: uuid!, $stepId: uuid!, $error: String!) {
          update_step_runs(where: {workflow_run_id: {_eq: $workflowRunId}, step_id: {_eq: $stepId}}, _set: {status: "failed", error: $error, completed_at: "now()"}) {
            affected_rows
          }
        }
      `, { workflowRunId, stepId: step.id, error: String(error.message || error) });
      
      return { completed: false, paused: false, error: String(error.message) };
    }
    
    currentIndex++;
    await new Promise(r => setTimeout(r, 500)); // small delay for UI updates
  }
  
  return { completed: true, paused: false };
};
