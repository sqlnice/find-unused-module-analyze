const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
const { resolve, dirname, join, extname } = require('path');
const chalk = require('chalk');
const postcss = require('postcss');
const postcssLess = require('postcss-less');
const postcssScss = require('postcss-scss');

const JS_EXTS = ['.js', '.jsx', '.ts', '.tsx'];
const CSS_EXTS = ['.css', '.less', '.scss'];
const JSON_EXTS = ['.json'];

let requirePathResolver = () => {};

const MODULE_TYPES = {
  JS: 1 << 0,
  CSS: 1 << 1,
  JSON: 1 << 2,
};

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (e) {}
  return false;
}

const visitedModules = new Set();

function moduleResolver(curModulePath, requirePath) {
  if (typeof requirePathResolver === 'function') {
    const res = requirePathResolver(dirname(curModulePath), requirePath);
    if (typeof res === 'string') {
      requirePath = res;
    }
  }

  requirePath = resolve(dirname(curModulePath), requirePath);
  // 过滤掉第三方模块
  if (requirePath.includes('node_modules')) {
    return '';
  }

  requirePath = completeModulePath(requirePath);
  // 保存遍历过的路径
  if (visitedModules.has(requirePath)) {
    return '';
  } else {
    visitedModules.add(requirePath);
  }
  return requirePath;
}
// 补齐模块路径
function completeModulePath(modulePath) {
  const EXTS = [...JSON_EXTS, ...JS_EXTS];
  if (modulePath.match(/\.[a-zA-Z]+$/)) {
    return modulePath;
  }

  function tryCompletePath(resolvePath) {
    for (let i = 0; i < EXTS.length; i++) {
      let tryPath = resolvePath(EXTS[i]);
      // 路径是否存在
      if (fs.existsSync(tryPath)) {
        return tryPath;
      }
    }
  }

  function reportModuleNotFoundError(modulePath) {
    throw chalk.red('module not found: ' + modulePath);
  }

  if (isDirectory(modulePath)) {
    // 为文件夹，去找文件夹下index.相关后缀
    const tryModulePath = tryCompletePath((ext) => join(modulePath, 'index' + ext));
    if (!tryModulePath) {
      reportModuleNotFoundError(modulePath);
    } else {
      return tryModulePath;
    }
  } else if (!EXTS.some((ext) => modulePath.endsWith(ext))) {
    // 没有文件后缀，补齐
    const tryModulePath = tryCompletePath((ext) => modulePath + ext);
    if (!tryModulePath) {
      reportModuleNotFoundError(modulePath);
    } else {
      return tryModulePath;
    }
  }
  return modulePath;
}

function resolveBabelSyntaxtPlugins(modulePath) {
  const plugins = [];
  if (['.tsx', '.jsx'].some((ext) => modulePath.endsWith(ext))) {
    plugins.push('jsx');
  }
  if (['.ts', '.tsx'].some((ext) => modulePath.endsWith(ext))) {
    plugins.push('typescript');
  }
  return plugins;
}

function resolveBabelSyntaxtPlugins(modulePath) {
  const plugins = [];
  if (['.tsx', '.jsx'].some((ext) => modulePath.endsWith(ext))) {
    plugins.push('jsx');
  }
  if (['.ts', '.tsx'].some((ext) => modulePath.endsWith(ext))) {
    plugins.push('typescript');
  }
  return plugins;
}

function resolvePostcssSyntaxtPlugin(modulePath) {
  if (modulePath.endsWith('.scss')) {
    return postcssScss;
  }
  if (modulePath.endsWith('.less')) {
    return postcssLess;
  }
}

function getModuleType(modulePath) {
  const moduleExt = extname(modulePath);
  if (JS_EXTS.some((ext) => ext === moduleExt)) {
    return MODULE_TYPES.JS;
  } else if (CSS_EXTS.some((ext) => ext === moduleExt)) {
    return MODULE_TYPES.CSS;
  } else if (JSON_EXTS.some((ext) => ext === moduleExt)) {
    return MODULE_TYPES.JSON;
  }
}

function traverseCssModule(curModulePath, callback) {
  const moduleFileConent = fs.readFileSync(curModulePath, {
    encoding: 'utf-8',
  });

  const ast = postcss.parse(moduleFileConent, {
    syntaxt: resolvePostcssSyntaxtPlugin(curModulePath),
  });
  ast.walkAtRules('import', (rule) => {
    const subModulePath = moduleResolver(curModulePath, rule.params.replace(/['"]/g, ''));
    if (!subModulePath) {
      return;
    }
    callback && callback(subModulePath);
    traverseModule(subModulePath, callback);
  });
  ast.walkDecls((decl) => {
    if (decl.value.includes('url(')) {
      const url = /.*url\((.+)\).*/.exec(decl.value)[1].replace(/['"]/g, '');
      const subModulePath = moduleResolver(curModulePath, url);
      if (!subModulePath) {
        return;
      }
      callback && callback(subModulePath);
    }
  });
}

function traverseJsModule(curModulePath, callback) {
  const moduleFileContent = fs.readFileSync(curModulePath, {
    encoding: 'utf-8',
  });

  const ast = parser.parse(moduleFileContent, {
    sourceType: 'unambiguous',
    plugins: resolveBabelSyntaxtPlugins(curModulePath),
  });

  traverse(ast, {
    // 获取当前文件夹下的import节点
    ImportDeclaration(path) {
      console.log(chalk.blue('获取当前文件夹下的import节点:'));
      const node = path.get('source.value');
      console.log(path.get('source.value').node);
      const subModulePath = moduleResolver(curModulePath, path.get('source.value').node);
      if (!subModulePath) {
        return;
      }
      // 调用回调，把路径保存进useModule
      callback && callback(subModulePath);
      // 递归调用子路径
      traverseModule(subModulePath, callback);
    },
    CallExpression(path) {
      if (path.get('callee').toString() === 'require') {
        const subModulePath = moduleResolver(curModulePath, path.get('arguments.0').toString().replace(/['"]/g, ''));
        if (!subModulePath) {
          return;
        }
        callback && callback(subModulePath);
        traverseModule(subModulePath, callback);
      }
    },
  });
}

// 从入口文件开始递归已使用模块
// curModulePath   C:\Users\小乖\Desktop\find-unused-module-master\demo-project\fre.js
function traverseModule(curModulePath, callback) {
  curModulePath = completeModulePath(curModulePath);
  const moduleType = getModuleType(curModulePath);
  if (moduleType & MODULE_TYPES.JS) {
    // 递归处理JS
    traverseJsModule(curModulePath, callback);
  } else if (moduleType & MODULE_TYPES.CSS) {
    // 递归处理CSS
    traverseCssModule(curModulePath, callback);
  }
}

module.exports.traverseModule = traverseModule;
module.exports.setRequirePathResolver = (resolver) => {
  requirePathResolver = resolver;
};
