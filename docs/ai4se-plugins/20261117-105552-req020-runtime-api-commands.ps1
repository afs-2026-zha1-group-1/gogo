# Runtime API re-run for REQ-020 (tasks.md 5.3). Isolated backend on 8081, isolated SQLite file.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8081'
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
function ItemArr($body) { try { @(($body | ConvertFrom-Json).items) } catch { @() } }
function MemberRows($body) { try { @(($body | ConvertFrom-Json).members) } catch { @() } }
function Row($members, $userId) { @($members | Where-Object { $_.userId -eq $userId })[0] }
function PayloadOf($snap) { [regex]::Match($snap, 'PAYLOAD=(\{.*?\})\s*(\||$)').Groups[1].Value }
function Snap([int[]]$users = @(1, 2, 3, 4)) {
    $call = @('backend\target\req020-db-dump.py', 'must_do') + ($users | ForEach-Object { [string]$_ })
    ((& python $call) -join ' || ')
}
function Put($s, $items) { Api $s 'Put' '/api/trips/1/preferences/must-dos' (List $items) }
function PutRaw($s, $json) { Api $s 'Put' '/api/trips/1/preferences/must-dos' $json }
function GetMd($s) { Api $s 'Get' '/api/trips/1/preferences/must-dos' $null }
function ItemJson($id, $activity, $location, $time) {
    $parts = @()
    if ($null -ne $id) { $parts += ('"id":{0}' -f [int]$id) }
    $parts += ('"activity":{0}' -f (JStr $activity))
    $parts += ('"location":{0}' -f (JStr $location))
    $parts += ('"time":{0}' -f (JStr $time))
    '{' + ($parts -join ',') + '}'
}
function JStr($v) { if ($null -eq $v) { 'null' } else { '"{0}"' -f [string]$v } }
function List($items) { '{"items":[' + (@($items) -join ',') + ']}' }

$ben = New-Session 'ben@example.com'
$chloe = New-Session 'chloe@example.com'
Log ('RESET (tasks 5.2 empty-state path): ' + ((& python backend\target\req020-db-clear.py) -join ' / '))
Log "TARGET: $base (new jar) | identity: session cookie after POST /api/auth/login | DB: %TEMP%\gogo-req020-runtime.db (fresh Flyway V1-V7)"
Log 'NOTE: every PUT below is a whole-list replace; "seed" means an earlier PUT whose ids are then reused.'

# MDS-1 add one item and read it back -----------------------------------------------------
$script:case = 'MDS-1'
$null = PutRaw $ben '{"items":[]}'
$r = Put $ben @( (ItemJson $null 'Marina Bay Sands' 'MBS' '19:30') )
$it = @(ItemArr $r.Body)
Check '200, one item, server id, key set without name' ("$($r.Status) n=$($it.Count) id=$($it[0].id) keys=$((($it[0].PSObject.Properties.Name | Sort-Object) -join ','))") ($r.Status -eq 200 -and $it.Count -eq 1 -and $it[0].id -ge 1 -and (($it[0].PSObject.Properties.Name | Sort-Object) -join ',') -eq 'activity,id,location,time')
$id1 = $it[0].id
$g = GetMd $ben
Check 'read back through GET shows the same activity' ("$($g.Status) body-has-activity=$($g.Body -match 'Marina Bay Sands')") ($g.Status -eq 200 -and $g.Body -match 'Marina Bay Sands')

# MDS-2 edit keeps the id ------------------------------------------------------------------
$script:case = 'MDS-2'
$r = Put $ben @( (ItemJson $id1 'Marina Bay Sands' 'MBS' '10:30') )
$it = @(ItemArr $r.Body)
Check "200, id=$id1 kept, time 10:30, one item" ("$($r.Status) n=$($it.Count) id=$($it[0].id) time=$($it[0].time)") ($r.Status -eq 200 -and $it.Count -eq 1 -and $it[0].id -eq $id1 -and $it[0].time -eq '10:30')

