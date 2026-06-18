param(
  [string]$TaskName = "ReadAndVoiceDailyMaintenance",
  [string]$Time = "03:00"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot "backend"
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$logDir = Join-Path $backendRoot "backups\logs"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stdout = Join-Path $logDir "daily-maintenance.out.log"
$stderr = Join-Path $logDir "daily-maintenance.err.log"
$action = New-ScheduledTaskAction `
  -Execute $npm `
  -Argument "--prefix `"$backendRoot`" run ops:daily" `
  -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Runs Read and Voice monitor, content audit, and database backup daily." `
  -Force | Out-Null

Write-Host "Registered task: $TaskName"
Write-Host "Runs daily at: $Time"
Write-Host "Command: npm --prefix `"$backendRoot`" run ops:daily"
Write-Host "Reports: $backendRoot\backups\reports"
Write-Host "Logs directory: $logDir"
Write-Host "Note: Windows Task Scheduler captures task history; command output reports are written by ops:daily."
