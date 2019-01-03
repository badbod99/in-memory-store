import InMemoryStore from './src/in-memory-store';
import { data } from './dummydata/people';

let store = new InMemoryStore(item => item.id);

store.populate(data);
store.buildBinaryIndex("firstLetter", r => r.name.first.substring(0,1));

let letters = store.getValues("firstLetter");

renderButtons(letters.sort());
renderCat(letters[0]);

function renderCat(firstLetter) {
    let cat = store.get("firstLetter", firstLetter);

    let ul = document.getElementById('people-list');
    ul.innerHTML = '';

    cat.forEach((f) => {
        ul.appendChild(createItem(f));
    });
}

function renderButtons(values) {
    let btnGroup = document.getElementById('firstLetter-list');

    values.forEach((value => {
        let b = document.createElement('button');
        b.type = "button";
        b.value = value;
        b.onclick = () => renderCat(value);
        b.appendChild(document.createTextNode(`${value}`));
        btnGroup.appendChild(b);
    }));
}

function createItem(item) {
    let d = document;
    let name = d.createElement('label');  
    name.appendChild( d.createTextNode(`${item.name.first} ${item.name.last}`));
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