# MDS-3 omission is the delete path -------------------------------------------------------
$script:case = 'MDS-3'
$r = Put $ben @( (ItemJson $null 'Gardens by the Bay' 'GBB' $null), (ItemJson $null 'Sentosa' 'Sentosa' '09:00') )
$seeded = @(ItemArr $r.Body)
$keptId = $seeded[0].id
$r = Put $ben @( (ItemJson $keptId 'Gardens by the Bay' 'GBB' $null) )
$it = @(ItemArr $r.Body)
Check 'omitted item disappears, kept item survives with its id' ("$($r.Status) n=$($it.Count) first=$($it[0].activity) id=$($it[0].id)") ($r.Status -eq 200 -and $it.Count -eq 1 -and $it[0].activity -eq 'Gardens by the Bay' -and $it[0].id -eq $keptId)

# MDS-4 empty list clears but keeps the row -----------------------------------------------
$script:case = 'MDS-4'
$r = PutRaw $ben '{"items":[]}'
$snap = Snap @(2)
Check '200 items [] while the row stays with {"items":[]}' ("$($r.Status) body=$($r.Body) db=$snap") ($r.Status -eq 200 -and $r.Body -eq '{"items":[]}' -and $snap -match 'USER=2 ROW=present' -and $snap -match '\{"items":\[\]\}')

# MDS-5 submitted order is preserved ------------------------------------------------------
$script:case = 'MDS-5'
$r = Put $ben @( (ItemJson $null 'Alpha' 'A' '08:00'), (ItemJson $null 'Bravo' 'B' '09:00'), (ItemJson $null 'Charlie' 'C' '10:00') )
$order = (@(ItemArr $r.Body | ForEach-Object { $_.activity }) -join ',')
$gOrder = (@((Row (MemberRows (GetMd $ben).Body) 2).mustDos | ForEach-Object { $_.activity }) -join ',')
Check 'Alpha,Bravo,Charlie in the PUT response and in the GET' ("put=$order get=$gOrder") ($order -eq 'Alpha,Bravo,Charlie' -and $gOrder -eq 'Alpha,Bravo,Charlie')

# MDS-6 ids are list-local and restart after clearing -------------------------------------
$script:case = 'MDS-6'
$null = PutRaw $ben '{"items":[]}'
$r = Put $ben @( (ItemJson $null 'Restart' 'X' $null) )
$benNew = (ItemArr $r.Body)[0].id
$null = PutRaw $chloe '{"items":[]}'
$rc = Put $chloe @( (ItemJson $null 'Chloe first' 'Y' $null), (ItemJson $null 'Chloe second' 'Z' $null) )
$chloeIds = (@(ItemArr $rc.Body | ForEach-Object { $_.id }) -join ',')
Check 'Ben restarts at 1 after clearing; Chloe numbering is independent' ("ben=$benNew chloe=$chloeIds") ($benNew -eq 1 -and $chloeIds -eq '1,2')

# MDS-7 location alone / time alone -------------------------------------------------------
$script:case = 'MDS-7'
$r = Put $ben @( (ItemJson $null 'Place only' 'Somewhere' $null), (ItemJson $null 'Time only' $null '11:00') )
$it = @(ItemArr $r.Body)
Check 'the absent field reads back as null' ("n=$($it.Count) [1]=$($it[0].location)/$($it[0].time) [2]=$($it[1].location)/$($it[1].time)") ($it.Count -eq 2 -and $it[0].location -eq 'Somewhere' -and $null -eq $it[0].time -and $null -eq $it[1].location -and $it[1].time -eq '11:00')

# MDS-8 both fields together --------------------------------------------------------------
$script:case = 'MDS-8'
$r = Put $ben @( (ItemJson $null 'Both' 'Clarke Quay' '20:00') )
$it = @(ItemArr $r.Body)
Check 'location and time both stored' ("n=$($it.Count) loc=$($it[0].location) time=$($it[0].time)") ($it.Count -eq 1 -and $it[0].location -eq 'Clarke Quay' -and $it[0].time -eq '20:00')

