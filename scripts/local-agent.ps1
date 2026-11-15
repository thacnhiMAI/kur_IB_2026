param([switch]$Check, [switch]$LocalSite)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework
Set-Location (Split-Path $PSScriptRoot -Parent)

[xml]$layout = Get-Content -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot "agent-office.xaml") -Raw
$window = [Windows.Markup.XamlReader]::Load([System.Xml.XmlNodeReader]::new($layout))
foreach ($name in 'State','Graph','Details','Limit','Run','Cancel','Prompt','DeskTitle','DeskMeta','ProgressText','NextDesk','PreviousDesk','History','LiveRun','FlowPlan','FlowWork','FlowFinal','FlowSummary','CrewDock','ModelChoice','ReloadModels','HistoryColumn','DetailsColumn','HistoryPanel','DetailsPanel','HistorySplitter','DetailsSplitter','ShowHistory','ShowDetails','ParallelLimit') {
  Set-Variable -Name $name -Value $window.FindName($name)
}
0..6 | ForEach-Object { [void]$Limit.Items.Add($_) }
$Limit.SelectedIndex = 2
1..24 | ForEach-Object { [void]$ParallelLimit.Items.Add($_) }
$ParallelLimit.SelectedItem = 4
$script:steps = @()
$script:selected = 0
$script:lastFrame = ''
$script:loadingModels = $false
$script:runs = @{}
$script:latestId = ''
$script:pinnedId = ''
$script:viewId = ''
. (Join-Path $PSScriptRoot "agent-session-history.ps1")
. (Join-Path $PSScriptRoot "agent-office.ps1")
$History.Add_SelectionChanged({
  if ($History.SelectedItem) {
    $script:pinnedId = [string]$History.SelectedItem.Tag
    $script:selected = 0
    Open-Run $script:pinnedId
  }
})
$LiveRun.Add_Click({
  $script:pinnedId = ''
  $History.SelectedIndex = -1
  Open-Run $script:latestId
})
$FlowPlan.Add_Click({ Select-Desk 0 })
$FlowWork.Add_Click({
  $index = 1
  for ($i = 1; $i -le 6; $i++) {
    if ($script:desks[$i].Step) { $index = $i; break }
  }
  Select-Desk $index
})
$FlowFinal.Add_Click({ Select-Desk 7 })
$PreviousDesk.Add_Click({ Select-Desk ($script:selected - 1) })
$NextDesk.Add_Click({ Select-Desk ($script:selected + 1) })
Select-Desk 0
function Set-ModelOptions($update) {
  $script:loadingModels = $true
  try {
    $ModelChoice.Items.Clear()
    foreach ($option in $update.options) {
      [void]$ModelChoice.Items.Add([pscustomobject]@{ Id=$option.id; Label=$option.label })
    }
    $ModelChoice.SelectedValue = $update.selected
    $ModelChoice.IsEnabled = $ModelChoice.Items.Count -gt 0
    if ($update.message) { $ModelChoice.ToolTip = $update.message }
    else { $ModelChoice.ToolTip = 'Applies to the next task.' }
  } finally {
    $script:loadingModels = $false
  }
}

$script:panelWidths = @{ History = $HistoryColumn.Width; Details = $DetailsColumn.Width }

function Set-SidePanel($key, $enabled, $column, $panel, $splitter, $minimum) {
  if ($enabled) {
    $column.Width = $script:panelWidths[$key]
    $column.MinWidth = $minimum
    $panel.Visibility = 'Visible'
    $splitter.Visibility = 'Visible'
  } else {
    $script:panelWidths[$key] = $column.Width
    $column.MinWidth = 0
    $column.Width = [Windows.GridLength]::new(0)
    $panel.Visibility = 'Collapsed'
    $splitter.Visibility = 'Collapsed'
  }
}

$ShowHistory.Add_Checked({ Set-SidePanel 'History' $true $HistoryColumn $HistoryPanel $HistorySplitter 140 })
$ShowHistory.Add_Unchecked({ Set-SidePanel 'History' $false $HistoryColumn $HistoryPanel $HistorySplitter 140 })
$ShowDetails.Add_Checked({ Set-SidePanel 'Details' $true $DetailsColumn $DetailsPanel $DetailsSplitter 205 })
$ShowDetails.Add_Unchecked({ Set-SidePanel 'Details' $false $DetailsColumn $DetailsPanel $DetailsSplitter 205 })

