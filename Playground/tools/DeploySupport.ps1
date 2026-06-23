Set-StrictMode -Version Latest

function Resolve-RemoteConnection {
	param(
		[string]$RemoteTarget,
		[string]$RemoteHost,
		[string]$RemoteUser
	)

	if ([string]::IsNullOrWhiteSpace($RemoteTarget)) {
		if ([string]::IsNullOrWhiteSpace($RemoteHost)) {
			throw "Specify -RemoteTarget user@host or -RemoteHost with optional -RemoteUser."
		}

		$RemoteTarget = if ([string]::IsNullOrWhiteSpace($RemoteUser)) {
			$RemoteHost
		} else {
			"$RemoteUser@$RemoteHost"
		}
	}

	$parts = $RemoteTarget -split "@", 2
	if ($parts.Count -eq 2) {
		return [pscustomobject]@{
			Target = $RemoteTarget
			User = $parts[0]
			Host = $parts[1]
		}
	}

	return [pscustomobject]@{
		Target = $RemoteTarget
		User = $null
		Host = $RemoteTarget
	}
}

function ConvertTo-BashSingleQuotedString {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Value
	)

	return "'" + ($Value -replace "'", "'\''") + "'"
}

function Invoke-WslCommand {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Distro,

		[Parameter(Mandatory = $true)]
		[string]$Command
	)

	& wsl.exe -d $Distro -- bash -lc $Command
	if ($LASTEXITCODE -ne 0) {
		throw "WSL command failed with exit code $LASTEXITCODE."
	}
}

function Convert-WindowsPathToWslPath {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Path
	)

	$resolvedPath = (Resolve-Path $Path).Path
	if ($resolvedPath -match "^([A-Za-z]):\\(.*)$") {
		$drive = $Matches[1].ToLowerInvariant()
		$rest = $Matches[2] -replace "\\", "/"
		if ([string]::IsNullOrWhiteSpace($rest)) {
			return "/mnt/$drive"
		}

		return "/mnt/$drive/$rest"
	}

	$quotedPath = ConvertTo-BashSingleQuotedString -Value $resolvedPath
	$wslPath = & wsl.exe -- bash -lc "wslpath -a $quotedPath"
	if ($LASTEXITCODE -ne 0) {
		throw "Could not convert Windows path to WSL path: $resolvedPath"
	}

	return ($wslPath | Select-Object -First 1)
}

function Test-WslCommandAvailable {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Distro,

		[Parameter(Mandatory = $true)]
		[string]$Name
	)

	& wsl.exe -d $Distro -- bash -lc "command -v '$Name' >/dev/null 2>&1"
	return $LASTEXITCODE -eq 0
}

function Assert-WslCommandAvailable {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Distro,

		[Parameter(Mandatory = $true)]
		[string]$Name
	)

	if (-not (Test-WslCommandAvailable -Distro $Distro -Name $Name)) {
		throw "Required WSL command '$Name' was not found in distro '$Distro'."
	}
}
