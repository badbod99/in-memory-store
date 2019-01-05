import buble from 'rollup-plugin-buble';
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
  plugins: [ buble() ]
}, {
  input: 'src/index.js',
  output: {
    format: 'umd',
    file: 'dist/in-memory-store.es6.js',
    name, banner,
    sourcemap: true,
  }
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
  input: 'src/indexes/binaryarray.js',
  output: {
    format: 'umd',
    file: 'dist/binaryarray.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ buble() ]
}, {
  input: 'src/indexes/binaryarray.js',
  output: {
    format: 'umd',
    file: 'dist/binaryarray.es6.js',
    name, banner,
    sourcemap: true,
  }
},
{
  input: 'example/index.js',
  output: {
    format: 'umd',
    file: 'example/dist/example.js',
    name, banner,
    sourcemap: true,
  },
  plugins: [ buble() ]
}];
