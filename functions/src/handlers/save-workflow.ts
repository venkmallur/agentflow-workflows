import { Request, Response } from 'express';
import { query } from '../utils/hasura-client';
import { getOrgMembership, canManageWorkflow, checkStepTypePermission, checkTriggerTypePermission } from '../utils/permissions';

export default async (req: Request, res: Response) => {
  try {
    const userId = req.body.session_variables?.['x-hasura-user-id'];
    const input = req.body.input || {};
    const { id, org_id, name, description, steps = [], triggers = [] } = input;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!org_id) return res.status(400).json({ message: 'org_id is required' });

    // Check base permissions
    const membership = await getOrgMembership(userId, org_id);
    if (!membership || !canManageWorkflow(membership.role)) {
      return res.status(403).json({ message: 'Permission denied: must be owner or editor' });
    }

    // Check step & trigger level permissions
    for (const step of steps) {
      try {
        checkStepTypePermission(membership.role, step.type);
      } catch (e: any) {
        return res.status(403).json({ message: e.message });
      }
    }
    for (const trigger of triggers) {
      try {
        checkTriggerTypePermission(membership.role, trigger.type);
      } catch (e: any) {
        return res.status(403).json({ message: e.message });
      }
    }

    let workflowId = id;

    if (workflowId) {
      // Update existing
      await query(`
        mutation UpdateWorkflow($id: uuid!, $name: String!, $desc: String) {
          update_workflows_by_pk(pk_columns: {id: $id}, _set: {name: $name, description: $desc}) {
            id
          }
          delete_workflow_steps(where: {workflow_id: {_eq: $id}}) { affected_rows }
          delete_workflow_triggers(where: {workflow_id: {_eq: $id}}) { affected_rows }
        }
      `, { id: workflowId, name, desc: description || '' });
    } else {
      // Insert new
      const insertWf = await query(`
        mutation InsertWorkflow($orgId: uuid!, $name: String!, $desc: String) {
          insert_workflows_one(object: {org_id: $orgId, name: $name, description: $desc}) {
            id
          }
        }
      `, { orgId: org_id, name, desc: description || '' });
      workflowId = insertWf.insert_workflows_one.id;
    }

    // Insert steps and triggers
    if (steps.length > 0) {
      const stepObjects = steps.map((s: any) => ({
        workflow_id: workflowId,
        order: s.order,
        type: s.type,
        name: s.name || s.type,
        config: s.config || {}
      }));
      await query(`
        mutation InsertSteps($objects: [workflow_steps_insert_input!]!) {
          insert_workflow_steps(objects: $objects) { affected_rows }
        }
      `, { objects: stepObjects });
    }

    if (triggers.length > 0) {
      const triggerObjects = triggers.map((t: any) => ({
        workflow_id: workflowId,
        type: t.type,
        config: t.config || {},
        enabled: t.enabled !== undefined ? t.enabled : true
      }));
      await query(`
        mutation InsertTriggers($objects: [workflow_triggers_insert_input!]!) {
          insert_workflow_triggers(objects: $objects) { affected_rows }
        }
      `, { objects: triggerObjects });
    }

    return res.status(200).json({ success: true, workflow_id: workflowId });
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({ message: err.message || 'Error saving workflow' });
  }
};
