-- AgentFlow WORKFLOWS - SEED DATA
-- ================================
-- Important: Users must be created through the Auth service first.
-- After creating users, update the user_id values below to match.
-- 
-- To create users:
-- POST http://localhost:4000/signup/email-password
-- Body: { "email": "alice@acme.ai", "password": "password123", "options": { "displayName": "Alice" } }

-- 1. Organizations
INSERT INTO public.organizations (id, name, slug, quota_limit, quota_used) VALUES
('11111111-1111-4111-8111-111111111111', 'Acme AI', 'acme-ai', 100, 0),
('22222222-2222-4222-8222-222222222222', 'Beta Corp', 'beta-corp', 50, 0)
ON CONFLICT (id) DO NOTHING;

-- 2. Org Members  
-- Placeholder user IDs - replace these after creating users via Auth service
-- User 1: Alice (owner of Acme AI)     -> replace 00000000-0000-0000-0000-000000000001
-- User 2: Bob (editor of Acme AI)      -> replace 00000000-0000-0000-0000-000000000002
-- User 3: Carol (viewer of Acme AI)    -> replace 00000000-0000-0000-0000-000000000003
-- User 4: Dave (owner of Beta Corp)    -> replace 00000000-0000-0000-0000-000000000004
-- User 5: Eve (editor of Beta Corp)    -> replace 00000000-0000-0000-0000-000000000005

-- NOTE: Do NOT run this until users are created and you've replaced the UUIDs!
-- INSERT INTO public.org_members (org_id, user_id, role) VALUES
-- ('11111111-1111-4111-8111-111111111111', '<alice-user-id>', 'owner'),
-- ('11111111-1111-4111-8111-111111111111', '<bob-user-id>', 'editor'),
-- ('11111111-1111-4111-8111-111111111111', '<carol-user-id>', 'viewer'),
-- ('22222222-2222-4222-8222-222222222222', '<dave-user-id>', 'owner'),
-- ('22222222-2222-4222-8222-222222222222', '<eve-user-id>', 'editor');

-- 3. Sample Workflow in Acme AI
INSERT INTO public.workflows (id, org_id, name, description, status) VALUES
('55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 
 'Customer Onboarding Agent', 
 'Analyzes new customer emails with AI, routes enterprise vs standard signups, fetches CRM data, requires manager approval, and logs the result.',
 'active')
ON CONFLICT (id) DO NOTHING;

-- 4. Workflow Steps: llm_call â†’ conditional_branch â†’ http_request â†’ approval_gate â†’ db_write
INSERT INTO public.workflow_steps (id, workflow_id, name, type, step_order, config) VALUES
(
  '66666666-6666-4666-8666-666666666661', 
  '55555555-5555-4555-8555-555555555555', 
  'Analyze Customer Email', 
  'llm_call', 
  1, 
  '{"prompt": "You are a customer onboarding assistant. Analyze this customer signup request and determine if it is an enterprise customer or a standard customer. Respond with a JSON object containing: {\"customer_type\": \"enterprise\" or \"standard\", \"company_name\": \"...\", \"summary\": \"...\"}. Here is the signup data: {{previous_output}}"}'
),
(
  '66666666-6666-4666-8666-666666666662', 
  '55555555-5555-4555-8555-555555555555', 
  'Route by Customer Type', 
  'conditional_branch', 
  2, 
  '{"condition": "typeof previous_output === \"object\" && previous_output.response && previous_output.response.includes(\"enterprise\")", "then_step_order": 3, "else_step_order": 5}'
),
(
  '66666666-6666-4666-8666-666666666663', 
  '55555555-5555-4555-8555-555555555555', 
  'Fetch CRM Data', 
  'http_request', 
  3, 
  '{"url": "https://httpbin.org/post", "method": "POST", "headers": {"Content-Type": "application/json"}, "body": "{\"action\": \"lookup_customer\", \"data\": \"{{previous_output}}\"}"}'
),
(
  '66666666-6666-4666-8666-666666666664', 
  '55555555-5555-4555-8555-555555555555', 
  'Manager Approval Required', 
  'approval_gate', 
  4, 
  '{"required_role": "owner", "message": "Enterprise customer detected. Manager approval required before proceeding."}'
),
(
  '66666666-6666-4666-8666-666666666665', 
  '55555555-5555-4555-8555-555555555555', 
  'Log Onboarding Result', 
  'db_write', 
  5, 
  '{"table_name": "watched_table_events", "data": {"table_name": "onboarding_log", "operation": "INSERT", "row_data": {"status": "onboarded", "result": "{{previous_output}}"}}}'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Workflow Triggers (Manual + Webhook)
INSERT INTO public.workflow_triggers (id, workflow_id, type, config, enabled) VALUES
('77777777-7777-4777-8777-777777777771', '55555555-5555-4555-8555-555555555555', 'manual', '{}', true),
('77777777-7777-4777-8777-777777777772', '55555555-5555-4555-8555-555555555555', 'webhook', '{"secret": "acme-webhook-secret-123"}', true)
ON CONFLICT (id) DO NOTHING;
