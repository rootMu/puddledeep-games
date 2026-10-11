// Interaction checks with a small DOM harness, not a browser/layout test.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function setup({reduced = false, dialogSupport = true} = {}) {
  let document;
  class Element {
    constructor(tag) { this.tagName = tag; this.attributes = {}; this.children = []; this.style = {}; this.listeners = {}; this._text = ''; this.open = false; this.disabled = false; }
    setAttribute(k,v) {this.attributes[k] = String(v);}
    getAttribute(k) {return this.attributes[k] ?? null;}
    removeAttribute(k) {delete this.attributes[k];}
    set className(v) {this.setAttribute('class',v);}
    get className() {return this.getAttribute('class') || '';}
    get classList() {return {contains:c=>this.className.split(' ').includes(c), add:c=>{this.className=[...new Set([...this.className.split(' '),c])].join(' ');}, remove:c=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');}};}
    get hidden() {return 'hidden' in this.attributes;}
    set hidden(v) {if(v)this.setAttribute('hidden','');else this.removeAttribute('hidden');}
    set textContent(v) {this._text=String(v);this.children=[];}
    get textContent() {return this._text+this.children.map(x=>x.textContent).join('');}
    append(...els) {for(const el of els){el.parentElement=this;this.children.push(el);}}
    set innerHTML(v) {this.children=[];this._text='';for(const el of parse(v).children)this.append(el);}
    matches(s) {if(s[0]==='#')return this.getAttribute('id')===s.slice(1);if(s[0]==='.')return this.classList.contains(s.slice(1));if(s[0]==='[')return this.getAttribute(s.slice(1,-1))!==null;return this.tagName===s;}
    querySelectorAll(s) {const out=[];for(const c of this.children){if(c.matches(s))out.push(c);out.push(...c.querySelectorAll(s));}return out;}
    querySelector(s) {return this.querySelectorAll(s)[0] || null;}
    addEventListener(type, fn) {(this.listeners[type] ||= []).push(fn);}
    dispatch(type, fields={}) {for(const fn of this.listeners[type] || [])fn({target:this,preventDefault(){},...fields});}
    click() {if(!this.disabled&&!this.hidden)this.dispatch('click');}
    focus() {document.activeElement=this;}
    showModal() {this.open=true;this.setAttribute('open','');}
    close() {if(!this.open)return;this.open=false;this.removeAttribute('open');this.dispatch('close');}
    getBoundingClientRect() {return {left:100,top:100,right:700,bottom:600};}
  }
  for(const key of ['src','href','alt'])Object.defineProperty(Element.prototype,key,{get(){return this.getAttribute(key)||'';},set(v){this.setAttribute(key,v);}});
  function parse(html) {
    const doc=new Element('document');const stack=[doc];
    const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    for(const token of html.match(/<!--[^]*?-->|<[^>]+>|[^<]+/g)||[]) {
      if(/^<!/.test(token))continue;
      if(/^<\//.test(token)){stack.pop();continue;}
      if(token[0]==='<') {
        const name=token.match(/^<([\w-]+)/)?.[1];if(!name)continue;
        const el=new Element(name);
        const attrs=token.slice(name.length+1).replace(/\/?\s*>$/,'');
        for(const m of attrs.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))el.setAttribute(m[1],m[2]??m[3]??m[4]??'');
        stack.at(-1).append(el);if(!voids.has(name)&&!token.endsWith('/>'))stack.push(el);
      } else stack.at(-1)._text+=token;
    }
    return doc;
  }
  document=parse(fs.readFileSync(path.join(root,'index.html'),'utf8'));
  document.createElement=tag=>new Element(tag);document.createElementNS=(_,tag)=>new Element(tag);
  document.body=document.querySelector('body');
  if(!dialogSupport)document.querySelector('#game-preview').showModal=undefined;
  let time=0, nextID=0;const frames=new Map();const media={matches:reduced};
  const context=vm.createContext({document,window:{matchMedia:()=>media},performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++nextID,fn);return nextID;},cancelAnimationFrame:id=>frames.delete(id)});
  for(const name of ['road-geometry.js','road.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',name),'utf8'),context,{filename:name});
  const q=s=>document.querySelector(s);
  const tick=(ms=20)=>{time+=ms;const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(time);};
  const flush=()=>{let iterations=0;while(frames.size){assert.ok(iterations++<200,'animation must terminate');tick();}};
  return {q,document,tick,flush,media,frames,geometry:context.PuddleRoadGeometry,stops:q('.road-waypoints').querySelectorAll('button'),travel:q('.road-itinerary').querySelectorAll('button')};
}

