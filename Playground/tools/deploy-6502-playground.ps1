[CmdletBinding()]
param(
	[string]$RemoteTarget,
	[string]$RemoteHost,
	[string]$RemoteUser,
	[int]$Port = 22,
	[ValidateSet("Debug", "Release")]
	[string]$Configuration = "Release",
	[string]$LocalOutputRoot,
	[string]$RemoteStagingBase = "/tmp/6502playground-deploy",
	[string]$RemoteWebRoot = "/var/www/ben-rush.net/6502",
	[string]$WslDistro = "Ubuntu-24.04",
	[string]$PublicPath = "/6502/",
	[switch]$NoSudo,
	[switch]$SkipNginxReload
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. "$PSScriptRoot\DeploySupport.ps1"

function Normalize-PublicPath {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Value
	)

	$trimmed = $Value.Trim()
	if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed -eq "/") {
		return "/"
	}

	return "/" + $trimmed.Trim("/") + "/"
}

$connection = Resolve-RemoteConnection -RemoteTarget $RemoteTarget -RemoteHost $RemoteHost -RemoteUser $RemoteUser
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$projectPath = Join-Path $repoRoot "Playground.Client\Playground.Client.csproj"

if (-not (Test-Path $projectPath)) {
	throw "Could not find project at $projectPath."
}

if ([string]::IsNullOrWhiteSpace($LocalOutputRoot)) {
	$LocalOutputRoot = Join-Path $repoRoot "artifacts\deploy"
}

$publishRoot = Join-Path $LocalOutputRoot "publish"
$stageRoot = Join-Path $LocalOutputRoot "stage"
$siteStageRoot = Join-Path $stageRoot "site"
$normalizedPublicPath = Normalize-PublicPath -Value $PublicPath
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$remoteStagingRoot = "$($RemoteStagingBase.TrimEnd('/'))/6502playground-$timestamp"
$gitCommit = (& git -C $repoRoot rev-parse --short HEAD 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitCommit)) {
	$gitCommit = "unknown"
}

$buildVersion = if ($gitCommit -eq "unknown") {
	$timestamp
} else {
	"$timestamp-$gitCommit"
}

Assert-WslCommandAvailable -Distro $WslDistro -Name "rsync"
Assert-WslCommandAvailable -Distro $WslDistro -Name "ssh"

Write-Host "Publishing standalone Blazor WebAssembly app ($Configuration)..."
if (Test-Path $publishRoot) {
	Remove-Item -LiteralPath $publishRoot -Recurse -Force
}
if (Test-Path $stageRoot) {
	Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $publishRoot, $siteStageRoot | Out-Null

& dotnet publish $projectPath -c $Configuration -o $publishRoot
if ($LASTEXITCODE -ne 0) {
	throw "dotnet publish failed with exit code $LASTEXITCODE."
}

$publishedWwwroot = Join-Path $publishRoot "wwwroot"
if (-not (Test-Path $publishedWwwroot)) {
	throw "Expected publish output at $publishedWwwroot."
}

Copy-Item -Path (Join-Path $publishedWwwroot "*") -Destination $siteStageRoot -Recurse -Force

$indexPath = Join-Path $siteStageRoot "index.html"
if (-not (Test-Path $indexPath)) {
	throw "Published site did not include index.html."
}

$indexHtml = Get-Content -Raw -Path $indexPath
$indexHtml = $indexHtml -replace '<base href="[^"]*"\s*/?>', "<base href=""$normalizedPublicPath"" />"
$indexHtml = $indexHtml -replace 'href="app\.css(?:\?v=[^"]*)?"', "href=""app.css?v=$buildVersion"""
$indexHtml = $indexHtml -replace 'href="Playground\.Client\.styles\.css(?:\?v=[^"]*)?"', "href=""Playground.Client.styles.css?v=$buildVersion"""
$indexHtml = $indexHtml -replace 'src="_framework/blazor\.webassembly\.js(?:\?v=[^"]*)?"', "src=""_framework/blazor.webassembly.js?v=$buildVersion"""
Set-Content -Path $indexPath -Value $indexHtml -Encoding utf8

$manifest = @(
	"BuiltAtUtc=$((Get-Date).ToUniversalTime().ToString("o"))",
	"GitCommit=$gitCommit",
	"BuildVersion=$buildVersion",
	"Configuration=$Configuration",
	"PublicPath=$normalizedPublicPath",
	"RemoteWebRoot=$RemoteWebRoot"
)
Set-Content -Path (Join-Path $siteStageRoot "deploy-manifest.txt") -Value $manifest -Encoding utf8

$stageWslPath = Convert-WindowsPathToWslPath -Path $siteStageRoot
$stageSource = ConvertTo-BashSingleQuotedString -Value ($stageWslPath.TrimEnd("/") + "/")
$remoteDestination = ConvertTo-BashSingleQuotedString -Value ($connection.Target + ":" + $remoteStagingRoot.TrimEnd("/") + "/site/")
$sshTransport = ConvertTo-BashSingleQuotedString -Value "ssh -p $Port"
$remoteTarget = ConvertTo-BashSingleQuotedString -Value $connection.Target
$remoteSiteStageArg = ConvertTo-BashSingleQuotedString -Value "$remoteStagingRoot/site"

Write-Host "Uploading staged static assets to $($connection.Target):$remoteStagingRoot..."
Invoke-WslCommand -Distro $WslDistro -Command "ssh -p $Port $remoteTarget mkdir -p $remoteSiteStageArg"
Invoke-WslCommand -Distro $WslDistro -Command "rsync -az --delete -e $sshTransport $stageSource $remoteDestination"

$remoteStageArg = ConvertTo-BashSingleQuotedString -Value $remoteStagingRoot
$remoteSiteArg = ConvertTo-BashSingleQuotedString -Value "$remoteStagingRoot/site/"
$remoteWebRootArg = ConvertTo-BashSingleQuotedString -Value $RemoteWebRoot.TrimEnd("/")
$sudo = if ($NoSudo) { "" } else { "sudo " }

$remoteCommands = @(
	"set -e",
	"command -v rsync >/dev/null 2>&1 || { echo 'rsync is required on the remote host' >&2; exit 1; }",
	"${sudo}mkdir -p $remoteWebRootArg",
	"${sudo}rsync -a --delete $remoteSiteArg $remoteWebRootArg/",
	"${sudo}find $remoteWebRootArg -type d -exec chmod 755 {} +",
	"${sudo}find $remoteWebRootArg -type f -exec chmod 644 {} +",
	"rm -rf $remoteStageArg"
)

if (-not $SkipNginxReload) {
	$remoteCommands += "if command -v nginx >/dev/null 2>&1; then ${sudo}nginx -t; ${sudo}systemctl reload nginx; fi"
}

$remoteCommand = $remoteCommands -join "; "
$remoteCommandArg = ConvertTo-BashSingleQuotedString -Value $remoteCommand
$sshTtyOption = if ($NoSudo) { "" } else { "-tt " }

Write-Host "Publishing static site to $RemoteWebRoot..."
Invoke-WslCommand -Distro $WslDistro -Command "ssh ${sshTtyOption}-p $Port $remoteTarget $remoteCommandArg"

Write-Host "Deploy complete. Expected public path: $normalizedPublicPath"
