set MAIN_JS=%~dp0\majiang_server\app.js
set CONFIG=%~dp0\config_remote.js
call node.exe %MAIN_JS% %CONFIG%
pause