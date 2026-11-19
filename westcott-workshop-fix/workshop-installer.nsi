Unicode true
RequestExecutionLevel user
SetCompressor /SOLID zlib
ManifestDPIAware true
!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "ELLERY WESTCOTT 1.4.31"
OutFile "ElleryWestcott-Setup-1.4.31.exe"
InstallDir "$LOCALAPPDATA\Programs\ELLERY WESTCOTT"
VIProductVersion "1.4.31.0"
VIAddVersionKey "ProductName" "ELLERY WESTCOTT"
VIAddVersionKey "FileDescription" "ELLERY WESTCOTT Setup"
VIAddVersionKey "FileVersion" "1.4.31"
VIAddVersionKey "ProductVersion" "1.4.31"
!define MUI_ICON "payload\resources\modules\market\assets\ew-studio.ico"
!define MUI_UNICON "payload\resources\modules\market\assets\ew-studio.ico"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

Section
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File /r "payload\*"
  WriteUninstaller "$INSTDIR\Uninstall ELLERY WESTCOTT.exe"
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "/PORTABLEVERIFY" $1
  IfErrors register done
register:
  CreateShortCut "$DESKTOP\ELLERY WESTCOTT.lnk" "$INSTDIR\ELLERY WESTCOTT.exe" "" "$INSTDIR\resources\modules\market\assets\ew-studio.ico"
  CreateShortCut "$SMPROGRAMS\ELLERY WESTCOTT.lnk" "$INSTDIR\ELLERY WESTCOTT.exe" "" "$INSTDIR\resources\modules\market\assets\ew-studio.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ElleryWestcottWorkshop" "DisplayName" "ELLERY WESTCOTT"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ElleryWestcottWorkshop" "DisplayVersion" "1.4.31"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ElleryWestcottWorkshop" "UninstallString" '"$INSTDIR\Uninstall ELLERY WESTCOTT.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ElleryWestcottWorkshop" "InstallLocation" "$INSTDIR"
done:
SectionEnd

Section "Uninstall"
  !include "uninstall-payload.nsh"
  Delete "$INSTDIR\Uninstall ELLERY WESTCOTT.exe"
  RMDir "$INSTDIR"
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ElleryWestcottWorkshop" "InstallLocation"
  StrCmp $0 $INSTDIR 0 finish
  Delete "$DESKTOP\ELLERY WESTCOTT.lnk"
  Delete "$SMPROGRAMS\ELLERY WESTCOTT.lnk"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ElleryWestcottWorkshop"
finish:
SectionEnd
