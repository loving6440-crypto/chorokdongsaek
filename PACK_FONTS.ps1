$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$fontDir = Join-Path $project 'public\fonts'
$searchDirs = @($project, (Join-Path $project 'font-source'), (Join-Path $HOME 'Downloads'), (Join-Path $HOME 'Desktop'))

function Find-FontFile([string]$name) {
    foreach ($dir in $searchDirs) {
        $candidate = Join-Path $dir $name
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return (Resolve-Path -LiteralPath $candidate).Path }
    }
    return $null
}

$required = @(
    @{ Source = 'PF스타더스트 3.0.ttf'; Target = 'PF-Stardust-Regular.ttf' },
    @{ Source = 'PF스타더스트 3.0 Bold.ttf'; Target = 'PF-Stardust-Bold.ttf' },
    @{ Source = 'PF스타더스트 3.0 ExtraBold.ttf'; Target = 'PF-Stardust-ExtraBold.ttf' },
    @{ Source = 'Silver.ttf'; Target = 'Silver.ttf' }
)
$found = @()
$missing = @()
foreach ($item in $required) {
    $path = Find-FontFile $item.Source
    if ($null -eq $path) { $missing += $item.Source }
    else { $found += @{ Source = $path; Target = $item.Target } }
}
$ramchePath = Find-FontFile 'Ramche.zip'
if ($null -eq $ramchePath) { $missing += 'Ramche.zip' }
if ($missing.Count -gt 0) {
    Write-Host 'Fonts not found. Put these original files beside PACK_FONTS.cmd or in Downloads:' -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host (' - ' + $_) }
    exit 1
}

New-Item -ItemType Directory -Path $fontDir -Force | Out-Null
foreach ($item in $found) {
    Copy-Item -LiteralPath $item.Source -Destination (Join-Path $fontDir $item.Target) -Force
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$ramcheArchive = [System.IO.Compression.ZipFile]::OpenRead($ramchePath)
try {
    $ramcheEntry = $ramcheArchive.Entries | Where-Object { $_.FullName -eq 'Ramche.ttf' } | Select-Object -First 1
    if (-not $ramcheEntry) { throw 'Ramche.zip has no Ramche.ttf' }
    $ramcheTarget = Join-Path $fontDir 'Ramche.ttf'
    $inputStream = $ramcheEntry.Open()
    try {
        $outputStream = [System.IO.File]::Create($ramcheTarget)
        try { $inputStream.CopyTo($outputStream) }
        finally { $outputStream.Dispose() }
    }
    finally { $inputStream.Dispose() }
}
finally { $ramcheArchive.Dispose() }

$expected = @('PF-Stardust-Regular.ttf', 'PF-Stardust-Bold.ttf', 'PF-Stardust-ExtraBold.ttf', 'Silver.ttf', 'Ramche.ttf')
foreach ($name in $expected) {
    $path = Join-Path $fontDir $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing packaged font: $name" }
    if ((Get-Item -LiteralPath $path).Length -lt 5000) { throw "Font file unexpectedly small: $name" }
}

$destination = Join-Path (Split-Path -Parent $project) 'chorokdongsaek-v77.0.2-with-fonts.zip'
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Force }
$zip = [System.IO.Compression.ZipFile]::Open($destination, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $excludedDirs = @('node_modules', '.git', 'dist', 'font-source', '.vite')
    foreach ($file in (Get-ChildItem -LiteralPath $project -File -Recurse)) {
        $relative = $file.FullName.Substring($project.Length + 1).Replace('\','/')
        $segments = $relative.Split('/')
        $skip = $false
        foreach ($segment in $segments) { if ($excludedDirs -contains $segment) { $skip = $true; break } }
        if ($skip) { continue }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}
finally { $zip.Dispose() }
Write-Host ''
Write-Host ('Complete: ' + $destination) -ForegroundColor Green
Write-Host 'All five font files are now in public/fonts; visitors do not need to install fonts.'
