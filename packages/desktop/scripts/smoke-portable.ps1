param([Parameter(Mandatory=$true)][string]$PortableRoot)
$ErrorActionPreference = 'Stop'
$releaseDirectory = (Resolve-Path $PortableRoot).Path
if (Get-ChildItem $releaseDirectory -Recurse -Include node.exe,*.node,service.mjs) {
    throw 'Unexpected Node runtime in portable release'
}
& "$releaseDirectory/extcap/ffxiv-extcap.exe" --extcap-interfaces
if ($LASTEXITCODE -ne 0) { throw 'Packaged extcap enumeration failed' }
& "$releaseDirectory/extcap/ffxiv-extcap.exe" --extcap-dlts --extcap-interface synthetic
if ($LASTEXITCODE -ne 0) { throw 'Packaged extcap discovery failed' }
$originalPath = $env:PATH
$desktopProcess = $null
try {
    # Runtime startup must not depend on Node, developer tools, or the shell's cwd.
    $env:PATH = "$env:SystemRoot/System32;$env:SystemRoot"
    $desktopProcess = Start-Process "$releaseDirectory/FFXIV-Packet-Dissector.exe" -WorkingDirectory $env:TEMP -PassThru
    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    do {
        Start-Sleep -Milliseconds 200
        $desktopProcess.Refresh()
        if ($desktopProcess.HasExited) { throw 'Desktop exited during startup' }
    } while ($desktopProcess.MainWindowHandle -eq 0 -and [DateTime]::UtcNow -lt $deadline)
    if ($desktopProcess.MainWindowHandle -eq 0) { throw 'Desktop window did not appear' }
    if (-not $desktopProcess.CloseMainWindow()) { throw 'Could not request normal window close' }
    if (-not $desktopProcess.WaitForExit(10000)) { throw 'Desktop did not exit after normal close' }
    if ($desktopProcess.ExitCode -ne 0) { throw 'Desktop reported an unsuccessful exit' }
} finally {
    $env:PATH = $originalPath
    if ($desktopProcess -and -not $desktopProcess.HasExited) { $desktopProcess.Kill() }
}
