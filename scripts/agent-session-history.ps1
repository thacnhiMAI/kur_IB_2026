function Get-DeskSlot($step) {
  if ($step.label -match '^\S+ ([1-6]):') { return [int]$Matches[1] }
  if ($step.kind -eq 'final' -or $step.label -in @('Final response', 'Ответ координатора')) { return 7 }
  return 0
}

function Save-RunFrame($update) {
  $id = [string]$update.runId
  if (!$id) { return }
  if (!$script:runs.ContainsKey($id)) {
    $row = [Windows.Controls.ListBoxItem]::new()
    $row.Tag = $id
    $script:runs[$id] = @{
      Row = $row; Started = Get-Date; Events = @{}; Changed = @{}; Signatures = @{}; Steps = @()
    }
    $History.Items.Insert(0, $row)
    $script:latestId = $id
  }
  $run = $script:runs[$id]
  $run.Status = $update.status
  $run.Source = $update.source
  $run.Row.Content = "$($run.Started.ToString('HH:mm:ss'))  $($run.Source)`n$($run.Status)"
  if ($update.title) { $run.Row.Content += [Environment]::NewLine + $update.title; $run.Row.ToolTip = $update.title }
  $run.Steps = @($update.steps | Where-Object { $null -ne $_ })
  foreach ($step in $run.Steps) {
    $slot = Get-DeskSlot $step
    $signature = [string]$step.status
    if ($run.Signatures[$slot] -eq $signature) { continue }
    $run.Signatures[$slot] = $signature
    $run.Changed[$slot] = Get-Date
    $run.Events[$slot] = @($run.Events[$slot] | Where-Object { $_ }) + "$(Get-Date -Format HH:mm:ss)  $($step.status)"
  }
  if (($script:pinnedId -and $script:pinnedId -eq $id) -or (!$script:pinnedId -and $script:latestId -eq $id)) { Open-Run $id }
  elseif ($script:viewId) { Draw-Graph }
}

function Open-Run([string]$id) {
  if (!$script:runs.ContainsKey($id)) { return }
  $script:viewId = $id
  $script:steps = $script:runs[$id].Steps
  $Cancel.IsEnabled = $script:runs[$id].Status -eq "running"
  Draw-Graph
  Show-Details
}

function Update-Flow {
  $plan = $script:desks[0].Step
  $final = $script:desks[7].Step
  $agents = @($script:desks[1..6] | Where-Object { $_.Step })
  $agentFinished = @($agents | Where-Object { $_.Step.status -in @('done','failed','cancelled') }).Count
  $planState = if ($plan) { $plan.status } elseif ($final) { 'skipped' } else { 'waiting' }
  $finalState = if ($final) { $final.status } else { 'waiting' }
  $workerState = if ($agents.Count) { "$agentFinished/$($agents.Count) finished" } elseif ($final) { 'skipped' } else { 'waiting' }
  $FlowSummary.Text = "Plan: $planState   |   Agents: $workerState   |   Lead review: $finalState"
  $colors = @{ running='#F9C96F'; done='#AEDD9B'; failed='#F4A196'; cancelled='#D6BCD5' }
  $agentState = if ($agents.Step.status -contains 'running') { 'running' } elseif ($agents.Step.status -contains 'failed') { 'failed' } elseif ($agents.Count) { 'done' }
  foreach ($stage in @(@($FlowPlan, $planState), @($FlowWork, $agentState), @($FlowFinal, $finalState))) {
    $stage[0].Background = if ($stage[1] -and $colors.ContainsKey($stage[1])) { $colors[$stage[1]] } else { '#DFE6D3' }
  }
}
