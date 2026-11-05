@echo off
setlocal
chcp 65001 >nul
title UPC TV - Instalator pre Samsung Smart TV

echo ================================================================
echo    UPC TV - Automaticky instalator pre Samsung Smart TV
echo ================================================================
echo.

set SDB_EXE=C:\tizen-studio\tools\sdb.exe
set TIZEN_BAT=C:\tizen-studio\tools\ide\bin\tizen.bat
set SCRIPT_DIR=%~dp0
set WGT_PATH=%SCRIPT_DIR%UPC_TV.wgt

if not exist "%SDB_EXE%" (
    echo [CHYBA] Nastroj sdb.exe sa nenasiel v C:\tizen-studio\tools\sdb.exe!
    pause
    exit /b 1
)

echo [OK] Najdene vyvojarske nastroje Tizen Studio.
echo.

REM 1. Zostavenie a podpisanie balicka
echo [1/4] Zostavujem a podpisujem aktualny balicek UPC_TV.wgt...
call node "%SCRIPT_DIR%build-wgt.js"
if errorlevel 1 (
    echo [CHYBA] Zostavenie balicka zlyhalo!
    pause
    exit /b 1
)

REM 2. Pripojenie k TV
set TV_IP=%1
if "%TV_IP%"=="" set TV_IP=192.168.100.14
echo.
echo [2/4] Pripajam sa k televizoru Samsung (%TV_IP%:26101) ...
"%SDB_EXE%" connect %TV_IP%:26101

REM 3. Instalacia aplikacie
echo.
echo [3/4] Instalujem aplikaciu UPC TV do televizora (%TV_IP%:26101)...
call "%TIZEN_BAT%" install -n "%WGT_PATH%" -s %TV_IP%:26101
if errorlevel 1 (
    echo.
    echo [INFO] Pokusam sa o cistu reinstalaciu (odinstalovanie starej verzie)...
    call "%TIZEN_BAT%" uninstall -p UPCTV00001.UpcTv -s %TV_IP%:26101
    call "%TIZEN_BAT%" uninstall -p UPCTV00001 -s %TV_IP%:26101
    echo.
    echo [INFO] Opakujem instalaciu...
    call "%TIZEN_BAT%" install -n "%WGT_PATH%" -s %TV_IP%:26101
)

echo.
REM 4. Spustenie aplikacie na TV
echo [4/4] Spustam aplikaciu UPC TV na obrazovke televizora...
call "%TIZEN_BAT%" run -p UPCTV00001.UpcTv -s %TV_IP%:26101

echo.
echo ================================================================
echo    HOTOVO! Aplikacia UPC TV v1.5.5 bezi na Vasom televizore!
echo ================================================================
echo.
pause
