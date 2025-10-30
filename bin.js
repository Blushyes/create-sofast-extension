#!/usr/bin/env node
/*
  create-sofast-extension
  Minimal scaffolder to create Sofast plugin projects using Vite.
  Options:
    --name <dir>            Target directory / package name
    --ts / --no-ts          Use TypeScript (default: true)
    --framework <react|vue|empty>  Framework preference (default: react)
*/
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import { bold, dim, red, green, blue } from 'colorette';

const cwd = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = { name: undefined, ts: undefined, framework: undefined, title: undefined, tailwind: undefined };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ts') out.ts = true;
    else if (a === '--no-ts') out.ts = false;
    else if (a === '--framework' || a === '-f') {
      out.framework = String(argv[++i] || '').toLowerCase();
    } else if (a === '--title' || a === '-t') {
      out.title = argv[++i];
    } else if (a === '--tailwind') {
      out.tailwind = true;
    } else if (a === '--no-tailwind') {
      out.tailwind = false;
    } else if (a === '--name' || a === '-n') {
      out.name = argv[++i];
    } else if (!a.startsWith('-') && !out.name) {
      out.name = a;
    }
  }
  return out;
}

function isValidPkgName(name) {
  // very loose check
  return /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(name);
}

async function ensureDirEmpty(dir) {
  try {
    const stat = await fsp.stat(dir).catch(() => undefined);
    if (!stat) return;
    const files = await fsp.readdir(dir);
    if (files.length > 0) {
      throw new Error(`Target directory not empty: ${dir}`);
    }
  } catch (e) {
    if (e && e.message && String(e.message).includes('not empty')) throw e;
    // ok
  }
}

