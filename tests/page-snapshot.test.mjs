import test from 'node:test';
import assert from 'node:assert/strict';
import { freezePage } from '../app/experience/page-snapshot.ts';

class Style {
  constructor(values = {}) { Object.assign(this, values); }
  setProperty(key, value) { this[key] = value; }
  getPropertyValue(key) { return this[key] ?? ''; }
  [Symbol.iterator]() { return Object.keys(this)[Symbol.iterator](); }
  get cssText() { return JSON.stringify(this); }
  set cssText(value) { Object.assign(this, JSON.parse(value)); }
}
class Element {
  constructor(id, computed = {}, rect = {}) {
    this.id = id; this.style = new Style(); this.computed = new Style({position:'static',...computed});
    this.rect = {left:0,top:0,width:100,height:20,...rect}; this.children = []; this.dataset = {};
    this.scrollTop = 0; this.scrollLeft = 0; this.attributes = {id};
  }
  append(child) { child.parent?.children.splice(child.parent.children.indexOf(child), 1); child.parent = this; this.children.push(child); }
  before(child) { child.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this), 0, child); }
  querySelectorAll() { return this.children.flatMap(child => [child, ...child.querySelectorAll()]); }
  cloneNode() { const copy = new this.constructor(this.id, this.computed, this.rect); for (const child of this.children) copy.append(child.cloneNode()); return copy; }
  getBoundingClientRect() { return this.rect; }
  removeAttribute(name) { delete this.attributes[name]; }
  setAttribute(name, value) { this.attributes[name] = value; }
}
class Input extends Element {}
class TextArea extends Element {}
class Select extends Element {}
class Canvas extends Element {
  getContext() { return {drawImage: source => { this.drawn = source; }}; }
  dispatchEvent(event) { this.snapshotEvent = event; }
}
function environment() {
  const originals = new Map();
  const replacements = {
    document: {createElement: () => new Element('')}, HTMLInputElement: Input,
    HTMLTextAreaElement: TextArea, HTMLSelectElement: Select, HTMLCanvasElement: Canvas,
    getComputedStyle: (node, pseudo) => pseudo ? new Style({content:'none'}) : node.computed,
  };
  for (const [key,value] of Object.entries(replacements)) {
    originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{value,configurable:true});
  }
  return () => { for (const [key,value] of originals) { if(value) Object.defineProperty(globalThis,key,value); else delete globalThis[key]; } };
}

test('snapshot freezes ID-dependent grid and inherited font before stripping identifiers', () => {
  const restore = environment();
  try {
    const source = new Element('root', {}, {width:1200,top:-380});
    const grid = new Element('kem-flow', {display:'grid','grid-template-columns':'300px 220px 300px','font-family':'Arial','container-type':'inline-size'});
    source.append(grid);
    const {clone} = freezePage(source), copy = clone.children[0];
    assert.equal(copy.style['grid-template-columns'],'300px 220px 300px');
    assert.equal(copy.style['font-family'],'Arial');
    assert.equal(copy.style['container-type'],'inline-size');
    assert.equal(copy.attributes.id,undefined);
    assert.equal(copy.style.animation,'none');
    assert.equal(clone.style.width,'1200px');
    assert.equal(clone.style.top,'-380px');
    assert.equal(clone.inert,true);
    assert.equal(clone.attributes['aria-hidden'],'true');
  } finally {restore();}
});

test('sticky nodes retain their clipping ancestors and flow, fixed elements remain viewport-positioned', () => {
  const restore=environment();
  try {
    const source=new Element('root',{}, {top:-380,width:1200});
    const scroller=new Element('scroller',{overflow:'auto'});scroller.scrollLeft=40;
    scroller.append(new Element('header',{position:'sticky'},{top:0,width:1200,height:78}));
    source.append(scroller);
    source.append(new Element('main', {display:'grid'}));
    source.append(new Element('button',{position:'fixed'},{top:700,left:1000,width:100,height:40}));
    const {clone,restoreScrollers}=freezePage(source);
    const header=clone.children[0].children[0];
    // Model its natural flow position after mounting the scrolled snapshot.
    header.rect={top:-380,left:-40};restoreScrollers();
    assert.equal(clone.children.length,3);
    assert.equal(clone.children[0].scrollLeft,40);
    assert.equal(header.parent,clone.children[0]);
    assert.equal(header.style.position,'relative');
    assert.equal(header.style.top,'380px');
    assert.equal(header.style.left,'40px');
    assert.equal(clone.children[1].id,'main');
    assert.equal(clone.children[2].style.top,'1080px');
  } finally {restore();}
});

test('snapshot preserves values, select state, scrolling and canvas frames', () => {
  const restore=environment();
  try {
    const source=new Element('root');
    const input=new Input('input'); input.value='edited'; input.checked=true;
    const text=new TextArea('text');text.value='local sample'; text.scrollTop=30; text.scrollLeft=10;
    const select=new Select('select');select.selectedIndex=2;
    const canvas=new Canvas('canvas');canvas.width=640;canvas.height=480;
    for(const node of [input,text,select,canvas])source.append(node);
    const {clone,restoreScrollers}=freezePage(source);restoreScrollers();
    assert.equal(clone.children[0].value,'edited');assert.equal(clone.children[0].checked,true);
    assert.equal(clone.children[1].value,'local sample');assert.equal(clone.children[1].scrollTop,30);
    assert.equal(clone.children[1].scrollLeft,10);assert.equal(clone.children[2].selectedIndex,2);
    assert.equal(clone.children[3].drawn,canvas);assert.equal(clone.children[3].width,640);
    assert.equal(canvas.snapshotEvent.type,'liangzai:snapshot');
  } finally {restore();}
});
