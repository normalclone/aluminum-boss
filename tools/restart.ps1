# Dung may chu, dung lai, chay lai. Chay tu thu muc goc du an.
#
# Ton tai vi ban .exe dang chay khoa chinh file MSBuild muon ghi de: bo qua buoc dung thi
# `dotnet build` bao "Exceeded retry count of 10" sau 30 giay cho, va thong bao loi noi ve
# apphost.exe chu khong noi ve may chu, nen rat de doc nham thanh loi bien dich.
#
#   powershell -File tools/restart.ps1 [cong]
param([int]$Port = 5199)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Get-Process QlWeb2 -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host ("  dung may chu dang chay (pid {0})" -f $_.Id)
    Stop-Process -Id $_.Id -Force
}
Start-Sleep -Milliseconds 600

$build = & dotnet build -v q --nologo 2>&1
if ($LASTEXITCODE -ne 0) { $build | Select-Object -Last 25; exit 1 }
Write-Host '  build sach'

$exe = Join-Path $root 'bin\Debug\net8.0\QlWeb2.exe'
$log = Join-Path $env:TEMP 'qlweb2.log'
$env:ASPNETCORE_URLS = "http://localhost:$Port"
Start-Process -FilePath $exe -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"

for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { Write-Host ("  may chu len o cong {0}" -f $Port); exit 0 }
    } catch { }
}
Write-Host '  may chu KHONG len — xem log:'
Write-Host $log
Get-Content $log -Tail 20 -ErrorAction SilentlyContinue
exit 1
