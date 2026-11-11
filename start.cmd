@echo off
rem One-command launch without changing PowerShell execution policy: double-click or .\start.cmd
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
