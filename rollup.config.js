import buble from 'rollup-plugin-buble';
import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs'
import { version, author, name as moduleName, license, description } from './package.json';

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
    name, banner,
    sourcemap: true,
  },
  plugins: [ buble(), resolve(),
    commonJS({
      include: 'node_modules/**'
    }) 
  ]
}, {
  input: 'src/index.js',
  output: {
    format: 'umd',
    file: 'dist/in-memory-store.es6.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ resolve(),
    commonJS({
      include: 'node_modules/**'
    }) 
  ]
}, {
  input: 'src/indexes/binaryindex.js',
  output: {
    format: 'umd',
    file: 'dist/binaryindex.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ buble() ]
}, {
  input: 'src/indexes/binaryindex.js',
  output: {
    format: 'umd',
    file: 'dist/binaryindex.es6.js',
    name, banner,
    sourcemap: true,
  }
}, {
  input: 'src/indexes/hashindex.js',
  output: {
    format: 'umd',
    file: 'dist/hashindex.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ buble() ]
}, {
  input: 'src/indexes/hashindex.js',
  output: {
    format: 'umd',
    file: 'dist/hashindex.es6.js',
    name, banner,
    sourcemap: true,
  }
}, {
  input: 'src/indexes/rbindex.js',
  output: {
    format: 'umd',
    file: 'dist/rbindex.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ resolve(),
    commonJS({
      include: 'node_modules/**'
    }) 
  ]
}, {
  input: 'src/indexes/rbindex.js',
  output: {
    format: 'umd',
    file: 'dist/rbindex.es6.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ buble(), resolve(),
    commonJS({
      include: 'node_modules/**'
    }) 
  ]
}, {
  input: 'src/indexes/avlindex.js',
  output: {
    format: 'umd',
    file: 'dist/avlindex.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ resolve(),
    commonJS({
      include: 'node_modules/**'
    }) 
  ]
}, {
  input: 'src/indexes/avlindex.js',
  output: {
    format: 'umd',
    file: 'dist/avlindex.es6.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ buble(), resolve(),
    commonJS({
      include: 'node_modules/**'
    }) 
  ]
} ,
{
  input: 'example/index.js',
  output: {
    format: 'umd',
    file: 'example/dist/example.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ buble(), resolve(),
    commonJS({
      include: 'node_modules/**'
    }) 
  ]
}];
