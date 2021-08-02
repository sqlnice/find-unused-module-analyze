const { resolve, normalize } = require('path');
const fastGlob = require('fast-glob');
const { traverseModule, setRequirePathResolver } = require('./traverseModule');

const defaultOptions = {
  cwd: '',
  entries: [],
  includes: ['**/*', '!node_modules'],
  resolveRequirePath: () => {},
};

function findUnusedModule(options) {
  // 初始化默认值
  let { cwd, entries, includes, resolveRequirePath } = Object.assign(defaultOptions, options);
  includes = includes.map((includePath) => (cwd ? `${cwd.replace(/\\/g, '/')}/${includePath}` : includePath));
  // entries   [ './demo-project/fre.js', './demo-project/suzhe2.js' ]
  // includes   [ 'C:/Users/小乖/Desktop/find-unused-module-master/./demo-project/**/*' ]

  // 匹配该路径下的所有文件
  // normalize 规范化给定的 path，解析 '..' 和 '.' 片段
  const allFiles = fastGlob.sync(includes).map((item) => normalize(item));
  const entryModules = [];
  const usedModules = [];
  setRequirePathResolver(resolveRequirePath);
  entries.forEach((entry) => {
    const entryPath = resolve(cwd, entry);
    entryModules.push(entryPath);
    traverseModule(entryPath, (modulePath) => {
      usedModules.push(modulePath);
    });
  });
  const unusedModules = allFiles.filter((filePath) => {
    const resolvedFilePath = resolve(filePath);
    return !entryModules.includes(resolvedFilePath) && !usedModules.includes(resolvedFilePath);
  });
  return {
    all: allFiles,
    used: usedModules,
    unused: unusedModules,
  };
}

module.exports = findUnusedModule;
