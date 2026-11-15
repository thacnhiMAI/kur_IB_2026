function Add-OfficeRect($canvas, $x, $y, $w, $h, $fill, $radius = 0) {
  $rect = [Windows.Shapes.Rectangle]::new()
  $rect.Width = $w; $rect.Height = $h
  $rect.RadiusX = $radius; $rect.RadiusY = $radius
  $rect.Fill = $fill
  [Windows.Controls.Canvas]::SetLeft($rect, $x)
  [Windows.Controls.Canvas]::SetTop($rect, $y)
  [void]$canvas.Children.Add($rect)
}

function Add-OfficeLabel($canvas, $x, $y, $value, $size, $color) {
  $label = [Windows.Controls.TextBlock]::new()
  $label.Text = $value; $label.FontSize = $size; $label.Foreground = $color
  [Windows.Controls.Canvas]::SetLeft($label, $x)
  [Windows.Controls.Canvas]::SetTop($label, $y)
  [void]$canvas.Children.Add($label)
}

function Add-Bot($hostCanvas, $x, $y, $color, $status, $recentlyDone, $live, $taskCount) {
  $canvas = [Windows.Controls.Canvas]::new()
  $canvas.Width = 63; $canvas.Height = 49
  [Windows.Controls.Canvas]::SetLeft($canvas, $x)
  [Windows.Controls.Canvas]::SetTop($canvas, $y)
  [void]$hostCanvas.Children.Add($canvas)
  $x = 0; $y = 0
  Add-OfficeRect $canvas ($x+4) ($y+39) 54 9 '#D4C5E8' 4
  Add-OfficeRect $canvas ($x+6) ($y+8) 50 34 $color 15
  Add-OfficeRect $canvas $x ($y+19) 10 16 '#423450' 5
  Add-OfficeRect $canvas ($x+52) ($y+19) 10 16 '#423450' 5
  Add-OfficeRect $canvas ($x+15) ($y+15) 33 20 '#2D2341' 8
  $eyeHeight = if ($status -ne 'running') { 2 } else { 7 }
  Add-OfficeRect $canvas ($x+21) ($y+22) 5 $eyeHeight '#FFF9FF' 2
  Add-OfficeRect $canvas ($x+36) ($y+22) 5 $eyeHeight '#FFF9FF' 2
  Add-OfficeRect $canvas ($x+29) ($y+1) 4 9 '#423450' 2
  Add-OfficeRect $canvas ($x+27) $y 8 6 '#FFF6B9' 3
  if ($live) {
    $motion = [Windows.Media.TranslateTransform]::new()
    $canvas.RenderTransform = $motion
    $span = if ($status -eq 'running') { 310 } else { 1250 }
    $height = if ($status -eq 'running') { -4 } else { -2 }
    $bob = [Windows.Media.Animation.DoubleAnimation]::new(0, $height, [Windows.Duration]::new([TimeSpan]::FromMilliseconds($span)))
    $bob.AutoReverse = $true
    $bob.RepeatBehavior = [Windows.Media.Animation.RepeatBehavior]::Forever
    $motion.BeginAnimation([Windows.Media.TranslateTransform]::YProperty, $bob)
  }
  if ($status -eq 'running') {
    Add-OfficeRect $hostCanvas 43 29 34 25 '#5B39A4' 9
    Add-OfficeLabel $hostCanvas $(if ($taskCount -gt 9) { 51 } else { 56 }) 30 ([string]$taskCount) 14 '#FFFFFF'
  } elseif ($recentlyDone) {
    $notice = [Windows.Controls.Canvas]::new()
    $notice.Width = 24; $notice.Height = 25
    [Windows.Controls.Canvas]::SetLeft($notice, 49)
    [Windows.Controls.Canvas]::SetTop($notice, 30)
    Add-OfficeRect $notice 0 0 24 24 '#FFCD66' 10
    Add-OfficeLabel $notice 9 0 '!' 17 '#4C2D16'
    [void]$hostCanvas.Children.Add($notice)
    $fade = [Windows.Media.Animation.DoubleAnimation]::new(1, 0, [Windows.Duration]::new([TimeSpan]::FromMilliseconds(450)))
    $fade.BeginTime = [TimeSpan]::FromMilliseconds(700)
    $notice.BeginAnimation([Windows.UIElement]::OpacityProperty, $fade)
  }
}

