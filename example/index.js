import InMemoryStore from './src/in-memory-store';

let store = new InMemoryStore(item => item.id);

let racers = [{
    id: '1',
    name: 'Simon Lerpiniere',
    category: '2nd'
},
{
    id: '2',
    name: 'Matt Dudman',
    category: '1st'
}];

store.populate(racers);

var ul = document.getElementById('racer-list');
ul.innerHTML = '';