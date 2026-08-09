# =============================================
# AgentFlow Workflows - Setup Script (PowerShell)
# =============================================
# Creates test users and sets up org memberships.
# Run AFTER: docker compose up -d
#
# Usage: .\scripts\setup-demo.ps1
# =============================================

$AUTH_URL = "http://localhost:4000"
$HASURA_URL = "http://localhost:8080/v1/graphql"
$ADMIN_SECRET = "nhost-admin-secret"

Write-Host "`nðŸš€ AgentFlow Workflows - Demo Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Wait for services
Write-Host "`nâ³ Waiting for services..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
do {
    $attempt++
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:8080/healthz" -Method Get -TimeoutSec 2
        Write-Host "  âœ… Hasura is ready" -ForegroundColor Green
        break
    } catch {
        Write-Host "  Waiting for Hasura... ($attempt/$maxAttempts)"
        Start-Sleep -Seconds 3
    }
} while ($attempt -lt $maxAttempts)

# Apply seed SQL (organizations and workflow)
Write-Host "`nðŸŒ± Applying seed data..." -ForegroundColor Yellow
$seedSql = Get-Content -Path ".\nhost\seeds\default\1_seed.sql" -Raw
$seedBody = @{
    type = "run_sql"
    args = @{
        source = "default"
        sql = $seedSql
    }
} | ConvertTo-Json -Depth 5

try {
    $null = Invoke-RestMethod -Uri "http://localhost:8080/v2/query" -Method Post -Headers @{"X-Hasura-Admin-Secret" = $ADMIN_SECRET} -ContentType "application/json" -Body $seedBody
    Write-Host "  âœ… Seed data applied" -ForegroundColor Green
} catch {
    Write-Host "  âš ï¸ Seed data may already exist (continuing)" -ForegroundColor Yellow
}

# Reload metadata
Write-Host "`nðŸ“¦ Reloading Hasura metadata..." -ForegroundColor Yellow
$metaBody = '{"type":"reload_metadata","args":{}}'
try {
    $null = Invoke-RestMethod -Uri "http://localhost:8080/v1/metadata" -Method Post -Headers @{"X-Hasura-Admin-Secret" = $ADMIN_SECRET} -ContentType "application/json" -Body $metaBody
    Write-Host "  âœ… Metadata reloaded" -ForegroundColor Green
} catch {
    Write-Host "  âš ï¸ Metadata reload failed: $_" -ForegroundColor Red
}

# Create users
Write-Host "`nðŸ‘¤ Creating test users..." -ForegroundColor Yellow

function Create-User {
    param(
        [string]$Email,
        [string]$Password,
        [string]$DisplayName
    )
    
    $body = @{
        email = $Email
        password = $Password
        options = @{
            displayName = $DisplayName
        }
    } | ConvertTo-Json -Depth 3
    
    try {
        $response = Invoke-RestMethod -Uri "$AUTH_URL/signup/email-password" -Method Post -ContentType "application/json" -Body $body
        if ($response.session.user.id) {
            return $response.session.user.id
        }
    } catch {
        # User might already exist, try signing in
        try {
            $signInBody = @{
                email = $Email
                password = $Password
            } | ConvertTo-Json
            $response = Invoke-RestMethod -Uri "$AUTH_URL/signin/email-password" -Method Post -ContentType "application/json" -Body $signInBody
            if ($response.session.user.id) {
                return $response.session.user.id
            }
        } catch {
            Write-Host "    âš ï¸ Could not create/login $Email" -ForegroundColor Red
            return $null
        }
    }
    return $null
}

$ALICE_ID = Create-User -Email "alice@acme.ai" -Password "Password123!" -DisplayName "Alice (Owner)"
Write-Host "  Alice (Acme AI Owner): $ALICE_ID"

$BOB_ID = Create-User -Email "bob@acme.ai" -Password "Password123!" -DisplayName "Bob (Editor)"
Write-Host "  Bob (Acme AI Editor): $BOB_ID"

$CAROL_ID = Create-User -Email "carol@acme.ai" -Password "Password123!" -DisplayName "Carol (Viewer)"
Write-Host "  Carol (Acme AI Viewer): $CAROL_ID"

$DAVE_ID = Create-User -Email "dave@beta.corp" -Password "Password123!" -DisplayName "Dave (Owner)"
Write-Host "  Dave (Beta Corp Owner): $DAVE_ID"

$EVE_ID = Create-User -Email "eve@beta.corp" -Password "Password123!" -DisplayName "Eve (Editor)"
Write-Host "  Eve (Beta Corp Editor): $EVE_ID"

# Insert org members
Write-Host "`nðŸ”— Setting up org memberships..." -ForegroundColor Yellow

function Add-OrgMember {
    param(
        [string]$OrgId,
        [string]$UserId,
        [string]$Role
    )
    
    if (-not $UserId -or $UserId -eq "") {
        Write-Host "    âš ï¸ Skipping - no user ID for $Role" -ForegroundColor Yellow
        return
    }
    
    $mutation = "mutation { insert_org_members_one(object: {org_id: `"$OrgId`", user_id: `"$UserId`", role: `"$Role`"}, on_conflict: {constraint: org_members_org_id_user_id_key, update_columns: [role]}) { id } }"
    $gqlBody = @{ query = $mutation } | ConvertTo-Json
    
    try {
        $null = Invoke-RestMethod -Uri $HASURA_URL -Method Post -Headers @{"X-Hasura-Admin-Secret" = $ADMIN_SECRET} -ContentType "application/json" -Body $gqlBody
        Write-Host "    âœ… Added $Role to org" -ForegroundColor Green
    } catch {
        Write-Host "    âš ï¸ Failed to add member: $_" -ForegroundColor Red
    }
}

# Acme AI members
Add-OrgMember -OrgId "11111111-1111-4111-8111-111111111111" -UserId $ALICE_ID -Role "owner"
Add-OrgMember -OrgId "11111111-1111-4111-8111-111111111111" -UserId $BOB_ID -Role "editor"
Add-OrgMember -OrgId "11111111-1111-4111-8111-111111111111" -UserId $CAROL_ID -Role "viewer"

# Beta Corp members
Add-OrgMember -OrgId "22222222-2222-4222-8222-222222222222" -UserId $DAVE_ID -Role "owner"
Add-OrgMember -OrgId "22222222-2222-4222-8222-222222222222" -UserId $EVE_ID -Role "editor"

Write-Host "`nâœ… Demo setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "ðŸ“‹ Test Accounts:" -ForegroundColor Cyan
Write-Host "  Acme AI:" -ForegroundColor White
Write-Host "    alice@acme.ai / Password123! (Owner)"
Write-Host "    bob@acme.ai / Password123! (Editor)"
Write-Host "    carol@acme.ai / Password123! (Viewer)"
Write-Host "  Beta Corp:" -ForegroundColor White
Write-Host "    dave@beta.corp / Password123! (Owner)"
Write-Host "    eve@beta.corp / Password123! (Editor)"
Write-Host ""
Write-Host "ðŸŒ URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:       http://localhost:3001"
Write-Host "  Hasura Console:  http://localhost:8080/console"
Write-Host "  Auth:            http://localhost:4000"
Write-Host "  Functions:       http://localhost:3000"
Write-Host "  Mailhog:         http://localhost:8025"