# MDS-9 trim, blank -> null, stored strings -----------------------------------------------
$script:case = 'MDS-9'
$r = Put $ben @( (ItemJson $null '  Night Market  ' '   ' '18:00') )
$snap = Snap @(2)
Check 'payload holds trimmed activity and null location' ("$snap") ($snap -match '"activity":"Night Market"' -and $snap -match '"location":null')

# MDS-10 missing activity -----------------------------------------------------------------
$script:case = 'MDS-10'
$before = Snap @(2)
$r = Put $ben @( '{"location":"X","time":"09:00"}' )
$after = Snap @(2)
Check '400 MUST_DO_ACTIVITY_REQUIRED, payload and updated_at identical' ("$($r.Status) code=$(Code $r.Body) unchanged=$($before -eq $after)") ($r.Status -eq 400 -and (Code $r.Body) -eq 'MUST_DO_ACTIVITY_REQUIRED' -and $before -eq $after)

# MDS-11 neither location nor time --------------------------------------------------------
$script:case = 'MDS-11'
$before = Snap @(2)
$r = Put $ben @( '{"activity":"No place no time"}' )
$after = Snap @(2)
Check '400 MUST_DO_PLACE_OR_TIME_REQUIRED, zero write' ("$($r.Status) code=$(Code $r.Body) unchanged=$($before -eq $after)") ($r.Status -eq 400 -and (Code $r.Body) -eq 'MUST_DO_PLACE_OR_TIME_REQUIRED' -and $before -eq $after)

# MDS-12 six malformed times --------------------------------------------------------------
$script:case = 'MDS-12'
$before = Snap @(2)
foreach ($bad in @('10:0', '10:00:00', '25:00', '10am', '1 0:00', '24:00')) {
    $r = Put $ben @( (ItemJson $null 'Time check' 'X' $bad) )
    Check "time '$bad' -> 400 MUST_DO_TIME_INVALID" ("$($r.Status) $(Code $r.Body)") ($r.Status -eq 400 -and (Code $r.Body) -eq 'MUST_DO_TIME_INVALID')
}
Check 'no rejected time reached storage' ("unchanged=$($before -eq (Snap @(2)))") ($before -eq (Snap @(2)))

# MDS-13 foreign id is unknown ------------------------------------------------------------
$script:case = 'MDS-13'
$foreign = @( (Row (MemberRows (GetMd $chloe).Body) 3).mustDos | Select-Object -First 1 -ExpandProperty id )
$foreignId = $foreign[0]
$before = Snap @(1, 2, 3, 4)
$r = Put $ben @( (ItemJson $foreignId 'Stolen' 'X' '09:00') )
$after = Snap @(1, 2, 3, 4)
Check "400 MUST_DO_ITEM_UNKNOWN for Chloe's id $foreignId; all four rows unchanged" ("$($r.Status) code=$(Code $r.Body) unchanged=$($before -eq $after)") ($r.Status -eq 400 -and (Code $r.Body) -eq 'MUST_DO_ITEM_UNKNOWN' -and $before -eq $after)

# MDS-14 duplicate id inside one request --------------------------------------------------
$script:case = 'MDS-14'
$mine = @( (Row (MemberRows (GetMd $ben).Body) 2).mustDos | Select-Object -First 1 -ExpandProperty id )
$mineId = $mine[0]
$r = Put $ben @( (ItemJson $mineId 'Dup one' 'X' '09:00'), (ItemJson $mineId 'Dup two' 'Y' '10:00') )
Check "duplicate of own id $mineId -> 400 MUST_DO_ITEM_DUPLICATE_ID" ("$($r.Status) code=$(Code $r.Body) body=$($r.Body)") ($r.Status -eq 400 -and (Code $r.Body) -eq 'MUST_DO_ITEM_DUPLICATE_ID')