function Add-DeliveryPacket($desk, $destination, [int]$ordinal, [string]$color, [switch]$Once) {
  $startX = $desk.X + 72
  $startY = if ($desk.Y -lt 200) { 186 } else { 247 }
  $endX = $destination.X + 72
  $endY = if ($destination.Y -lt 200) { 186 } else { 247 }
  $packet = [Windows.Controls.Canvas]::new()
  $packet.Name = "DeliveryPacket$ordinal"
  $packet.Width = 25; $packet.Height = 20
  $packet.IsHitTestVisible = $false
  Add-OfficeRect $packet 1 3 23 17 '#725327' 4
  Add-OfficeRect $packet 1 1 23 16 $color 4
  Add-OfficeRect $packet 10 1 5 10 '#FFF2CB' 1
  Add-OfficeRect $packet 16 10 5 4 '#A76C26' 1
  [Windows.Controls.Canvas]::SetLeft($packet, -12)
  [Windows.Controls.Canvas]::SetTop($packet, -10)
  $motion = [Windows.Media.TranslateTransform]::new($startX, $startY)
  $packet.RenderTransform = $motion
  [void]$Graph.Children.Add($packet)

  # The package follows the workstation spur, the office belt, and the delivery spur.
  $duration = 2.4 + [Math]::Abs($endX - $startX) / 450
  $repeat = if ($Once) { [Windows.Media.Animation.RepeatBehavior]::new(1.0) } else { [Windows.Media.Animation.RepeatBehavior]::Forever }
  $xTrack = [Windows.Media.Animation.DoubleAnimationUsingKeyFrames]::new()
  $yTrack = [Windows.Media.Animation.DoubleAnimationUsingKeyFrames]::new()
  $alpha = [Windows.Media.Animation.DoubleAnimationUsingKeyFrames]::new()
  $frames = @(
    @{ At=0; X=$startX; Y=$startY; Alpha=0 },
    @{ At=0.12; X=$startX; Y=$startY; Alpha=1 },
    @{ At=0.27; X=$startX; Y=216; Alpha=1 },
    @{ At=0.74; X=$endX; Y=216; Alpha=1 },
    @{ At=0.90; X=$endX; Y=$endY; Alpha=1 },
    @{ At=1; X=$endX; Y=$endY; Alpha=0 }
  )
  foreach ($track in @($xTrack, $yTrack, $alpha)) {
    $track.RepeatBehavior = $repeat
    $track.BeginTime = [TimeSpan]::FromMilliseconds($ordinal * 180)
    $track.Duration = [Windows.Duration]::new([TimeSpan]::FromSeconds($duration))
  }
  foreach ($frame in $frames) {
    $time = [Windows.Media.Animation.KeyTime]::FromTimeSpan([TimeSpan]::FromSeconds($duration * $frame.At))
    [void]$xTrack.KeyFrames.Add([Windows.Media.Animation.LinearDoubleKeyFrame]::new($frame.X, $time))
    [void]$yTrack.KeyFrames.Add([Windows.Media.Animation.LinearDoubleKeyFrame]::new($frame.Y, $time))
    [void]$alpha.KeyFrames.Add([Windows.Media.Animation.LinearDoubleKeyFrame]::new($frame.Alpha, $time))
  }
  $packet.Opacity = 0
  $motion.BeginAnimation([Windows.Media.TranslateTransform]::XProperty, $xTrack)
  $motion.BeginAnimation([Windows.Media.TranslateTransform]::YProperty, $yTrack)
  $packet.BeginAnimation([Windows.UIElement]::OpacityProperty, $alpha)
}

