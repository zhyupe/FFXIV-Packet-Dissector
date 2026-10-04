#Requires -Version 5.1
<#
.SYNOPSIS
Compare official, full-icu and small-icu Windows x64 Node executables.
.DESCRIPTION
Builds isolated copies of the same source with identical options except ICU mode.
Does not replace the application's runtime. Downloads and builds stay in WorkDir.
Requires VS 2022 C++ tools and Windows SDK, Python, NASM, and Windows tar.exe.
#>
[CmdletBinding()]
param(
    [string]$WorkDir = (Join-Path $PSScriptRoot '../../../tools/local/node-icu'),
    [string]$InjectorPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    -not [Environment]::Is64BitProcess) {
    throw 'Run this script in 64-bit PowerShell on Windows.'
}

# Use the exact version currently distributed by the desktop package.
$prepareScript = Get-Content (Join-Path $PSScriptRoot 'prepare-runtime.mjs') -Raw
$versionMatch = [regex]::Match($prepareScript, "NODE_VERSION = '(\d+\.\d+\.\d+)'")
if (-not $versionMatch.Success) { throw 'Cannot read the desktop Node version.' }
$nodeVersion = $versionMatch.Groups[1].Value
$WorkDir = [IO.Path]::GetFullPath($WorkDir)
# Node's source build uses cmd.exe and generated project paths. Keep its path simple.
if ($WorkDir -notmatch '^[A-Za-z]:\\[A-Za-z0-9_\\.\-]+$') {
    throw 'Use a short local ASCII WorkDir without spaces, for example D:\node-icu.'
}
foreach ($mode in @('full-icu', 'small-icu')) {
    if (Test-Path -LiteralPath (Join-Path $WorkDir $mode)) {
        throw "Build directory already exists. Choose a fresh -WorkDir: $WorkDir"
    }
}
if ($InjectorPath) { $InjectorPath = (Resolve-Path -LiteralPath $InjectorPath).Path }
$tar = (Get-Command tar.exe -ErrorAction Stop).Source
$python = (Get-Command python.exe -ErrorAction Stop).Source
& $python --version
if ($LASTEXITCODE -ne 0) { throw 'Python is not available.' }

$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) { throw 'Install Visual Studio 2022 C++ Build Tools and Windows SDK.' }
$visualStudio = & $vswhere -latest -products '*' -version '[17.6,18.0)' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $visualStudio) { throw 'Visual Studio 2022 (17.6+) C++ tools were not found.' }

$downloads = Join-Path $WorkDir 'downloads'
$resultsDir = Join-Path $WorkDir 'results'
New-Item -ItemType Directory -Force $downloads, $resultsDir | Out-Null
# Do not let an older successful report appear to describe an interrupted run.
foreach ($report in @('report.json', 'sizes.csv')) {
    $path = Join-Path $resultsDir $report
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path }
}
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$baseUrl = "https://nodejs.org/dist/v$nodeVersion"
$sumFile = Join-Path $downloads 'SHASUMS256.txt'
Invoke-WebRequest "$baseUrl/SHASUMS256.txt" -UseBasicParsing -OutFile $sumFile

function Get-VerifiedDownload([string]$RemoteName, [string]$Destination) {
    $pattern = '^([a-fA-F0-9]{64})\s+' + [regex]::Escape($RemoteName) + '$'
    $matchesFound = @(Get-Content $sumFile | Where-Object { $_ -match $pattern })
    if ($matchesFound.Count -ne 1) { throw "Missing checksum: $RemoteName" }
    $expected = [regex]::Match($matchesFound[0], $pattern).Groups[1].Value
    if (-not (Test-Path -LiteralPath $Destination)) {
        $partial = "$Destination.partial"
        Invoke-WebRequest "$baseUrl/$RemoteName" -UseBasicParsing -OutFile $partial
        if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash -ne $expected) {
            throw "Download checksum mismatch: $RemoteName"
        }
        Move-Item -LiteralPath $partial -Destination $Destination -Force
    }
    if ((Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -ne $expected) {
        throw "Cached file checksum mismatch; remove and retry: $Destination"
    }
}

