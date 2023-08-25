import { createRequire } from 'node:module';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import swc from '@rollup/plugin-swc';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import ignore from './rollup-plugins/ignore.js';
import minifyHTML from 'rollup-plugin-minify-html-literals';
import summary from 'rollup-plugin-summary';
import { ignoreTextfieldFiles, ignoreSelectFiles, ignoreSwitchFiles } from './elements/ignore/ignore.js';

// Ignore the is-server because... the file isn't there? This is the error:
// (!) Unresolved dependencies
// https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
// lit-html/is-server.js (imported by node_modules/lit/index.js)
// (!) Unused external imports
// noChange,LitElement,html,css imported from external module "lit-html/is-server.js" but never used in "node_modules/lit/index.js"
const ignoreLitHtmlIsServer = ['lit-html/is-server.js'];

const require = createRequire(import.meta.url);

const dev = process.env.ROLLUP_WATCH;

const serveOpts = {
  contentBase: ['./dist'],
  host: '0.0.0.0',
  port: 3000,
  allowCrossOrigin: true,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
};

/**
 * @type {import('rollup').RollupOptions}
 */
export default {
  input: 'src/custom-cards.ts',
  output: {
    dir: 'dist',
    format: 'esm',
    inlineDynamicImports: true,
  },
  plugins: [
    nodeResolve({ extensions: ['.ts', '.mjs', '.js', '.json', '.node'] }),
    commonjs(),
    swc(),
    json(),
    !dev && minifyHTML.default(),
    !dev && terser(),
    dev && serve(serveOpts),
    ignore({
      // Ignore these Material files and use the Home Assistant instances instead
      // for distribution
      files: [...ignoreTextfieldFiles, ...ignoreSelectFiles, ...ignoreSwitchFiles, ...ignoreLitHtmlIsServer].map(
        (file) => require.resolve(file),
      ),
    }),
    !dev && summary(),
  ],
};
