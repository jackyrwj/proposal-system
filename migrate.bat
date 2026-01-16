@echo off
cd /d "%~dp0"
mysql -u root jdhtagz_local < "sql\migrate_settings_tables.sql"
pause
