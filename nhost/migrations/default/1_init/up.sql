-- 1. Create Enums
CREATE TYPE public.org_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.workflow_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.step_type AS ENUM ('llm_call', 'http_request', 'db_write', 'notify', 'conditional_branch', 'approval_gate');
CREATE TYPE public.trigger_type AS ENUM ('manual', 'webhook', 'scheduled', 'database_event');
CREATE TYPE public.run_status AS ENUM ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled');
CREATE TYPE public.step_run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped', 'paused_approval', 'approved');

-- 2. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Tables

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    quota_limit INTEGER NOT NULL DEFAULT 100,
    quota_used INTEGER NOT NULL DEFAULT 0,
    quota_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- FK handled externally/assumed to point to auth.users
    role public.org_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

CREATE TABLE public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status public.workflow_status NOT NULL DEFAULT 'draft',
    created_by UUID, -- FK to auth.users
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type public.step_type NOT NULL,
    step_order INTEGER NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_id, step_order)
);

CREATE TABLE public.workflow_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    type public.trigger_type NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    triggered_by UUID, -- FK to auth.users
    trigger_type public.trigger_type NOT NULL DEFAULT 'manual',
    status public.run_status NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.step_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    status public.step_run_status NOT NULL DEFAULT 'pending',
    input JSONB,
    output JSONB,
    error TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    approved_by UUID, -- FK to auth.users
    approved_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.watched_table_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    row_data JSONB,
    trigger_workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Apply Triggers for updated_at
CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_workflow_steps_updated_at BEFORE UPDATE ON public.workflow_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_workflow_triggers_updated_at BEFORE UPDATE ON public.workflow_triggers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_workflow_runs_updated_at BEFORE UPDATE ON public.workflow_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_step_runs_updated_at BEFORE UPDATE ON public.step_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Indexes
CREATE INDEX idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX idx_workflows_org_id ON public.workflows(org_id);
CREATE INDEX idx_workflows_created_by ON public.workflows(created_by);
CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_triggers_workflow_id ON public.workflow_triggers(workflow_id);
CREATE INDEX idx_workflow_runs_workflow_id ON public.workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_triggered_by ON public.workflow_runs(triggered_by);
CREATE INDEX idx_workflow_runs_created_at ON public.workflow_runs(created_at);
CREATE INDEX idx_step_runs_workflow_run_id ON public.step_runs(workflow_run_id);
CREATE INDEX idx_step_runs_step_id ON public.step_runs(step_id);

-- 6. Computed Fields / SQL Functions
CREATE OR REPLACE FUNCTION public.org_monthly_run_count(org_row public.organizations)
RETURNS INTEGER AS $$
    SELECT COALESCE(COUNT(*), 0)::integer
    FROM public.workflow_runs wr
    JOIN public.workflows w ON w.id = wr.workflow_id
    WHERE w.org_id = org_row.id
    AND wr.created_at >= org_row.quota_period_start;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.org_avg_run_duration_seconds(org_row public.organizations)
RETURNS NUMERIC AS $$
    SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (wr.completed_at - wr.started_at))),
        0
    )
    FROM public.workflow_runs wr
    JOIN public.workflows w ON w.id = wr.workflow_id
    WHERE w.org_id = org_row.id
    AND wr.completed_at IS NOT NULL
    AND wr.started_at IS NOT NULL;
$$ LANGUAGE sql STABLE;
