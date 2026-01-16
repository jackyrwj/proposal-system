@echo off
echo ====================================
echo 教代会提案系统 - Next.js 开发服务器
echo ====================================
echo.
echo 服务器信息：
echo - 本地访问: http://localhost:3000
echo - 网络访问: http://172.31.171.244:3000
echo.
echo 按任意键打开浏览器...
pause > nul
start http://localhost:3000
echo.
echo 浏览器已打开
echo 如果页面无法加载，请检查：
echo 1. 是否已运行: cd proposal && npm install
echo 2. 是否已启动: npm run dev
echo.
pause