test('perspective brings the next game forward and keeps stops within phone bounds',()=>{
  const {geometry:g}=setup();
  for(let current=0;current<3;current++) {
    const cam=g.stopDepth(current),selected=g.stop(current,cam);
    assert.equal(selected.cardScale,1);
    for(let i=current;i<3;i++) {
      const p=g.stop(i,cam);assert.ok(p.visible);
      for(const [width,card] of [[282,158],[337,158],[600,180],[1000,230]]) {
        const x=p.x/1000*width,half=card*p.cardScale/2;
        assert.ok(x-half>=0&&x+half<=width,`stop ${i} at camera ${current} must fit ${width}px`);
      }
    }
  }
  assert.ok(g.stop(1,0).cardScale<g.stop(1,g.stopDepth(1)).cardScale);
  for(let camera=0;camera<=2100;camera+=25){const r=g.road(camera);assert.ok(!/NaN|Infinity/.test(r.fill+r.centre));}
});

test('road travel, previews, planned states and the Sprawl website link',()=>{
  const h=setup();const {q,stops,travel,flush}=h;
  assert.equal(q('[data-road]').hidden,false);assert.equal(q('.games-grid').hidden,true);
  assert.equal(stops.length,3);assert.equal(q('[data-road-previous]').disabled,true);
  const initialTop=parseFloat(stops[1].style.top);
  q('[data-road-next]').click();flush();
  assert.ok(parseFloat(stops[1].style.top)>initialTop);
  assert.equal(stops[1].getAttribute('aria-current'),'step');assert.equal(stops[0].hidden,true);
  stops[1].click();flush();assert.equal(q('#game-preview').open,true);
  assert.equal(q('#preview-title').textContent,'Project Crawl');
  assert.equal(q('[data-preview-link]').hidden,true);assert.equal(q('[data-preview-link]').getAttribute('href'),null);
  q('[data-preview-next]').click();flush();
  assert.equal(q('#preview-title').textContent,'Project Brawl');
  assert.match(q('[data-preview-image]').src,/brawl-lowpoly/);
  assert.match(q('[data-preview-planned]').textContent,/style is still being explored/);
  assert.equal(q('[data-preview-next]').disabled,true);
  q('[data-preview-back]').click();assert.equal(q('#game-preview').open,false);
  assert.equal(h.document.activeElement,stops[2]);assert.equal(h.document.body.classList.contains('road-is-open'),false);
  travel[0].click();flush();stops[0].click();flush();
  assert.equal(q('[data-preview-link]').href,'https://rootmu.github.io/sprawl-site/');
  assert.equal(q('[data-preview-link]').hidden,false);assert.equal(q('[data-preview-planned]').hidden,true);
  q('[data-preview-close]').click();assert.equal(q('#game-preview').open,false);
});

test('rapid navigation cancels obsolete travel and stale preview requests',()=>{
  const h=setup();h.stops[2].click();h.tick(80);h.travel[1].click();h.flush();
  assert.equal(h.stops[1].getAttribute('aria-current'),'step');
  assert.equal(h.q('#game-preview').open,false);
  assert.match(h.stops[1].style.transform,/scale\(1\)/);
  h.q('.road-viewport').dispatch('keydown',{key:'Home'});h.flush();
  assert.equal(h.document.activeElement,h.stops[0]);
  h.q('.road-viewport').dispatch('keydown',{key:'End'});h.flush();
  assert.equal(h.document.activeElement,h.stops[2]);assert.equal(h.q('[data-road-next]').disabled,true);
});

test('reduced motion jumps directly and unsupported dialogs keep the fallback',()=>{
  const h=setup({reduced:true});h.travel[2].click();h.tick();
  assert.equal(h.frames.size,0);assert.match(h.stops[2].style.transform,/scale\(1\)/);
  const fallback=setup({dialogSupport:false});
  assert.equal(fallback.q('[data-road]').hidden,true);
  assert.equal(fallback.q('.games-grid').hidden,false);
});
