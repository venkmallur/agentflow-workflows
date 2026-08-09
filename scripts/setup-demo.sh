#!/bin/bash
# =============================================
# AgentFlow Workflows - Setup Script
# =============================================
# This script creates test users and sets up org memberships.
# Run this AFTER docker compose up -d and waiting for services to be healthy.
#
# Usage: bash scripts/setup-demo.sh
# =============================================

AUTH_URL="http://localhost:4000"
HASURA_URL="http://localhost:8080/v1/graphql"
ADMIN_SECRET="nhost-admin-secret"

echo "ðŸš€ AgentFlow Workflows - Demo Setup"
echo "================================="

# Wait for services
echo "â³ Waiting for services to be ready..."
until curl -sf "$AUTH_URL/healthz" > /dev/null 2>&1; do
  echo "  Waiting for Auth service..."
  sleep 3
done
until curl -sf "http://localhost:8080/healthz" > /dev/null 2>&1; do
  echo "  Waiting for Hasura..."
  sleep 3
done
echo "âœ… Services are ready!"

# Apply Hasura metadata
echo ""
echo "ðŸ“¦ Applying Hasura metadata..."
curl -s -X POST "http://localhost:8080/v1/metadata" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"reload_metadata","args":{}}' > /dev/null

echo "âœ… Metadata reloaded"

# Create users
echo ""
echo "ðŸ‘¤ Creating test users..."

create_user() {
  local email=$1
  local password=$2
  local display_name=$3
  
  local response=$(curl -s -X POST "$AUTH_URL/signup/email-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"options\":{\"displayName\":\"$display_name\"}}")
  
  local user_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$user_id" ]; then
    # Try to sign in if user already exists
    response=$(curl -s -X POST "$AUTH_URL/signin/email-password" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    user_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  fi
  
  echo "$user_id"
}

ALICE_ID=$(create_user "alice@acme.ai" "Password123!" "Alice (Owner)")
echo "  Alice (Acme AI Owner): $ALICE_ID"

BOB_ID=$(create_user "bob@acme.ai" "Password123!" "Bob (Editor)")
echo "  Bob (Acme AI Editor): $BOB_ID"

CAROL_ID=$(create_user "carol@acme.ai" "Password123!" "Carol (Viewer)")
echo "  Carol (Acme AI Viewer): $CAROL_ID"

DAVE_ID=$(create_user "dave@beta.corp" "Password123!" "Dave (Owner)")
echo "  Dave (Beta Corp Owner): $DAVE_ID"

EVE_ID=$(create_user "eve@beta.corp" "Password123!" "Eve (Editor)")
echo "  Eve (Beta Corp Editor): $EVE_ID"

# Insert seed data
echo ""
echo "ðŸŒ± Seeding organizations and memberships..."

# Insert org members via Hasura admin
insert_member() {
  local org_id=$1
  local user_id=$2
  local role=$3
  
  if [ -n "$user_id" ] && [ "$user_id" != "null" ]; then
    curl -s -X POST "$HASURA_URL" \
      -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
      -H "Content-Type: application/json" \
      -d "{\"query\":\"mutation { insert_org_members_one(object: {org_id: \\\"$org_id\\\", user_id: \\\"$user_id\\\", role: \\\"$role\\\"}, on_conflict: {constraint: org_members_org_id_user_id_key, update_columns: [role]}) { id } }\"}" > /dev/null
    echo "  âœ… Added $role to org $org_id"
  else
    echo "  âš ï¸  Skipping - user ID is empty"
  fi
}

# Acme AI members
insert_member "11111111-1111-4111-8111-111111111111" "$ALICE_ID" "owner"
insert_member "11111111-1111-4111-8111-111111111111" "$BOB_ID" "editor"
insert_member "11111111-1111-4111-8111-111111111111" "$CAROL_ID" "viewer"

# Beta Corp members
insert_member "22222222-2222-4222-8222-222222222222" "$DAVE_ID" "owner"
insert_member "22222222-2222-4222-8222-222222222222" "$EVE_ID" "editor"

echo ""
echo "âœ… Demo setup complete!"
echo ""
echo "ðŸ“‹ Test Accounts:"
echo "  Acme AI:"
echo "    alice@acme.ai / Password123! (Owner)"
echo "    bob@acme.ai / Password123! (Editor)"
echo "    carol@acme.ai / Password123! (Viewer)"
echo "  Beta Corp:"
echo "    dave@beta.corp / Password123! (Owner)"
echo "    eve@beta.corp / Password123! (Editor)"
echo ""
echo "ðŸŒ URLs:"
echo "  Frontend:      http://localhost:3001"
echo "  Hasura Console: http://localhost:8080/console"
echo "  Auth:           http://localhost:4000"
echo "  Functions:      http://localhost:3000"
echo "  Mailhog:        http://localhost:8025"