# MDS-15 mixed valid and invalid ----------------------------------------------------------
$script:case = 'MDS-15'
$before = Snap @(2)
$r = Put $ben @( (ItemJson $null 'Valid new item' 'X' '09:00'), '{"activity":"","location":"Y","time":"10:00"}' )
$after = Snap @(2)
Check '400 and the valid new item is not stored either' ("$($r.Status) code=$(Code $r.Body) unchanged=$($before -eq $after) storedValid=$($after -match 'Valid new item')") ($r.Status -eq 400 -and (Code $r.Body) -eq 'MUST_DO_ACTIVITY_REQUIRED' -and $before -eq $after -and $after -notmatch 'Valid new item')

# MDS-16 malformed bodies -----------------------------------------------------------------
$script:case = 'MDS-16'
$malformed = [ordered]@{
    'bare array'       = '[{"activity":"A","location":"B"}]';
    'missing items'    = '{}';
    'items as object'  = '{"items":{"activity":"A","location":"B"}}';
    'item is a string' = '{"items":["nope"]}';
    'id is a string'   = '{"items":[{"id":"1","activity":"A","location":"B"}]}'
}
foreach ($k in $malformed.Keys) {
    $r = PutRaw $ben $malformed[$k]
    Check "$k -> 400 INVALID_REQUEST" ("$($r.Status) $(Code $r.Body)") ($r.Status -eq 400 -and (Code $r.Body) -eq 'INVALID_REQUEST')
}

# MDS-17 repeating the acknowledged list is idempotent ------------------------------------
$script:case = 'MDS-17'
$null = Put $ben @( (ItemJson $null 'Steady' 'X' '09:00'), (ItemJson $null 'Second' 'Y' '10:00') )
$payload = List (@( (Row (MemberRows (GetMd $ben).Body) 2).mustDos | ForEach-Object { ItemJson $_.id $_.activity $_.location $_.time } ))
$r1 = PutRaw $ben $payload; $s1 = PayloadOf (Snap @(2))
$r2 = PutRaw $ben $payload; $s2 = PayloadOf (Snap @(2))
Check 'same request twice -> identical bodies and identical stored payload' ("status=$($r1.Status),$($r2.Status) sameBody=$($r1.Body -eq $r2.Body) payload1=$s1 payload2=$s2") ($r1.Status -eq 200 -and $r2.Status -eq 200 -and $r1.Body -eq $r2.Body -and $s1 -eq $s2)

# MDS-18 one row per member (UNIQUE trip/user/kind) ---------------------------------------
$script:case = 'MDS-18'
$snap = Snap @(2)
$rows = ([regex]::Matches($snap, 'USER=2 ROW=present')).Count
Check 'exactly one must_do row for Ben after create, edit and clear cycles' ("present-blocks=$rows snap=$snap") ($rows -eq 1)

# MDS-19 name mirror on create and edit, never on the wire ---------------------------------
$script:case = 'MDS-19'
$null = PutRaw $ben '{"items":[]}'
$created = Put $ben @( (ItemJson $null 'Mirror create' 'X' '09:00') )
$mid = (@(ItemArr $created.Body))[0].id
$afterCreate = Snap @(2)
$edited = Put $ben @( (ItemJson $mid 'Mirror edited' 'X' '09:00') )
$afterEdit = Snap @(2)
$wireKeys = ((@(ItemArr $edited.Body))[0].PSObject.Properties.Name | Sort-Object) -join ','
Check 'payload mirrors name=activity after create and after edit; response has no name' ("create=$afterCreate edit=$afterEdit wire=$wireKeys") ($afterCreate -match '"name":"Mirror create"' -and $afterEdit -match '"name":"Mirror edited"' -and $wireKeys -eq 'activity,id,location,time')

