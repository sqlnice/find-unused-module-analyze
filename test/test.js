const chalk = require('chalk');
const findUnusedModule = require('../src/index');
const path = require('path');
const { all, used, unused } = findUnusedModule({
  cwd: process.cwd(), // 解析模块的根路径
  //   entries: ['./demo-project/fre.js', './demo-project/suzhe2.js'], // 入口文件
  entries: ['./demo-project/fre.js'], // 入口文件
  includes: ['./demo-project/**/*'], //
  resolveRequirePath(curDir, requirePath) {
    if (requirePath === 'b') {
      return path.resolve(curDir, './lib/ssh.js');
    }
    return requirePath;
  },
});

// console.log(chalk.blue('used modules:'));
// console.log(used);
// console.log(chalk.yellow('unused modules:'));
// console.log(unused);
