import InMemoryStore from '../src/index';
import { data } from './dummydata/people';

let store = new InMemoryStore(item => item.id);

let catFn = r => r.name.last.substring(0,1).toUpperCase();
store.populate(data);
store.buildBinaryIndex("firstLetter", catFn);

let letters = store.getIndexKeys("firstLetter");

renderButtons(letters);
renderCategory(letters[0]);

function removeEntry(item) {
    let cat = store.removeOne(item);
    renderCategory(catFn(item));
}

function renderCategory(firstLetter) {
    let cat = store.getOne("firstLetter", firstLetter);
    let ul = document.getElementById('people-list');
    ul.innerHTML = '';
    cat.forEach(f => ul.appendChild(createItem(f)));
}

function renderButtons(values) {
    let btnGroup = document.getElementById('firstLetter-list');

    values.forEach((value => {
        let b = createButton(() => renderCategory(value), value);
        btnGroup.appendChild(b);
    }));
}

function createButton(onclick, value) {
    let b = document.createElement('button');
    b.type = "button";
    b.value = value;
    b.onclick = onclick;
    b.appendChild(document.createTextNode(`${value}`));
    return b;
}

function createItem(item) {
    let d = document;

    let remove = createButton(() => removeEntry(item), "X");
    let name = d.createElement('label');  
    name.appendChild( d.createTextNode(`${item.name.first} ${item.name.last} `));
    name.appendChild(remove);
    let address = d.createElement('p');  
    address.appendChild( d.createTextNode(`${item.address}`));
    let email = d.createElement('p');  
    email.appendChild( d.createTextNode(`${item.email}`));
    let phone = d.createElement('p');  
    phone.appendChild( d.createTextNode(`${item.phone}`));

    var div = d.createElement('div');
    div.className = 'view';
    div.appendChild(name);
    div.appendChild(phone);
    div.appendChild(email);
    div.appendChild(address);
    
    var li = d.createElement('li');
    li.id = 'li_' + item.id;
    li.appendChild(div);
    return li;
}