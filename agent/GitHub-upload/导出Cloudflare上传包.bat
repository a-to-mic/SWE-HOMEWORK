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
    echo Could not prepare the build drive.
    pause
    exit /b 1
)

pushd W:\
call npm.cmd run build
if errorlevel 1 goto :build_failed

if exist "W:\dist\audio" rmdir /s /q "W:\dist\audio"

set "UPLOAD_ZIP=%~dp0Cloudflare-upload.zip"
powershell.exe -NoProfile -Command "$root=(Resolve-Path -LiteralPath 'W:\dist').Path; $zip=$env:UPLOAD_ZIP; if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }; Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; $archive=[IO.Compression.ZipFile]::Open($zip,[IO.Compression.ZipArchiveMode]::Create); try { Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object { $entry=$_.FullName.Substring($root.Length).TrimStart('\').Replace('\','/'); [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$_.FullName,$entry,[IO.Compression.CompressionLevel]::Optimal) | Out-Null } } finally { $archive.Dispose() }"
if errorlevel 1 goto :zip_failed

popd
subst W: /D
echo.
echo Finished: Cloudflare-upload.zip
echo You can upload this ZIP file to Cloudflare Pages.
pause
exit /b 0

:build_failed
popd
subst W: /D
echo.
echo Build failed. Take a screenshot and send it to Codex.
pause
exit /b 1

:zip_failed
popd
subst W: /D
echo.
echo ZIP creation failed. Take a screenshot and send it to Codex.
pause
exit /b 1