function Draw-Graph {
  $Graph.Children.Clear()
  $CrewDock.Children.Clear()
  $Graph.Background = 'Transparent'
  Add-OfficeRect $Graph 16 30 688 405 '#B8A1E4' 20
  Add-OfficeRect $Graph 16 20 688 405 '#D1BCEA' 20
  Add-OfficeRect $Graph 24 25 672 388 '#FFF8F1' 15
  Add-OfficeRect $Graph 39 199 643 36 '#E5D8FA' 12
  Add-OfficeRect $Graph 54 214 611 5 '#BDA5ED' 2

  $slots = @(
    @{ X=42; Y=38; Title='Lead'; Paint='#8252DE'; Wall='#EFE1FF'; Step=$null }
    @{ X=204; Y=38; Title='Agent 1'; Paint='#28A1D4'; Wall='#DFF5FF'; Step=$null }
    @{ X=366; Y=38; Title='Agent 2'; Paint='#D48B22'; Wall='#FFF0C3'; Step=$null }
    @{ X=528; Y=38; Title='Agent 3'; Paint='#CF5898'; Wall='#FFE2F0'; Step=$null }
    @{ X=42; Y=246; Title='Agent 4'; Paint='#645AE4'; Wall='#EBE5FF'; Step=$null }
    @{ X=204; Y=246; Title='Agent 5'; Paint='#DD7255'; Wall='#FFE7D7'; Step=$null }
    @{ X=366; Y=246; Title='Agent 6'; Paint='#369D92'; Wall='#DCF4EC'; Step=$null }
    @{ X=528; Y=246; Title='Mailroom'; Paint='#359B6B'; Wall='#E0F5D8'; Step=$null }
  )
  foreach ($step in $script:steps) { $slots[(Get-DeskSlot $step)].Step = $step }
  foreach ($desk in $slots) {
    Add-OfficeRect $Graph ($desk.X+59) 211 29 10 $desk.Paint 5
    if ($desk.Step -or $desk.Title -in @("Lead", "Mailroom")) {
      $y = if ($desk.Y -lt 200) { 184 } else { 219 }
      Add-OfficeRect $Graph ($desk.X+72) $y 4 29 $desk.Paint 2
    }
  }
  $script:desks = $slots
  $palette = @{ running='#AB701A'; queued='#76669B'; done='#3C6942'; failed='#A54539'; cancelled='#69586E'; idle='#555F50' }
  $labels = @{ running='Working'; queued='Queued'; done='Complete'; failed='Failed'; cancelled='Cancelled'; idle='Idle' }
  $live = !$script:viewId -or $script:viewId -eq $script:latestId -or $script:runs[$script:viewId].Status -eq "running"
  $runState = if ($script:viewId) { $script:runs[$script:viewId] }
  $final = $slots[7]
  $counts = @(0,0,0,0,0,0,0,0)
  foreach ($activeRun in $script:runs.Values) {
    if ($activeRun.Status -ne 'running') { continue }
    foreach ($activeStep in $activeRun.Steps) {
      if ($activeStep.status -ne 'running') { continue }
      $slot = Get-DeskSlot $activeStep
      if ($slot -eq 7) { $slot = 0 }
      $counts[$slot]++
    }
  }
  for ($index = 0; $index -lt $slots.Count; $index++) {
    $desk = $slots[$index]
    $displayStep = if ($index -eq 0 -and $final.Step) { $final.Step } else { $desk.Step }
    $status = if ($displayStep -and $labels.ContainsKey($displayStep.status)) { $displayStep.status } else { 'idle' }
    $furniture = [Windows.Controls.Canvas]::new()
    $furniture.Width = 144; $furniture.Height = 143
    Add-OfficeRect $furniture 0 0 144 143 $desk.Wall 10
    Add-OfficeRect $furniture 0 114 144 29 '#FFFAFF' 10
    Add-OfficeRect $furniture 9 11 31 31 '#EBFAFF' 4
    Add-OfficeRect $furniture 13 15 23 23 '#AFDCF7' 3
    Add-OfficeRect $furniture 23 15 2 23 '#EAF7FF'
    Add-OfficeRect $furniture 13 25 23 2 '#EAF7FF'
    Add-OfficeRect $furniture 104 13 31 29 '#FAF6FF' 4
    foreach ($note in 0..2) { Add-OfficeRect $furniture (108 + $note*8) (18 + ($note%2)*7) 6 11 $desk.Paint 1 }
    if ($index -eq 7) {
      Add-OfficeRect $furniture 25 58 94 38 '#32694F' 7
      Add-OfficeRect $furniture 27 55 90 32 '#F9FFEF' 6
      Add-OfficeRect $furniture 51 59 42 6 '#32694F' 3
      Add-OfficeRect $furniture 61 72 25 12 '#79BE98' 3
      $mailStatus = if ($status -eq 'done') { 'Sent' } else { 'Waiting' }
      $caption = "Mailroom · $mailStatus"
    } else {
      Add-OfficeRect $furniture 14 65 115 35 '#C6A9D4' 7
      Add-OfficeRect $furniture 14 60 115 34 '#FFF9F2' 7
      Add-OfficeRect $furniture 80 49 33 21 '#514363' 4
      Add-OfficeRect $furniture 84 53 25 12 $desk.Paint 2
      Add-OfficeRect $furniture 91 71 13 3 '#8D7AA7' 1
      Add-OfficeRect $furniture 113 75 9 11 '#EBA8C5' 2
      $eventSlot = if ($index -eq 0 -and $final.Step) { 7 } else { $index }
      $recent = $live -and $status -eq 'done' -and $runState -and $runState.Changed[$eventSlot] -and
        ((Get-Date) - $runState.Changed[$eventSlot]).TotalMilliseconds -lt 1500
      $count = $counts[$index]
      $botStatus = if ($count -gt 0) { 'running' } else { $status }
      if ($botStatus -eq 'running' -and $count -eq 0) { $count = 1 }
      Add-Bot $furniture 27 62 $desk.Paint $botStatus $recent $live $count
      $caption = if ($status -eq 'done') { "$($desk.Title) · Resting" } else { "$($desk.Title) · $($labels[$status])" }
    }
    Add-OfficeRect $furniture 13 124 9 9 $palette[$status] 4
    Add-OfficeLabel $furniture 27 119 $caption 11 '#3D3155'
    $button = [Windows.Controls.Button]::new()
    $button.Name = "Desk$index"
    $button.Tag = $index; $button.Content = $furniture
    $button.Padding = '0'; $button.Width = 150; $button.Height = 149
    $button.Background = '#FFFFFF'
    $button.BorderBrush = $desk.Paint
    $button.BorderThickness = if ($index -eq $script:selected) { 3 } else { 0 }
    $button.ToolTip = $caption
    $caption = $button.ToolTip
    [Windows.Automation.AutomationProperties]::SetName($button, $caption)
    $button.Add_Click({ param($sender, $event) Select-Desk ([int]$sender.Tag) -Focus })
    [Windows.Controls.Canvas]::SetLeft($button, $desk.X)
    [Windows.Controls.Canvas]::SetTop($button, $desk.Y)
    [void]$Graph.Children.Add($button)
    if ($index -ne 7) { Add-CrewButton $index $desk $status $palette[$status] }
  }
  if ($live -and $runState) {
    $lead = $slots[0]
    if ($runState.Status -eq 'running') {
      for ($i = 1; $i -le 6; $i++) {
        $workerDesk = $slots[$i]
        if ($workerDesk.Step.status -eq 'running') {
          Add-DeliveryPacket $lead $workerDesk $i '#FFD382' -Once
        } elseif ($workerDesk.Step.status -eq 'done' -and $runState.Changed[$i] -and
            ((Get-Date) - $runState.Changed[$i]).TotalSeconds -lt 4) {
          Add-DeliveryPacket $workerDesk $lead $i '#9FDEFF' -Once
        }
      }
    }
    if ($runState.Status -eq 'done' -and $final.Step.status -eq 'done' -and $runState.Changed[7] -and
        ((Get-Date) - $runState.Changed[7]).TotalSeconds -lt 4) {
      Add-DeliveryPacket $lead $final 0 '#A7E4AB' -Once
    }
  }
  $finished = @($script:steps | Where-Object { $_.status -in @('done','failed','cancelled') }).Count
  $working = @($script:steps | Where-Object { $_.status -eq 'running' }).Count
  $ProgressText.Text = if ($script:steps.Count) { "$working working · $finished finished" } else { 'No active run' }
  Update-Flow
}

