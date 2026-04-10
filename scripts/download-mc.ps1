# Download MinIO Client (mc) binaries for Tauri sidecar bundling.
# Usage: .\scripts\download-mc.ps1 [-Target <target>]
# If no target specified, downloads for current platform.

param(
    [string]$Target = ""
)

$ErrorActionPreference = "Stop"

$BinariesDir = Join-Path $PSScriptRoot "..\src-tauri\binaries"
New-Item -ItemType Directory -Force -Path $BinariesDir | Out-Null
$BinariesDir = Resolve-Path $BinariesDir

$BaseUrl = "https://dl.min.io/client/mc/release"

$Targets = @{
    "x86_64-pc-windows-msvc"    = "windows-amd64/mc.exe"
    "aarch64-pc-windows-msvc"   = "windows-arm64/mc.exe"
    "x86_64-apple-darwin"       = "darwin-amd64/mc"
    "aarch64-apple-darwin"      = "darwin-arm64/mc"
    "x86_64-unknown-linux-gnu"  = "linux-amd64/mc"
    "aarch64-unknown-linux-gnu" = "linux-arm64/mc"
}

function Download-McTarget {
    param([string]$TargetName)

    $UrlPath = $Targets[$TargetName]
    $Ext = if ($TargetName -like "*windows*") { ".exe" } else { "" }
    $Output = Join-Path $BinariesDir "mc-$TargetName$Ext"
    $Url = "$BaseUrl/$UrlPath"

    Write-Host "Downloading mc for $TargetName..."
    Write-Host "  URL: $Url"
    Write-Host "  Output: $Output"

    Invoke-WebRequest -Uri $Url -OutFile $Output -UseBasicParsing
    Write-Host "  Done."
}

if ($Target) {
    if (-not $Targets.ContainsKey($Target)) {
        Write-Error "Unknown target: $Target. Available: $($Targets.Keys -join ', ')"
        exit 1
    }
    Download-McTarget -TargetName $Target
} else {
    # Default: download for current platform
    $CurrentTarget = "x86_64-pc-windows-msvc"
    if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq "Arm64") {
        $CurrentTarget = "aarch64-pc-windows-msvc"
    }
    Write-Host "No target specified, downloading for current platform: $CurrentTarget"
    Download-McTarget -TargetName $CurrentTarget
}

Write-Host ""
Write-Host "Downloads complete. Binaries in: $BinariesDir"
Get-ChildItem "$BinariesDir\mc-*"
