# Generates the PNG app icons in ../icons using System.Drawing.
Add-Type -AssemblyName System.Drawing
$out = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) 'icons'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Icon([int]$size, [string]$name, [bool]$rounded) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(99, 102, 241)), ([System.Drawing.Color]::FromArgb(20, 184, 166)), 45.0

  if ($rounded) {
    $r = [int]($size * 0.22); $d = $r * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $size - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
  } else {
    $g.FillRectangle($brush, $rect)
  }

  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), ([single]($size * 0.1))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pts = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF ([single]($size * 0.30)), ([single]($size * 0.52))),
    (New-Object System.Drawing.PointF ([single]($size * 0.44)), ([single]($size * 0.66))),
    (New-Object System.Drawing.PointF ([single]($size * 0.71)), ([single]($size * 0.37)))
  )
  $g.DrawLines($pen, $pts)
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 192 'icon-192.png' $true
New-Icon 512 'icon-512.png' $true
New-Icon 512 'icon-maskable-512.png' $false
New-Icon 180 'apple-touch-icon.png' $false
Write-Host "Icons written to $out"
