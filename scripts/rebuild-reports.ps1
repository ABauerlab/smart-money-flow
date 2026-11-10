<#
  Gera de novo os relatorios periodicos com a triagem de IA (Gemini) no banco novo,
  a partir das rodadas ja importadas. Rode UMA vez depois do import-history.ps1.

  Janelas geradas (a mais nova primeiro): diario D0..D2, semanal S0..S4, mensal M0..M1.
  Cada chamada usa a IA e leva de 20 a 90 segundos; o script espera entre elas para
  respeitar o limite de 8 chamadas por minuto.

  Uso (PowerShell):
    .\scripts\rebuild-reports.ps1 -AccessCode "<codigo do cliente>"
#>
param(
  [Parameter(Mandatory = $true)][string]$AccessCode,
  [string]$Url = "https://erwbgzuksqwrgzvounqj.supabase.co/functions/v1/crypto-analysis?action=generate-periodic",
  [int]$Daily = 3,
  [int]$Weekly = 5,
  [int]$Monthly = 2
)

$ErrorActionPreference = "Stop"
$jobs = @()
for ($i = $Monthly - 1; $i -ge 0; $i--) { $jobs += @{ type = "monthly"; idx = $i } }
for ($i = $Weekly - 1; $i -ge 0; $i--)  { $jobs += @{ type = "weekly";  idx = $i } }
for ($i = $Daily - 1; $i -ge 0; $i--)   { $jobs += @{ type = "daily";   idx = $i } }

$ok = 0; $fail = @()
foreach ($j in $jobs) {
  $body = @{ accessCode = $AccessCode; periodType = $j.type; windowIndex = $j.idx } | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $done = $false
  for ($try = 1; $try -le 3 -and -not $done; $try++) {
    try {
      $r = Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 180
      $tem = [bool]$r.report.ai_analysis
      Write-Host ("{0} #{1}: {2} | IA: {3} | modelo: {4}" -f $j.type, $j.idx, $r.report.summary, $(if ($tem) { "ok" } else { "sem texto" }), $r.aiModelUsed)
      $ok++; $done = $true
    } catch {
      $code = $_.Exception.Response.StatusCode.value__
      if ($code -eq 429) { Start-Sleep -Seconds 60 } else { Start-Sleep -Seconds (10 * $try) }
    }
  }
  if (-not $done) { $fail += "$($j.type) #$($j.idx)" }
  Start-Sleep -Seconds 12
}
Write-Host ""
Write-Host "Concluido. Gerados: $ok | Falhas: $($fail.Count)"
if ($fail.Count -gt 0) { $fail | ForEach-Object { Write-Host "  $_" } }
