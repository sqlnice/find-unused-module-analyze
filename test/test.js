const chalk = require('chalk');
const findUnusedModule = require('../src/index');
const path = require('path');
const { all, used, unused } = findUnusedModule({
  cwd: process.cwd(), // 项目目录
  entries: ['./demo-project/sqltest'], // 入口文件
  // includes: ['./demo-project/**/*'], // 所有文件
  // resolveRequirePath(curDir, requirePath) {
  //   // 自定义解析路径
  //   if (requirePath === 'b') {
  //     return path.resolve(curDir, './lib/ssh.js');
  //   }
  //   return requirePath;
  // },
});
console.log(chalk.blue('used modules:'));
console.log(used);
console.log(chalk.yellow('unused modules:'));
console.log(unused);
