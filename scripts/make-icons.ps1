# Draws the app icon set from the theme palette so the artwork has a source
# rather than being four opaque PNGs nobody can change.
#
#   powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
#
# The mark is a tachometer: graphite ground, signal-orange sweep, pale needle.
# Sizes follow the platform rules — a full-bleed square for iOS, a transparent
# foreground kept inside Android's 66% safe circle, a self-contained badge for
# the splash so it reads on both the light and the dark background.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$Out = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets'

# Straight from src/theme/palette.ts.
$Ground = [System.Drawing.Color]::FromArgb(255, 16, 19, 20)     # DARK.ground
$Lift   = [System.Drawing.Color]::FromArgb(255, 29, 35, 38)     # a touch above surface
$Track  = [System.Drawing.Color]::FromArgb(255, 46, 53, 56)     # DARK.ruleStrong, warmed
$Accent = [System.Drawing.Color]::FromArgb(255, 255, 107, 44)   # DARK.accent
$Ink    = [System.Drawing.Color]::FromArgb(255, 237, 240, 238)  # DARK.ink

$SWEEP_START = 150.0
$SWEEP_ARC = 240.0
$SWEEP_READING = 0.62

function New-Graphics($bitmap) {
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return $g
}

function New-RoundedRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2.0 * $r
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
  $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
  $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

# Fills the whole canvas with the ground, lifted slightly behind the dial so the
# mark sits in a soft pool of light instead of on flat black.
function Add-Ground($g, [float]$size) {
  $flat = New-Object System.Drawing.SolidBrush($Ground)
  $g.FillRectangle($flat, 0, 0, $size, $size)
  $flat.Dispose()

  $halo = New-Object System.Drawing.Drawing2D.GraphicsPath
  $halo.AddEllipse((-0.18 * $size), (-0.31 * $size), (1.36 * $size), (1.36 * $size))
  $glow = New-Object System.Drawing.Drawing2D.PathGradientBrush($halo)
  $glow.CenterPoint = New-Object System.Drawing.PointF((0.5 * $size), (0.42 * $size))
  $glow.CenterColor = $Lift
  $glow.SurroundColors = [System.Drawing.Color[]]@($Ground)
  $g.FillRectangle($glow, 0, 0, $size, $size)
  $glow.Dispose()
  $halo.Dispose()
}

# ($mx, $my) is where the mark's visual centre lands; the dial pivot sits below
# it because the sweep is open at the bottom.
function Add-Mark($g, [float]$mx, [float]$my, [float]$s) {
  $cx = $mx
  $cy = $my + 73.0 * $s
  $r = 292.0 * $s
  $stroke = 90.0 * $s

  $box = New-Object System.Drawing.RectangleF(($cx - $r), ($cy - $r), (2.0 * $r), (2.0 * $r))

  foreach ($layer in @(@($Track, $SWEEP_ARC), @($Accent, ($SWEEP_ARC * $SWEEP_READING)))) {
    $pen = New-Object System.Drawing.Pen($layer[0], $stroke)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($pen, $box, $SWEEP_START, [float]$layer[1])
    $pen.Dispose()
  }

  $angle = ([Math]::PI / 180.0) * ($SWEEP_START + $SWEEP_ARC * $SWEEP_READING)
  $ux = [Math]::Cos($angle)
  $uy = [Math]::Sin($angle)
  $px = -$uy
  $py = $ux

  # The tail has to stay shorter than the hub radius or its corners show up as
  # a wedge sticking out from under the pivot.
  $reach = 240.0 * $s
  $half = 34.0 * $s
  $tail = 30.0 * $s

  $needle = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF([float]($cx + $reach * $ux), [float]($cy + $reach * $uy))),
    (New-Object System.Drawing.PointF([float]($cx - $tail * $ux + $half * $px), [float]($cy - $tail * $uy + $half * $py))),
    (New-Object System.Drawing.PointF([float]($cx - $tail * $ux - $half * $px), [float]($cy - $tail * $uy - $half * $py)))
  )

  $ink = New-Object System.Drawing.SolidBrush($Ink)
  $g.FillPolygon($ink, $needle)

  $outer = 52.0 * $s
  $g.FillEllipse($ink, [float]($cx - $outer), [float]($cy - $outer), [float](2.0 * $outer), [float](2.0 * $outer))
  $ink.Dispose()

  $inner = 20.0 * $s
  $hub = New-Object System.Drawing.SolidBrush($Ground)
  $g.FillEllipse($hub, [float]($cx - $inner), [float]($cy - $inner), [float](2.0 * $inner), [float](2.0 * $inner))
  $hub.Dispose()
}

function Save-Png($bitmap, [string]$name) {
  $path = Join-Path $Out $name
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "  wrote $name"
}

# ── icon.png — full bleed, no transparency; iOS masks it itself ───────────────
$icon = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = New-Graphics $icon
Add-Ground $g 1024
Add-Mark $g 512 512 1.06
$g.Dispose()
Save-Png $icon 'icon.png'

# ── adaptive-icon.png — transparent, inside Android's 66% safe circle ─────────
$adaptive = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = New-Graphics $adaptive
Add-Mark $g 512 512 0.72
$g.Dispose()
Save-Png $adaptive 'adaptive-icon.png'

# ── splash-icon.png — a badge, so it reads on paper grey and on graphite ──────
$splash = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = New-Graphics $splash
$badge = New-RoundedRect 0 0 1024 1024 232
$g.SetClip($badge)
Add-Ground $g 1024
Add-Mark $g 512 512 1.06
$g.ResetClip()
$badge.Dispose()
$g.Dispose()
Save-Png $splash 'splash-icon.png'

# ── favicon.png — the icon, downsampled ──────────────────────────────────────
$favicon = New-Object System.Drawing.Bitmap(48, 48, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = New-Graphics $favicon
$g.DrawImage($icon, (New-Object System.Drawing.Rectangle(0, 0, 48, 48)))
$g.Dispose()
Save-Png $favicon 'favicon.png'

foreach ($bitmap in @($icon, $adaptive, $splash, $favicon)) { $bitmap.Dispose() }

Write-Host "Icons written to $Out"
