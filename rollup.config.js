import buble from 'rollup-plugin-buble';
import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';
import {
  version,
  author,
  name as moduleName,
  license,
  description,
} from './package.json';

const banner = `\
/**
 * ${moduleName} v${version}
 * ${description}
 *
 * @author ${author}
 * @license ${license}
 * @preserve
 */
`;

const name = 'in-memory-store';

export default [{
  input: 'src/index.js',
  output: {
    format: 'umd',
    file: 'dist/in-memory-store.js',
    name,
    banner,
    sourcemap: true,
  },
  plugins: [buble()],
}, {
  input: 'src/index.js',
  output: {
    format: 'umd',
    file: 'dist/in-memory-store.es6.js',
    name,
    banner,
    sourcemap: true,
  },
  plugins: [buble()],
}, {
  input: 'bench/index.js',
  output: {
    format: 'umd',
    file: 'dist/benchmark.js',
    name,
    banner,
    sourcemap: true,
  },
  plugins: [buble(),
    resolve(),
    commonJS({
      include: 'node_modules/**',
    })],
}, {
  input: 'example/index.js',
  output: {
    format: 'umd',
    file: 'example/dist/example.js',
    name,
    banner,
    sourcemap: true,
  },
  plugins: [buble()],
}];