if ($Check) {
  $ShowHistory.IsChecked = $false
  $ShowDetails.IsChecked = $false
  if ($HistoryColumn.Width.Value -ne 0 -or $DetailsColumn.Width.Value -ne 0) { throw 'Panel collapse check failed.' }
  $ShowHistory.IsChecked = $true
  $ShowDetails.IsChecked = $true
  if ($HistoryColumn.Width.Value -ne 183 -or $DetailsColumn.Width.Value -ne 290) { throw 'Panel width restoration check failed.' }
  Set-ModelOptions @{ options = @(@{id='auto';label='Auto'}, @{id='codex:test';label='Test model'}); selected='codex:test' }
  if ($ModelChoice.Items.Count -ne 2 -or $ModelChoice.SelectedValue -ne 'codex:test') { throw 'Model picker check failed.' }
  $script:steps = @(
    @{ label = 'Plan'; status = 'done'; model = 'mock:planner' },
    @{ label = 'Worker 1: Example'; status = 'running'; model = 'mock:worker' },
    @{ label = 'Final response'; status = 'done'; model = 'mock:final'; tokens = 10; cost = 0; output = 'Example' }
  )
  Select-Desk 1
  if ($CrewDock.Children.Count -ne 7) { throw 'Crew dock check failed.' }
  if ($DeskTitle.Text -ne 'Agent 1' -or $DeskMeta.Text -notmatch 'mock:worker') { throw 'Agent desk check failed.' }
  Select-Desk 7
  if ($Details.Text -notmatch 'Example' -or $ProgressText.Text -notmatch '1 working') {
    throw 'Graph rendering check failed.'
  }
  Save-RunFrame @{runId='test-1';source='Local';status='running';steps=@(@{label='Worker 1: Example';status='running';model='example'})}
  Save-RunFrame @{runId='test-1';source='Local';status='done';steps=@(@{label='Worker 1: Example';status='done';model='example';output='First result';summaries=@(@{at='2026-01-01T00:00:00Z';text='Comparing two definitions.'})})}
  Save-RunFrame @{runId='test-2';source='Vercel';status='failed';steps=@(@{label='Plan';status='failed';model='example'})}
  Save-RunFrame @{runId='test-3';source='Local';status='running';steps=@(
    @{label='Worker 1: Example';status='done';model='example'},
    @{label='Worker 2: Example';status='running';model='example'},
    @{label='Final response';status='running';model='example'}
  )}
  if (!($Graph.Children | Where-Object { $_.Name -eq 'DeliveryPacket2' -and $_.HasAnimatedProperties })) {
    throw 'Delivery packet animation check failed.'
  }
  if (!($Graph.Children | Where-Object { $_.Name -eq 'DeliveryPacket1' -and $_.HasAnimatedProperties })) {
    throw 'Completed worker should return its package to Lead.'
  }
  Save-RunFrame @{runId='test-3';source='Local';status='done';steps=@(
    @{label='Worker 1: Example';status='done';model='example'},
    @{label='Final response';status='done';model='example';output='Final result'}
  )}
  if (!($Graph.Children | Where-Object { $_.Name -eq 'DeliveryPacket0' -and $_.HasAnimatedProperties })) {
    throw 'Lead should send the final package to the mailroom.'
  }
  Save-RunFrame @{runId='parallel-a';source='Local';status='running';steps=@(
    @{label='Plan';status='running';model='example'},
    @{label='Worker 1: Example';status='running';model='example'}
  )}
  Save-RunFrame @{runId='parallel-b';source='Local';status='running';steps=@(
    @{label='Final response';status='running';model='example'},
    @{label='Worker 1: Example';status='running';model='example'}
  )}
  foreach ($index in @(0,1)) {
    $deskButton = $Graph.Children | Where-Object { $_.Name -eq ("Desk" + $index) }
    if (!($deskButton.Content.Children | Where-Object { $_ -is [Windows.Controls.TextBlock] -and $_.Text -eq '2' })) {
      throw 'Aggregate task badge check failed.'
    }
  }
  $History.SelectedIndex = 4
  Select-Desk 1
  if ($Graph.Children | Where-Object { $_.Name -like 'DeliveryPacket*' }) {
    throw 'Historical run should not show active delivery packets.'
  }
  if ($History.Items.Count -ne 5 -or $Details.Text -notmatch 'First result' -or $Details.Text -notmatch 'Comparing two definitions' -or $Details.Text -notmatch 'running' -or $Details.Text -notmatch 'done') {
    throw 'Session history check failed.'
  }
  return
}
$worker = [Diagnostics.Process]::new()
$worker.StartInfo.FileName = (Get-Command node.exe).Source
$worker.StartInfo.Arguments = '--env-file-if-exists=.env --env-file-if-exists=.env.local scripts/agent-studio-host.mjs'
$worker.StartInfo.WorkingDirectory = (Get-Location).Path
$worker.StartInfo.UseShellExecute = $false
$worker.StartInfo.CreateNoWindow = $true
$worker.StartInfo.RedirectStandardInput = $true
$worker.StartInfo.RedirectStandardOutput = $true
$worker.StartInfo.StandardOutputEncoding = [Text.Encoding]::UTF8
if ($LocalSite) {
  $worker.StartInfo.EnvironmentVariables["AGENT_WORKER_URL"] = "http://127.0.0.1:3000"
}
[void]$worker.Start()
$script:pending = $worker.StandardOutput.ReadLineAsync()
$timer = [Windows.Threading.DispatcherTimer]::new()
$timer.Interval = [TimeSpan]::FromMilliseconds(150)
$timer.Add_Tick({
  while ($script:pending.IsCompleted) {
    $line = $script:pending.GetAwaiter().GetResult()
    if ($null -eq $line) {
      $timer.Stop()
      $State.Text = 'Backend stopped. Reopen Agent Studio to restart.'
      $Run.IsEnabled = $false
      $Cancel.IsEnabled = $false
      return
    }
    $script:pending = $worker.StandardOutput.ReadLineAsync()
    if ($line -eq $script:lastFrame) { continue }
    $script:lastFrame = $line
    $update = ConvertFrom-Json -InputObject $line
    if ($update.type -eq "models") { Set-ModelOptions $update; continue }
    $State.Text = if ($update.message) { $update.message } elseif ($update.source) { "$($update.source) | $($update.status)" } else { $update.status }
    if ($update.runId) {
      if (!$script:pinnedId -and $script:latestId -eq $update.runId -and $update.status -eq 'done') {
        $script:selected = 7
      }
      Save-RunFrame $update
      $count = @($script:runs.Values | Where-Object { $_.Status -eq 'running' }).Count
      $State.Text = "$count active / $($ParallelLimit.SelectedItem) slots"
    }
  }
})
$Run.Add_Click({
  if ([string]::IsNullOrWhiteSpace($Prompt.Text)) { $State.Text = 'Enter a task first.'; return }
  $script:pinnedId = ''
  $History.SelectedIndex = -1
  $json = ConvertTo-Json -Compress -InputObject @{ action = 'start'; prompt = $Prompt.Text; limit = $Limit.SelectedIndex }
  $encoded = [regex]::Replace($json, '[^\x00-\x7F]', { param($char) '\u' + ([int][char]$char.Value).ToString('x4') })
  $worker.StandardInput.WriteLine($encoded)
})
$Limit.Add_SelectionChanged({
  if (!$worker.HasExited) {
    $worker.StandardInput.WriteLine((ConvertTo-Json -Compress -InputObject @{ action = 'limit'; limit = $Limit.SelectedIndex }))
  }
})
$ModelChoice.Add_SelectionChanged({
  if (!$script:loadingModels -and $ModelChoice.SelectedValue -and !$worker.HasExited) {
    $worker.StandardInput.WriteLine((ConvertTo-Json -Compress -InputObject @{ action='model'; model=[string]$ModelChoice.SelectedValue }))
  }
})
$ReloadModels.Add_Click({
  if (!$worker.HasExited) { $worker.StandardInput.WriteLine('{"action":"models"}') }
})
$ParallelLimit.Add_SelectionChanged({
  if (!$worker.HasExited -and $ParallelLimit.SelectedItem) {
    $worker.StandardInput.WriteLine((ConvertTo-Json -Compress -InputObject @{ action='parallel'; limit=[int]$ParallelLimit.SelectedItem }))
  }
})
$Cancel.Add_Click({
  if ($script:viewId -and $script:runs[$script:viewId].Status -eq 'running') {
    $worker.StandardInput.WriteLine((ConvertTo-Json -Compress -InputObject @{ action='cancel'; runId=$script:viewId }))
  }
})
$window.Add_Closed({ $timer.Stop(); $worker.StandardInput.Close(); $worker.Dispose() })
$timer.Start()
[void]$window.ShowDialog()