function Add-CrewButton($index, $desk, $status, $stateColor) {
  $tile = [Windows.Controls.StackPanel]::new()
  $avatar = [Windows.Controls.Canvas]::new()
  $avatar.Width = 33; $avatar.Height = 25
  Add-OfficeRect $avatar 3 5 26 17 $desk.Paint 8
  Add-OfficeRect $avatar 8 9 16 9 '#312343' 4
  Add-OfficeRect $avatar 11 12 2 3 '#FFFFFF' 1
  Add-OfficeRect $avatar 18 12 2 3 '#FFFFFF' 1
  Add-OfficeRect $avatar 25 2 6 6 $stateColor 3
  [void]$tile.Children.Add($avatar)
  $label = [Windows.Controls.TextBlock]::new()
  $label.Text = $desk.Title; $label.FontSize = 10; $label.TextAlignment = 'Center'
  [void]$tile.Children.Add($label)
  $control = [Windows.Controls.Button]::new()
  $control.Content = $tile; $control.Tag = $index; $control.Padding = '2'
  $control.Margin = '1'; $control.ToolTip = "$($desk.Title) · $status"
  $control.Background = if ($index -eq $script:selected) { '#E0D1FF' } else { '#FCF8FF' }
  [Windows.Automation.AutomationProperties]::SetName($control, $control.ToolTip)
  $control.Add_Click({ param($sender, $event) Select-Desk ([int]$sender.Tag) -Focus })
  [void]$CrewDock.Children.Add($control)
}