# MDR rows -------------------------------------------------------------------------------
$script:case = 'MDR-1'
$g = GetMd $ben
$rows = MemberRows $g.Body
$benRow = Row $rows 2
Check 'Ben reads back the saved list' ("$($g.Status) n=$(@($benRow.mustDos).Count) first=$(@($benRow.mustDos)[0].activity)") ($g.Status -eq 200 -and @($benRow.mustDos).Count -eq 1 -and @($benRow.mustDos)[0].activity -eq 'Mirror edited')

$script:case = 'MDR-2'
$daniel = Row $rows 4
Check 'a member without saved items is present with an empty array' ("userId4=$($null -ne $daniel) n=$(@($daniel.mustDos).Count)") ($null -ne $daniel -and @($daniel.mustDos).Count -eq 0)

$script:case = 'MDR-3'
$chloeRow = Row $rows 3
Check 'two members keep two independent lists' ("ben=$(@($benRow.mustDos)[0].activity) chloeFirst=$(@($chloeRow.mustDos)[0].activity)") (@($benRow.mustDos)[0].activity -ne @($chloeRow.mustDos)[0].activity)

$script:case = 'MDR-4'
$memberKeys = ((@($rows)[0].PSObject.Properties.Name | Sort-Object) -join ',')
$itemKeys = ((@($benRow.mustDos)[0].PSObject.Properties.Name | Sort-Object) -join ',')
$ordered = (@($rows | ForEach-Object { $_.userId }) -join ',')
Check 'exact key sets and members ordered by userId' ("member=$memberKeys item=$itemKeys order=$ordered") ($memberKeys -eq 'mustDos,userId' -and $itemKeys -eq 'activity,id,location,time' -and $ordered -eq '1,2,3,4')

$script:case = 'MDR-5'
$inputs = Api $ben 'Get' '/api/trips/1/main-plan/inputs' $null
Check 'no name key on the wire while main-plan inputs still list the mirrored activity' ("noMirror=$(-not ($g.Body -match '"name":')) status=$($inputs.Status) mirrorActivity=$($inputs.Body -match 'Mirror edited')") ((-not ($g.Body -match '"name":')) -and $inputs.Status -eq 200 -and $inputs.Body -match 'Mirror edited')

$script:case = 'MDR-6'
$s1 = Snap @(1, 2, 3, 4)
$null = GetMd $ben
$null = GetMd $chloe
$s2 = Snap @(1, 2, 3, 4)
Check 'two reads change nothing' ("unchanged=$($s1 -eq $s2)") ($s1 -eq $s2)

# ATDD section-5 reverse checks ----------------------------------------------------------
$script:case = 'REV-extra-kind'
$null = PutRaw $ben '{"items":[]}'
$r = PutRaw $ben '{"kind":"budget","items":[{"activity":"Kind probe","location":"X"}]}'
$snap = Snap @(1, 2, 3, 4)
Check 'top-level kind ignored, no budget kind in the table' ("$($r.Status) $snap") ($r.Status -eq 200 -and $snap -notmatch 'budget')

$script:case = 'REV-extra-date'
$r = PutRaw $ben '{"items":[{"activity":"Date probe","location":"X","date":"2026-12-05"}]}'
$keys = ((@(ItemArr $r.Body))[0].PSObject.Properties.Name | Sort-Object) -join ','
$snap = Snap @(2)
Check 'unknown item field ignored on the wire and in the payload' ("$($r.Status) keys=$keys payload=$snap") ($r.Status -eq 200 -and $keys -eq 'activity,id,location,time' -and $snap -notmatch '2026-12-05')

$script:case = 'REV-no-limits'
$long = 'L' * 300
$r = Put $ben @( (ItemJson $null $long 'X' '09:00'), (ItemJson $null $long 'Y' '10:00'), (ItemJson $null 'Dup' 'Z' '11:00'), (ItemJson $null 'Dup' 'Z' '11:00') )
$it = @(ItemArr $r.Body)
Check 'length, count and duplicate activities are all accepted' ("$($r.Status) n=$($it.Count) act0len=$($it[0].activity.Length)") ($r.Status -eq 200 -and $it.Count -eq 4 -and $it[0].activity.Length -eq 300)

