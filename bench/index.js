// Exports all modules needed for our benchmark test
// Includes modules not packaged with in-memory-store
import InMemoryStore from '../src/in-memory-store';
import AVLIndex from '../src/indexes/avlindex';
import HashIndex from '../src/indexes/hashindex';
import BinaryIndex from '../src/indexes/binaryindex';

export {
  InMemoryStore,
  AVLIndex,
  HashIndex,
  BinaryIndex,
};