function Select-Desk([int]$index, [switch]$Focus) {
  $script:selected = ($index + 8) % 8
  Draw-Graph
  Show-Details
  if ($Focus) {
    $deskButton = $Graph.Children | Where-Object { $_ -is [Windows.Controls.Button] -and $_.Tag -eq $script:selected }
    [void]$deskButton.Focus()
  }
}

function Show-Details {
  $desk = $script:desks[$script:selected]
  $step = $desk.Step
  $DeskTitle.Text = $desk.Title
  if (!$step) {
    if ($script:selected -eq 7) {
      $DeskMeta.Text = 'Output station'
      $Details.Text = 'Receives the final response from Lead and hands it back to its requester.'
      return
    }
    $DeskMeta.Text = 'Idle'
    $Details.Text = 'No task assigned to this desk.'
    return
  }
  $metric = if ($null -ne $step.tokens) { " · $($step.tokens) tokens" } else { '' }
  $cost = if ($null -ne $step.cost) { ' · $' + $step.cost.ToString('F6') + ' estimated' } else { '' }
  $modelLabel = if ($step.servedModel -and $step.servedModel -ne $step.model) { "$($step.model) → $($step.servedModel)" } else { $step.model }
  $DeskMeta.Text = "$modelLabel`n$($step.status)$metric$cost"
  if ($script:selected -eq 7) {
    $DeskMeta.Text = if ($step.status -eq 'running') { 'Waiting for Lead' } elseif ($step.status -eq 'done') { "Final response · $modelLabel" } else { 'Delivery unavailable' }
  }
  $parts = @($step.assignment) | Where-Object { $_ }
  if ($step.summaries) {
    $rows = foreach ($entry in $step.summaries) {
      $stamp = ([DateTimeOffset]::Parse($entry.at)).ToLocalTime().ToString('HH:mm:ss')
      "$stamp  $($entry.text)"
    }
    $parts = @($parts) + ("Reasoning summary" + [Environment]::NewLine + ($rows -join ([Environment]::NewLine * 2)))
  } elseif ($step.status -eq 'running') {
    $parts = @($parts) + 'Waiting for a progress summary from the model.'
  }
  $parts = @($parts) + @($step.output, $step.error) | Where-Object { $_ }
  if ($script:viewId) {
    $events = $script:runs[$script:viewId].Events[$script:selected]
    $newline = [Environment]::NewLine
    if ($events) { $parts = @($parts) + ('Activity' + $newline + ($events -join $newline)) }
  }
  $Details.Text = if ($parts) { $parts -join "`n`n" } else { $step.label }
}
