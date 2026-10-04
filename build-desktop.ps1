#Requires -Version 5.1
<#
.SYNOPSIS
Build the Windows x64 portable desktop application.
.DESCRIPTION
Requires Node.js, pnpm, Rust and the Visual Studio C++ build tools on Windows.
Node.js is used only during the build and is not included in the ZIP.
.PARAMETER RunTests
Also run Rust, wizard, browser and packaged application smoke tests.
Browser tests download Chromium; smoke tests require WebView2.
.EXAMPLE
.\build-desktop.ps1
.EXAMPLE
.\build-desktop.ps1 -RunTests
#>
[CmdletBinding()]
param([switch]$RunTests)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    Write-Host "> $Command $($Arguments -join ' ')"
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE."
    }
}

if ($env:OS -ne 'Windows_NT' -or -not [Environment]::Is64BitProcess) {
    throw 'Run this script in 64-bit PowerShell on Windows.'
}
foreach ($command in @('node', 'pnpm', 'cargo', 'git')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Missing build prerequisite: $command. See docs/development.md."
    }
}

$target = 'x86_64-pc-windows-msvc'
$portableRoot = Join-Path $PSScriptRoot 'packages/desktop/portable'
$archive = Join-Path $PSScriptRoot 'packages/desktop/ffxiv-packet-desktop-windows-x64.zip'
$previousTargetDirectory = $env:CARGO_TARGET_DIR
$env:CARGO_TARGET_DIR = Join-Path $PSScriptRoot 'target'
$releaseDirectory = Join-Path $env:CARGO_TARGET_DIR "$target/release"

Push-Location $PSScriptRoot
try {
    # Remove old deliverables first so a failed build cannot publish a stale ZIP.
    foreach ($path in @($portableRoot, $archive)) {
        if (Test-Path -LiteralPath $path) {
            Remove-Item -LiteralPath $path -Recurse -Force
        }
    }

    Invoke-Checked 'pnpm' @('install', '--frozen-lockfile', '--ignore-scripts')
    Invoke-Checked 'cargo' @('run', '-p', 'xtask', '--locked')
    Invoke-Checked 'pnpm' @('--filter', '@ffxiv/contracts', 'generate')
    Invoke-Checked 'pnpm' @('--filter', 'wizard', 'build')
    Invoke-Checked 'git' @('diff', '--exit-code', '--', 'packages/contracts/generated', 'packages/wizard/generated')
    Invoke-Checked 'pnpm' @('--filter', 'wizard', '--filter', 'desktop', 'typecheck')

    # Tauri's beforeBuildCommand validates resources and builds the web frontend.
    Invoke-Checked 'pnpm' @('--filter', 'desktop', 'exec', 'tauri', 'build', '--ci', '--no-bundle', '--target', $target, '--', '--locked')
    Invoke-Checked 'cargo' @('build', '-p', 'ffxiv-extcap', '--release', '--locked', '--target', $target)

    if ($RunTests) {
        Invoke-Checked 'cargo' @('test', '--workspace', '--locked', '--target', $target)
        Invoke-Checked 'pnpm' @('--filter', 'wizard', 'test')
        Invoke-Checked 'pnpm' @('--filter', 'desktop', 'exec', 'playwright', 'install', 'chromium')
        Invoke-Checked 'pnpm' @('--filter', 'desktop', 'test:ui')
    }

    New-Item -ItemType Directory -Force -Path "$portableRoot/extcap/ffxiv-resources", "$portableRoot/wireshark", "$portableRoot/licenses" | Out-Null
    Copy-Item -LiteralPath "$releaseDirectory/ffxiv-packet-desktop.exe" -Destination "$portableRoot/FFXIV-Packet-Dissector.exe"
    Copy-Item -LiteralPath "$releaseDirectory/ffxiv-extcap.exe" -Destination "$portableRoot/extcap/"
    Copy-Item -Path 'resources/deucalion/*' -Destination "$portableRoot/extcap/ffxiv-resources/"
    Copy-Item -Path 'src/*' -Destination "$portableRoot/wireshark/" -Recurse
    Copy-Item -LiteralPath 'LICENSE' -Destination "$portableRoot/licenses/PROJECT-LICENSE"
    Copy-Item -LiteralPath 'packages/desktop/src/components/ui/LICENSE.md' -Destination "$portableRoot/licenses/SHADCN-LICENSE.md"
    Copy-Item -LiteralPath 'packages/desktop/README.md' -Destination "$portableRoot/README.md"
    # Windows PowerShell 5.1 ignores -Include when combined with -LiteralPath.
    $unexpectedArtifacts = @(Get-ChildItem -LiteralPath $portableRoot -Recurse -File -Force | Where-Object {
        $_.Name -eq 'node.exe' -or $_.Extension -eq '.node' -or $_.Name -eq 'service.mjs'
    })
    if ($unexpectedArtifacts.Count -gt 0) {
        throw "Unexpected Node runtime artifact in the portable application: $($unexpectedArtifacts.FullName -join ', ')"
    }

    if ($RunTests) {
        & "$PSScriptRoot/packages/desktop/scripts/smoke-portable.ps1" -PortableRoot $portableRoot
    }
    Compress-Archive -Path "$portableRoot/*" -DestinationPath $archive
    Write-Host "Portable ZIP: $archive"
    if (-not $RunTests) {
        Write-Host 'Tests were skipped. Use -RunTests to enable them.'
    }
} finally {
    Pop-Location
    $env:CARGO_TARGET_DIR = $previousTargetDirectory
}
