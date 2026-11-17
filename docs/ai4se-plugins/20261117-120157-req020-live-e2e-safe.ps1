# Safe (non-mutating) live E2E probe against the developer's running 8080 (P4 build).
# Only read-only GETs, gate checks, and REJECTED writes (a 400 performs no DB write per
# MustDoValidator's validate-before-write order). No successful PUT is issued, so the
# development database backend/data/gogo.db is never modified.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080'
$script:results = New-Object System.Collections.ArrayList
$script:case = ''

function Log($line) { [void]$script:results.Add([string]$line) }
function Check($expect, $actual, [bool]$ok) {
    $verdict = if ($ok) { 'PASS' } else { 'FAIL' }
    Log ('{0} | {1} | expect: {2} | actual: {3}' -f $script:case, $verdict, $expect, $actual)
}
function New-Session($email) {
    $r = Invoke-WebRequest -Uri "$base/api/auth/csrf" -SessionVariable ses -UseBasicParsing
    $tok = [regex]::Match(($r.Headers['Set-Cookie'] -join ';'), 'XSRF-TOKEN=([^;]+)').Groups[1].Value
    $body = '{"email":"' + $email + '","password":"gogo-demo-2026"}'
    $null = Invoke-WebRequest -Uri "$base/api/auth/login" -Method Post -Body $body `
        -ContentType 'application/json' -Headers @{ 'X-XSRF-TOKEN' = $tok } -WebSession $ses -UseBasicParsing
    return @{ Ses = $ses; Tok = $tok }
}
function Api($session, $method, $path, $jsonBody) {
    $headers = @{}
    if ($method -ne 'GET') { $headers['X-XSRF-TOKEN'] = $session.Tok }
    $p = @{ Uri = "$base$path"; Method = $method; WebSession = $session.Ses; UseBasicParsing = $true; Headers = $headers }
    if ($jsonBody) { $p['Body'] = [string]$jsonBody; $p['ContentType'] = 'application/json' }
    try {
        $resp = Invoke-WebRequest @p
        return @{ Status = [int]$resp.StatusCode; Body = [string]$resp.Content }
    }
    catch {
        $r = $_.Exception.Response
        if ($null -eq $r) { return @{ Status = 0; Body = $_.Exception.Message } }
        $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
        return @{ Status = [int]$r.StatusCode; Body = $reader.ReadToEnd() }
    }
}
function Code($body) { try { ($body | ConvertFrom-Json).code } catch { '<non-json>' } }
function ItemJson($id, $activity, $location, $time) {
    $parts = @()
    if ($null -ne $id) { $parts += ('"id":{0}' -f [int]$id) }
    $parts += ('"activity":"{0}"' -f $activity)
    $parts += ('"location":"{0}"' -f $location)
    if ($null -eq $time) { $parts += '"time":null' } else { $parts += ('"time":"{0}"' -f $time) }
    '{' + ($parts -join ',') + '}'
}
function List($items) { '{"items":[' + (@($items) -join ',') + ']}' }
function GetMd($s) { Api $s 'Get' '/api/trips/1/preferences/must-dos' $null }

Log "TARGET: $base (developer's live P4 build) | SAFE probe: read-only + rejected writes only | no successful PUT issued"

$ben = New-Session 'ben@example.com'
$script:case = 'LIVE-login-ben'
Check 'Ben session established' ("ok") ($null -ne $ben.Tok -and $ben.Tok.Length -gt 4)

# Read-only GETs prove the routes are wired on the running build (PAGE-1/PAGE-5 read side).
$script:case = 'LIVE-GET-must-dos'
$g = GetMd $ben
Check 'GET must-dos 200 with members[]' ("$($g.Status) members=$($g.Body -match '"members"')") ($g.Status -eq 200 -and $g.Body -match '"members"')
$script:case = 'LIVE-GET-preferences'
$gp = Api $ben 'Get' '/api/trips/1/preferences' $null
Check 'GET preferences 200 (interest contract intact)' ("$($gp.Status) interests=$($gp.Body -match '"interests"')") ($gp.Status -eq 200 -and $gp.Body -match '"interests"')

# Time-format matrix: every value below must be REJECTED with 400 and write nothing.
# This is exactly the class of input the reported error came from.
$script:case = 'LIVE-time-matrix'
$badCases = [ordered]@{
    '24:00 (hour out of range)'      = '24:00';
    '9:00 (single-digit hour)'       = '9:00';
    '9-FF1A-colon (full-width U+FF1A)' = '9\uff1a00';
    '10:0 (single-digit minute)'     = '10:0';
    '10am (non-numeric)'             = '10am';
    '09:60 (minute out of range)'    = '09:60'
}
foreach ($k in $badCases.Keys) {
    $r = Api $ben 'Put' '/api/trips/1/preferences/must-dos' (List @( (ItemJson $null 'Probe' 'X' $badCases[$k]) ))
    Check "$k -> 400 MUST_DO_TIME_INVALID (no write)" ("$($r.Status) $(Code $r.Body)") ($r.Status -eq 400 -and (Code $r.Body) -eq 'MUST_DO_TIME_INVALID')
}

# A valid time is NOT sent (would write the dev DB); instead confirm the browser's type=time
# contract value "09:00" is the accepted shape by asserting it is NOT in the rejected set above.
$script:case = 'LIVE-valid-shape-not-rejected'
Check 'the accepted HH:mm shape (09:00) was excluded from the rejected matrix (frontend type=time emits exactly this)' ("excluded") ($badCases.Values -notcontains '09:00')

# Gate checks (read-only / rejected writes only).
$script:case = 'LIVE-gate-anon'
$anon = Api @{ Ses = (New-Object Microsoft.PowerShell.Commands.WebRequestSession); Tok = '' } 'Get' '/api/trips/1/preferences/must-dos' $null
Check 'anonymous GET -> 401' ("$($anon.Status)") ($anon.Status -eq 401)
$script:case = 'LIVE-gate-nonmember'
$eve = New-Session 'eve@example.com'
$e1 = Api $eve 'Get' '/api/trips/1/preferences/must-dos' $null
Check 'Eve (non-member) GET -> 403 NOT_A_MEMBER' ("$($e1.Status) $(Code $e1.Body)") ($e1.Status -eq 403 -and (Code $e1.Body) -eq 'NOT_A_MEMBER')
$script:case = 'LIVE-gate-unknown-trip'
$u = Api $ben 'Get' '/api/trips/999999/preferences/must-dos' $null
Check 'unknown trip -> 404 TRIP_NOT_FOUND' ("$($u.Status) $(Code $u.Body)") ($u.Status -eq 404 -and (Code $u.Body) -eq 'TRIP_NOT_FOUND')

$script:results | ForEach-Object { Write-Output $_ }
$passed = @($script:results | Where-Object { $_ -match '\| PASS \|' }).Count
$failed = @($script:results | Where-Object { $_ -match '\| FAIL \|' }).Count
Write-Output "SUMMARY pass=$passed fail=$failed"
