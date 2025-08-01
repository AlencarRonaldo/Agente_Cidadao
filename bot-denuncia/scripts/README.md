# Port Management Scripts

This directory contains utilities to help manage port conflicts for the bot-denuncia system.

## Files Overview

### 1. `portManager.js` (Node.js Module)
Located at `src/utils/portManager.js` - Core port management utilities used by the application.

**Features:**
- Check port availability
- Find processes using specific ports
- Automatically find next available port
- Safely terminate conflicting processes
- Generate port usage reports
- Resolve port conflicts automatically

### 2. `check-port.bat` (Windows Batch Script)
Simple command-line tool for port management.

**Usage:**
```bash
# Check if port 3355 is in use
check-port.bat

# Check specific port
check-port.bat 3356

# Kill process using port 3355
check-port.bat 3355 kill

# Generate port usage report
check-port.bat 3355 report
```

### 3. `Manage-Port.ps1` (PowerShell Script)
Advanced PowerShell script with more features and better error handling.

**Usage:**
```powershell
# Check port (default 3355)
.\Manage-Port.ps1

# Check specific port
.\Manage-Port.ps1 -Port 3356

# Kill process using port (with confirmation)
.\Manage-Port.ps1 -Port 3355 -Action Kill

# Force kill without confirmation
.\Manage-Port.ps1 -Port 3355 -Action Kill -Force

# Generate comprehensive report
.\Manage-Port.ps1 -Action Report

# Find next available port
.\Manage-Port.ps1 -Port 3355 -Action FindAvailable
```

### 4. `safe-start.bat` (Application Startup Script)
Intelligent startup script that handles port conflicts automatically.

**Features:**
- Checks port availability before starting
- Identifies conflicting processes
- Offers to terminate safe processes (Node.js instances)
- Installs dependencies if needed
- Starts the application with error handling

**Usage:**
```bash
# Start the application safely
safe-start.bat
```

## Port Conflict Resolution Strategy

The system uses a multi-layered approach to resolve port conflicts:

### 1. **Detection Phase**
- Check if desired port (3355) is available
- Identify process using the port if occupied
- Determine if the process is safe to terminate

### 2. **Resolution Phase**
- **Option A**: Terminate safe processes (Node.js instances)
- **Option B**: Find next available port (3356, 3357, etc.)
- **Option C**: User intervention for system processes

### 3. **Safety Measures**
- Never terminate system-critical processes
- Always confirm before killing processes (unless forced)
- Provide detailed information about conflicting processes
- Validate port availability after process termination

## Common Port Ranges

The bot-denuncia system typically uses these ports:

- **3355**: Main application server (default)
- **3356-3359**: Alternative ports for main server
- **3000-3007**: Frontend/admin panel servers
- **5432**: PostgreSQL database
- **6379**: Redis cache server

## Troubleshooting

### Error: "EADDRINUSE: address already in use"

1. **Quick Fix:**
   ```bash
   # Run the safe startup script
   scripts\safe-start.bat
   ```

2. **Manual Check:**
   ```bash
   # Check what's using the port
   scripts\check-port.bat 3355 check
   
   # Kill the process if safe
   scripts\check-port.bat 3355 kill
   ```

3. **PowerShell Alternative:**
   ```powershell
   # Comprehensive check with process details
   .\scripts\Manage-Port.ps1 -Port 3355 -Action Check
   
   # Force kill if needed
   .\scripts\Manage-Port.ps1 -Port 3355 -Action Kill -Force
   ```

### Port Still in Use After Killing Process

Sometimes processes don't release ports immediately. Solutions:

1. **Wait and retry** (process cleanup delay)
2. **Restart the terminal/command prompt**
3. **Use the PowerShell script** (more reliable process handling)
4. **Let the app find an alternative port** (automatic fallback)

### System Process Using Port

If a system process is using the port:

1. **Don't kill system processes** (dangerous)
2. **Use alternative port** (app will auto-detect)
3. **Change default port** in `.env` file
4. **Check for port conflicts** with other applications

## Integration with Application

The main application (`src/index.js`) automatically uses these utilities:

- **Startup**: Resolves port conflicts before server start
- **Error Handling**: Provides detailed error messages for port issues
- **Graceful Fallback**: Finds alternative ports when needed
- **Process Management**: Safely handles conflicting Node.js instances

## Security Considerations

- Scripts only terminate "safe" processes (Node.js, npm, etc.)
- System processes are protected from termination
- User confirmation required for process termination
- Detailed logging of all port management actions
- Force flags require explicit user intent