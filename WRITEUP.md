# AgentFlow Workflows â€” Technical Write-Up

## Schema Reasoning

### Why This Schema Shape

The data model follows a strict ownership hierarchy: **Organization â†’ Members â†’ Workflows â†’ Steps/Triggers â†’ Runs â†’ Step Runs**. Every piece of data traces back to an organization, which is the core multi-tenancy boundary.

**Key design decisions:**

1. **UUID primary keys everywhere** â€” prevents ID enumeration attacks and makes cross-org ID guessing infeasible even at the database level.

2. **Enums instead of strings** â€” `org_role`, `step_type`, `trigger_type`, `run_status`, and `step_run_status` are PostgreSQL enums. This gives us database-level validation without any application code, preventing invalid states from ever being stored.

3. **JSONB config columns** â€” `workflow_steps.config` and `workflow_triggers.config` use JSONB rather than separate tables per step/trigger type. This makes the schema extensible (adding a new step type doesn't require a migration) while keeping queries simple. The tradeoff is we lose column-level type safety, which we compensate for with validation in the Action handlers.

4. **`org_members` as a junction table** â€” a user can belong to multiple organizations. We deliberately do NOT store the org role in a JWT claim because a user's role varies per org. Instead, permissions check the `org_members` table dynamically via Hasura relationship traversal.

5. **`step_runs` separate from `workflow_steps`** â€” a step definition (what to do) is separate from a step execution (what happened). This means re-running a workflow creates new `step_run` records without touching the step definitions, and you get a full audit trail.

6. **`watched_table_events`** â€” a dedicated table for the database event trigger. An insert here fires a Hasura Event Trigger that evaluates whether any workflow should be triggered. This is a clean separation between "something happened in the database" and "a workflow should run."

---

## Two Permission Layers â€” How They're Enforced Differently

### Layer 1: Org + Role Scoping (Hasura Row-Level Permissions)

This is enforced **declaratively** in Hasura metadata. Every table's permission rules include a filter that traverses relationships back to `org_members` and checks `user_id = X-Hasura-User-Id`.

**Example â€” `workflows` table select permission:**
```yaml
filter:
  organization:
    org_members:
      user_id:
        _eq: X-Hasura-User-Id
```

This means:
- A user can only see workflows belonging to organizations where they are a member
- Even if a user knows a workflow UUID from another org, the query returns zero rows
- This is enforced at the **database query level** â€” Hasura appends WHERE clauses to every SQL query
- It works for queries, subscriptions, and direct table mutations alike
- No application code is involved; it's pure metadata configuration

**Role-based write restrictions** layer on top:
```yaml
# Only owner/editor can insert workflows
check:
  organization:
    org_members:
      _and:
        - user_id: { _eq: X-Hasura-User-Id }
        - role: { _in: [owner, editor] }
```

**Why this works for cross-org isolation:** A viewer in Org A and an editor in Org B both use the same Hasura `user` role. The permission filter checks their **specific org membership**, not a global role. An Org B editor physically cannot query Org A's data because the org_members join returns no rows.

### Layer 2: Step-Level Gating (Action Handler Logic)

Some permissions can't be expressed as row filters because they involve **business logic during execution**:

1. **Step type restrictions:** Only an owner can create `db_write` or `notify` steps (these interact with external systems). This is checked in the `saveWorkflow` Action handler.

2. **Trigger type restrictions:** Only an owner can create a `webhook` trigger (it exposes an inbound endpoint). Also checked in `saveWorkflow`.

3. **Approval gate authorization:** When a workflow is paused at an `approval_gate` step, the `approveStep` Action handler must verify the approver is an owner or editor **in the workflow's org** before resuming. This is a mid-execution decision â€” the workflow is already running, and a simple row-level permission can't express "this user may advance this specific run."

**Why this can't be Layer 1:** Hasura permissions operate on table rows â€” they can check "can this user see this step_run?" but not "should this user be allowed to resume the workflow engine?" The approval is an imperative action (update step_run + resume execution), not a simple row update. The handler fetches the org membership, checks the role, and only then updates the state and resumes step execution.

```typescript
// In approveStep handler â€” Layer 2 enforcement
const membership = await getOrgMembershipForWorkflow(userId, workflowId);
if (!membership || membership.role === 'viewer') {
  return res.status(403).json({ message: 'Only owners/editors can approve steps' });
}
```

---

## Approval Gate: Pause/Resume Implementation

### How Pause Works

1. The `triggerWorkflowRun` Action handler executes steps sequentially
2. When it encounters an `approval_gate` step:
   - Sets the `step_run.status` to `'paused_approval'`
   - Sets the `workflow_run.status` to `'paused'`
   - **Returns immediately** from the Action handler
3. The frontend subscription sees the status change in real-time and shows the approval UI

### How Resume Works

1. An authorized user clicks "Approve" in the UI
2. This calls the `approveStep` Action (a separate Hasura Action)
3. The handler:
   a. Validates the `step_run` is in `'paused_approval'` status
   b. Checks the caller's org membership and role (Layer 2)
   c. Updates `step_run`: status â†’ `'approved'`, sets `approved_by`, `approved_at`
   d. Updates `workflow_run`: status â†’ `'running'`
   e. Fetches the remaining steps (those with `step_order` > current step)
   f. Resumes sequential execution from the next step
   g. On completion, marks the run as `'completed'` and increments quota

### Why Two Separate Actions?

The pause/resume is split across two HTTP requests (`triggerWorkflowRun` and `approveStep`) because:
- The workflow may pause for hours or days while waiting for human approval
- We can't hold an HTTP connection open for that duration
- The state is persisted in the database (`step_run.status = 'paused_approval'`)
- The subscription provides the bridge â€” the frontend sees the pause in real-time and presents the approval button

### What the Frontend Sees

The subscription on `step_runs` filtered by `workflow_run_id` delivers real-time updates:

```
Step 1: llm_call       â†’ pending â†’ running â†’ completed âœ…
Step 2: conditional     â†’ pending â†’ running â†’ completed âœ…
Step 3: http_request    â†’ pending â†’ running â†’ completed âœ…
Step 4: approval_gate   â†’ pending â†’ running â†’ paused_approval â¸ï¸  â† UI shows "Approve" button
                         (user clicks Approve)
Step 4: approval_gate   â†’ approved âœ…
Step 5: db_write        â†’ pending â†’ running â†’ completed âœ…
Run: completed âœ…
```

Each status transition is a separate database update, and Hasura's live query subscription detects the change and pushes it to all connected clients â€” no polling, no page refresh.