function writeJSON(file, obj) {
  return fsp.writeFile(file, JSON.stringify(obj, null, 2) + os.EOL, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  printBanner();

  let name = args.name;
  let ts = typeof args.ts === 'boolean' ? args.ts : undefined;
  let framework = ['react', 'vue', 'empty'].includes(args.framework) ? args.framework : undefined;
  let title = typeof args.title === 'string' ? args.title : undefined;
  let tailwind = typeof args.tailwind === 'boolean' ? args.tailwind : undefined;

  const onCancel = () => {
    console.log(`\n${red('✖')} ${dim('Aborted by user (Ctrl+C)')}`);
    process.exit(1);
  };

  // name
  if (!name) {
    const { name: n } = await prompts({
      type: 'text',
      name: 'name',
      message: `${blue(bold('Plugin directory name'))} ${dim('(e.g. my-plugin)')}`,
      initial: 'sofast-plugin',
      validate: (v) => (isValidPkgName(v) ? true : red('Invalid package/directory name')),
    }, { onCancel });
    name = n || 'sofast-plugin';
  }
  if (!isValidPkgName(name)) {
    console.error(red(`Invalid package/directory name: ${name}`));
    process.exit(1);
  }

  // ts
  if (ts === undefined) {
    const { ts: t } = await prompts({
      type: 'toggle',
      name: 'ts',
      message: blue(bold('Use TypeScript?')),
      initial: true,
      active: 'Yes',
      inactive: 'No',
    }, { onCancel });
    ts = t;
  }

  // framework
  if (!framework) {
    const { framework: f } = await prompts({
      type: 'select',
      name: 'framework',
      message: blue(bold('Framework')),
      choices: [
        { title: 'React', value: 'react' },
        { title: 'Vue', value: 'vue' },
        { title: 'Empty', value: 'empty' },
      ],
      initial: 0,
    }, { onCancel });
    framework = f || 'react';
  }

  // title
  const derivedTitle = toDisplayTitle(name);
  if (!title) {
    const { title: t } = await prompts({
      type: 'text',
      name: 'title',
      message: blue(bold('Display title')),
      initial: derivedTitle,
    }, { onCancel });
    title = t || derivedTitle;
  }

  // tailwind
  if (tailwind === undefined) {
    const { tailwind: tw } = await prompts({
      type: 'toggle',
      name: 'tailwind',
      message: blue(bold('Use Tailwind?')),
      initial: true,
      active: 'Yes',
      inactive: 'No',
    }, { onCancel });
    tailwind = tw;
  }

  const targetDir = path.resolve(cwd, name);
  await ensureDirEmpty(targetDir);
  await fsp.mkdir(targetDir, { recursive: true });

  const pm = detectPackageManager();
  const uiEntry = 'index.html';
  const pkg = buildPackageJSON({ name, ts, framework, uiEntry, tailwind, title });
  // write package.json
  await writeJSON(path.join(targetDir, 'package.json'), pkg);

  // copy file-based templates (common + variant)
  const templatesRoot = path.resolve(__dirname, 'templates');
  const commonDir = path.join(templatesRoot, 'common');
  const variantDir = path.join(templatesRoot, framework, ts ? 'ts' : 'js');

  const replacements = {
    __EXT__: ts ? 'ts' : 'js',
    __PKG_NAME__: name,
    __DISPLAY_NAME__: title,
    __UI_ENTRY__: uiEntry,
    __FRAMEWORK__: framework,
    __TAILWIND_IMPORT__: tailwind ? "import tailwindcss from '@tailwindcss/vite';" : '',
    __TAILWIND_PLUGIN_TRAILING__: tailwind ? ', tailwindcss()' : '',
    __TAILWIND_PLUGIN_SOLO__: tailwind ? 'tailwindcss()' : '',
  };

  await copyDir(commonDir, targetDir, { replacements });
  await copyDir(variantDir, targetDir, { replacements });

  // Done
  const runCmd = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npm run';
  console.log(`\n${green('✔')} ${bold('Scaffolded Sofast extension')}: ${dim(targetDir)}`);
  console.log(`\n${bold('Next steps')}`);
  console.log(`  1) ${bold('cd')} ${name}`);
  console.log(`  2) ${bold('pnpm i')} ${dim('(or yarn / npm i)')}`);
  console.log(`  3) ${bold(runCmd)} dev`);
}

function detectPackageManager() {
  const ua = process.env.npm_config_user_agent || '';
  if (ua.includes('pnpm')) return 'pnpm';
  if (ua.includes('yarn')) return 'yarn';
  if (ua.includes('bun')) return 'bun';
  return 'npm';
}

function buildPackageJSON({ name, ts, framework, uiEntry, tailwind, title }) {
  /** @type {Record<string, any>} */
  const pkg = {
    name,
    type: 'module',
    version: '0.0.1',
    private: true,
    scripts: {
      dev: 'vite',
      build: 'vite build && (cp package.json dist/package.json || copy package.json dist\\package.json >NUL)',
      preview: 'vite preview'
    },
    // New manifest: top-level commands only; UI entry defaults to index.html
    commands: [
      { name: 'hello', title: title || 'Hello Sofast Extension', mode: 'view' }
    ],
    dependencies: {},
    devDependencies: {
      vite: '^7.1.6'
    }
  };

  if (framework === 'react') {
    Object.assign(pkg.dependencies, {
      react: '^19.1.1',
      'react-dom': '^19.1.1'
    });
    Object.assign(pkg.devDependencies, {
      '@vitejs/plugin-react': '^5.0.3'
    });
    if (tailwind) Object.assign(pkg.dependencies, { tailwindcss: '^4.1.10', '@tailwindcss/vite': '^4.1.10' });
    if (ts) Object.assign(pkg.devDependencies, { typescript: '^5.9.2', '@types/react': '^19.1.13', '@types/react-dom': '^19.1.9' });
  } else if (framework === 'vue') {
    Object.assign(pkg.dependencies, { vue: '^3.5.12' });
    Object.assign(pkg.devDependencies, { '@vitejs/plugin-vue': '^5.1.4' });
    if (tailwind) Object.assign(pkg.dependencies, { tailwindcss: '^4.1.10', '@tailwindcss/vite': '^4.1.10' });
    if (ts) Object.assign(pkg.devDependencies, { typescript: '^5.9.2' });
  } else {
    if (tailwind) Object.assign(pkg.dependencies, { tailwindcss: '^4.1.10', '@tailwindcss/vite': '^4.1.10' });
    if (ts) Object.assign(pkg.devDependencies, { typescript: '^5.9.2' });
  }

  return pkg;
}

function toDisplayTitle(pkgName) {
  // strip scope
  const name = pkgName.replace(/^@[^/]+\//, '');
  // split by - _ . and space
  const parts = name.split(/[\-_.\s]+/).filter(Boolean);
  return parts.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

// recursively copy directory; if a file ends with .tpl, apply replacements and drop the .tpl suffix
async function copyDir(src, dest, options = {}) {
  const { replacements = {} } = options;
  const stat = await fsp.stat(src).catch(() => undefined);
  if (!stat) return; // nothing to copy
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const it of entries) {
    const s = path.join(src, it.name);
    let dName = it.name;
    const isTpl = dName.endsWith('.tpl');
    if (isTpl) dName = dName.slice(0, -4);
    const d = path.join(dest, dName);
    if (it.isDirectory()) {
      await copyDir(s, d, options);
    } else if (it.isFile()) {
      if (isTpl) {
        let content = await fsp.readFile(s, 'utf8');
        for (const [k, v] of Object.entries(replacements)) {
          const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          content = content.replace(re, String(v));
        }
        await fsp.writeFile(d, content, 'utf8');
      } else {
        await fsp.mkdir(path.dirname(d), { recursive: true });
        await fsp.copyFile(s, d);
      }
    }
  }
}

function printBanner() {
  const line = '━'.repeat(Math.min(process.stdout.columns || 60, 60));
  console.log(`\n${bold(blue('Create Sofast Extension'))}\n${dim(line)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
