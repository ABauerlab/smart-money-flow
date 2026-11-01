<#
  Importa o historico de relatorios (CSV da VPS) para a funcao crypto-analysis.

  Como funciona
  - Envia cada arquivo em ordem cronologica (o nome tem a data/hora: relatorio_AAAA-MM-DD_HH-MM-SS.csv).
  - A funcao tira a data do proprio nome do arquivo e aplica a regra da virada das 21h.
  - skipAi = true: so grava os dados, nao chama o Gemini (a IA e gerada depois, uma vez so).
  - Idempotente: cada arquivo tem um id fixo (import:<nome>), entao rodar de novo nao duplica nada.

  Uso (PowerShell):
    .\scripts\import-history.ps1 -Folder "C:\Users\...\Desktop\RELATORIOS CRIPTO VPS" -AccessCode "<codigo do cliente>" -DryRun
    .\scripts\import-history.ps1 -Folder "C:\Users\...\Desktop\RELATORIOS CRIPTO VPS" -AccessCode "<codigo do cliente>"
#>
param(
  [Parameter(Mandatory = $true)][string]$Folder,
  [Parameter(Mandatory = $true)][string]$AccessCode,
  [string]$Url = "https://erwbgzuksqwrgzvounqj.supabase.co/functions/v1/crypto-analysis?action=analyze-csv",
  [string]$Pattern = "relatorio_*.csv",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$files = Get-ChildItem -Path $Folder -Filter $Pattern -File | Sort-Object Name
Write-Host "Arquivos encontrados: $($files.Count)"
if ($files.Count -eq 0) { throw "Nenhum arquivo '$Pattern' em $Folder" }
if ($DryRun) { $files | Select-Object -First 3 Name, Length | Format-Table; $files | Select-Object -Last 3 Name, Length | Format-Table; return }

$ok = 0; $dup = 0; $fail = @()
$i = 0
foreach ($f in $files) {
  $i++
  # Excel/VPS CSVs may be UTF-8 or Windows-1252; symbols are ASCII so either is fine.
  $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  $body = @{
    accessCode     = $AccessCode
    csvText        = $text
    sourceFileId   = "import:$($f.Name)"
    sourceFileName = $f.Name
    skipAi         = $true
    fileCount      = 1
  } | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

  $done = $false
  for ($try = 1; $try -le 4 -and -not $done; $try++) {
    try {
      $r = Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 60
      if ($r.duplicate) { $dup++ } else { $ok++ }
      $done = $true
    } catch {
      $code = $_.Exception.Response.StatusCode.value__
      if ($code -eq 429) { Start-Sleep -Seconds 30 }
      elseif ($code -ge 400 -and $code -lt 500) { $fail += "$($f.Name): HTTP $code"; break }
      else { Start-Sleep -Seconds (3 * $try) }
    }
  }
  if (-not $done -and -not ($fail -match [regex]::Escape($f.Name))) { $fail += "$($f.Name): sem resposta" }
  if ($i % 25 -eq 0 -or $i -eq $files.Count) { Write-Host "[$i/$($files.Count)] novos=$ok ja_existiam=$dup falhas=$($fail.Count)" }
}

Write-Host ""
Write-Host "Concluido. Novos: $ok | Ja existiam: $dup | Falhas: $($fail.Count)"
if ($fail.Count -gt 0) { $fail | ForEach-Object { Write-Host "  $_" } }
