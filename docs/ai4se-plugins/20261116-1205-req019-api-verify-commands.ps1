# REQ-019 (US-019) API verification against a running backend (P4, tasks 5.1/5.3).
# Start the backend first, then run from the repository root:
#   powershell -NoProfile -File docs/ai4se-plugins/20261116-1205-req019-api-verify-commands.ps1
# Expect every line to carry the status and body shown in the P4 local-verify report.

$base = 'http://localhost:8081'
$trip = 1

function Api([string]$label, [string]$method, [string]$path, [string]$user, [string]$body) {
    $arguments = @('-s', '-o', '-', '-w', '|status=%{http_code}', '-X', $method)
    if ($user) { $arguments += @('-H', "X-User-Id: $user") }
    if ($body) {
        # Windows PowerShell strips inner quotes from native arguments, so the body goes
        # through a file instead of --data.
        $file = Join-Path $env:TEMP 'req019-api-verify-body.json'
        [System.IO.File]::WriteAllText($file, $body)
        $arguments += @('-H', 'Content-Type: application/json', '--data-binary', "@$file")
    }
    $arguments += ($base + $path)
    $output = & curl.exe @arguments
    '{0,-44} {1}' -f $label, $output
}

$prefs = "/api/trips/$trip/preferences"

Api 'GET  no header'                 'GET'  $prefs   $null  $null
Api 'GET  user 99 (not seeded)'      'GET'  $prefs   '99'   $null
Api 'GET  user " 2 " (whitespace)'   'GET'  $prefs   ' 2 '  $null
Api 'GET  user 5 (not a member)'     'GET'  $prefs   '5'    $null
Api 'GET  trip 999999 (user 2)'      'GET'  '/api/trips/999999/preferences' '2' $null

Api 'PUT  all seven (user 2)'        'PUT'  $prefs   '2'    '{"interests":["Art","Nature","Culture","History","Food","Shopping","Adventure"]}'
Api 'PUT  duplicate Art,Nature,Art'  'PUT'  $prefs   '2'    '{"interests":["Art","Nature","Art"]}'
Api 'PUT  wrong case art'            'PUT'  $prefs   '2'    '{"interests":["art"]}'
Api 'PUT  empty string'              'PUT'  $prefs   '2'    '{"interests":[""]}'
Api 'PUT  single space'              'PUT'  $prefs   '2'    '{"interests":[" "]}'
Api 'PUT  near match foodie'         'PUT'  $prefs   '2'    '{"interests":["foodie"]}'
Api 'PUT  null element'              'PUT'  $prefs   '2'    '{"interests":[null]}'
Api 'PUT  numeric element'           'PUT'  $prefs   '2'    '{"interests":[42]}'
Api 'PUT  interests as a string'     'PUT'  $prefs   '2'    '{"interests":"Art"}'
Api 'PUT  body is an array'          'PUT'  $prefs   '2'    '["Art"]'
Api 'PUT  empty object'              'PUT'  $prefs   '2'    '{}'
Api 'PUT  mixed valid + unknown'      'PUT'  $prefs   '2'    '{"interests":["Art","teleportation"]}'
Api 'GET  user 2 after rejects'      'GET'  $prefs   '2'    $null
Api 'PUT  user 3 saves Food'         'PUT'  $prefs   '3'    '{"interests":["Food"]}'
Api 'GET  user 2 sees both members'  'GET'  $prefs   '2'    $null
Api 'PUT  clear user 2'              'PUT'  $prefs   '2'    '{"interests":[]}'
Api 'GET  user 2 after clear'        'GET'  $prefs   '2'    $null

Api 'GET  /api/tags (must 404)'      'GET'  '/api/tags' '2'  $null
Api 'GET  /trips/1/plan (must 404)'  'GET'  "/api/trips/$trip/plan" '2' $null
Api 'GET  /trips/1/plans (must 404)' 'GET'  "/api/trips/$trip/plans" '2' $null
Api 'PUT  /api/trips/1 (must 405)'   'PUT'  "/api/trips/$trip" '1' '{}'
Api 'GET  /api/greeting unchanged'   'GET'  '/api/greeting' $null $null

Api 'PUT  clear user 3 (cleanup)'    'PUT'  $prefs   '3'    '{"interests":[]}'
