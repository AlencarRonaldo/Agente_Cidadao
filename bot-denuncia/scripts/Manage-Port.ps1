[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [int]$Port = 3355,
    
    [Parameter(Position=1)]
    [ValidateSet("Check", "Kill", "Report", "FindAvailable")]
    [string]$Action = "Check",
    
    [switch]$Force,
    
    [int]$MaxPortAttempts = 10
)

function Write-ColorText {
    param(
        [string]$Text,
        [ConsoleColor]$Color = [ConsoleColor]::White
    )
    
    $originalColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Text
    $Host.UI.RawUI.ForegroundColor = $originalColor
}

function Test-PortInUse {
    param([int]$Port)
    
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $false
    }
    catch {
        return $true
    }
}

function Get-ProcessUsingPort {
    param([int]$Port)
    
    try {
        $netstatOutput = netstat -ano | Select-String ":$Port"
        if ($netstatOutput) {
            $line = $netstatOutput[0].ToString().Trim()
            $parts = $line -split '\s+'
            $pid = [int]$parts[-1]
            
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                return @{
                    PID = $pid
                    Name = $process.ProcessName
                    Memory = [math]::Round($process.WorkingSet64 / 1MB, 2)
                    Path = $process.Path
                    StartTime = $process.StartTime
                }
            }
        }
    }
    catch {
        Write-Warning "Error getting process info: $($_.Exception.Message)"
    }
    
    return $null
}

function Find-AvailablePort {
    param(
        [int]$StartPort,
        [int]$MaxAttempts = 10
    )
    
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        $testPort = $StartPort + $i
        if (-not (Test-PortInUse -Port $testPort)) {
            return $testPort
        }
    }
    
    throw "Could not find available port after $MaxAttempts attempts starting from $StartPort"
}

function Stop-ProcessSafely {
    param(
        [int]$PID,
        [bool]$Force = $false
    )
    
    try {
        $process = Get-Process -Id $PID -ErrorAction SilentlyContinue
        if (-not $process) {
            Write-ColorText "Process $PID not found" -Color Yellow
            return $false
        }
        
        # Check if it's a system process
        $systemProcesses = @('System', 'svchost', 'winlogon', 'csrss', 'explorer')
        if ($systemProcesses -contains $process.ProcessName) {
            Write-ColorText "Cannot kill system process: $($process.ProcessName)" -Color Red
            return $false
        }
        
        if ($Force) {
            $process | Stop-Process -Force
        } else {
            $process | Stop-Process
        }
        
        # Wait a bit for process to terminate
        Start-Sleep -Seconds 2
        
        $stillRunning = Get-Process -Id $PID -ErrorAction SilentlyContinue
        return $null -eq $stillRunning
    }
    catch {
        Write-ColorText "Error stopping process: $($_.Exception.Message)" -Color Red
        return $false
    }
}

# Main script logic
Write-ColorText "=========================================="
Write-ColorText "Bot-Denuncia Port Management Tool (PowerShell)"
Write-ColorText "=========================================="
Write-Host "Port: $Port"
Write-Host "Action: $Action"
Write-Host ""

switch ($Action) {
    "Check" {
        Write-ColorText "Checking port $Port..." -Color Cyan
        
        if (Test-PortInUse -Port $Port) {
            Write-ColorText "❌ Port $Port is in use" -Color Red
            
            $processInfo = Get-ProcessUsingPort -Port $Port
            if ($processInfo) {
                Write-Host ""
                Write-ColorText "Process Details:" -Color Yellow
                Write-Host "  Name: $($processInfo.Name)"
                Write-Host "  PID: $($processInfo.PID)"
                Write-Host "  Memory: $($processInfo.Memory) MB"
                Write-Host "  Path: $($processInfo.Path)"
                Write-Host "  Start Time: $($processInfo.StartTime)"
                Write-Host ""
                Write-ColorText "To kill this process, run: .\Manage-Port.ps1 $Port Kill" -Color Cyan
            }
        } else {
            Write-ColorText "✅ Port $Port is available" -Color Green
        }
    }
    
    "Kill" {
        Write-ColorText "Attempting to kill process using port $Port..." -Color Cyan
        
        $processInfo = Get-ProcessUsingPort -Port $Port
        if ($processInfo) {
            Write-Host ""
            Write-ColorText "Found process:" -Color Yellow
            Write-Host "  Name: $($processInfo.Name) (PID: $($processInfo.PID))"
            Write-Host "  Memory: $($processInfo.Memory) MB"
            
            if (-not $Force) {
                $confirmation = Read-Host "`nAre you sure you want to kill this process? (y/N)"
                if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
                    Write-ColorText "Operation cancelled." -Color Yellow
                    exit
                }
            }
            
            Write-Host "Killing process..."
            $success = Stop-ProcessSafely -PID $processInfo.PID -Force $Force
            
            if ($success) {
                Write-ColorText "✅ Process killed successfully" -Color Green
                
                # Recheck port
                Start-Sleep -Seconds 1
                if (Test-PortInUse -Port $Port) {
                    Write-ColorText "⚠️ Port still in use" -Color Yellow
                } else {
                    Write-ColorText "✅ Port $Port is now available" -Color Green
                }
            } else {
                Write-ColorText "❌ Failed to kill process" -Color Red
            }
        } else {
            Write-ColorText "No process found using port $Port" -Color Yellow
        }
    }
    
    "Report" {
        Write-ColorText "Generating port usage report..." -Color Cyan
        Write-Host ""
        Write-ColorText "Common ports used by bot-denuncia system:" -Color Yellow
        Write-Host ""
        
        $commonPorts = @(3355, 3356, 3357, 3358, 3359, 5432, 6379, 3000, 3001, 3007)
        
        foreach ($testPort in $commonPorts) {
            $inUse = Test-PortInUse -Port $testPort
            
            if ($inUse) {
                Write-ColorText "  Port $testPort`: IN USE" -Color Red
                $processInfo = Get-ProcessUsingPort -Port $testPort
                if ($processInfo) {
                    Write-Host "    Process: $($processInfo.Name) (PID: $($processInfo.PID))"
                }
            } else {
                Write-ColorText "  Port $testPort`: AVAILABLE" -Color Green
            }
        }
    }
    
    "FindAvailable" {
        Write-ColorText "Finding next available port starting from $Port..." -Color Cyan
        
        try {
            $availablePort = Find-AvailablePort -StartPort $Port -MaxAttempts $MaxPortAttempts
            Write-ColorText "✅ Next available port: $availablePort" -Color Green
        }
        catch {
            Write-ColorText "❌ $($_.Exception.Message)" -Color Red
        }
    }
}

Write-Host ""
Write-ColorText "Script completed." -Color Cyan