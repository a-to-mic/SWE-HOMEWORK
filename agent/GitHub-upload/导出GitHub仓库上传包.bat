@echo off
setlocal
cd /d "%~dp0"

if exist W:\ (
    echo Drive W: is already in use. Close this window and tell Codex.
    pause
    exit /b 1
)

subst W: "%~dp0"
if errorlevel 1 (
    echo Could not prepare the export drive.
    pause
    exit /b 1
)

pushd W:\

set "GITHUB_ZIP=%~dp0GitHub-upload.zip"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$root=(Resolve-Path -LiteralPath 'W:\').Path.TrimEnd('\'); $zip=$env:GITHUB_ZIP; if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }; $excludeDirs=@('node_modules','dist','.asset-backups','.git','.agents','.codex'); $excludeFiles=@('Cloudflare-upload.zip','GitHub-upload.zip','11'); Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; $archive=[IO.Compression.ZipFile]::Open($zip,[IO.Compression.ZipArchiveMode]::Create); try { Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object { $rel=$_.FullName.Substring($root.Length).TrimStart('\'); $parts=$rel -split '\\'; -not (($parts | Where-Object { $excludeDirs -contains $_ }).Count) -and -not ($excludeFiles -contains $_.Name) -and $_.Extension -ne '.zip' } | ForEach-Object { $entry=$_.FullName.Substring($root.Length).TrimStart('\').Replace('\','/'); [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$_.FullName,$entry,[IO.Compression.CompressionLevel]::Optimal) | Out-Null } } finally { $archive.Dispose() }"
if errorlevel 1 goto :zip_failed

popd
subst W: /D
echo.
echo Finished: GitHub-upload.zip
echo Upload this ZIP to GitHub. It contains source files only.
echo It excludes node_modules, dist, ZIP files, backups, and temp files.
pause
exit /b 0

:zip_failed
popd
subst W: /D
echo.
echo ZIP creation failed. Take a screenshot and send it to Codex.
pause
exit /b 1
