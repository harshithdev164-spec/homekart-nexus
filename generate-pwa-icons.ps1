# Quick PWA Icon Generator Script
# This creates basic PWA icons from the favicon

Write-Host "Creating PWA icons from favicon..." -ForegroundColor Cyan

# Check if favicon exists
if (-not (Test-Path "public/favicon.ico")) {
    Write-Host "Error: favicon.ico not found in public folder" -ForegroundColor Red
    exit 1
}

# For now, just copy the favicon as a temporary solution
# In production, you should create proper PNG icons
Copy-Item "public/favicon.ico" "public/icon-192.png" -Force
Copy-Item "public/favicon.ico" "public/icon-512.png" -Force

Write-Host "✓ Created icon-192.png" -ForegroundColor Green
Write-Host "✓ Created icon-512.png" -ForegroundColor Green
Write-Host ""
Write-Host "Note: These are temporary icons. For production, create proper PNG icons:" -ForegroundColor Yellow
Write-Host "  - Use an online tool like https://realfavicongenerator.net/" -ForegroundColor Yellow
Write-Host "  - Or use design software to create 192x192 and 512x512 PNG files" -ForegroundColor Yellow