$official = Join-Path $downloads 'node.exe'
$archive = Join-Path $downloads "node-v$nodeVersion.tar.xz"
Get-VerifiedDownload 'win-x64/node.exe' $official
Get-VerifiedDownload "node-v$nodeVersion.tar.xz" $archive

# ASCII script with Unicode escapes also works under Windows PowerShell 5.1.
$probe = Join-Path $WorkDir 'probe.cjs'
@'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const version = process.argv[2];
assert.equal(process.version, `v${version}`);
assert.equal(process.platform, 'win32');
assert.equal(process.arch, 'x64');
assert.equal(typeof require('node:net').connect, 'function');
assert.equal(typeof require('node:dgram').createSocket, 'function');
assert.equal(typeof require('node:timers/promises').setTimeout, 'function');
assert.equal(crypto.createHash('sha256').update('abc').digest('hex'),
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.equal('e\u0301'.normalize('NFC'), '\u00e9');
assert.equal(new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })
  .format(new Date('2020-01-01T00:00:00Z')), 'January');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'node-icu-'));
try {
  const file = path.join(directory, '\u6d4b\u8bd5 space.txt');
  fs.writeFileSync(file, '\u4e2d\u6587', 'utf8');
  assert.equal(fs.readFileSync(file, 'utf8'), '\u4e2d\u6587');
} finally { fs.rmSync(directory, { recursive: true, force: true }); }
let addonLoaded = false;
if (process.argv[3]) {
  const addon = require(path.resolve(process.argv[3]));
  assert.equal(typeof addon.listGameProcesses, 'function');
  addonLoaded = true;
}
console.log(JSON.stringify({
  version: process.version, architecture: process.arch,
  abi: process.versions.modules, icu: process.versions.icu,
  smallIcu: process.config.variables.icu_small === true ||
    process.config.variables.icu_small === 'true' ||
    process.config.variables.icu_small === 1,
  chineseDateLocale: Intl.DateTimeFormat.supportedLocalesOf(['zh-CN']).length > 0,
  addonLoaded, checks: 'version, builtins, SHA256, Unicode file path, normalization, English Intl'
}));
'@ | Set-Content -LiteralPath $probe -Encoding ASCII

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Measure-Runtime([string]$Name, [string]$Executable, [bool]$ExpectSmall) {
    $variantDir = Join-Path $resultsDir $Name
    New-Item -ItemType Directory -Force $variantDir | Out-Null
    $binary = Join-Path $variantDir 'node.exe'
    Copy-Item -LiteralPath $Executable -Destination $binary -Force
    $arguments = @($probe, $nodeVersion)
    if ($InjectorPath) { $arguments += $InjectorPath }
    $output = & $binary @arguments
    if ($LASTEXITCODE -ne 0) { throw "Runtime checks failed: $Name" }
    $metadata = ($output -join "`n") | ConvertFrom-Json
    if ($metadata.smallIcu -ne $ExpectSmall) { throw "Unexpected ICU mode: $Name" }

    # Same entry name, timestamp, compressor and compression level for every variant.
    $zipPath = Join-Path $variantDir 'node.zip'
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath }
    $zip = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
    try {
        $entry = $zip.CreateEntry('node.exe', [IO.Compression.CompressionLevel]::Optimal)
        $entry.LastWriteTime = [DateTimeOffset]::new(2020, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
        $binaryStream = [IO.File]::OpenRead($binary)
        try {
            $entryStream = $entry.Open()
            try { $binaryStream.CopyTo($entryStream) } finally { $entryStream.Dispose() }
        } finally { $binaryStream.Dispose() }
    } finally { $zip.Dispose() }
    $exeBytes = (Get-Item -LiteralPath $binary).Length
    $zipBytes = (Get-Item -LiteralPath $zipPath).Length
    return [pscustomobject]@{
        variant = $Name
        exeBytes = $exeBytes
        exeMiB = [math]::Round($exeBytes / 1MB, 3)
        zipBytes = $zipBytes
        zipMiB = [math]::Round($zipBytes / 1MB, 3)
        sha256 = (Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash.ToLowerInvariant()
        runtime = $metadata
    }
}

# Isolate runtime probes and builds from Node configuration inherited by the shell.
$savedEnvironment = @{}
foreach ($key in @('NODE_OPTIONS', 'NODE_PATH', 'NODE_ICU_DATA')) {
    $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
    [Environment]::SetEnvironmentVariable($key, $null, 'Process')
}
try {
    $measurements = @(Measure-Runtime 'official' $official $false)
    # vcbuild defaults to Release. Explicit ltcg matches its release optimization.
    $commonBuildArgs = @('x64', 'vs2022', 'ltcg', 'no-cctest', 'projgen')
    foreach ($mode in @('full-icu', 'small-icu')) {
        $buildRoot = Join-Path $WorkDir $mode
        $source = Join-Path $buildRoot "node-v$nodeVersion"
        # A new source tree per invocation avoids reusing stale/custom build output.
        New-Item -ItemType Directory -Force $buildRoot | Out-Null
        & $tar -xf $archive -C $buildRoot
        if ($LASTEXITCODE -ne 0) { throw "Source extraction failed: $mode" }
        $buildArgs = $commonBuildArgs + $mode
        $stdout = Join-Path $resultsDir "$mode.build.log"
        $stderr = Join-Path $resultsDir "$mode.build.err.log"
        Write-Host "Building $mode. This can take a long time. Log: $stdout"
        $build = Start-Process -FilePath $env:ComSpec -WorkingDirectory $source -ArgumentList @(
            '/d', '/c', ('vcbuild.bat ' + ($buildArgs -join ' '))
        ) -Wait -PassThru -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr
        if ($build.ExitCode -ne 0) { throw "Build failed ($($build.ExitCode)): $stdout; $stderr" }
        $measurements += Measure-Runtime $mode (Join-Path $source 'Release/node.exe') ($mode -eq 'small-icu')
    }
} finally {
    foreach ($key in $savedEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process')
    }
}

if (@($measurements.runtime.abi | Select-Object -Unique).Count -ne 1) {
    throw 'The three runtimes have different native addon ABIs.'
}
function Compare-Size($Baseline, $Candidate) {
    return [pscustomobject]@{
        baseline = $Baseline.variant
        candidate = $Candidate.variant
        exeSavedBytes = $Baseline.exeBytes - $Candidate.exeBytes
        exeSavedMiB = [math]::Round(($Baseline.exeBytes - $Candidate.exeBytes) / 1MB, 3)
        exeSavedPercent = [math]::Round(100 * (1 - $Candidate.exeBytes / $Baseline.exeBytes), 2)
        zipSavedBytes = $Baseline.zipBytes - $Candidate.zipBytes
        zipSavedMiB = [math]::Round(($Baseline.zipBytes - $Candidate.zipBytes) / 1MB, 3)
        zipSavedPercent = [math]::Round(100 * (1 - $Candidate.zipBytes / $Baseline.zipBytes), 2)
    }
}
$comparisons = @(
    (Compare-Size $measurements[0] $measurements[2]),
    (Compare-Size $measurements[1] $measurements[2])
)
$report = [ordered]@{
    nodeVersion = $nodeVersion
    measuredAtUtc = [DateTime]::UtcNow.ToString('o')
    sourceSha256 = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    visualStudio = $visualStudio
    powershell = $PSVersionTable.PSVersion.ToString()
    commonBuildArgs = $commonBuildArgs
    unit = 'MiB = 1048576 bytes; EXE disk size, not RAM usage; ZIP contains only node.exe'
    measurements = $measurements
    comparisons = $comparisons
    limitations = 'Smoke checks do not replace desktop/game integration tests. Official vs custom also includes compiler and signing differences; full-icu vs small-icu isolates the ICU build option.'
}
$report | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $resultsDir 'report.json') -Encoding UTF8
$measurements | Select-Object variant, exeBytes, exeMiB, zipBytes, zipMiB, sha256 |
    Export-Csv (Join-Path $resultsDir 'sizes.csv') -NoTypeInformation -Encoding UTF8
$measurements | Format-Table variant, exeMiB, zipMiB
$comparisons | Format-Table baseline, candidate, exeSavedMiB, exeSavedPercent, zipSavedMiB, zipSavedPercent
Write-Host "Measurements and build logs: $resultsDir"