$script:case = 'REV-userId-redirect'
$before = Snap @(3)
$r = PutRaw $ben '{"userId":3,"items":[{"activity":"Redirect probe","location":"X"}]}'
$after = Snap @(3)
Check "Ben's body carrying userId 3 leaves Chloe byte-identical" ("$($r.Status) unchanged=$($before -eq $after)") ($r.Status -eq 200 -and $before -eq $after)

$script:case = 'REV-no-readiness-keys'
$g = GetMd $ben
Check 'GET carries no ready or required keys' ("ready=$($g.Body -match '"ready"') required=$($g.Body -match '"required"')") ((-not ($g.Body -match '"ready"')) -and (-not ($g.Body -match '"required"')))

$script:case = 'REV-interest-contract-unchanged'
$pI = Api $ben 'Put' '/api/trips/1/preferences' '{"interests":["\u6444\u5f71"]}'
$gI = Api $ben 'Get' '/api/trips/1/preferences' $null
$gKeys = (((@(MemberRows $gI.Body)[0].PSObject.Properties.Name | Sort-Object)) -join ',')
Check 'interest contract unchanged: PUT answers {"interests":[..]}, GET answers members with interests+userId' ("put=$($pI.Status) putBody=$($pI.Body.Substring(0, [Math]::Min(24, $pI.Body.Length))) getKeys=$gKeys") ($pI.Status -eq 200 -and $pI.Body.StartsWith('{"interests":[') -and $gKeys -eq 'interests,userId')

$script:case = 'REV-interest-write-isolation'
$mustBefore = Snap @(2)
$null = Api $ben 'Put' '/api/trips/1/preferences' '{"interests":["\u81ea\u7136\u98ce\u666f"]}'
Check 'an interest save leaves Ben must_do payload byte-identical' ("unchanged=$($mustBefore -eq (Snap @(2)))") ($mustBefore -eq (Snap @(2)))

$script:case = 'REV-no-must-dos-key-in-interests'
Check 'interest GET has no mustDos key' ("hasMustDos=$($gI.Body -match 'mustDos')") (-not ($gI.Body -match 'mustDos'))

$script:case = 'GATE-reused-for-both-endpoints'
$eve = New-Session 'eve@example.com'
$e1 = Api $eve 'Get' '/api/trips/1/preferences/must-dos' $null
$e2 = Api $eve 'Put' '/api/trips/1/preferences/must-dos' '{"items":[]}'
$e3 = Api $ben 'Get' '/api/trips/999999/preferences/must-dos' $null
$e4 = Api @{ Ses = (New-Object Microsoft.PowerShell.Commands.WebRequestSession); Tok = '' } 'Get' '/api/trips/1/preferences/must-dos' $null
Check 'Eve 403 on GET and PUT, unknown trip 404, anonymous 401' ("eveGet=$($e1.Status)/$(Code $e1.Body) evePut=$($e2.Status)/$(Code $e2.Body) missingTrip=$($e3.Status)/$(Code $e3.Body) anon=$($e4.Status)/$(Code $e4.Body)") ($e1.Status -eq 403 -and (Code $e1.Body) -eq 'NOT_A_MEMBER' -and $e2.Status -eq 403 -and $e3.Status -eq 404 -and (Code $e3.Body) -eq 'TRIP_NOT_FOUND' -and $e4.Status -eq 401)

Log ''
Log 'FINAL RUNTIME DB STATE (kind=must_do, trip 1)'
Log (Snap @(1, 2, 3, 4))

$script:results | ForEach-Object { Write-Output $_ }
$passed = @($script:results | Where-Object { $_ -match '\| PASS \|' }).Count
$failed = @($script:results | Where-Object { $_ -match '\| FAIL \|' }).Count
Write-Output "SUMMARY pass=$passed fail=$failed"
