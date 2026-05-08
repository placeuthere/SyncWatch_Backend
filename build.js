/**
 * 构建脚本：打包 Chrome 和 Edge 版本
 * 用法：node build.js [production|development]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const mode = args[0] || 'development';
const SERVER_URL = mode === 'production'
  ? 'https://your-production-server.com'  // TODO: 改为生产服务器地址
  : 'http://localhost:3000';

console.log(`🔨 构建模式: ${mode}`);
console.log(`📡 服务器地址: ${SERVER_URL}`);

// 源目录和输出目录
const srcDir = path.join(__dirname, 'src');
const buildDir = path.join(__dirname, 'build');
const chromeDir = path.join(buildDir, 'chrome');
const edgeDir = path.join(buildDir, 'edge');

// 清空旧的构建目录
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

// 复制文件并替换服务器地址
function copyAndReplace(src, dest) {
  let content = fs.readFileSync(src, 'utf8');

  // 替换服务器地址（仅在 background.js 中）
  if (src.endsWith('background.js')) {
    content = content.replace(
      /const SERVER_URL = '[^']+';/,
      `const SERVER_URL = '${SERVER_URL}';`
    );
  }

  fs.writeFileSync(dest, content);
}

// 构建版本
function buildVersion(targetDir, browserName) {
  console.log(`\n📦 构建 ${browserName} 版本...`);

  cleanDir(targetDir);

  // 复制所有文件
  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(targetDir, file);

    const stat = fs.statSync(srcPath);
    if (stat.isFile()) {
      copyAndReplace(srcPath, destPath);
      console.log(`  ✓ ${file}`);
    }
  });

  console.log(`✅ ${browserName} 版本构建完成: ${targetDir}`);
}

// 执行构建
buildVersion(chromeDir, 'Chrome');
buildVersion(edgeDir, 'Edge');

console.log(`\n🎉 全部构建完成！`);
console.log(`📂 Chrome 版本: ${chromeDir}`);
console.log(`📂 Edge 版本: ${edgeDir}`);
console.log(`\n📋 下一步：`);
console.log(`  1. 压缩为 .zip 文件`);
console.log(`  2. 上传到 Chrome Web Store 和 Microsoft Edge Add-ons`);
