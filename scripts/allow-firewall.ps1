<#
    Opens the Windows Firewall so other devices on your Wi-Fi can reach Soyo.

    Windows blocks inbound connections to node.exe by default, which is the most
    common reason http://soyo.local:3000 works on the host but times out on a
    phone. Run this once, from an elevated PowerShell:

        npm run allow-firewall
#>

param(
    [int]$Port = 3000,
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$ruleName = "Soyo Media Server (TCP $Port)"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
          ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host ""
    Write-Host "  This needs an elevated PowerShell." -ForegroundColor Yellow
    Write-Host "  Right-click PowerShell -> 'Run as administrator', then re-run:" -ForegroundColor Yellow
    Write-Host "      npm run allow-firewall" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($Remove) {
    if ($existing) {
        Remove-NetFirewallRule -DisplayName $ruleName
        Write-Host "  Removed firewall rule '$ruleName'." -ForegroundColor Green
    } else {
        Write-Host "  No rule named '$ruleName' to remove."
    }
    exit 0
}

if ($existing) {
    Write-Host "  Firewall rule '$ruleName' already exists." -ForegroundColor Green
} else {
    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $Port `
        -Profile Private, Domain `
        -Description 'Allows devices on your local network to stream from Soyo.' | Out-Null

    Write-Host "  Allowed inbound TCP $Port on Private and Domain networks." -ForegroundColor Green
}

# mDNS (soyo.local) rides on UDP 5353.
$mdnsRule = 'Soyo mDNS Discovery (UDP 5353)'
if (-not (Get-NetFirewallRule -DisplayName $mdnsRule -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule `
        -DisplayName $mdnsRule `
        -Direction Inbound `
        -Action Allow `
        -Protocol UDP `
        -LocalPort 5353 `
        -Profile Private, Domain `
        -Description 'Allows soyo.local to be discovered on your local network.' | Out-Null

    Write-Host "  Allowed inbound UDP 5353 for soyo.local discovery." -ForegroundColor Green
}

# A Wi-Fi marked as 'Public' blocks LAN traffic regardless of the rules above.
$publicProfiles = Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' }
if ($publicProfiles) {
    Write-Host ""
    Write-Host "  Warning: these networks are set to 'Public', which blocks LAN access:" -ForegroundColor Yellow
    $publicProfiles | ForEach-Object { Write-Host "      - $($_.Name)" -ForegroundColor Yellow }
    Write-Host "  Set yours to Private with:" -ForegroundColor Yellow
    Write-Host "      Set-NetConnectionProfile -Name '<name>' -NetworkCategory Private" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  Done. Start the server with 'npm run dev' and open the address it prints." -ForegroundColor Green
Write-Host ""
