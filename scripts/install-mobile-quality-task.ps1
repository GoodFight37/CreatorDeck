$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$entry = Join-Path $PSScriptRoot "mobile-quality.mjs"
$node = (Get-Command node.exe -ErrorAction Stop).Source
$taskName = "CreatorDeck-Qualite-Mobile"
$action = New-ScheduledTaskAction -Execute $node -Argument ('"' + $entry + '"') -WorkingDirectory $repo
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existing) {
  $installed = $existing.Actions | Select-Object -First 1
  if ($installed.Execute -ne $action.Execute -or $installed.Arguments -ne $action.Arguments -or $installed.WorkingDirectory -ne $action.WorkingDirectory) {
    throw "La tâche $taskName existe déjà avec une autre action ; aucun remplacement effectué."
  }
  Write-Output "Tâche existante conservée : $taskName"
  exit 0
}

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 4) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 25) -StartWhenAvailable
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Description "Tests CreatorDeck locaux, sans IA ni accès production, toutes les 4 heures quand la session est ouverte." -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
Write-Output "Tâche créée : $taskName ; utilisateur $identity ; exécution toutes les 4 heures."
