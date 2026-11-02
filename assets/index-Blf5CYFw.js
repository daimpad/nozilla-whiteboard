const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-DGAySJjj.js","./index-DbVlHCwm.js","./index-CG4bn5Lc.css"])))=>i.map(i=>d[i]);
import{a7 as ke,a8 as hi,a9 as fi,aa as Me,ab as dt,ac as cn,D as z,ad as we,ae as Fe,af as vn,ag as ut,ah as mi,ai as ht,aj as dn,ak as $e,al as gi,am as sn,v as Le,an as pi,ao as Ze,ap as xi,aq as bi,ar as ki,as as Oe,at as q,r as w,au as un,av as Be,aw as ft,ax as mt,ay as Sn,az as gt,aA as Te,aB as wi,Y as pt,aC as je,aD as yi,aE as ji,aF as vi,aG as Si,aH as zn,aI as zi,aJ as Ni,H as Pe,aK as xt,j as n,aL as hn,aM as R,aN as bt,C as pe,aO as Re,aP as Ei,aQ as Di,G as fn,aR as ce,aS as He,aT as kt,aU as wt,aV as Mi,c as H,aW as Fi,I as B,aX as mn,aY as ie,aZ as se,a_ as Ci,a$ as Ii,b0 as yt,b1 as jt,b2 as vt,b3 as M,b4 as St,b5 as G,b6 as zt,b7 as $i,b8 as Nt,b9 as Ti,ba as Et,bb as Pi,bc as Dt,k as F,bd as le,be as Ai,bf as Mt,bg as Li,bh as Ft,bi as Oi,bj as Ct,bk as Bi,bl as It,bm as Ri,B as V,bn as oe,bo as $t,bp as Hi,bq as Tt,br as Wi,bs as me,bt as Nn,bu as Zi,bv as Gi,bw as Ki,bx as Vi,by as _i,bz as Pt,bA as Ui,bB as En,bC as Dn,bD as Mn,bE as qi,bF as Yi,bG as Ji,bH as Qi,bI as an,bJ as Xi,bK as es,bL as Ge,bM as ns,bN as rn,bO as At,bP as Lt,bQ as ae,bR as Ot,bS as Bt,bT as Rt,bU as ts,o as is,u as ss,bV as Ht,bW as Ke,bX as Ve,bY as as,i as rs,bZ as ls,b_ as os,b$ as cs,c0 as ds,X as us,c1 as hs,m as fs,c2 as ms,c3 as he,c4 as _e,n as gs,a2 as Wt,c5 as Fn,c6 as ps,c7 as xs,c8 as bs,c9 as ks,ca as ws,J as ys,K as Zt,L as js,M as vs,cb as Ss,cc as zs,cd as Cn,_ as Ns,$ as We,a0 as gn,a1 as Es,a3 as Ds,ce as Ms,cf as Fs,a4 as Cs,a5 as Is,a6 as $s}from"./index-DbVlHCwm.js";const Ts=`---
title: nozilla Whiteboard
author: nozilla
date: 2026-08-07
footer: nozilla · Gute digitale Dienste.
---

<!-- nzl
layout: title
transition: cut
background: paper
bare: true
notes: Neunzig Sekunden. Erst die Idee, dann weiter.
elements:
  - id: mark-title
    kind: wordmark
    x: 88
    y: 72
    w: 260
    h: 62
  - id: badge-title
    kind: badge
    x: 88
    y: 512
    w: 268
    h: 44
    tone: signal
    text: Markdown + Fläche
  - id: rule-title
    kind: connector
    x: 88
    y: 470
    w: 320
    h: 0
    connector: line
    strokeWeight: heavy
-->

# Folien, die sich wie ein Whiteboard benehmen.

Die Worte schreibst du in Markdown. Alles andere legst du von Hand.

---

<!-- nzl
layout: split
transition: fade
notes: Die zwei Hälften. Beim Reden auf die rechte Seite zeigen.
elements:
  - id: card-md
    kind: card
    x: 700
    y: 140
    w: 492
    h: 190
    icon: file-lines
    label: Inhalt
    title: Markdown ist die Quelle
    body: Überschriften, Listen, Code und Tabellen werden in der CI-Hierarchie gesetzt.
    reveal:
      step: 1
      animation: rise
  - id: card-canvas
    kind: card
    x: 700
    y: 360
    w: 492
    h: 190
    tone: signal
    icon: object-group
    label: Layout
    title: Die Fläche ist frei
    body: Ziehen, einrasten, duplizieren, stapeln — mit fertigen CI-Bausteinen.
    reveal:
      step: 2
      animation: rise
-->

## Eine Datei, zwei Denkweisen

- Die ==linke Hälfte== ist Prosa: sie fließt, sie bricht um, sie bleibt diffbar.
- Die ==rechte Hälfte== ist Layout: sie bleibt genau da, wo du sie hinlegst.
- Beides steht in derselben \`.md\`, die Versionsverwaltung sieht ein Artefakt.

---

<!-- nzl
layout: canvas
background: grid
transition: fade
notes: Alles hier kam aus der Seitenleiste. Nichts wurde von Hand eingefärbt.
elements:
  - id: h-lib
    kind: text
    x: 88
    y: 72
    w: 1104
    h: 72
    text: Die CI-Bibliothek, unverändert
    typeStyle: h1
  - id: sub-lib
    kind: text
    x: 88
    y: 148
    w: 760
    h: 34
    text: Jede Kachel erbt Palette, Kanten und Strichstärken automatisch.
    typeStyle: lead
  - id: stat-1
    kind: card
    x: 88
    y: 216
    w: 254
    h: 180
    variant: stat
    label: Icons
    title: "462"
    body: Dialekt A, 4 px, square caps
  - id: stat-2
    kind: card
    x: 362
    y: 216
    w: 254
    h: 180
    variant: stat
    label: Farbrollen
    title: "3"
    body: Papier, Tinte, Signal
  - id: stat-3
    kind: card
    x: 636
    y: 216
    w: 254
    h: 180
    variant: stat
    tone: signal
    label: Radius
    title: "0"
    body: Überall, ohne Ausnahme
  - id: note-1
    kind: card
    x: 910
    y: 216
    w: 282
    h: 180
    variant: note
    icon: circle-info
    title: Kein Farbwähler
    body: Die Einschränkung ist das Merkmal — ein Deck kann nicht abdriften.
  - id: hex-1
    kind: shape
    x: 88
    y: 432
    w: 190
    h: 160
    shape: hexagon
    label: Formen
  - id: chev-1
    kind: shape
    x: 300
    y: 470
    w: 210
    h: 84
    shape: chevron
    label: Phase
    tone: signal
  - id: bubble-1
    kind: shape
    x: 532
    y: 432
    w: 232
    h: 160
    shape: callout
    label: Sprechblase
    shadow: md
  - id: frame-1
    kind: shape
    x: 786
    y: 432
    w: 180
    h: 160
    shape: frame
    fill: outline
    strokeWeight: heavy
  - id: icon-1
    kind: icon
    x: 988
    y: 432
    w: 96
    h: 96
    icon: rocket
    frame: box
    fill: framed
  - id: icon-2
    kind: icon
    x: 1096
    y: 432
    w: 96
    h: 96
    icon: shield-halved
    frame: box
    fill: framed
    tone: signal
  - id: badge-row
    kind: badge
    x: 988
    y: 548
    w: 204
    h: 44
    text: Fertig
    icon: check
-->

---

<!-- nzl
layout: split
transition: slide
notes: Der Export ist das Argument. Hier langsam sprechen.
elements:
  - id: exp-md
    kind: card
    x: 700
    y: 128
    w: 492
    h: 138
    variant: note
    icon: file-lines
    title: Markdown
    body: Inhalt und Position, zurück in die Datei geschrieben.
  - id: exp-svg
    kind: card
    x: 700
    y: 286
    w: 492
    h: 138
    variant: note
    icon: bezier-curve
    title: SVG
    body: Echte Pfade, echte Textknoten — kein foreignObject, kein Screenshot.
  - id: exp-pdf
    kind: card
    x: 700
    y: 444
    w: 492
    h: 138
    variant: note
    icon: file-pdf
    title: PDF
    body: Vektorseiten mit markierbarem, durchsuchbarem Text.
-->

## Export bleibt Vektor

Fläche, SVG-Schreiber und PDF-Schreiber lesen ==dieselbe Szene==.

Es gibt keinen zweiten Renderer, der widersprechen könnte. Was du legst, ist
das, was du lieferst.

---

<!-- nzl
layout: quote
background: ink
transition: cut
bare: true
elements:
  - id: quote-mark
    kind: wordmark
    x: 88
    y: 596
    w: 180
    h: 44
    variant: paper
-->

> Einschränkungen begrenzen ein Deck nicht.
> Sie sind der einzige Grund, warum es aussieht, als käme es aus einem Haus.

---

<!-- nzl
transition: fade
notes: Mit den Tasten schließen, damit die Leute es auch benutzen.
elements:
  - id: kbd
    kind: markdown
    x: 664
    y: 128
    w: 528
    h: 464
    fill: framed
    shadow: md
    padding: 28
    markdown: |
      ### Tasten

      | Was | Tasten |
      | --- | --- |
      | Folie vor / zurück | \`→\` \`←\` \`Leer\` |
      | Auswahl schieben | Pfeiltasten |
      | Duplizieren | \`⌘D\` |
      | Löschen | \`⌫\` |
      | Ebene vor / zurück | \`⌘]\` \`⌘[\` |
      | Alles wählen | \`⌘A\` |
      | Rückgängig / Wiederholen | \`⌘Z\` \`⇧⌘Z\` |
      | Übersicht | \`⌘K\` |
      | Präsentieren | \`P\` |
      | Markdown sichern | \`⌘S\` |
-->

## Loslegen

1. Eine \`.md\` irgendwo ins Fenster ziehen — sie wird geöffnet.
2. Links in der Bibliothek klicken — der Baustein kommt CI-konform an.
3. Ziehen mit Einrasten; \`Alt\` hält das Raster an.
4. \`P\` startet die Präsentation, \`Esc\` bringt dich zurück.

Der grüne Marker schreibt sich \`==so==\` — ein bis drei Wörter pro Absatz.
`,Ps=`---
title: muster · Probenhaus
author: muster
date: 2026-08-23
footer: muster · Erst die Probe, dann die Auflage.
theme: musterkunde
---

<!-- nzl
layout: title
transition: cut
background: paper
bare: true
notes: Vierzig Sekunden. Wer wir sind, dann gleich zur Sache.
elements:
  - id: mark
    kind: wordmark
    x: 88
    y: 72
    w: 232
    h: 52
  - id: rule
    kind: connector
    x: 88
    y: 470
    w: 320
    h: 0
    connector: line
    strokeWeight: heavy
  - id: badge
    kind: badge
    x: 88
    y: 512
    w: 232
    h: 44
    tone: signal
    text: Muster und Proben
    icon: probe
-->

# Bevor etwas in Auflage geht, geht es durch unsere Hände.

Wir machen Proben, prüfen sie und geben sie frei. Sonst nichts.

---

<!-- nzl
layout: split
transition: fade
notes: Die drei Schritte. Beim Reden auf die rechte Spalte zeigen.
elements:
  - id: schritt-1
    kind: card
    x: 700
    y: 96
    w: 492
    h: 168
    variant: feature
    icon: schnitt
    label: Erst
    title: Der Schnitt
    body: Aus dem Entwurf wird eine Kontur, aus der Kontur ein Muster.
    reveal:
      step: 1
      animation: rise
  - id: schritt-2
    kind: card
    x: 700
    y: 288
    w: 492
    h: 168
    variant: feature
    icon: probe
    label: Dann
    title: Die Probe
    body: Ein einzelnes Stück — es zeigt, was die Zeichnung verschweigt.
    reveal:
      step: 2
      animation: rise
  - id: schritt-3
    kind: card
    x: 700
    y: 480
    w: 492
    h: 168
    variant: feature
    tone: signal
    icon: freigabe
    label: Zuletzt
    title: Die Freigabe
    body: Erst wenn sie da ist, läuft die Maschine.
    reveal:
      step: 3
      animation: rise
-->

## Drei Schritte, keiner zu überspringen

- Der ==Schnitt== steht am Anfang: er entscheidet, was überhaupt möglich ist.
- Die ==Probe== ist das erste Stück, das man anfassen kann.
- Die ==Freigabe== ist eine Unterschrift, kein Gefühl.

---

<!-- nzl
layout: canvas
transition: fade
background: grid
notes: Alles hier kam aus der Bibliothek. Nichts wurde von Hand eingefärbt.
elements:
  - id: h-werkstatt
    kind: text
    x: 88
    y: 72
    w: 900
    h: 72
    text: Was in der Werkstatt steht
    typeStyle: h1
  - id: sub-werkstatt
    kind: text
    x: 88
    y: 144
    w: 760
    h: 34
    text: Zwölf eigene Zeichen, im Dialekt des Werkzeugs gezeichnet.
    typeStyle: lead
  - id: stat-proben
    kind: card
    x: 88
    y: 216
    w: 254
    h: 180
    variant: stat
    label: Proben
    title: "1 240"
    body: im letzten Jahr geprüft
  - id: stat-quote
    kind: card
    x: 362
    y: 216
    w: 254
    h: 180
    variant: stat
    label: Erste Freigabe
    title: 86 %
    body: ohne Nacharbeit
  - id: stat-tage
    kind: card
    x: 636
    y: 216
    w: 254
    h: 180
    variant: stat
    tone: signal
    label: Durchlauf
    title: "3"
    body: Tage vom Schnitt zur Freigabe
  - id: note-werkstatt
    kind: card
    x: 910
    y: 216
    w: 282
    h: 180
    variant: note
    icon: lupe
    title: Keine Ausnahme
    body: Was durchfällt, geht zurück — auch wenn es eilt.
  - id: ic-raster
    kind: icon
    x: 88
    y: 440
    w: 88
    h: 88
    icon: raster
    frame: box
  - id: ic-schere
    kind: icon
    x: 200
    y: 440
    w: 88
    h: 88
    icon: schere
    frame: box
  - id: ic-massband
    kind: icon
    x: 312
    y: 440
    w: 88
    h: 88
    icon: massband
    frame: box
  - id: ic-stempel
    kind: icon
    x: 424
    y: 440
    w: 88
    h: 88
    icon: stempel
    frame: box
  - id: ic-karton
    kind: icon
    x: 536
    y: 440
    w: 88
    h: 88
    icon: karton
    frame: box
  - id: ic-farbfeld
    kind: icon
    x: 648
    y: 440
    w: 88
    h: 88
    tone: signal
    icon: farbfeld
    frame: box
  - id: ic-naht
    kind: icon
    x: 760
    y: 440
    w: 88
    h: 88
    icon: naht
    frame: box
  - id: ic-ruecklauf
    kind: icon
    x: 872
    y: 440
    w: 88
    h: 88
    icon: ruecklauf
    frame: box
  - id: badge-werkstatt
    kind: badge
    x: 984
    y: 460
    w: 208
    h: 44
    tone: ink
    text: Eigenes Set
    icon: stempel
-->

---

<!-- nzl
layout: quote
transition: fade
background: ink
notes: Der Satz, den der Meister immer sagt. Kurz stehen lassen.
-->

> Eine Probe, die keiner ansieht, ist nur ein teures Stück Stoff.

---

<!-- nzl
layout: statement
transition: fade
background: signal
bare: true
notes: Hier endet der Vortrag. Karte liegt auf dem Tisch.
-->

# Schicken Sie uns den Schnitt. Die Probe kommt in drei Tagen zurück.
`,Gt=[{file:"welcome.md",label:"nozilla-Design",source:Ts},{file:"musterkunde.md",label:"Alternatives Design",source:Ps}],In=Gt[0];let Ce=null;function $n(e){Ce=e}function Kt(e,t){e.length===0&&t.length===0||Ce==null||Ce({zeichen:e,schnitte:t})}function nl(e){Kt([],e)}const As=["display","body","mono"];function Ls(e){const t=fi[e].split(",").map(i=>i.trim().replace(/^['"]|['"]$/g,"")),a=[];for(const i of t){const l=As.find(c=>Me(c)===i);l&&!a.includes(l)&&a.push(l)}return a.includes(e)||a.unshift(e),a}const Tn=(e,t)=>`${e.family}|${e.weight}|${t}`;async function tl(e){const t=new Map;for(const s of e)for(const r of s.prims)if(r.t==="text")for(const m of r.runs)Os(t,m);const a=new Map,i=new Map,l=new Set,c=async s=>{if(s){if(a.has(s.id))return a.get(s.id);try{const r=await hi(s);return a.set(s.id,r),i.set(s.id,s),r}catch{l.add(s.id);return}}},o=[];await Promise.all([...t.values()].map(async({spec:s,codePoints:r})=>{const m=ke(s),u=await c(m);if(u)for(const d of r)u.glyph(d)===null&&o.push({spec:s,codePoint:d})}));const h=new Map,x=[];if(o.length>0){const s=new Map,r=new Map;for(const{spec:m}of o){const u=s.get(m.family)??Ls(m.family);s.set(m.family,u);for(const d of u){if(d===m.family)continue;const g=ke({family:d,weight:m.weight});g&&r.set(g.id,g)}}await Promise.all([...r.values()].map(c));for(const{spec:m,codePoint:u}of o){const d=(s.get(m.family)??[]).filter(g=>g!==m.family).map(g=>ke({family:g,weight:m.weight})).find(g=>{var b;return g&&((b=a.get(g.id))==null?void 0:b.glyph(u))!=null});d?h.set(Tn(m,u),d):x.push(String.fromCodePoint(u))}}return Kt([...new Set(x)],[...l]),{faceFor(s,r){return h.get(Tn(s,r))??ke(s)},outlines(s){return a.get(s.id)},faces:[...i.values()],uncovered:[...new Set(x)]}}function Os(e,t){const a=`${t.font.family}|${t.font.weight}`;let i=e.get(a);i||(i={spec:{family:t.font.family,weight:t.font.weight},codePoints:new Set},e.set(a,i));for(const l of t.text){const c=l.codePointAt(0);c!==void 0&&c>32&&i.codePoints.add(c)}}function il(){return{faceFor:e=>ke(e),outlines:()=>{},faces:[],uncovered:[]}}function sl(e,t){var o;const a=[],i=new Set(t.uncovered);let l=null,c=0;for(const h of e.text){const x=h.codePointAt(0);if(i.has(h)){a.push({text:h,at:c,face:null,ungedeckt:!0}),c+=h.length;continue}const s=x===void 0||x<=32?l??t.faceFor(e.font,32):t.faceFor(e.font,x),r=a[a.length-1];r&&!r.ungedeckt&&((o=r.face)==null?void 0:o.id)===(s==null?void 0:s.id)?r.text+=h:a.push({text:h,at:c,face:s}),l=s,c+=h.length}return a}const ln=2,Pn=420,Bs=.5625,An=z.width*ln;function Rs(e,t){const a=Math.max(e,t);if(!(a>An))return null;const i=An/a;return{w:Math.max(1,Math.round(e*i)),h:Math.max(1,Math.round(t*i))}}const Hs=new Set(["image/png","image/jpeg"]),Ws=.5,Zs=25e5,Gs=Zs/5;function Ks(e,t,a,i){if(!Hs.has(a))return null;const l=Rs(e,t);return l||(i<=Gs||a==="image/jpeg"?null:{w:e,h:t})}async function Vt(e,t={}){const a=await dt(e),i=await Vs(a),l=i&&i.naturalWidth>0?i.naturalHeight/i.naturalWidth:Bs;return cn("image",{src:i&&_s(i,e.type,a)||a,alt:Ys(e),w:Pn,h:Math.round(Pn*l),...t})}function Vs(e){return new Promise((t,a)=>{const i=new Image;i.onload=()=>t(i),i.onerror=a,i.src=e}).catch(()=>null)}function _s(e,t,a){const i=Ks(e.naturalWidth,e.naturalHeight,t,a.length);if(!i)return null;try{const l=document.createElement("canvas");l.width=i.w,l.height=i.h;const c=l.getContext("2d");if(!c)return null;c.drawImage(e,0,0,i.w,i.h);const o=l.toDataURL("image/png"),h=qs(c,l.width,l.height)?o:Us(o,l.toDataURL("image/jpeg"));return h.length<a.length?h:null}catch{return null}}function Us(e,t){return t.length<e.length*Ws?t:e}function qs(e,t,a){const i=e.getImageData(0,0,t,a).data;for(let l=3;l<i.length;l+=4)if(i[l]<255)return!0;return!1}function Ys(e){const t=e.name.replace(/\.[^.]+$/,"").trim();return t&&t!=="image"?t:""}const Ln=e=>{let t;const a=new Set,i=(s,r)=>{const m=typeof s=="function"?s(t):s;if(!Object.is(m,t)){const u=t;t=r??(typeof m!="object"||m===null)?m:Object.assign({},t,m),a.forEach(d=>d(t,u))}},l=()=>t,h={setState:i,getState:l,getInitialState:()=>x,subscribe:s=>(a.add(s),()=>a.delete(s))},x=t=e(i,l,h);return h},Js=(e=>e?Ln(e):Ln),Qs=e=>e;function Xs(e,t=Qs){const a=we.useSyncExternalStore(e.subscribe,we.useCallback(()=>t(e.getState()),[e,t]),we.useCallback(()=>t(e.getInitialState()),[e,t]));return we.useDebugValue(a),a}const ea=e=>{const t=Js(e),a=i=>Xs(t,i);return Object.assign(a,t),a},na=(e=>ea),On=e=>Symbol.iterator in e,Bn=e=>"entries"in e,Rn=(e,t)=>{const a=e instanceof Map?e:new Map(e.entries()),i=t instanceof Map?t:new Map(t.entries());if(a.size!==i.size)return!1;for(const[l,c]of a)if(!i.has(l)||!Object.is(c,i.get(l)))return!1;return!0},ta=(e,t)=>{const a=e[Symbol.iterator](),i=t[Symbol.iterator]();let l=a.next(),c=i.next();for(;!l.done&&!c.done;){if(!Object.is(l.value,c.value))return!1;l=a.next(),c=i.next()}return!!l.done&&!!c.done};function ia(e,t){return Object.is(e,t)?!0:typeof e!="object"||e===null||typeof t!="object"||t===null||Object.getPrototypeOf(e)!==Object.getPrototypeOf(t)?!1:On(e)&&On(t)?Bn(e)&&Bn(t)?Rn(e,t):ta(e,t):Rn({entries:()=>Object.entries(e)},{entries:()=>Object.entries(t)})}function sa(e){const t=we.useRef(void 0);return a=>{const i=e(a);return ia(t.current,i)?t.current:t.current=i}}const Hn=34;function aa(e,t){const a=t.trim();if(a.length<2)return 0;let i=0;for(const l of e.slides){i+=ye(l.markdown,a).length,i+=ye(l.meta.notes??"",a).length;for(const c of l.elements)for(const{text:o}of pn(c))i+=ye(o,a).length}return i}function ra(e,t){const a=t.trim();if(a.length<2)return[];const i=[];return e.slides.forEach((l,c)=>{const o=(h,x,s,r)=>{const m=la(s,a);m&&i.push({slideIndex:c,wo:h,feld:x,elementId:r,...m})};o("flow","Fließtext",l.markdown),o("notes","Notiz",l.meta.notes??"");for(const h of l.elements)for(const{feld:x,text:s}of pn(h))o("element",x,s,h.id)}),i}function pn(e){const t=[],a=(i,l,c)=>t.push({feld:i,schluessel:l,text:c});switch(e.name&&a("Name","name",e.name),e.kind){case"text":a("Text","text",e.text);break;case"markdown":a("Markdown","markdown",e.markdown);break;case"card":e.label&&a("Label","label",e.label),e.title&&a("Titel","title",e.title),e.body&&a("Text","body",e.body);break;case"badge":a("Badge","text",e.text);break;case"shape":e.label&&a("Beschriftung","label",e.label);break;case"image":e.alt&&a("Alternativtext","alt",e.alt);break;case"chart":e.label&&a("Überschrift","label",e.label),a("Zahlen","data",e.data);break;case"table":e.label&&a("Überschrift","label",e.label),a("Zellen","data",e.data);break;case"connector":e.label&&a("Beschriftung","label",e.label);break}return t}function ye(e,t){if(!t)return[];const a=e.toLocaleLowerCase("de-DE"),i=a.length===e.length,l=i?a:e,c=i?t.toLocaleLowerCase("de-DE"):t;if(!c)return[];const o=[];for(let h=0;;){const x=l.indexOf(c,h);if(x<0)break;o.push({at:x,laenge:c.length}),h=x+c.length}return o}function Ue(e,t,a){const i=ye(e,t);if(i.length===0)return{text:e,anzahl:0};let l="",c=0;for(const{at:o,laenge:h}of i)l+=e.slice(c,o)+a,c=o+h;return{text:l+e.slice(c),anzahl:i.length}}function la(e,t){const a=ye(e,t)[0];if(!a)return null;const{at:i,laenge:l}=a,c=x=>x.replace(/\s+/g," "),o=Math.max(0,i-Hn),h=Math.min(e.length,i+l+Hn);return{vorher:(o>0?"…":"")+c(e.slice(o,i)),treffer:e.slice(i,i+l),nachher:c(e.slice(i+l,h))+(h<e.length?"…":"")}}const _t={grid:!0,smart:!0};function on(e,t=z.gridSize){return Math.round(e/t)*t}function oa(e,t){return e.x<t.x+t.w&&e.x+e.w>t.x&&e.y<t.y+t.h&&e.y+e.h>t.y}function ca(e,t,a,i){return{x:Math.min(e,a),y:Math.min(t,i),w:Math.abs(a-e),h:Math.abs(i-t)}}function Ut(e){if(e.length===0)return null;let t=1/0,a=1/0,i=-1/0,l=-1/0;for(const c of e)t=Math.min(t,c.x),a=Math.min(a,c.y),i=Math.max(i,c.x+c.w),l=Math.max(l,c.y+c.h);return{x:t,y:a,w:i-t,h:l-a}}function da(){const{width:e,height:t,margin:a}=z;return{vertical:[0,a.left,e/2,e-a.right,e],horizontal:[0,a.top,t/2,t-a.bottom,t]}}function ua(e,t,a=_t){const i=a.threshold??z.snapThreshold,l=a.gridSize??z.gridSize;let c=e.x,o=e.y;const h=[];if(a.smart){const x=da(),s=[{offset:0,value:e.x},{offset:e.w/2,value:e.x+e.w/2},{offset:e.w,value:e.x+e.w}],r=[{offset:0,value:e.y},{offset:e.h/2,value:e.y+e.h/2},{offset:e.h,value:e.y+e.h}],m=[...x.vertical.map(b=>({value:b,from:0,to:z.height})),...t.flatMap(b=>[{value:b.x,from:b.y,to:b.y+b.h},{value:b.x+b.w/2,from:b.y,to:b.y+b.h},{value:b.x+b.w,from:b.y,to:b.y+b.h}])],u=[...x.horizontal.map(b=>({value:b,from:0,to:z.width})),...t.flatMap(b=>[{value:b.y,from:b.x,to:b.x+b.w},{value:b.y+b.h/2,from:b.x,to:b.x+b.w},{value:b.y+b.h,from:b.x,to:b.x+b.w}])],d=Wn(s,m,i);d&&(c=d.target.value-d.source.offset,h.push({orientation:"v",position:d.target.value,start:Math.min(d.target.from,o),end:Math.max(d.target.to,o+e.h)}));const g=Wn(r,u,i);if(g&&(o=g.target.value-g.source.offset,h.push({orientation:"h",position:g.target.value,start:Math.min(g.target.from,c),end:Math.max(g.target.to,c+e.w)})),d&&g)return{x:c,y:o,guides:h}}return a.grid&&(h.some(x=>x.orientation==="v")||(c=on(c,l)),h.some(x=>x.orientation==="h")||(o=on(o,l))),{x:c,y:o,guides:h}}function Wn(e,t,a){let i=null;for(const l of e)for(const c of t){const o=Math.abs(l.value-c.value);o<=a&&(!i||o<i.distance)&&(i={source:l,target:c,distance:o})}return i}const ha=["nw","n","ne","e","se","s","sw","w"];function fa(e,t,a,i,l={}){var E,N;const c=l.minSize??z.minElementSize,o=l.minHeight??c,h=((E=l.snap)==null?void 0:E.grid)??!0,x=((N=l.snap)==null?void 0:N.gridSize)??z.gridSize,s=k=>h?on(k,x):k,r=t.includes("w"),m=t.includes("e"),u=t.startsWith("n"),d=t.startsWith("s");let{x:g,y:b,w:v,h:f}=e;if(l.fromCenter)return m&&(v=e.w+a*2),r&&(v=e.w-a*2),d&&(f=e.h+i*2),u&&(f=e.h-i*2),v=Math.max(c,s(v)),f=Math.max(o,s(f)),l.lockAspect&&({w:v,h:f}=Zn(e,v,f,c,o)),g=e.x+e.w/2-v/2,b=e.y+e.h/2-f/2,{x:g,y:b,w:v,h:f};if(m&&(v=Math.max(c,s(e.w+a))),r){const k=e.x+e.w;g=Math.min(s(e.x+a),k-c),v=k-g}if(d&&(f=Math.max(o,s(e.h+i))),u){const k=e.y+e.h;b=Math.min(s(e.y+i),k-o),f=k-b}if(l.lockAspect){const k=Zn(e,v,f,c,o);r&&(g=e.x+e.w-k.w),u&&(b=e.y+e.h-k.h),v=k.w,f=k.h}return{x:g,y:b,w:v,h:f}}function Zn(e,t,a,i,l){const c=e.h===0?1:e.w/e.h;if(Math.abs(t-e.w)>=Math.abs(a-e.h)){const x=Math.max(i,t);return{w:x,h:Math.max(l,x/c)}}const h=Math.max(l,a);return{w:Math.max(i,h*c),h}}function Gn(e,t,a,i,l){if(!l)return{x:e,y:t};const c=l*Math.PI/180,o=Math.cos(c),h=Math.sin(c),x=e-a,s=t-i;return{x:a+x*o-s*h,y:i+x*h+s*o}}function Kn(e,t=z.minElementSize){return{...e,x:Math.min(Math.max(e.x,-e.w+t),z.width-t),y:Math.min(Math.max(e.y,-e.h+t),z.height-t)}}const qe=120,ma=e=>typeof structuredClone=="function"?structuredClone(e):JSON.parse(JSON.stringify(e));function Vn(){return{meta:{title:"Untitled deck"},slides:[$e({meta:{...ki,layout:"title"}})]}}function _n(e,t){const a=e.deck.slides[e.slideIndex];if(!a)return[...new Set(t)];const i=new Set(t.map(c=>{var o;return(o=a.elements.find(h=>h.id===c))==null?void 0:o.group}).filter(c=>!!c));if(i.size===0)return[...new Set(t)];const l=a.elements.filter(c=>c.group&&i.has(c.group)).map(c=>c.id);return[...new Set([...t,...l])]}function ga(e){if(e.kind==="text"||e.kind==="markdown"){const t=e.fill==="none"?0:e.padding,a=Math.max(8,Ze()-t*2),i=e.kind==="text"?xi(e.text,e.typeStyle,{width:a}):bi(e.markdown,{width:a});return{w:Ze(),h:Math.max(16,Math.round(i.height+t*2))}}return{w:Math.min(e.w,Ze()),h:e.h}}const pa=600;function Ye(e,t){return qt({...e,...t})}function qt(e){if(!e.unknownRaw)return e;const t={...e};return delete t.unknownRaw,t}const p=na()((e,t)=>{let a=null;const i=(s,r)=>{const m=Date.now(),d=r!==void 0&&a!==null&&a.schluessel===r&&m-a.zeit<pa&&s.past[s.past.length-1]===a.stand?s.past:[...s.past,s.deck].slice(-qe);return a=r===void 0?null:{schluessel:r,zeit:m,stand:d[d.length-1]},{past:d,future:[],dirty:!0}},l=s=>s.deck.slides[s.slideIndex],c=s=>{if(s.meta.unreadable===void 0)return s;const r={...s.meta};return delete r.unreadable,{...s,meta:r}},o=(s,r,m)=>({...s.deck,slides:s.deck.slides.map((u,d)=>d===r?c(m(u)):u)}),h=(s,r)=>o(s,s.slideIndex,m=>{const u=new Set(m.elements),d=r(m.elements).map(g=>g.unknownRaw&&!u.has(g)?qt(g):g);return{...m,elements:d}}),x=s=>{const r=l(s);if(!r)return[];const m=new Set(s.selection);return r.elements.filter(u=>m.has(u.id)).map(u=>({element:u,rect:{x:u.x,y:u.y,w:u.w,h:u.h}}))};return{deck:Vn(),fileName:"untitled.md",dirty:!1,slideIndex:0,mode:"edit",revealStep:1/0,overviewOpen:!1,notesOpen:!1,promptOpen:!1,searchOpen:!1,pruefungOpen:!1,markenOpen:!1,tourOpen:!1,panels:pi(),selection:[],guides:[],snap:{..._t},showGrid:!0,zoom:"fit",past:[],future:[],sicherungGescheitert:!1,hinweis:null,hinweisAktion:null,loadDeck:(s,r)=>e({deck:s,slideIndex:0,selection:[],guides:[],past:[],future:[],dirty:!1,revealStep:1/0,fileName:(r==null?void 0:r.fileName)??t().fileName,fileHandle:r==null?void 0:r.handle}),loadMarkdown:(s,r)=>t().loadDeck(Le(s),r),newDeck:()=>e({deck:Vn(),slideIndex:0,selection:[],guides:[],past:[],future:[],dirty:!1,fileName:"untitled.md",fileHandle:void 0,revealStep:1/0}),markSaved:s=>e(r=>({dirty:!1,fileName:(s==null?void 0:s.fileName)??r.fileName,fileHandle:(s==null?void 0:s.handle)??r.fileHandle})),meldeSicherung:s=>e({sicherungGescheitert:!s}),zeigeHinweis:(s,r)=>e({hinweis:s,hinweisAktion:r??null}),setDeckMeta:s=>e(r=>({...i(r,`deck:${Object.keys(s).join()}`),deck:{...r.deck,meta:{...r.deck.meta,...s}}})),goTo:s=>e(r=>({slideIndex:Math.max(0,Math.min(s,r.deck.slides.length-1)),selection:[],guides:[],revealStep:r.mode==="present"?0:1/0})),next:()=>t().goTo(t().slideIndex+1),previous:()=>t().goTo(t().slideIndex-1),advance:()=>e(s=>{const r=l(s);if(!r)return{};const m=sn(r);return s.mode==="present"&&s.revealStep<m?{revealStep:s.revealStep+1}:s.slideIndex>=s.deck.slides.length-1?{}:{slideIndex:s.slideIndex+1,selection:[],guides:[],revealStep:s.mode==="present"?0:1/0}}),retreat:()=>e(s=>{if(s.mode==="present"&&s.revealStep>0)return{revealStep:s.revealStep-1};if(s.slideIndex<=0)return{};const r=s.slideIndex-1,m=s.deck.slides[r];return{slideIndex:r,selection:[],guides:[],revealStep:s.mode==="present"?sn(m):1/0}}),setMode:s=>e(r=>({mode:s,selection:s==="present"?[]:r.selection,overviewOpen:!1,revealStep:s==="present"?0:1/0})),toggleOverview:s=>e(r=>({overviewOpen:s??!r.overviewOpen})),toggleNotes:s=>e(r=>({notesOpen:s??!r.notesOpen})),togglePrompt:s=>e(r=>({promptOpen:s??!r.promptOpen})),toggleSearch:s=>e(r=>({searchOpen:s??!r.searchOpen})),togglePruefung:s=>e(r=>({pruefungOpen:s??!r.pruefungOpen})),toggleMarken:s=>e(r=>({markenOpen:s??!r.markenOpen})),toggleTour:s=>e(r=>s??!r.tourOpen?{tourOpen:!0,overviewOpen:!1,searchOpen:!1,pruefungOpen:!1,promptOpen:!1,markenOpen:!1}:{tourOpen:!1}),togglePanel:(s,r)=>e(m=>{const u={...m.panels,[s]:r??!m.panels[s]};return gi(u),{panels:u}}),addSlide:(s,r)=>e(m=>{const u=s??m.slideIndex+1,d=m.deck.slides.slice();return d.splice(u,0,$e(r)),{...i(m),deck:{...m.deck,slides:d},slideIndex:u,selection:[]}}),deleteSlide:s=>e(r=>{const m=s??r.slideIndex;if(r.deck.slides.length<=1)return{...i(r),deck:{...r.deck,slides:[$e()]},slideIndex:0,selection:[]};const u=r.deck.slides.filter((d,g)=>g!==m);return{...i(r),deck:{...r.deck,slides:u},slideIndex:Math.max(0,Math.min(m,u.length-1)),selection:[]}}),duplicateSlide:s=>e(r=>{const m=s??r.slideIndex,u=r.deck.slides[m];if(!u)return{};const d={...ma({meta:r.deck.meta,slides:[u]}).slides[0],id:Fe("slide")};d.elements=d.elements.map(b=>({...b,id:Fe(b.kind)}));const g=r.deck.slides.slice();return g.splice(m+1,0,d),{...i(r),deck:{...r.deck,slides:g},slideIndex:m+1,selection:[]}}),moveSlide:(s,r)=>e(m=>{const u=m.deck.slides.slice();if(s<0||s>=u.length)return{};const d=Math.max(0,Math.min(r,u.length-1)),[g]=u.splice(s,1);return u.splice(d,0,g),{...i(m),deck:{...m.deck,slides:u},slideIndex:d}}),setSlideMarkdown:(s,r)=>e(m=>({...i(m,`markdown:${r??m.slideIndex}`),deck:o(m,r??m.slideIndex,u=>({...u,markdown:s}))})),ersetzeImDeck:(s,r)=>{if(!s)return 0;let m=0;const u=t().deck.slides.map(d=>{const g={},b=Ue(d.markdown,s,r);b.anzahl>0&&(m+=b.anzahl,g.markdown=b.text);const v=Ue(d.meta.notes??"",s,r);v.anzahl>0&&(m+=v.anzahl,g.meta={...d.meta,notes:v.text});const f=d.elements.map(E=>{const N={};for(const{schluessel:k,text:S}of pn(E)){const $=Ue(S,s,r);$.anzahl>0&&(m+=$.anzahl,N[k]=$.text)}return Object.keys(N).length>0?Ye(E,N):E});return f.some((E,N)=>E!==d.elements[N])&&(g.elements=f),Object.keys(g).length>0?{...d,...g}:d});return m===0?0:(e(d=>({...i(d),deck:{...d.deck,slides:u}})),m)},setSlideMeta:(s,r)=>e(m=>({...i(m,`folie:${r??m.slideIndex}:${Object.keys(s).join()}`),deck:o(m,r??m.slideIndex,u=>({...u,meta:{...u.meta,...s}}))})),addElement:(s,r)=>e(m=>{const u=l(m),d=u?u.elements.length:0,g={...s,z:d};return{...i(m),deck:h(m,b=>[...b,g]),selection:(r==null?void 0:r.select)===!1?m.selection:[g.id]}}),addElements:s=>e(r=>{const m=l(r),u=m?m.elements.length:0,d=s.map((g,b)=>({...g,z:u+b}));return{...i(r),deck:h(r,g=>[...g,...d]),selection:d.map(g=>g.id)}}),insertPreset:(s,r)=>{const m=t(),u=l(m),d=cn(s,r),g=ga(d),b=u?ht(u.meta.layout,u.markdown,Oe):null,v=dn((u==null?void 0:u.elements)??[],g,b?[b]:[]),f=Kn({...v,...g});m.addElement({...d,...g,x:f.x,y:f.y})},pasteElements:(s,r)=>{if(s.length===0)return;const m=r!=null&&r.offset?z.gridSize*3:0,u=s.map(d=>{const g=Kn({x:d.x+m,y:d.y+m,w:d.w,h:d.h});return{...d,x:g.x,y:g.y}});t().addElements(u)},updateElement:(s,r)=>t().updateElements([s],r),updateElements:(s,r)=>e(m=>{const u=new Set(s);return{dirty:!0,deck:h(m,d=>d.map(g=>u.has(g.id)?Ye(g,r):g))}}),transformElements:(s,r)=>e(m=>{const u=new Set(r??m.selection);return{dirty:!0,deck:h(m,d=>d.map(g=>{if(!u.has(g.id))return g;const b=s(g);return b?Ye(g,b):g}))}}),deleteSelection:()=>e(s=>{if(s.selection.length===0)return{};const r=new Set(s.selection);return{...i(s),deck:h(s,m=>vn(m.filter(u=>!r.has(u.id)))),selection:[]}}),duplicateSelection:()=>e(s=>{const r=l(s);if(!r||s.selection.length===0)return{};const m=new Set(s.selection),u=ut(r.elements.filter(d=>m.has(d.id)).map((d,g)=>({...mi(d),z:r.elements.length+g})));return u.length===0?{}:{...i(s),deck:h(s,d=>[...d,...u]),selection:u.map(d=>d.id)}}),nudgeSelection:(s,r)=>e(m=>{if(m.selection.length===0)return{};const u=new Set(m.selection);return{...i(m,`schieben:${m.selection.join()}`),deck:h(m,d=>d.map(g=>u.has(g.id)&&!g.locked?{...g,x:g.x+s,y:g.y+r}:g))}}),reorderSelection:s=>e(r=>{const m=l(r);if(!m||r.selection.length===0)return{};const u=new Set(r.selection),d=vn(m.elements),g=d.filter(f=>u.has(f.id)),b=d.filter(f=>!u.has(f.id));let v;switch(s){case"front":v=[...b,...g];break;case"back":v=[...g,...b];break;case"forward":{v=d.slice();for(let f=v.length-2;f>=0;f-=1)u.has(v[f].id)&&!u.has(v[f+1].id)&&([v[f],v[f+1]]=[v[f+1],v[f]]);break}case"backward":default:{v=d.slice();for(let f=1;f<v.length;f+=1)u.has(v[f].id)&&!u.has(v[f-1].id)&&([v[f],v[f-1]]=[v[f-1],v[f]]);break}}return{...i(r),deck:h(r,()=>v.map((f,E)=>({...f,z:E})))}}),alignSelection:s=>e(r=>{const m=x(r);if(m.length<1)return{};const u=m.length===1?{x:0,y:0,w:z.width,h:z.height}:Ut(m.map(g=>g.rect)),d=new Set(r.selection);return{...i(r),deck:h(r,g=>g.map(b=>{if(!d.has(b.id)||b.locked)return b;switch(s){case"left":return{...b,x:u.x};case"right":return{...b,x:u.x+u.w-b.w};case"hcenter":return{...b,x:u.x+(u.w-b.w)/2};case"top":return{...b,y:u.y};case"bottom":return{...b,y:u.y+u.h-b.h};case"vcenter":default:return{...b,y:u.y+(u.h-b.h)/2}}}))}}),distributeSelection:s=>e(r=>{const m=x(r).filter(N=>!N.element.locked);if(m.length<3)return{};const u=m.slice().sort((N,k)=>s==="h"?N.rect.x-k.rect.x:N.rect.y-k.rect.y),d=u[0].rect,g=u[u.length-1].rect,v=(s==="h"?g.x+g.w-d.x-u.reduce((N,k)=>N+k.rect.w,0):g.y+g.h-d.y-u.reduce((N,k)=>N+k.rect.h,0))/(u.length-1),f=new Map;let E=s==="h"?d.x:d.y;for(const N of u)f.set(N.element.id,E),E+=(s==="h"?N.rect.w:N.rect.h)+v;return{...i(r),deck:h(r,N=>N.map(k=>{const S=f.get(k.id);return S===void 0?k:s==="h"?{...k,x:S}:{...k,y:S}}))}}),setElementTone:s=>e(r=>({...i(r),deck:h(r,m=>m.map(u=>r.selection.includes(u.id)?{...u,tone:s}:u))})),setRevealStep:(s,r)=>e(m=>({...i(m),deck:h(m,u=>u.map(d=>{var g;return m.selection.includes(d.id)?{...d,reveal:s<=0?void 0:{step:s,animation:r??((g=d.reveal)==null?void 0:g.animation)??"rise"}}:d}))})),select:s=>e(r=>({selection:_n(r,s)})),toggleSelect:s=>e(r=>{const m=_n(r,[s]);return r.selection.includes(s)?{selection:r.selection.filter(u=>!m.includes(u))}:{selection:[...new Set([...r.selection,...m])]}}),selectAll:()=>e(s=>{const r=l(s);return{selection:r?r.elements.filter(m=>!m.locked).map(m=>m.id):[]}}),clearSelection:()=>e({selection:[],guides:[]}),groupSelection:()=>e(s=>{if(!l(s)||s.selection.length<2)return{};const m=new Set(s.selection),u=Fe("group");return{...i(s),deck:h(s,d=>d.map(g=>m.has(g.id)?{...g,group:u}:g))}}),ungroupSelection:()=>e(s=>{const r=l(s);if(!r||s.selection.length===0)return{};const m=new Set(s.selection);return r.elements.some(u=>m.has(u.id)&&u.group)?{...i(s),deck:h(s,u=>u.map(d=>{if(!m.has(d.id)||!d.group)return d;const{group:g,...b}=d;return b}))}:{}}),setGuides:s=>e(r=>s.length===0&&r.guides.length===0?{}:{guides:s}),setSnap:s=>e(r=>({snap:{...r.snap,...s}})),toggleGrid:()=>e(s=>({showGrid:!s.showGrid})),setZoom:s=>e({zoom:s==="fit"?"fit":Math.min(z.zoom.max,Math.max(z.zoom.min,s))}),pushHistory:s=>e(r=>i(r,s)),undo:()=>e(s=>{const r=s.past[s.past.length-1];return r?{deck:r,past:s.past.slice(0,-1),future:[s.deck,...s.future].slice(0,qe),slideIndex:Math.min(s.slideIndex,r.slides.length-1),selection:[],guides:[],dirty:!0}:{}}),redo:()=>e(s=>{const r=s.future[0];return r?{deck:r,past:[...s.past,s.deck].slice(-qe),future:s.future.slice(1),slideIndex:Math.min(s.slideIndex,r.slides.length-1),selection:[],guides:[],dirty:!0}:{}})}}),de=e=>e.deck.slides[e.slideIndex],xa=e=>{const t=e.deck.slides[e.slideIndex];if(!t)return[];const a=new Set(e.selection);return t.elements.filter(i=>a.has(i.id))};function ba(){return p(sa(xa))}const ka=e=>e.past.length>0,wa=e=>e.future.length>0;function Un(e){return`Dieses Deck trägt die Marke „${e}", die dieser Browser nicht kennt. Gezeichnet wird in nozilla, und der Eintrag bleibt in der Datei stehen. Die Marke kommt als .nzci.json aus dem CI-Generator.`}let be=null;function ya(){const e=p(a=>a.deck.meta.theme),t=q();w.useEffect(()=>{const a=!!e&&un(e),i=a?e:"nozilla";i!==Be().id&&ft(i);const l=p.getState();e&&!a?be!==e&&(be=e,l.zeigeHinweis(Un(e),"marken")):be&&(l.hinweis===Un(be)&&l.zeigeHinweis(null),be=null)},[e,t])}function ja(){const e=p(t=>t.deck.meta.format);w.useEffect(()=>{gt(Te(e)?e:"16-9")},[e])}function re(){return w.useSyncExternalStore(mt,Sn,Sn)}const va=["embedded","outlines"],Sa={embedded:"Schrift einbetten",outlines:"Text in Pfade"},za={embedded:"Text bleibt markierbar und durchsuchbar",outlines:"Überall gleich, auch ohne Schrift-Unterstützung"},Na=["folie","a4-hoch","a4-quer"],qn={folie:"Folie","a4-hoch":"A4 hoch","a4-quer":"A4 quer"},Ea={folie:"Die Seite ist die Folie, ohne Rand","a4-hoch":"Die Folie mittig auf A4, hochkant","a4-quer":"Die Folie mittig auf A4, quer"},Da="text/markdown",al="application/vnd.openxmlformats-officedocument.presentationml.presentation",rl="image/svg+xml",ll="application/pdf";function ol(e){return je(e)}async function Yt(e,t={}){const a=t.filename??`${wi(e.meta.title)}.md`;return pt(je(e),a,Da,t.handle)}const ve="nozilla-whiteboard:session:v1",Yn=`${ve}:unlesbar`,Ma=700;function Jt(){try{return typeof localStorage>"u"?null:localStorage}catch{return null}}function Fa(){const e=Jt();if(!e)return null;const t=e.getItem(ve);if(!t)return null;try{const a=JSON.parse(t);return typeof a.markdown!="string"?Jn(e,t,"der Eintrag trägt kein Markdown"):{deck:Le(a.markdown),fileName:a.fileName||"untitled.md",slideIndex:a.slideIndex??0}}catch(a){return Jn(e,t,xe(a))}}function Jn(e,t,a){let i=!1;try{e.setItem(Yn,t),e.removeItem(ve),i=!0}catch{}return p.getState().zeigeHinweis(`Die gemerkte Sitzung ließ sich nicht lesen: ${a}. Ihre ${t.length} Zeichen `+(i?`sind unverändert erhalten und stehen in der Ablage des Browsers unter „${Yn}".`:`stehen weiter unter „${ve}" — beiseitelegen ließen sie sich nicht, und die nächste Selbstsicherung schreibt darüber.`)),null}function Ca(){const e=Jt();if(!e)return()=>{};let t;const a=()=>{const c=p.getState();let o=!1;try{const h={markdown:je(c.deck),fileName:c.fileName,slideIndex:c.slideIndex,savedAt:Date.now()};e.setItem(ve,JSON.stringify(h)),o=!0}catch{}c.sicherungGescheitert===o&&p.getState().meldeSicherung(o)},i=p.subscribe((c,o)=>{c.deck===o.deck&&c.slideIndex===o.slideIndex||(clearTimeout(t),t=setTimeout(a,Ma))}),l=()=>{clearTimeout(t),a()};return window.addEventListener("beforeunload",l),()=>{clearTimeout(t),i(),window.removeEventListener("beforeunload",l)}}function ge(){return!p.getState().dirty||typeof confirm!="function"?!0:confirm("Das offene Deck ist nicht gesichert. Trotzdem ersetzen?")}async function xn(){const e=p.getState();try{const t=await Yt(e.deck,{filename:e.fileName,handle:e.fileHandle});return p.getState().markSaved({handle:t.handle}),p.getState().zeigeHinweis(e.fileHandle&&t.via==="download"?`„${e.fileName}" ließ sich nicht an Ort und Stelle beschreiben — das Deck wurde stattdessen heruntergeladen. Die geöffnete Datei ist damit nicht auf dem neuesten Stand.`:null),!0}catch(t){return t instanceof DOMException&&t.name==="AbortError"||p.getState().zeigeHinweis(`Das Deck ließ sich nicht sichern. ${xe(t)}`),!1}}async function Qt(){if(!ge())return!1;try{const e=await yi();return e?(p.getState().loadMarkdown(e.text,{fileName:e.name,handle:e.handle}),!0):!1}catch(e){return p.getState().zeigeHinweis(`Die Datei ließ sich nicht öffnen. ${xe(e)}`),!1}}function xe(e){if(e instanceof Error&&e.message)return e.message;const t=String(e);return t==="[object Object]"?"Unbekannter Fehler.":t}function Ia(){const e=t=>{p.getState().dirty&&(t.preventDefault(),t.returnValue="")};return window.addEventListener("beforeunload",e),()=>window.removeEventListener("beforeunload",e)}const Ie=e=>{if(!(e instanceof HTMLElement))return!1;if(e.isContentEditable)return!0;const t=e.tagName;return t==="INPUT"||t==="TEXTAREA"||t==="SELECT"},$a=e=>e instanceof HTMLElement&&e.closest("button, a[href], summary")!==null;function Ta(){w.useEffect(()=>{const e=t=>{const a=p.getState(),i=t.metaKey||t.ctrlKey,l=Ie(t.target);if(t.key==="Escape"){if(a.markenOpen)a.toggleMarken(!1);else if(a.searchOpen)a.toggleSearch(!1);else if(a.pruefungOpen)a.togglePruefung(!1);else if(a.promptOpen)a.togglePrompt(!1);else if(a.overviewOpen)a.toggleOverview(!1);else if(a.mode==="present")a.setMode("edit");else if(a.selection.length>0)a.clearSelection();else return;t.preventDefault();return}if(i&&!t.shiftKey&&["1","2","3"].includes(t.key)){t.preventDefault();const x={1:"library",2:"rail",3:"inspector"};a.togglePanel(x[t.key]);return}if(i&&t.key.toLowerCase()==="s"){t.preventDefault(),xn();return}if(i&&t.key.toLowerCase()==="o"){t.preventDefault(),Qt();return}if(i&&t.shiftKey&&t.key.toLowerCase()==="n"){if(t.preventDefault(),!ge())return;a.newDeck();return}if(i&&t.key.toLowerCase()==="k"){t.preventDefault(),a.toggleOverview();return}if(i&&t.key.toLowerCase()==="f"){t.preventDefault(),a.toggleSearch(!0);return}if(l||(t.key===" "||t.key==="Enter")&&$a(t.target))return;if(i&&t.key.toLowerCase()==="z"){t.preventDefault(),t.shiftKey?a.redo():a.undo();return}if(i&&t.key.toLowerCase()==="y"){t.preventDefault(),a.redo();return}if(a.mode==="present"){switch(t.key){case"ArrowRight":case"PageDown":case" ":case"Enter":t.preventDefault(),a.advance();return;case"ArrowLeft":case"PageUp":case"Backspace":t.preventDefault(),a.retreat();return;case"Home":t.preventDefault(),a.goTo(0);return;case"End":t.preventDefault(),a.goTo(a.deck.slides.length-1);return}const x=t.key.toLowerCase();if(x==="f"){t.preventDefault(),Pa();return}if(x==="n"){t.preventDefault(),a.toggleNotes();return}return}const c=a.markenOpen||a.searchOpen||a.pruefungOpen||a.promptOpen||a.overviewOpen,o=c?0:a.selection.length,h=t.shiftKey?z.gridSize*5:z.gridSize;switch(t.key){case"ArrowLeft":t.preventDefault(),o>0?a.nudgeSelection(-h,0):a.previous();return;case"ArrowRight":t.preventDefault(),o>0?a.nudgeSelection(h,0):a.next();return;case"ArrowUp":t.preventDefault(),o>0?a.nudgeSelection(0,-h):a.previous();return;case"ArrowDown":t.preventDefault(),o>0?a.nudgeSelection(0,h):a.next();return;case" ":t.preventDefault(),a.next();return;case"Home":t.preventDefault(),a.goTo(0);return;case"End":t.preventDefault(),a.goTo(a.deck.slides.length-1);return}if(!c){if(i&&t.key.toLowerCase()==="a"){t.preventDefault(),a.selectAll();return}if(i&&t.key.toLowerCase()==="d"){t.preventDefault(),a.duplicateSelection();return}if(i&&t.key.toLowerCase()==="g"){t.preventDefault(),t.shiftKey?a.ungroupSelection():a.groupSelection();return}if(i&&(t.key==="]"||t.key==="[")){t.preventDefault(),t.shiftKey?a.reorderSelection(t.key==="]"?"front":"back"):a.reorderSelection(t.key==="]"?"forward":"backward");return}if(t.key==="Delete"||t.key==="Backspace"){if(a.selection.length===0)return;t.preventDefault(),a.deleteSelection();return}if(!i)switch(t.key.toLowerCase()){case"g":t.preventDefault(),a.toggleGrid();break;case"p":t.preventDefault(),a.setMode("present");break;case"n":t.preventDefault(),a.addSlide();break}}};return window.addEventListener("keydown",e),()=>window.removeEventListener("keydown",e)},[])}async function Pa(){try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen()}catch{}}function Aa(e){return vi($e({elements:[...e]}))}function La(e){if(!e.includes("elements:"))return[];try{return ut(ji(e).elements.map(t=>({...t,id:Fe(t.kind)})))}catch{return[]}}let De=null;function Oa(){w.useEffect(()=>{const e=()=>{const l=p.getState();if(l.mode!=="edit"||l.selection.length===0)return null;const c=de(l);if(!c)return null;const o=l.selection.map(x=>c.elements.find(s=>s.id===x)).filter(x=>!!x);if(o.length===0)return null;const h=Aa(o);return De={text:h,slideId:c.id},h},t=l=>{if(Ie(l.target))return;const c=e();!c||!l.clipboardData||(l.clipboardData.setData("text/plain",c),l.preventDefault())},a=l=>{if(Ie(l.target))return;const c=e();!c||!l.clipboardData||(l.clipboardData.setData("text/plain",c),l.preventDefault(),p.getState().deleteSelection())},i=l=>{if(Ie(l.target))return;const c=p.getState();if(c.mode!=="edit"||!l.clipboardData)return;const o=[...l.clipboardData.files].filter(r=>r.type.startsWith("image/"));if(o.length>0){l.preventDefault(),Ba(o);return}const h=La(l.clipboardData.getData("text/plain"));if(h.length===0)return;l.preventDefault();const x=de(c),s=!!(De&&x&&De.slideId===x.id&&De.text===l.clipboardData.getData("text/plain"));c.pasteElements(h,{offset:s})};return document.addEventListener("copy",t),document.addEventListener("cut",a),document.addEventListener("paste",i),()=>{document.removeEventListener("copy",t),document.removeEventListener("cut",a),document.removeEventListener("paste",i)}},[])}async function Ba(e){for(const t of e){const a=await Vt(t),i=p.getState(),l=de(i),c=l?ht(l.meta.layout,l.markdown,Oe):null,o=dn((l==null?void 0:l.elements)??[],a,c?[c]:[]);i.addElement({...a,x:o.x,y:o.y})}}function Xt(){const e=w.useRef(null),[t,a]=w.useState({width:0,height:0}),i=w.useRef(null),l=w.useCallback(c=>{var h;if((h=i.current)==null||h.disconnect(),e.current=c,!c)return;const o=()=>{const x=c.getBoundingClientRect();a(s=>Math.abs(s.width-x.width)<.5&&Math.abs(s.height-x.height)<.5?s:{width:x.width,height:x.height})};o(),typeof ResizeObserver<"u"&&(i.current=new ResizeObserver(o),i.current.observe(c))},[]);return w.useEffect(()=>()=>{var c;return(c=i.current)==null?void 0:c.disconnect()},[]),[l,t,e]}function Se(e){const t=w.useSyncExternalStore(Si,zn,zn);return w.useEffect(()=>{zi(Ni(e))},[e]),t}function Ra({slide:e,deck:t,slideNumber:a,totalSlides:i,revealStep:l=1/0,animateReveals:c=!1,chrome:o=!0,focusable:h=!1,onFocusElement:x,className:s}){const r=pe(),m=Se(t),u=q(),d=re(),g=w.useMemo(()=>Re(e.meta.background),[e.meta.background,u,d]),b=w.useMemo(()=>Pe(Ei(e,{resolveImageSize:Oe})),[e,r,u,m,d]),v=w.useMemo(()=>o?Pe(Di(e,t,{slideNumber:a,totalSlides:i})):"",[o,e,t,a,i,r,u,d]),f=w.useMemo(()=>e.elements.slice().sort((E,N)=>E.z-N.z),[e.elements]);return n.jsxs("svg",{className:s,viewBox:`0 0 ${z.width} ${z.height}`,width:"100%",height:"100%",preserveAspectRatio:"xMidYMid meet",role:h?"group":"img","aria-label":t.meta.title,children:[n.jsx("g",{dangerouslySetInnerHTML:{__html:b}}),f.map((E,N)=>{var S;const k=((S=E.reveal)==null?void 0:S.step)??0;return k>l?null:n.jsx(Ha,{element:E,background:g,animate:c&&k>0&&k===l,index:N,fonts:r,bilder:m,skin:u,focusable:h,onFocusElement:x},E.id)}),v?n.jsx("g",{dangerouslySetInnerHTML:{__html:v}}):null]})}const ze=w.memo(Ra),Ha=w.memo(function({element:t,background:a,animate:i,index:l,fonts:c,bilder:o,skin:h,focusable:x,onFocusElement:s}){var d;const r=w.useMemo(()=>Pe(xt(t,a,{resolveImageSize:Oe})),[t,a,c,h,o]),m=((d=t.reveal)==null?void 0:d.animation)??"rise",u=x?{tabIndex:0,role:"button","aria-label":Wa(t),onFocus:()=>s==null?void 0:s(t.id)}:{};return n.jsx("g",{"data-element-id":t.id,className:i?`nz-reveal nz-reveal-${m}`:void 0,style:i?{animationDelay:`${l*hn.stagger}ms`}:void 0,dangerouslySetInnerHTML:{__html:r},...u})});function Wa(e){const t=R(bt,e.kind),a=Za(e).replace(/\s+/g," ").trim();return a?`${t}: ${a.slice(0,60)}`:t}function Za(e){return"title"in e&&e.title?e.title:"text"in e&&e.text?e.text:"markdown"in e&&e.markdown?e.markdown:"label"in e&&e.label?e.label:"alt"in e&&e.alt?e.alt:""}const Qn=15;function Ga({slide:e,deck:t,slideNumber:a,totalSlides:i}){re();const l=pe(),c=q(),o=Se(t),[h,x]=Xt(),s=w.useRef(null),r=w.useRef(null),[m,u]=w.useState(null),d=p(j=>j.zoom),g=p(j=>j.selection),b=p(j=>j.guides),v=p(j=>j.showGrid),f=p(j=>j.snap),E=p(j=>j.select),N=p(j=>j.toggleSelect),k=p(j=>j.clearSelection),S=p(j=>j.pushHistory),$=p(j=>j.transformElements),O=p(j=>j.setGuides),Z=40,y=x.width>0&&x.height>0?Math.min((x.width-Z*2)/z.width,(x.height-Z*2)/z.height):.5,T=d==="fit"?Math.max(.05,y):d,C=w.useMemo(()=>new Set(g),[g]),ri=w.useMemo(()=>e.elements.map(j=>({element:j,um:fn(j)})).filter(j=>j.um>0),[e.elements,l,c,o]),li=w.useMemo(()=>e.elements.filter(j=>C.has(j.id)),[e.elements,C]),Ne=w.useCallback((j,D)=>{var K;const A=(K=s.current)==null?void 0:K.getBoundingClientRect();return A?{x:(j-A.left)/T,y:(D-A.top)/T}:{x:0,y:0}},[T]),fe=w.useCallback((j,D,A={})=>{var U,te;const K=Ne(j.clientX,j.clientY),J=A.ids??g,ee=new Map,L=new Map;for(const P of e.elements)J.includes(P.id)&&(ee.set(P.id,{x:P.x,y:P.y,w:P.w,h:P.h}),L.set(P.id,P.rotation));let W,ne;if(D==="rotate"&&A.primaryId){const P=ee.get(A.primaryId);P&&(W={x:P.x+P.w/2,y:P.y+P.h/2},ne=Math.atan2(K.y-W.y,K.x-W.x)*180/Math.PI)}r.current={kind:D,pointerId:j.pointerId,start:K,originals:ee,rotations:L,handle:A.handle,primaryId:A.primaryId,center:W,startAngle:ne,moved:!1},(te=(U=j.currentTarget).setPointerCapture)==null||te.call(U,j.pointerId)},[g,e.elements,Ne]),oi=w.useCallback(j=>{var ee;const D=r.current;if(!D||D.pointerId!==j.pointerId)return;const A=Ne(j.clientX,j.clientY),K=A.x-D.start.x,J=A.y-D.start.y;if(!D.moved){if(Math.abs(K)*T<2&&Math.abs(J)*T<2)return;D.moved=!0,D.kind!=="marquee"&&S()}switch(D.kind){case"marquee":{u(ca(D.start.x,D.start.y,A.x,A.y));break}case"move":{const L=D.primaryId??[...D.originals.keys()][0],W=L?D.originals.get(L):void 0;if(!W)break;const ne=e.elements.filter(Y=>!D.originals.has(Y.id)).map(Y=>({x:Y.x,y:Y.y,w:Y.w,h:Y.h})),U={...W,x:W.x+K,y:W.y+J},te=j.altKey?{x:U.x,y:U.y,guides:[]}:ua(U,ne,f),P=te.x-W.x,Ee=te.y-W.y;O(te.guides),$(Y=>{const Q=D.originals.get(Y.id);return!Q||Y.locked?null:{x:Q.x+P,y:Q.y+Ee}},[...D.originals.keys()]);break}case"resize":{const L=D.primaryId,W=L?D.originals.get(L):void 0;if(!L||!W||!D.handle)break;const ne=D.rotations.get(L)??0,U=Gn(K,J,0,0,-ne),te=(ee=e.elements.find(Q=>Q.id===L))==null?void 0:ee.kind,P=fa(W,D.handle,U.x,U.y,{lockAspect:j.shiftKey,fromCenter:j.altKey,snap:f,minHeight:te&&wt(te)===0?0:void 0});let{x:Ee,y:Y}=P;if(ne){const Q={x:W.x+W.w/2,y:W.y+W.h/2},yn={x:P.x+P.w/2,y:P.y+P.h/2},jn=Gn(yn.x-Q.x,yn.y-Q.y,0,0,ne);Ee=Q.x+jn.x-P.w/2,Y=Q.y+jn.y-P.h/2}$(()=>({x:Ee,y:Y,w:P.w,h:P.h}),[L]);break}case"rotate":{const L=D.primaryId;if(!L||!D.center||D.startAngle===void 0)break;const W=Math.atan2(A.y-D.center.y,A.x-D.center.x)*180/Math.PI;let U=(D.rotations.get(L)??0)+(W-D.startAngle);j.altKey||(U=Math.round(U/Qn)*Qn),$(()=>({rotation:Ja(U)}),[L]);break}}},[S,T,O,e.elements,f,Ne,$]),wn=w.useCallback(j=>{var A,K;const D=r.current;if(!(!D||D.pointerId!==j.pointerId)){if(r.current=null,(K=(A=j.currentTarget).releasePointerCapture)==null||K.call(A,j.pointerId),D.kind==="marquee"){const J=m;if(u(null),J&&J.w>2&&J.h>2){const ee=e.elements.filter(L=>oa(J,{x:L.x,y:L.y,w:L.w,h:L.h})).map(L=>L.id);E(j.shiftKey?[...g,...ee]:ee)}else j.shiftKey||k()}O([])}},[k,m,E,g,O,e.elements]),ci=w.useCallback(j=>{if(j.button!==0)return;const D=j.target;D.closest("[data-hit-element]")||D.closest("[data-handle]")||(j.shiftKey||k(),fe(j,"marquee",{ids:[]}))},[fe,k]),di=w.useCallback((j,D)=>{if(j.button!==0)return;j.stopPropagation();let A=g;j.shiftKey?(N(D.id),A=g.includes(D.id)?g.filter(K=>K!==D.id):[...g,D.id]):g.includes(D.id)||(E([D.id]),A=[D.id]),!D.locked&&fe(j,"move",{primaryId:D.id,ids:A})},[fe,E,g,N]),ui={width:z.width*T,height:z.height*T};return n.jsx("div",{ref:h,className:"relative flex h-full w-full items-center justify-center overflow-auto bg-ui-canvas p-10","data-testid":"canvas-viewport",children:n.jsxs("div",{ref:s,className:"nz-stage relative shrink-0 touch-none select-none","data-tour":"flaeche",style:ui,onPointerDown:ci,onPointerMove:oi,onPointerUp:wn,onPointerCancel:wn,children:[n.jsx(ze,{slide:e,deck:t,slideNumber:a,totalSlides:i,focusable:!0,onFocusElement:j=>E([j]),className:"pointer-events-none absolute inset-0 h-full w-full overflow-hidden rounded-[inherit]"}),v?n.jsx(Ka,{scale:T}):null,n.jsx("div",{className:"pointer-events-none absolute inset-0",children:ri.map(({element:j,um:D})=>n.jsx("div",{title:`Der Text steht ${D} Einheiten unter der Unterkante.`,className:"absolute",style:{left:j.x*T,top:(j.y+j.h)*T,width:j.w*T,height:Math.max(2,2*T),background:ce.warn,transform:He(j).drehung&&j.rotation?`rotate(${j.rotation}deg)`:void 0,transformOrigin:`${j.w/2*T}px ${-j.h/2*T}px`}},j.id))}),n.jsx("div",{className:"absolute inset-0",children:e.elements.map(j=>n.jsx("div",{"data-hit-element":j.id,"data-locked":j.locked||void 0,role:"button",tabIndex:-1,"aria-label":kt(j),className:"nz-hit",style:Ua(j,T,C.has(j.id)),onPointerDown:D=>di(D,j)},j.id))}),n.jsx(Va,{elements:li,scale:T,onResizeStart:(j,D,A)=>{j.stopPropagation(),fe(j,"resize",{handle:A,primaryId:D.id,ids:[D.id]})},onRotateStart:(j,D)=>{j.stopPropagation(),fe(j,"rotate",{primaryId:D.id,ids:[D.id]})}}),n.jsx(_a,{guides:b,scale:T}),m?n.jsx("div",{className:"pointer-events-none absolute border",style:{left:m.x*T,top:m.y*T,width:m.w*T,height:m.h*T,borderColor:ce.select,background:ce.selectWash}}):null]})})}function Ka({scale:e}){const t=z.gridSize*e;return t<3?null:n.jsx("div",{className:"pointer-events-none absolute inset-0 rounded-[inherit]",style:{backgroundImage:`radial-gradient(${ce.grid} 1px, transparent 1px)`,backgroundSize:`${t}px ${t}px`,opacity:.5}})}function Va({elements:e,scale:t,onResizeStart:a,onRotateStart:i}){if(e.length===0)return null;const l=e.length===1?e[0]:null,c=e.length>1?Ut(e.map(o=>({x:o.x,y:o.y,w:o.w,h:o.h}))):null;return n.jsxs("div",{className:"pointer-events-none absolute inset-0",children:[c?n.jsx("div",{className:"absolute border border-dashed",style:{left:c.x*t,top:c.y*t,width:c.w*t,height:c.h*t,borderColor:ce.select}}):null,e.map(o=>{const h=He(o).drehung;return n.jsx("div",{className:"absolute",style:{left:o.x*t,top:o.y*t,width:o.w*t,height:o.h*t,transform:h&&o.rotation?`rotate(${o.rotation}deg)`:void 0,transformOrigin:"center center",outline:`1.5px solid ${ce.select}`,outlineOffset:0},children:l&&!o.locked?n.jsxs(n.Fragment,{children:[ha.map(x=>n.jsx("button",{type:"button","data-handle":x,"aria-label":`Größe ändern: ${R(Mi,x)}`,className:"nz-handle pointer-events-auto",style:Ya(x,o,t),onPointerDown:s=>a(s,o,x)},x)),h?n.jsx("button",{type:"button","data-handle":"rotate","aria-label":"Drehen",className:"nz-handle nz-handle--round pointer-events-auto",style:{left:o.w*t/2-5,top:-26,cursor:"grab"},onPointerDown:x=>i(x,o)}):null]}):null},o.id)})]})}function _a({guides:e,scale:t}){return e.length===0?null:n.jsx("div",{className:"pointer-events-none absolute inset-0 overflow-visible",children:e.map((a,i)=>a.orientation==="v"?n.jsx("div",{className:"absolute",style:{left:a.position*t,top:Math.min(a.start,0)*t,width:1,height:(Math.max(a.end,z.height)-Math.min(a.start,0))*t,background:ce.select,transition:`opacity ${hn.duration.fast}ms linear`}},`v-${i}`):n.jsx("div",{className:"absolute",style:{top:a.position*t,left:Math.min(a.start,0)*t,height:1,width:(Math.max(a.end,z.width)-Math.min(a.start,0))*t,background:ce.select}},`h-${i}`))})}function Ua(e,t,a){return{left:e.x*t,top:e.y*t,width:e.w*t,height:Math.max(e.h,z.minElementSize/2)*t,transform:He(e).drehung&&e.rotation?`rotate(${e.rotation}deg)`:void 0,cursor:e.locked?"not-allowed":a?"move":"pointer"}}const qa={nw:"nwse-resize",n:"ns-resize",ne:"nesw-resize",e:"ew-resize",se:"nwse-resize",s:"ns-resize",sw:"nesw-resize",w:"ew-resize"};function Ya(e,t,a){const i=t.w*a,l=t.h*a,c=5,o=e.includes("w")?-c:e.includes("e")?i-c:i/2-c,h=e.startsWith("n")?-c:e.startsWith("s")?l-c:l/2-c;return{left:o,top:h,cursor:qa[e]}}function Ja(e){const t=e%360;return Math.abs(t)<.01?0:t}const Qa=["type","cards","labels","shapes","connectors","brand"],Xa={type:"Typografie",cards:"Karten",labels:"Labels",shapes:"Formen",connectors:"Verbinder",brand:"Marke & Medien"},I=(e,t,a,i,l,c)=>({id:e,label:t,group:a,kind:i,patch:l,hint:c}),Xn=[I("text-display","Kampagnensatz","type","text",{text:"Gute digitale Dienste.",typeStyle:"display",w:1104,h:272},"Die größte Stufe der Auszeichnungsschrift — für den einen Satz"),I("text-headline","Headline","type","text",{text:"Wir bauen wartbare Plattformen.",typeStyle:"headline",w:1e3,h:184}),I("text-h1","Überschrift 1","type","text",{text:"Überschrift",typeStyle:"h1",w:800,h:72}),I("text-h2","Überschrift 2","type","text",{text:"Zwischentitel",typeStyle:"h2",w:640,h:56}),I("text-h3","Überschrift 3","type","text",{text:"Kleiner Titel",typeStyle:"h3",w:520,h:40}),I("text-lead","Lead","type","text",{text:"Ein Satz, der etwas behauptet — und den die nächste Folie belegt.",typeStyle:"lead",w:624,h:104}),I("text-body","Fließtext","type","text",{text:"Fließtext in der Grundstufe, Zeilenhöhe 1,55.",typeStyle:"body",w:520,h:96}),I("text-small","Kleintext","type","text",{text:"Quelle, Fußnote, Randbemerkung",typeStyle:"small",w:400,h:32}),I("text-label","Label","type","text",{text:"Abschnitt",typeStyle:"label",w:304,h:24},"Label-Schrift, ALL-CAPS, gesperrt — wird automatisch gesetzt"),I("chart-bar","Balken","cards","chart",{chart:"bar",label:"Laufzeit in Tagen",data:`2023  38
2024  52
* 2025  61`},"Zahlen als Balken — ein Wert mit * davor bekommt das Signal"),I("chart-line","Linie","cards","chart",{chart:"line",label:"Wartungsaufwand",data:`Q1  62
Q2  48
Q3  35
Q4  28`},"Ein Verlauf über die Zeit"),I("table","Tabelle","cards","table",{label:"",data:`Was  Tasten
Folie vor / zurück  → ←
Übersicht  ⌘K
Präsentieren  P`,header:!0},"Zellen tippen oder aus einer Tabellenkalkulation hineinkopieren"),I("markdown-block","Markdown-Block","type","markdown",{markdown:`### Zwischentitel

- Erster Punkt
- Zweiter Punkt
- Dritter Punkt`,w:520,h:240},"Volles Markdown, gesetzt in der CI-Hierarchie"),I("markdown-panel","Markdown-Fläche","type","markdown",{markdown:'Markdown auf einer Fläche.\n\nDer ==grüne Marker== schreibt sich `==so==`.\n\n```ts\nexport const brand = "nozilla";\n```',fill:"framed",shadow:"md",w:560,h:304},"Mit Kontur und hartem Schatten"),I("card-feature","Karte","cards","card",{variant:"feature",icon:"square-check",title:"Was wir machen",body:"Ein Satz, der die Behauptung der Karte trägt.",w:344,h:240}),I("card-stat","Zahl","cards","card",{variant:"stat",label:"Laufzeit",title:"38 %",body:"weniger Wartungsaufwand",w:304,h:216}),I("card-step","Schritt","cards","card",{variant:"step",label:"1",title:"Verstehen",body:"Was in dieser Phase passiert.",w:304,h:232}),I("card-quote","Zitat","cards","card",{variant:"quote",title:"Wir schreiben Sätze, die etwas behaupten.",body:"nozilla",w:464,h:224}),I("card-note","Hinweis","cards","card",{variant:"note",icon:"circle-info",title:"Worauf es ankommt",body:"Eine Randbemerkung, die nicht untergehen darf.",w:440,h:176}),I("card-signal","Karte, Signal","cards","card",{variant:"feature",icon:"rocket",title:"Der eine Punkt",body:"Signal-Grün trägt eine Folie — nicht fünf.",tone:"signal",w:344,h:240},"Sparsam: 5 % der Fläche"),I("card-ink","Karte, Tinte","cards","card",{variant:"feature",icon:"terminal",title:"Invers",body:"Tinte als Fläche, Papier als Schrift.",tone:"ink",w:344,h:240}),I("badge-signal","Badge Signal","labels","badge",{text:"Neu",tone:"signal",w:128,h:40}),I("badge-paper","Badge Papier","labels","badge",{text:"In Arbeit",tone:"paper",w:176,h:40}),I("badge-ink","Badge Tinte","labels","badge",{text:"Abgelöst",tone:"ink",w:176,h:40}),I("badge-icon","Badge mit Icon","labels","badge",{text:"Fertig",icon:"check",tone:"signal",w:200,h:48}),I("shape-rectangle","Rechteck","shapes","shape",{shape:"rectangle",w:280,h:184}),I("shape-rectangle-shadow","Rechteck mit Schatten","shapes","shape",{shape:"rectangle",shadow:"md",w:280,h:184}),I("shape-outline","Nur Kontur","shapes","shape",{shape:"rectangle",fill:"outline",strokeWeight:"strong",w:280,h:184}),I("shape-ellipse","Ellipse","shapes","shape",{shape:"ellipse",w:200,h:200}),I("shape-diamond","Raute","shapes","shape",{shape:"diamond",w:200,h:200}),I("shape-triangle","Dreieck","shapes","shape",{shape:"triangle",w:200,h:176}),I("shape-hexagon","Sechseck","shapes","shape",{shape:"hexagon",w:224,h:192}),I("shape-chevron","Chevron","shapes","shape",{shape:"chevron",label:"Phase",w:264,h:88}),I("shape-banner","Banner","shapes","shape",{shape:"banner",label:"Banner",tone:"signal",w:280,h:64}),I("shape-callout","Sprechblase","shapes","shape",{shape:"callout",label:"Kurze Notiz",w:280,h:176}),I("shape-frame","Eckwinkel","shapes","shape",{shape:"frame",fill:"outline",strokeWeight:"heavy",w:344,h:240}),I("shape-bracket","Klammer","shapes","shape",{shape:"bracket",fill:"outline",strokeWeight:"strong",w:48,h:240}),I("shape-cross","Kreuz","shapes","shape",{shape:"cross",w:184,h:184}),I("connector-arrow","Pfeil","connectors","connector",{connector:"arrow",w:240,h:0}),I("connector-line","Linie","connectors","connector",{connector:"line",w:240,h:0}),I("connector-double","Doppelpfeil","connectors","connector",{connector:"double-arrow",w:264,h:0}),I("connector-elbow","Winkel","connectors","connector",{connector:"elbow",w:240,h:144}),I("connector-dashed","Gestrichelt","connectors","connector",{connector:"arrow",dashed:!0,w:240,h:0}),I("connector-rule","Regel","connectors","connector",{connector:"line",strokeWeight:"heavy",w:304,h:0}),I("wordmark","Wortmarke","brand","wordmark",{w:320,h:80},"Nie drehen, nie umfärben, nie verzerren, nie mit Schatten"),I("wordmark-large","Wortmarke groß","brand","wordmark",{w:560,h:144},"Mindestgröße digital: 96 px Wortmarkenbreite"),I("image-placeholder","Bild","brand","image",{w:440,h:280,shadow:"md"},"Datei auf die Fläche ziehen — Fotografie schwarzweiß mit Korn")];function er(){const[e,t]=w.useState("elements"),[a,i]=w.useState("paper"),[l,c]=w.useState(""),o=p(r=>r.insertPreset),h=q(),x=w.useMemo(()=>{const r=l.trim().toLowerCase();return r?Xn.filter(m=>m.label.toLowerCase().includes(r)||m.kind.includes(r)):Xn},[l]),s=w.useMemo(()=>l?Fi(l):null,[l,h]);return n.jsxs("aside",{"data-tour":"bibliothek",className:"flex h-full w-[268px] shrink-0 flex-col border-r border-ui bg-ui-surface","aria-label":"Bausteinbibliothek",children:[n.jsxs("div",{className:"flex items-center gap-1 border-b border-ui px-2 py-2",children:[n.jsx(et,{active:e==="elements",onClick:()=>t("elements"),icon:"layer-group",children:"Bausteine"}),n.jsx(et,{active:e==="icons",onClick:()=>t("icons"),icon:"wand-magic-sparkles",children:"Zeichen"})]}),n.jsxs("div",{className:"border-b border-ui p-2",children:[n.jsxs("div",{className:"relative",children:[n.jsx("span",{className:"pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ui-faint",children:n.jsx(B,{name:"magnifying-glass",size:13})}),n.jsx("input",{type:"search",value:l,onChange:r=>c(r.target.value),placeholder:e==="icons"?"Zeichen suchen":"Bausteine suchen",className:"nz-field pl-8","aria-label":"Bibliothek durchsuchen"})]}),n.jsxs("div",{className:"mt-2 flex items-center gap-1",children:[n.jsx("span",{className:"mr-1 text-[11px] font-semibold uppercase tracking-wide text-ui-faint",children:"Ton"}),mn.map(r=>n.jsx("button",{type:"button",title:ie[r].label,"aria-label":`Ton ${ie[r].label} wählen`,"aria-pressed":a===r,onClick:()=>i(r),className:H("h-5 w-5 rounded-sm border transition-transform duration-fast ease-standard",a===r?"scale-110 border-ui-accent ring-2 ring-ui-accent":"border-ui hover:scale-105"),style:{background:ie[r].surface,boxShadow:`inset 0 0 0 2px ${ie[r].line}`}},r))]}),n.jsx("p",{"data-hinweis":"ton",className:"mt-1.5 text-[11px] leading-snug text-ui-faint",children:"Gilt für Bausteine mit eigener Fläche. Text, Tabelle, Verbinder und die Wortmarke nehmen Tinte und Linie vom Untergrund der Folie."})]}),n.jsx("div",{className:"min-h-0 flex-1 overflow-y-auto pb-6",children:e==="elements"?Qa.map(r=>{const m=x.filter(u=>u.group===r);return m.length===0?null:n.jsxs("section",{children:[n.jsx(se,{children:Xa[r]}),n.jsx("div",{className:"grid grid-cols-2 gap-2 px-3",children:m.map(u=>n.jsx(nr,{preset:u,tone:a,onInsert:()=>o(u.kind,{...u.patch,tone:a})},u.id))})]},r)}):n.jsx(tr,{tone:a,matches:s})})]})}function et({active:e,onClick:t,icon:a,children:i}){return n.jsxs("button",{type:"button",onClick:t,"aria-pressed":e,className:H("inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-sm text-ui-body font-medium","transition-colors duration-fast ease-standard",e?"bg-ui-accent-soft text-ui-ink":"text-ui-muted hover:bg-ui-sunken"),children:[n.jsx(B,{name:a,size:14}),i]})}const nr=w.memo(function({preset:t,tone:a,onInsert:i}){const l=q(),c=pe(),o=w.useMemo(()=>{const x=cn(t.kind,{...t.patch,tone:a,x:0,y:0});return{html:Pe(xt(x)),w:x.w,h:Math.max(x.h,24)}},[t,a,l,c]),h=10;return n.jsxs("button",{type:"button",onClick:i,title:t.hint??`${t.label} einsetzen`,className:H("group flex flex-col items-stretch gap-1 rounded-md border border-ui bg-ui-surface p-1.5","text-left transition-all duration-fast ease-standard","hover:-translate-y-px hover:border-ui-accent-border hover:shadow-ui-md"),children:[n.jsx("span",{className:"flex h-[54px] items-center justify-center overflow-hidden",style:{background:Re("paper").fill},"aria-hidden":"true",children:n.jsx("svg",{viewBox:`${-h} ${-h} ${o.w+h*2} ${o.h+h*2}`,width:"100%",height:"100%",preserveAspectRatio:"xMidYMid meet",dangerouslySetInnerHTML:{__html:o.html}})}),n.jsx("span",{className:"truncate text-[11px] font-medium text-ui-muted group-hover:text-ui-ink",children:t.label})]})});function tr({tone:e,matches:t}){const a=p(d=>d.insertPreset),i=q(),l=w.useMemo(()=>Ci(),[i]),c=t?new Set(t):null,o=l.flatMap(d=>c?d.names.filter(g=>c.has(g)):d.names),[h,x]=w.useState(null),s=h&&o.includes(h)?h:o[0]??null,r=d=>{var f;const g=(f=d.parentElement)==null?void 0:f.children;if(!g)return 1;const b=g[0].offsetTop;let v=0;for(const E of g){if(E.offsetTop!==b)break;v+=1}return Math.max(1,v)},m=d=>{var N;const g=d.target,b=o.indexOf(g.dataset.zeichen??"");if(b<0)return;const v={ArrowRight:1,ArrowLeft:-1,ArrowDown:r(g),ArrowUp:-r(g)}[d.key];let f;if(v!==void 0?f=b+v:d.key==="Home"?f=0:d.key==="End"&&(f=o.length-1),f===void 0)return;d.preventDefault();const E=o[Math.min(Math.max(f,0),o.length-1)];x(E),(N=d.currentTarget.querySelector(`[data-zeichen="${CSS.escape(E)}"]`))==null||N.focus()},u=(d,g)=>{a("icon",{icon:d,tone:e,frame:g,fill:g==="none"?"none":"soft",w:g==="none"?72:88,h:g==="none"?72:88})};return n.jsxs("div",{onKeyDown:m,children:[n.jsx("div",{className:"px-3 pt-3",children:n.jsx("p",{className:"text-[11px] leading-snug text-ui-faint",children:"Klick setzt das nackte Zeichen, ⇧-Klick eine getönte Kachel. Mit den Pfeiltasten geht es durch die Zeichen."})}),l.map(d=>{const g=c?d.names.filter(b=>c.has(b)):d.names;return g.length===0?null:n.jsxs("section",{children:[n.jsx(se,{children:d.category}),n.jsx("div",{className:"grid grid-cols-6 gap-1 px-3",children:g.map(b=>n.jsx("button",{type:"button",title:b,"aria-label":`Zeichen ${b} einsetzen`,"data-zeichen":b,tabIndex:b===s?0:-1,onFocus:()=>x(b),onClick:v=>u(b,v.shiftKey?"box":"none"),className:H("flex aspect-square items-center justify-center rounded-sm border border-transparent","transition-colors duration-fast ease-standard hover:border-ui hover:bg-ui-subtle"),style:{color:Ii.ink},children:n.jsx(yt,{name:b,size:18})},b))})]},d.category)})]})}function ir(){const e=p(de),t=ba(),[a,i]=w.useState("slide"),l=t.length>0&&a==="slide"?"element":a;return n.jsxs("aside",{className:"flex h-full w-[300px] shrink-0 flex-col border-l border-ui bg-ui-surface","aria-label":"Inspektor","data-tour":"inspektor",children:[n.jsxs("div",{className:"flex items-center gap-1 border-b border-ui px-2 py-2",children:[n.jsx(Je,{active:l==="slide",onClick:()=>i("slide"),children:"Folie"}),n.jsxs(Je,{active:l==="element",onClick:()=>i("element"),children:["Element",t.length>1?` (${t.length})`:""]}),n.jsx(Je,{active:l==="deck",onClick:()=>i("deck"),children:"Deck"})]}),n.jsxs("div",{className:"min-h-0 flex-1 overflow-y-auto",children:[l==="slide"&&e?n.jsx(sr,{}):null,l==="element"?n.jsx(or,{elements:t}):null,l==="deck"?n.jsx(lr,{}):null]})]})}function Je({active:e,onClick:t,children:a}){return n.jsx("button",{type:"button",onClick:t,"aria-pressed":e,className:H("h-7 flex-1 rounded-sm text-ui-body font-medium transition-colors duration-fast ease-standard",e?"bg-ui-accent-soft text-ui-ink":"text-ui-muted hover:bg-ui-sunken"),children:a})}function sr(){const e=p(de),t=p(o=>o.setSlideMeta),a=p(o=>o.setSlideMarkdown),i=p(o=>o.deck);pe(),q(),Se(i),re();const l=e?jt(e):0,c=e?vt(e):0;return e?n.jsxs("div",{className:"space-y-3 p-3",children:[e.meta.unreadable!==void 0?n.jsxs("p",{className:"flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink",children:[n.jsx(B,{name:"triangle-exclamation",size:14,className:"mt-0.5 shrink-0 text-ui-warn"}),n.jsxs("span",{children:["Der ",n.jsx("code",{className:"font-mono",children:"nzl"}),"-Block dieser Folie ließ sich nicht lesen — meist ein Doppelpunkt zu viel im YAML. Layout und Elemente fehlen deshalb hier, der Block selbst bleibt beim Sichern ",n.jsx("strong",{children:"unverändert erhalten"}),". Wer ihn geradebiegt, bekommt die Folie zurück; wer hier etwas ändert, ersetzt ihn."]})]}):null,n.jsx(M,{label:"Layout",hint:St[e.meta.layout],children:n.jsx(G,{value:e.meta.layout,onChange:o=>t({layout:o.target.value}),options:zt.map(o=>({value:o,label:R($i,o)}))})}),n.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[n.jsx(M,{label:"Untergrund",children:n.jsx(G,{value:e.meta.background,onChange:o=>t({background:o.target.value}),options:Nt.map(o=>({value:o,label:R(Ti,o)}))})}),n.jsx(M,{label:"Übergang",children:n.jsx(G,{value:e.meta.transition,onChange:o=>t({transition:o.target.value}),options:Et.map(o=>({value:o,label:R(Pi,o)}))})})]}),n.jsxs("label",{className:"flex items-center gap-2 text-ui-body text-ui-muted",children:[n.jsx("input",{type:"checkbox",checked:!!e.meta.bare,onChange:o=>t({bare:o.target.checked})}),"Fußzeile und Foliennummer ausblenden"]}),l>0?n.jsxs("p",{className:"flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink",children:[n.jsx(B,{name:"triangle-exclamation",size:14,className:"mt-0.5 shrink-0 text-ui-warn"}),n.jsxs("span",{children:["Der Fließtext läuft ",l," Einheiten unter den Satzspiegel — dort steht die Fußzeile",c>0?`, und ${c} Einheiten davon liegen unter der Folienkante`:"","."]})]}):null,n.jsx(M,{label:"Markdown",hint:"Gesetzt im Satzspiegel des Layouts, in der Typo-Leiter der CI.",children:n.jsx("textarea",{value:e.markdown,spellCheck:!1,onChange:o=>a(o.target.value),rows:12,className:"nz-field resize-y font-mono text-[12px] leading-relaxed",placeholder:`# Überschrift

- Ein Punkt
- Noch ein Punkt`})}),n.jsx(M,{label:"Notizen für den Vortrag",children:n.jsx("textarea",{value:e.meta.notes??"",onChange:o=>t({notes:o.target.value}),rows:4,className:"nz-field resize-y",placeholder:"Sieht nur, wer vorträgt."})})]}):null}function ar(){q();const e=p(h=>h.deck.meta.theme),t=p(h=>h.setDeckMeta),a=p(h=>h.toggleMarken),i=an(),l=e??"nozilla",c=!i.some(h=>h.id===l),o=[...i.map(h=>({value:h.id,label:h.label})),...c?[{value:l,label:`${l} — nicht installiert`}]:[]];return n.jsxs(M,{label:"Erscheinungsbild",hint:c?`„${l}" ist hier nicht angemeldet. Gezeichnet wird im Standard; der Eintrag bleibt in der Datei stehen.`:i.length>1?"Steht im Frontmatter — die Datei trägt ihre Zugehörigkeit mit.":"Weitere kommen über Datei → Erscheinungsbilder… oder werden in src/themes/ angemeldet.",children:[n.jsx(G,{value:l,onChange:h=>t({theme:h.target.value}),options:o}),c?n.jsx(V,{className:"mt-2",icon:"upload",onClick:()=>a(!0),children:"Erscheinungsbilder…"}):null]})}function rr(){const e=p(o=>o.deck),t=p(o=>o.setDeckMeta),a=e.meta.format??"16-9",i=!Te(a),l=[...Xi.map(o=>({value:o,label:R(es,o)})),...i?[{value:a,label:`${a} — unbekannt`}]:[]],c=o=>{if(o!==a){if(Te(o)){const h=Lt(e,Ge(o));if(h.length>0){const x=new Set(h.map(r=>r.folie)).size,s=`${ae(h.length,"Element","Elemente")} auf ${ae(x,"Folie","Folien")} ${h.length===1?"liegt":"liegen"} bei einer Folienhöhe von ${Ge(o)} unter der Kante und ${h.length===1?"ist":"sind"} dann in keiner Ausgabe mehr zu sehen. Trotzdem umstellen? ⌘Z nimmt es zurück.`;if(!window.confirm(s))return}}t({format:o})}};return n.jsx(M,{label:"Folienformat",hint:i?`„${a}" kennt dieses Werkzeug nicht. Gezeichnet wird 16:9; der Eintrag bleibt in der Datei stehen.`:`${z.width} × ${Ge(a)} Einheiten. Steht im Frontmatter — die Datei trägt ihr Blatt mit.`,children:n.jsx(G,{value:a,onChange:o=>c(o.target.value),options:l})})}function lr(){const e=p(l=>l.deck.meta),t=p(l=>l.setDeckMeta),a=p(l=>l.deck.slides.length),i=p(l=>l.deck.slides.reduce((c,o)=>c+o.elements.length,0));return n.jsxs("div",{className:"space-y-3 p-3",children:[n.jsx(M,{label:"Titel",children:n.jsx("input",{className:"nz-field",value:e.title,onChange:l=>t({title:l.target.value})})}),n.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[n.jsx(M,{label:"Autor",children:n.jsx("input",{className:"nz-field",value:e.author??"",onChange:l=>t({author:l.target.value})})}),n.jsx(M,{label:"Datum",children:n.jsx("input",{className:"nz-field",value:e.date??"",placeholder:"2026-08-07",onChange:l=>t({date:l.target.value})})})]}),n.jsx(M,{label:"Fußzeile",hint:"Steht unten links auf jeder Folie, die eine Fußzeile zulässt.",children:n.jsx("input",{className:"nz-field",value:e.footer??"",onChange:l=>t({footer:l.target.value})})}),n.jsx(ar,{}),n.jsx(rr,{}),n.jsxs("dl",{className:"rounded-md border border-ui bg-ui-subtle p-2 text-[11px] text-ui-muted",children:[n.jsxs("div",{className:"flex justify-between",children:[n.jsx("dt",{children:"Folien"}),n.jsx("dd",{className:"font-mono",children:a})]}),n.jsxs("div",{className:"flex justify-between",children:[n.jsx("dt",{children:"Elemente auf der Fläche"}),n.jsx("dd",{className:"font-mono",children:i})]})]})]})}function or({elements:e}){var O,Z;const t=p(y=>y.updateElements),a=p(y=>y.pushHistory),i=p(y=>y.reorderSelection),l=p(y=>y.alignSelection),c=p(y=>y.distributeSelection),o=p(y=>y.duplicateSelection),h=p(y=>y.groupSelection),x=p(y=>y.ungroupSelection),s=p(y=>y.deleteSelection),r=p(y=>y.setRevealStep),m=p(y=>y.deck);pe(),q(),Se(m),re();const u=w.useMemo(()=>e.map(y=>y.id),[e]),d=e[0],g=!!(d!=null&&d.group),b=e.length===1&&d?fn(d):0,v=d?He(d):{drehung:!1,ton:!1,fuellung:!1,strichstaerke:!1,schatten:!1,innenabstand:!1},f=p(de),E=e.length===1&&d!==void 0&&Dt(d,Re((f==null?void 0:f.meta.background)??"paper")),N=(y,T=!0)=>{T&&a(`${u.join()}:${Object.keys(y).join()}`),t(u,y)},k=w.useMemo(()=>e.filter(y=>y.kind===(d==null?void 0:d.kind)).map(y=>y.id),[e,d]),S=k.length!==u.length,$=(y,T=!0)=>{T&&a(`${k.join()}:${Object.keys(y).join()}`),t(k,y)};return d?n.jsxs("div",{className:"space-y-3 p-3",children:[n.jsxs("div",{className:"flex flex-wrap items-center gap-1",children:[n.jsx(F,{icon:"layer-group",label:"Ganz nach vorn",onClick:()=>i("front")}),n.jsx(F,{icon:"arrow-up",label:"Eine Ebene vor",onClick:()=>i("forward")}),n.jsx(F,{icon:"arrow-down",label:"Eine Ebene zurück",onClick:()=>i("backward")}),n.jsx(F,{icon:"square",label:"Ganz nach hinten",onClick:()=>i("back")}),n.jsx(le,{}),n.jsx(F,{icon:"plus",label:"Duplizieren",onClick:o}),n.jsx(F,{icon:"layer-group",label:g?"Gruppe auflösen (⇧⌘G)":"Gruppieren (⌘G)",active:g,disabled:!g&&e.length<2,onClick:()=>g?x():h()}),n.jsx(F,{icon:d.locked?"lock":"key",label:d.locked?"Entsperren":"Sperren",active:d.locked,onClick:()=>N({locked:!d.locked})}),n.jsx(F,{icon:"xmark",label:"Löschen",tone:"danger",onClick:s})]}),n.jsxs("div",{className:"flex flex-wrap items-center gap-1",children:[n.jsx(F,{icon:"chevron-right",label:"Links ausrichten",className:"rotate-180",onClick:()=>l("left")}),n.jsx(F,{icon:"minus",label:"Waagerecht mittig ausrichten",onClick:()=>l("hcenter")}),n.jsx(F,{icon:"chevron-right",label:"Rechts ausrichten",onClick:()=>l("right")}),n.jsx(le,{}),n.jsx(F,{icon:"chevron-down",label:"Oben ausrichten",className:"rotate-180",onClick:()=>l("top")}),n.jsx(F,{icon:"minus",label:"Senkrecht mittig ausrichten",className:"rotate-90",onClick:()=>l("vcenter")}),n.jsx(F,{icon:"chevron-down",label:"Unten ausrichten",onClick:()=>l("bottom")}),n.jsx(le,{}),n.jsx(F,{icon:"table",label:"Waagerecht verteilen",onClick:()=>c("h"),disabled:e.length<3}),n.jsx(F,{icon:"layer-group",label:"Senkrecht verteilen",onClick:()=>c("v"),disabled:e.length<3})]}),n.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[n.jsx(ue,{label:"X",value:d.x,onChange:y=>N({x:y})}),n.jsx(ue,{label:"Y",value:d.y,onChange:y=>N({y})}),n.jsx(ue,{label:"Breite",value:d.w,min:Ai(),onChange:y=>N({w:y})}),n.jsx(ue,{label:"Höhe",value:d.h,min:wt(d.kind),onChange:y=>N({h:y})}),v.drehung?n.jsx(ue,{label:"Drehung",value:d.rotation,step:1,onChange:y=>N({rotation:y})}):null,n.jsx(ue,{label:"Deckkraft %",value:Math.round(d.opacity*100),min:0,max:100,onChange:y=>N({opacity:Math.min(1,Math.max(0,y/100))})})]}),b>0?n.jsxs("p",{className:"flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink",children:[n.jsx(B,{name:"triangle-exclamation",size:14,className:"mt-0.5 shrink-0 text-ui-warn"}),n.jsxs("span",{children:["Der Text steht ",b," Einheiten unter der Unterkante. Auf der Fläche sieht man ihn noch — im PDF steht er über dem Rand, und PowerPoint schneidet ihn ab."," ",n.jsx("button",{type:"button",className:"underline underline-offset-2",onClick:()=>N({h:Math.round(d.h+b)}),children:"Kasten anpassen"})]})]}):null,v.ton?n.jsx(M,{label:"Ton",children:n.jsx("div",{className:"flex flex-wrap gap-1",children:mn.map(y=>n.jsx("button",{type:"button",title:ie[y].label,"aria-label":ie[y].label,"aria-pressed":d.tone===y,onClick:()=>N({tone:y}),className:H("h-6 w-6 rounded-sm border transition-transform duration-fast ease-standard",d.tone===y?"scale-110 border-ui-accent ring-2 ring-ui-accent":"border-ui hover:scale-105"),style:{background:ie[y].surface,boxShadow:`inset 0 0 0 2px ${ie[y].line}`}},y))})}):null,n.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[v.fuellung?n.jsx(M,{label:"Füllung",children:n.jsx(G,{value:d.fill,onChange:y=>N({fill:y.target.value}),options:Mt.map(y=>({value:y,label:R(Li,y)}))})}):null,v.strichstaerke?n.jsx(M,{label:"Strichstärke",children:n.jsx(G,{value:d.strokeWeight,onChange:y=>N({strokeWeight:y.target.value}),options:Ft.map(y=>({value:y,label:R(Oi,y)}))})}):null,v.schatten?n.jsx(M,{label:"Schatten",hint:"Harter Versatz, kein Weichzeichner.",children:n.jsx(G,{value:d.shadow,onChange:y=>N({shadow:y.target.value}),options:Ct.map(y=>({value:y,label:y==="none"?"Ohne":`${Bi[y]} px`}))})}):null,v.innenabstand?n.jsx(ue,{label:"Innenabstand",value:d.padding,min:0,onChange:y=>N({padding:y})}):null]}),E?n.jsxs("p",{className:"flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink",children:[n.jsx(B,{name:"triangle-exclamation",size:14,className:"mt-0.5 shrink-0 text-ui-warn"}),n.jsx("span",{children:"Die Fläche hat genau die Farbe des Untergrunds — von diesem Element ist auf der Folie nichts zu sehen."})]}):null,S?n.jsxs("p",{className:"px-1 text-[11px] leading-snug text-ui-faint",children:["Die Auswahl umfasst mehrere Arten. Was hier steht, gilt nur für"," ",k.length===1?"das ausgewählte":`die ${k.length} ausgewählten`," ",R(bt,d.kind),"."]}):null,n.jsx(dr,{element:d,patch:$}),n.jsx("div",{className:"rounded-md border border-ui p-2",children:n.jsx(M,{label:"Einblendschritt",hint:"0 erscheint mit der Folie, ab 1 beim Weiterschalten.",children:n.jsxs("div",{className:"flex items-center gap-2",children:[n.jsx("input",{type:"number",min:0,className:"nz-field w-16",value:((O=d.reveal)==null?void 0:O.step)??0,onChange:y=>r(Math.max(0,Number(y.target.value)||0))}),n.jsx(G,{className:"flex-1",value:((Z=d.reveal)==null?void 0:Z.animation)??"rise",disabled:!d.reveal,onChange:y=>{var T;return r(((T=d.reveal)==null?void 0:T.step)??1,y.target.value)},options:It.map(y=>({value:y,label:R(Ri,y)}))})]})})})]}):n.jsxs("div",{className:"p-6 text-center text-ui-body text-ui-faint",children:[n.jsx(B,{name:"table",size:22,className:"mx-auto mb-2 opacity-50"}),"Nichts ausgewählt.",n.jsx("br",{}),"Wähle ein Element auf der Fläche oder setze eines aus der Bibliothek ein."]})}function cr({data:e}){const{ungelesen:t}=At(e);if(t.length===0)return null;const a=t[0],i=a.length>40?`${a.slice(0,40)}…`:a;return n.jsxs("p",{className:"flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink",children:[n.jsx(B,{name:"triangle-exclamation",size:14,className:"mt-0.5 shrink-0 text-ui-warn"}),n.jsxs("span",{children:[t.length===1?"Eine Zeile trägt keine lesbare Zahl und wird nicht gezeichnet: ":`${t.length} Zeilen tragen keine lesbare Zahl und werden nicht gezeichnet, die erste: `,n.jsxs("span",{className:"font-mono",children:["„",i,"“"]})]})]})}function dr({element:e,patch:t}){var a;switch(e.kind){case"chart":return n.jsxs(n.Fragment,{children:[n.jsx(M,{label:"Art",children:n.jsx(oe,{value:e.chart,onChange:i=>t({chart:i}),options:Ji.map(i=>({value:i,label:R(Qi,i)}))})}),n.jsx(M,{label:"Überschrift",children:n.jsx("input",{className:"nz-field",value:e.label,onChange:i=>t({label:i.target.value})})}),n.jsx(M,{label:"Zahlen",hint:"Eine Zeile je Wert: Beschriftung, dann die Zahl. Ein * davor hebt einen Wert hervor.",children:n.jsx("textarea",{rows:6,className:"nz-field resize-y font-mono text-ui-label",value:e.data,onChange:i=>t({data:i.target.value})})}),n.jsx(cr,{data:e.data}),n.jsxs("label",{className:"flex items-center gap-2 text-ui-body",children:[n.jsx("input",{type:"checkbox",checked:e.values,onChange:i=>t({values:i.target.checked})}),"Zahlen mitschreiben"]})]});case"table":return n.jsxs(n.Fragment,{children:[n.jsx(M,{label:"Überschrift",children:n.jsx("input",{className:"nz-field",value:e.label,onChange:i=>t({label:i.target.value})})}),n.jsx(M,{label:"Zellen",hint:"Eine Zeile je Zeile. Getrennt wird an Tabulator, senkrechtem Strich oder zwei Leerzeichen — aus einer Tabellenkalkulation kann man hineinkopieren.",children:n.jsx("textarea",{rows:7,className:"nz-field resize-y font-mono text-ui-label",value:e.data,onChange:i=>t({data:i.target.value})})}),n.jsxs("label",{className:"flex items-center gap-2 text-ui-body",children:[n.jsx("input",{type:"checkbox",checked:e.header,onChange:i=>t({header:i.target.checked})}),"Erste Zeile ist die Kopfzeile"]})]});case"text":return n.jsxs(n.Fragment,{children:[n.jsx(M,{label:"Text",children:n.jsx("textarea",{rows:3,className:"nz-field resize-y",value:e.text,onChange:i=>t({text:i.target.value})})}),n.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[n.jsx(M,{label:"Typo-Stufe",children:n.jsx(G,{value:e.typeStyle,onChange:i=>t({typeStyle:i.target.value}),options:Object.keys(me).map(i=>({value:i,label:`${R(Nn,i)} · ${me[i].size} px`}))})}),n.jsx(M,{label:"Ausrichtung",children:n.jsx(G,{value:e.align,onChange:i=>t({align:i.target.value}),options:Dn.map(i=>({value:i,label:R(Mn,i)}))})})]}),n.jsx(M,{label:"Senkrecht",children:n.jsx(oe,{value:e.valign,onChange:i=>t({valign:i}),options:qi.map(i=>({value:i,label:R(Yi,i)}))})})]});case"markdown":return n.jsxs(n.Fragment,{children:[n.jsx(M,{label:"Markdown",children:n.jsx("textarea",{rows:8,spellCheck:!1,className:"nz-field resize-y font-mono text-[12px]",value:e.markdown,onChange:i=>t({markdown:i.target.value})})}),n.jsx(M,{label:"Ausrichtung",children:n.jsx(oe,{value:e.align,onChange:i=>t({align:i}),options:Dn.map(i=>({value:i,label:R(Mn,i)}))})})]});case"card":return n.jsxs(n.Fragment,{children:[n.jsx(M,{label:"Variante",children:n.jsx(G,{value:e.variant,onChange:i=>t({variant:i.target.value}),options:Pt.map(i=>({value:i,label:R(Ui,i)}))})}),En(e.variant).label?n.jsx(M,{label:e.variant==="step"?"Nummer":"Label",children:n.jsx("input",{className:"nz-field",value:e.label??"",onChange:i=>t({label:i.target.value})})}):null,n.jsx(M,{label:"Titel",children:n.jsx("textarea",{rows:2,className:"nz-field resize-y",value:e.title,onChange:i=>t({title:i.target.value})})}),n.jsx(M,{label:"Fließtext",children:n.jsx("textarea",{rows:3,className:"nz-field resize-y",value:e.body,onChange:i=>t({body:i.target.value})})}),En(e.variant).icon?n.jsx(Qe,{value:e.icon,allowNone:!0,onChange:i=>t({icon:i})}):null]});case"badge":return n.jsxs(n.Fragment,{children:[n.jsx(M,{label:"Text",children:n.jsx("input",{className:"nz-field",value:e.text,onChange:i=>t({text:i.target.value})})}),n.jsx(Qe,{value:e.icon,allowNone:!0,onChange:i=>t({icon:i})})]});case"icon":return n.jsxs(n.Fragment,{children:[n.jsx(Qe,{value:e.icon,onChange:i=>t({icon:i??Ki()})}),n.jsx(M,{label:"Rahmen",children:n.jsx(oe,{value:e.frame,onChange:i=>t({frame:i}),options:Vi.map(i=>({value:i,label:R(_i,i)}))})})]});case"wordmark":return n.jsx(M,{label:"Farbe",hint:'„Automatisch" nimmt den Ton, der auf dem Untergrund der Folie lesbar ist.',children:n.jsx(G,{value:e.variant,onChange:i=>t({variant:i.target.value}),options:Zi.map(i=>({value:i,label:R(Gi,i)}))})});case"shape":return n.jsxs(n.Fragment,{children:[n.jsx(M,{label:"Form",children:n.jsx(G,{value:e.shape,onChange:i=>t({shape:i.target.value}),options:Tt.map(i=>({value:i,label:R(Wi,i)}))})}),n.jsx(M,{label:"Label",children:n.jsx("input",{className:"nz-field",value:e.label??"",onChange:i=>t({label:i.target.value})})}),(a=e.label)!=null&&a.trim()?n.jsx(M,{label:"Typo-Stufe des Labels",children:n.jsx(G,{value:e.labelStyle??"body",onChange:i=>t({labelStyle:i.target.value}),options:Object.keys(me).map(i=>({value:i,label:`${R(Nn,i)} · ${me[i].size} px`}))})}):null]});case"connector":return n.jsxs(n.Fragment,{children:[n.jsx(M,{label:"Verbinder",children:n.jsx(G,{value:e.connector,onChange:i=>t({connector:i.target.value}),options:$t.map(i=>({value:i,label:R(Hi,i)}))})}),n.jsxs("label",{className:"flex items-center gap-2 text-ui-body text-ui-muted",children:[n.jsx("input",{type:"checkbox",checked:e.dashed,onChange:i=>t({dashed:i.target.checked})}),"Gestrichelt"]}),n.jsx(M,{label:"Label",children:n.jsx("input",{className:"nz-field",value:e.label??"",onChange:i=>t({label:i.target.value})})})]});case"image":return n.jsxs(n.Fragment,{children:[n.jsx(M,{label:"Quelle",hint:"Ein Pfad relativ zum Deck oder eine eingebettete data-URI.",children:n.jsx("input",{className:"nz-field",value:e.src.startsWith("data:")?"(eingebettetes Bild)":e.src,readOnly:e.src.startsWith("data:"),onChange:i=>t({src:i.target.value})})}),n.jsx(V,{icon:"upload",onClick:async()=>{const i=document.createElement("input");i.type="file",i.accept="image/*",i.onchange=async()=>{var c;const l=(c=i.files)==null?void 0:c[0];l&&t({src:await dt(l)})},i.click()},children:"Datei einbetten"}),n.jsx(M,{label:"Alternativtext",hint:"Was auf dem Bild zu sehen ist, in einem Satz. Landet im SVG als Titel und in der PPTX als Beschreibung — dort liest eine Hilfstechnik ihn vor.",children:n.jsx("input",{className:"nz-field",value:e.alt,onChange:i=>t({alt:i.target.value})})}),e.alt.trim()?null:n.jsxs("p",{className:"flex items-start gap-2 border border-ui-warn bg-ui-warn-bg px-2 py-1.5 text-ui-body text-ui-ink",children:[n.jsx(B,{name:"triangle-exclamation",size:14,className:"mt-0.5 shrink-0 text-ui-warn"}),n.jsx("span",{children:"Ohne Alternativtext ist dieses Bild in jeder Ausgabe ein stummer Fleck. Zwei Sätze genügen — wer die Folie nicht sehen kann, hat sonst nichts."})]}),n.jsx(M,{label:"Einpassung",children:n.jsx(oe,{value:e.fit,onChange:i=>t({fit:i}),options:[{value:"contain",label:"Ganz sichtbar"},{value:"cover",label:"Füllend"}]})})]});default:return null}}function Qe({value:e,onChange:t,allowNone:a}){q();const i=e!==void 0&&!ns(e);return n.jsx(M,{label:"Icon",hint:i?`„${e}“ steht nicht im Zeichensatz dieses Erscheinungsbilds.`:void 0,children:n.jsxs("div",{className:"flex items-center gap-2",children:[n.jsx("span",{className:"flex h-8 w-8 items-center justify-center rounded-sm border border-ui bg-ui-subtle text-ui-ink",children:e?n.jsx(yt,{name:e,size:17}):n.jsx("span",{className:"text-ui-faint",children:"—"})}),n.jsx(G,{className:"flex-1",value:e??"",onChange:l=>t(l.target.value||void 0),options:[...a?[{value:"",label:"Ohne"}]:[],...i?[{value:e,label:`${e} — nicht in diesem Set`}]:[],...rn().map(l=>({value:l,label:l}))]})]})})}function ue({label:e,value:t,onChange:a,min:i,max:l,step:c=1}){return n.jsx(M,{label:e,children:n.jsx("input",{type:"number",className:"nz-field",value:Math.round(t*100)/100,min:i,max:l,step:c,onChange:o=>{const h=Number(o.target.value);Number.isFinite(h)&&a(Math.min(l??1/0,Math.max(i??-1/0,h)))}})})}const ur=["pitch","review","workshop","schulung","bericht","konzept"],ei={pitch:"Pitch — überzeugen, ein Angebot machen",review:"Review — Stand zeigen, Entscheidungen holen",workshop:"Workshop — gemeinsam arbeiten, Fläche brauchen",schulung:"Schulung — erklären, Schritt für Schritt",bericht:"Bericht — Zahlen und Ergebnisse zeigen",konzept:"Konzept — eine Idee ausbreiten"},hr={topic:"",purpose:"pitch",audience:"",goal:"",slideCount:8,material:"",title:"",footer:"nozilla · Gute digitale Dienste.",richCanvas:!0,notes:!0},nt=["arrow-right","arrow-up","arrow-down","check","square-check","xmark","plus","circle-info","triangle-exclamation","circle-question","lightbulb","bolt","rocket","flag","bullseye","compass","map","route","flask","microscope","chart-line","chart-simple","chart-pie","table","list-check","clipboard","file-lines","file-pdf","folder","book","newspaper","pen-to-square","users","user","handshake","comment","comments","envelope","phone","clock","calendar-days","hourglass","stopwatch","code","terminal","database","server","cloud","gears","sliders","wrench","lock","shield-halved","key","eye","magnifying-glass","filter","money-bill","coins","cart-shopping","tag","star","heart","thumbs-up","layer-group","object-group","cube","puzzle-piece","link","share-nodes","building","globe","leaf","recycle","truck","box-open","core-ai-model","core-ai-prompt","core-ai-drift","core-data-pipe","core-data-cluster","core-ops-incident","core-ops-rollback","core-sec-key","core-sec-encrypt","core-a11y-contrast","core-team-review","core-team-handover","core-proto-loop","core-web-deploy","core-web-speed","core-ws-agenda","core-ws-vote","core-ws-timebox","core-legacy-crack","core-refactor"],fr=150;function mr(){const e=new Set(rn()),t=nt.filter(a=>e.has(a));return t.length>=nt.length/5?t:rn().slice(0,fr)}const X=e=>e.join(" · "),gr=[["paper","white"],["cream","paper"],["ink","ink"],["signal","signal"],["grid","white"]];function pr(){const e=Math.max(z.width,z.height),t=Math.min(z.width,z.height);return Math.abs(e/t-Math.SQRT2)<.01?z.height>z.width?"DIN A hoch":"DIN A quer":`${Math.round(z.width/z.height*9)}:9`}function xr(){const e=zt.map(i=>`  ${i.padEnd(10)} ${St[i]}`).join(`
`),t=mn.map(i=>`  ${i.padEnd(9)} ${ie[i].hint}`).join(`
`),a=Object.keys(me).map(i=>`  ${i.padEnd(11)} ${me[i].size} px`).join(`
`);return`
════════════════════════════════════════════════════════════════
DATEIFORMAT
════════════════════════════════════════════════════════════════

Eine einzige Markdown-Datei. Aufbau:

  ---                       ← Deck-Frontmatter (YAML), einmal ganz oben
  title: …
  author: …
  footer: …
  theme: ${Be().id}
  format: ${Bt()}
  ---                       ← \`theme\` und \`format\` genau so übernehmen: ohne
                              sie öffnet das Deck unter nozilla auf 16:9, und
                              jede Koordinate darunter zeigt woandershin.

  <!-- nzl                  ← Metadaten dieser Folie (YAML), optional
  layout: title
  background: paper
  notes: Was die vortragende Person sagt.
  elements:
    - kind: card
      x: 704
      y: 144
      w: 488
      h: 192
      title: …
      body: …
  -->

  # Überschrift der Folie

  Fließtext, Listen, Tabellen, Code — normales Markdown.

  ---                       ← Trenner: neue Folie

  ## Nächste Folie

Regeln zum Format:
• Der Folientrenner ist eine Zeile mit genau \`---\`, davor eine Leerzeile.
• Der \`<!-- nzl … -->\`-Block steht immer VOR dem Fließtext der Folie.
• Der Block ist YAML. Einrückung mit zwei Leerzeichen, keine Tabs.
• Weglassen ist erlaubt: was fehlt, bekommt den CI-Standard.
• Eine Folie ohne freie Elemente braucht den Block gar nicht.

════════════════════════════════════════════════════════════════
FLÄCHE UND KOORDINATEN
════════════════════════════════════════════════════════════════

Die Folie ist ${z.width} × ${z.height} Einheiten (${pr()}).
Satzspiegel: links ${z.margin.left}, rechts ${z.width-z.margin.right}, oben ${z.margin.top}, unten ${z.height-z.margin.bottom}.
Alle Werte auf ein Vielfaches von ${z.gridSize} runden.

Der Fließtext (das Markdown) wird vom Layout gesetzt. Freie Elemente legst du
selbst — beides auf derselben Folie ist der Normalfall:
Text links im Satzspiegel, Karten rechts ab x ≈ 700.

Elemente dürfen sich nicht überlappen und nicht über den Rand ragen.

════════════════════════════════════════════════════════════════
VOKABULAR — nur diese Werte sind gültig
════════════════════════════════════════════════════════════════

layout:
${e}

background:  ${X(Nt)}
             paper = weiß (Standard) · cream = warmer Papierton
             ink = dunkel, Tinte als Fläche · signal = Signalfarbe als Fläche
             grid = weiß mit Punktraster
transition:  ${X(Et)}

tone — die Farbrolle einer Fläche:
${t}
Nie den Ton des Untergrunds als Fläche: das Element ist dann da und nicht zu
sehen. Unsichtbar sind ${X(gr.map(([i,l])=>`${i}+${l}`))}.

fill:        ${X(Mt)}
             none = nackt · outline = nur Kontur · flat = nur Fläche · framed = Fläche + Kontur
shadow:      ${X(Ct)}          (harter Versatz, kein Weichzeichner)
strokeWeight: ${X(Ft)}

kind — die Elementarten und ihre Felder:
  text       text, typeStyle, align (left|center|right), valign (top|middle|bottom)
  markdown   markdown, align
  card       variant, label, title, body, icon
  badge      text, icon
  icon       icon, frame (none|box)
  shape      shape, label, labelStyle
  connector  connector, dashed, label
  image      src, alt, fit (cover|contain)
  wordmark   variant (auto|ink|paper|mono)
  chart      chart (bar|line), label, data, values
  table      data, header, label

card.variant: ${X(Pt)}
              feature = Icon + Titel + Text · stat = große Zahl (title) + Bezug (body)
              step = Nummer in label · quote = Zitat in title, Quelle in body
              note = Balken links, für Hinweise
shape:        ${X(Tt)}
connector:    ${X($t)}

chart.data:   eine Zeile je Wert, „Beschriftung  Zahl". Getrennt wird an
              Tabulator, Semikolon, senkrechtem Strich oder ZWEI Leerzeichen.
              In der Zelle mit der Zahl darf nur eine Zahl stehen — „1e3"
              und „12 - 15" werden nicht gelesen.
              Ein * am Zeilenanfang hebt genau einen Wert hervor.
table.data:   eine Zeile je Zeile, Zellen getrennt an Tabulator, senkrechtem
              Strich oder ZWEI Leerzeichen. Eine Markdown-Trennzeile
              (---, ---:, :---:) als ZWEITE Zeile setzt die Ausrichtung der
              Spalten; weiter unten ist sie Inhalt.

typeStyle (kind: text) und labelStyle (kind: shape) — dieselbe Leiter:
${a}

reveal — Elemente nacheinander einblenden:
  reveal: { step: 1, animation: rise }
  step 0 = sofort mit der Folie. animation: ${X(It)}

icon — nur Namen aus dieser Liste:
${mr().join(", ")}

════════════════════════════════════════════════════════════════
DIE CI — nicht verhandelbar
════════════════════════════════════════════════════════════════

FARBE hat genau drei Rollen. Du wählst nie einen Farbwert, nur eine Rolle.
  Papier  Untergrund, rund 60 % der Fläche — als Creme oder als reines Weiß
  Tinte   Schrift, Linien, Konturen, rund 35 %
  Signal  ${Rt.name==="nozilla"?"Grün":"Die Signalfarbe"}, nur echte Handlungsaufforderungen, höchstens 5 %
Höchstens EIN Signal-Element pro Folie. Die Signalfarbe ist kein Dekor.

FORM
  Radius 0. Immer. Es gibt keine runde Ecke.
  Schatten sind harte Versätze (shadow: sm|md|lg), nie weich.
  Keine Verläufe, keine Weichzeichner, kein Glas.

TYPOGRAFIE
  Überschriften: ${Me("display")} Bold. Fließtext: ${Me("body")}. Labels: ${Me("mono")}.
  Labels werden automatisch in Versalien gesetzt — schreib sie normal.

DER MARKER — das Signature-Element, in der Signalfarbe
  Schreibweise: \`==Wort==\`
  Höchstens ${Ot} pro Absatz, nur auf Schlüsselwörtern.
  Nie ein ganzer Satz, nie zwei Marker direkt hintereinander.

SPRACHE
  Deutsch. Direkt. Kurze Verben statt langer Substantivketten.
  Der Kampagnensatz — die \`#\`-Überschrift der Titel- und Aussagefolien — ist
  ein Satz mit Punkt. Zwischenüberschriften (\`##\`) sind Überschriften und
  bekommen keinen.
  Keine Emoji. Keine Ausrufezeichen.
  Verboten: ${ts.join(", ")}.
  Behaupte etwas und belege es — keine Werbefloskeln.`.trim()}function br(){return`
════════════════════════════════════════════════════════════════
BEISPIEL — so sieht das Ergebnis aus
════════════════════════════════════════════════════════════════

---
title: Ablösung der Altplattform
author: nozilla
footer: nozilla · Gute digitale Dienste.
---

<!-- nzl
layout: title
background: paper
bare: true
notes: Erst das Problem benennen, dann das Angebot.
elements:
  - kind: wordmark
    x: 88
    y: 72
    w: 240
    h: 56
-->

# Die Altplattform kostet mehr, als sie trägt.

Ein Vorschlag, wie wir sie in zwei Quartalen ablösen.

---

<!-- nzl
layout: split
notes: Zahlen langsam vorlesen, sie tragen die Folie.
elements:
  - kind: card
    x: 704
    y: 152
    w: 488
    h: 176
    variant: stat
    label: Wartung
    title: 38 %
    body: der Entwicklungszeit fließen in Fehlerbehebung.
  - kind: card
    x: 704
    y: 360
    w: 488
    h: 176
    variant: stat
    tone: signal
    label: Ziel
    title: 12 %
    body: nach der Ablösung, gemessen über zwei Quartale.
    reveal:
      step: 1
      animation: rise
-->

## Wo die Zeit hingeht

Drei Viertel der Meldungen betreffen ==zwei Module==. Beide stammen aus der
ersten Ausbaustufe und sind seit vier Jahren nicht angefasst worden.

- Sie halten den Rest des Systems auf.
- Sie sind der Grund für die langen Freigaben.
- Sie lassen sich einzeln ersetzen.`.trim()}function kr(e){const t=[];return t.push("════════════════════════════════════════════════════════════════"),t.push("DER AUFTRAG"),t.push("════════════════════════════════════════════════════════════════"),t.push(""),t.push(`Thema:       ${e.topic.trim()||"(bitte erfragen)"}`),t.push(`Art:         ${ei[e.purpose]}`),e.audience.trim()&&t.push(`Publikum:    ${e.audience.trim()}`),e.goal.trim()&&t.push(`Ziel danach: ${e.goal.trim()}`),t.push(`Umfang:      ${e.slideCount} Folien`),e.title.trim()&&t.push(`Titel:       ${e.title.trim()}`),e.footer.trim()&&t.push(`Fußzeile:    ${e.footer.trim()}`),e.material.trim()&&(t.push(""),t.push("Material, das verarbeitet werden soll:"),t.push("---"),t.push(e.material.trim()),t.push("---")),t.push(""),t.push("Aufbau:"),t.push("• Erste Folie: layout: title, bare: true, mit der Wortmarke oben links."),t.push("• Danach eine Folie pro Gedanke. Ein Gedanke, eine Folie."),t.push(e.richCanvas?"• Mindestens die Hälfte der Folien nutzt die freie Fläche (Karten, Formen, Verbinder).":"• Vorwiegend Fließtext; freie Elemente nur, wo sie wirklich etwas zeigen."),t.push(e.notes?"• Zu jeder Folie `notes:` — ein bis zwei Sätze, was gesagt wird.":"• Keine Notizen."),t.push("• Letzte Folie: was als Nächstes passiert, konkret."),t.join(`
`)}function wr(e,t={}){const{withExample:a=!0}=t;return[`Du schreibst eine Präsentation für nozilla — eine Boutique-Agentur für
ehrliche Software. Die Ausgabe ist eine einzige Markdown-Datei, die das
nozilla Whiteboard direkt öffnet.

Du bist kein Werbetexter. Du schreibst Sätze, die etwas behaupten, und belegst
sie. Wenn im Material etwas fehlt, das die Aussage tragen müsste, schreibst du
das in die Notizen der Folie statt es zu erfinden.`,xr(),a?br():"",kr(e),`════════════════════════════════════════════════════════════════
AUSGABE
════════════════════════════════════════════════════════════════

Gib ausschließlich den Inhalt der Markdown-Datei aus.
Kein Vorwort, keine Erklärung, kein umschließender Codeblock.
Beginne mit \`---\` (dem Deck-Frontmatter).

Prüfe vor der Ausgabe:
□ Das Frontmatter trägt \`theme: ${Be().id}\` und \`format: ${Bt()}\`.
□ Jeder Folientrenner \`---\` hat eine Leerzeile davor.
□ Jeder \`<!-- nzl\`-Block ist mit \`-->\` geschlossen und sauber eingerückt.
□ Alle x/y/w/h liegen im Raster und innerhalb ${z.width} × ${z.height}.
□ Keine zwei Elemente überlappen sich.
□ Höchstens ein Signal-Element pro Folie.
□ Höchstens ${Ot} Marker pro Absatz.
□ Kein verbotenes Wort, kein Emoji, kein Ausrufezeichen.
□ Alle \`icon:\`-Werte stammen aus der Liste oben.`].filter(Boolean).join(`

`)}function bn(){w.useEffect(()=>{const e=document.activeElement;return()=>{e instanceof HTMLElement&&e.isConnected&&e.focus()}},[])}function yr(){bn();const e=p(f=>f.togglePrompt),t=p(f=>f.loadMarkdown),a=p(f=>f.zeigeHinweis),[i,l]=w.useState(hr),[c,o]=w.useState(!0),[h,x]=w.useState(""),[s,r]=w.useState(!1),[m,u]=w.useState(null),d=w.useMemo(()=>wr(i,{withExample:c}),[i,c]),g=(f,E)=>l(N=>({...N,[f]:E})),b=async()=>{a(null);try{await navigator.clipboard.writeText(d),r(!0),window.setTimeout(()=>r(!1),1600)}catch(f){r(!1),a(`Kopieren gescheitert. ${xe(f)}`)}},v=()=>{const f=is(h);if(!f.trim()){u("Da ist nichts drin.");return}const E=Le(f),N=E.slides.reduce((k,S)=>k+S.elements.length,0);if(E.slides.length===1&&!E.slides[0].markdown.trim()&&N===0){u("Das liest sich nicht wie ein Deck. Steht ganz oben das `---`-Frontmatter?");return}u(null),ge()&&(t(f,{fileName:"entwurf.md"}),e(!1))};return n.jsxs("div",{className:"absolute inset-0 z-modal flex flex-col bg-ui-canvas",role:"dialog","aria-label":"Prompt-Generator",children:[n.jsxs("header",{className:"flex h-12 shrink-0 items-center gap-3 border-b border-ui bg-ui-surface px-3",children:[n.jsx("h2",{className:"text-ui-title font-semibold",children:"Prompt-Generator"}),n.jsx("p",{className:"text-[11px] text-ui-muted",children:"Auftrag beschreiben, Prompt kopieren, Antwort zurück einfügen."}),n.jsx("div",{className:"ml-auto",children:n.jsx(F,{icon:"xmark",label:"Schließen (Esc)",onClick:()=>e(!1)})})]}),n.jsxs("div",{className:"grid min-h-0 flex-1 grid-cols-[minmax(320px,420px)_1fr]",children:[n.jsxs("section",{className:"min-h-0 space-y-3 overflow-y-auto border-r border-ui bg-ui-surface p-4",children:[n.jsx(M,{label:"Thema",hint:"Der eine Satz, worum es geht.",children:n.jsx("textarea",{className:"nz-field resize-y",rows:2,autoFocus:!0,value:i.topic,onChange:f=>g("topic",f.target.value),placeholder:"Ablösung der Altplattform in zwei Quartalen"})}),n.jsx(M,{label:"Art",children:n.jsx(G,{value:i.purpose,onChange:f=>g("purpose",f.target.value),options:ur.map(f=>({value:f,label:ei[f]}))})}),n.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[n.jsx(M,{label:"Publikum",children:n.jsx("input",{className:"nz-field",value:i.audience,onChange:f=>g("audience",f.target.value),placeholder:"Geschäftsführung"})}),n.jsx(M,{label:"Folien",children:n.jsx("input",{type:"number",min:2,max:40,className:"nz-field",value:i.slideCount,onChange:f=>g("slideCount",Math.max(2,Number(f.target.value)||8))})})]}),n.jsx(M,{label:"Ziel danach",hint:"Was soll passieren, wenn das Deck durch ist?",children:n.jsx("input",{className:"nz-field",value:i.goal,onChange:f=>g("goal",f.target.value),placeholder:"Freigabe für das erste Quartal"})}),n.jsx(M,{label:"Material",hint:"Stichpunkte, Zahlen, Zitate — roh reicht.",children:n.jsx("textarea",{className:"nz-field resize-y font-mono text-[12px]",rows:9,value:i.material,onChange:f=>g("material",f.target.value),placeholder:`38 % der Entwicklungszeit gehen in Fehlerbehebung
Zwei Module verursachen drei Viertel der Meldungen
Zielwert 12 % nach zwei Quartalen`})}),n.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[n.jsx(M,{label:"Titel",children:n.jsx("input",{className:"nz-field",value:i.title,onChange:f=>g("title",f.target.value),placeholder:"(automatisch)"})}),n.jsx(M,{label:"Fußzeile",children:n.jsx("input",{className:"nz-field",value:i.footer,onChange:f=>g("footer",f.target.value)})})]}),n.jsxs("fieldset",{className:"space-y-1.5 border border-ui p-2",children:[n.jsx("legend",{className:"px-1 text-[11px] font-semibold uppercase tracking-wide text-ui-faint",children:"Feinheiten"}),n.jsx(Xe,{checked:i.richCanvas,onChange:f=>g("richCanvas",f),label:"Freie Fläche nutzen",hint:"Karten, Formen und Verbinder statt reiner Textfolien"}),n.jsx(Xe,{checked:i.notes,onChange:f=>g("notes",f),label:"Präsentationsnotizen",hint:"Ein bis zwei Sätze pro Folie"}),n.jsx(Xe,{checked:c,onChange:o,label:"Beispielfolien mitschicken",hint:"Trifft das Format deutlich besser, kostet rund ein Drittel der Länge"})]})]}),n.jsxs("section",{className:"flex min-h-0 flex-col bg-ui-sunken",children:[n.jsxs("div",{className:"flex shrink-0 items-center gap-2 border-b border-ui bg-ui-surface px-3 py-2",children:[n.jsxs("span",{className:"text-[11px] font-semibold uppercase tracking-wide text-ui-faint",children:["Prompt · ",d.length.toLocaleString("de-DE")," Zeichen"]}),n.jsx("div",{className:"ml-auto flex items-center gap-2",children:n.jsx(V,{variant:"primary",icon:s?"check":"clone",onClick:b,children:s?"Kopiert":"Kopieren"})})]}),n.jsx("pre",{className:"min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed",children:d}),n.jsxs("div",{className:"shrink-0 border-t border-ui bg-ui-surface p-3",children:[n.jsx(M,{label:"Antwort des Modells",hint:"Hier einfügen — das Deck wird direkt geöffnet. Ein umschließender Codeblock stört nicht.",children:n.jsx("textarea",{className:"nz-field resize-y font-mono text-[11px]",rows:4,value:h,onChange:f=>{x(f.target.value),u(null)},placeholder:`---
title: …`})}),n.jsxs("div",{className:"mt-2 flex items-center gap-2",children:[n.jsx(V,{variant:"primary",icon:"file-lines",onClick:v,disabled:!h.trim(),children:"Als Deck öffnen"}),m?n.jsx("span",{className:H("text-[11px] font-semibold text-ui-danger"),children:m}):n.jsx("span",{className:"text-[11px] text-ui-muted",children:"Ersetzt das aktuelle Deck. Vorher sichern, wenn es noch gebraucht wird."})]})]})]})]})]})}function Xe({checked:e,onChange:t,label:a,hint:i}){return n.jsxs("label",{className:"flex cursor-pointer items-start gap-2",children:[n.jsx("input",{type:"checkbox",className:"mt-0.5",checked:e,onChange:l=>t(l.target.checked)}),n.jsxs("span",{children:[n.jsx("span",{className:"block text-ui-body font-semibold",children:a}),n.jsx("span",{className:"block text-[11px] text-ui-muted",children:i})]})]})}function jr(){var N;bn();const e=q(),t=ss(),a=p(k=>k.toggleMarken),i=p(k=>k.deck.meta.theme),l=p(k=>k.setDeckMeta),c=p(k=>k.zeigeHinweis),[o,h]=w.useState({art:"leer"}),[,x]=w.useState(0),s=an(),r=Ht().gescheitert,[m,u]=w.useState([]);w.useEffect(()=>{var $;let k=!1;const S=new Map;for(const{id:O,label:Z}of an())if(Ke(O))for(const y of(($=Ve(O))==null?void 0:$.webfontFaces)??[])y.file&&S.set(y.file,[...S.get(y.file)??[],Z]);return Promise.all([...S].map(async([O,Z])=>await as(O)?{datei:O,marken:[...new Set(Z)]}:null)).then(O=>{k||u(O.filter(Z=>Z!==null))}),()=>{k=!0}},[e,t]);const d=rs(),g=new Map;for(const{id:k,label:S}of s)if(Ke(k))for(const $ of((N=Ve(k))==null?void 0:N.webfontFaces)??[]){const O=ls($);if(!O.length)continue;const Z=os($.file);g.set(Z,[...g.get(Z)??[],`${S}: ${O.join(" und ")}`])}const b=async k=>{h({art:"liest",datei:k.name});const S=await ds(await k.text());h({art:"geprueft",datei:k.name,ergebnis:S})},v=k=>{const S=hs(k);h({art:"uebernommen",id:k.entwurf.id,label:k.entwurf.label,ablagefehler:S})},f=(k,S)=>{const $=i===k?`„${S}" aus diesem Browser entfernen? Das offene Deck trägt diese Marke und steht danach in nozilla; der Eintrag in der Datei bleibt.`:`„${S}" aus diesem Browser entfernen?`;window.confirm($)&&(cs(k),x(O=>O+1),o.art==="uebernommen"&&o.id===k&&h({art:"leer"}))},E=async k=>{const S=Ve(k);if(S)try{await pt(JSON.stringify(S,null,2),`${k}.nzci.json`,"application/json")}catch($){if($ instanceof DOMException&&$.name==="AbortError")return;c(`Die Datei ließ sich nicht aushändigen. ${xe($)}`)}};return n.jsx("div",{className:"absolute left-1/2 top-16 z-modal w-[34rem] max-w-[calc(100%-2rem)] -translate-x-1/2 animate-pop-in",role:"dialog","aria-label":"Erscheinungsbilder",children:n.jsxs("div",{className:"nz-panel flex max-h-[75vh] flex-col overflow-hidden shadow-ui-xl",children:[n.jsxs("div",{className:"flex items-center gap-2 border-b border-ui px-3 py-2",children:[n.jsx("h2",{className:"flex-1 text-ui-title font-semibold",children:"Erscheinungsbilder"}),n.jsx(F,{icon:"xmark",label:"Erscheinungsbilder schließen (Esc)",onClick:()=>a(!1)})]}),n.jsxs("div",{className:"min-h-0 flex-1 overflow-y-auto px-3 py-2",children:[n.jsx(se,{children:"Dieser Browser kennt"}),n.jsxs("ul",{className:"mb-3 flex flex-col",children:[s.map(({id:k,label:S})=>{const $=Ke(k);return n.jsxs("li",{className:"flex items-center gap-2 border-b border-ui py-1.5 last:border-b-0","aria-label":`Erscheinungsbild ${S}`,children:[n.jsxs("span",{className:"min-w-0 flex-1",children:[n.jsx("span",{className:"block text-ui-body text-ui-ink",children:S}),n.jsxs("span",{className:"block font-mono text-[11px] text-ui-faint",children:[k," · ",$?"importiert":"mitgeliefert",i===k?" · dieses Deck":""]})]}),$?n.jsxs(n.Fragment,{children:[n.jsx(F,{icon:"download",label:`„${S}" als .nzci.json sichern`,onClick:()=>void E(k)}),n.jsx(F,{icon:"trash",tone:"danger",label:`„${S}" entfernen`,onClick:()=>f(k,S)})]}):null]},k)}),r.map(({id:k,grund:S})=>n.jsxs("li",{className:"flex items-center gap-2 border-b border-ui py-1.5",children:[n.jsx(B,{name:"triangle-exclamation",size:14,className:"shrink-0 text-ui-warn"}),n.jsxs("span",{className:"min-w-0 flex-1",children:[n.jsxs("span",{className:"block font-mono text-[11px] text-ui-ink",children:[k," · ruht"]}),n.jsx("span",{className:"block text-[11px] leading-snug text-ui-muted",children:S})]}),n.jsx(F,{icon:"trash",tone:"danger",label:`Eintrag „${k}" entfernen`,onClick:()=>f(k,k)})]},`ruht-${k}`))]}),m.length||d.length?n.jsxs(n.Fragment,{children:[n.jsx(se,{children:"Schriften"}),m.length?n.jsx("ul",{className:"mb-2 flex flex-col","aria-label":"Fehlende Schriften",children:m.map(({datei:k,marken:S})=>n.jsxs("li",{className:"flex items-center gap-2 border-b border-ui py-1.5",children:[n.jsx(B,{name:"triangle-exclamation",size:14,className:"shrink-0 text-ui-warn"}),n.jsxs("span",{className:"min-w-0 flex-1",children:[n.jsx("span",{className:"block font-mono text-[11px] text-ui-ink",children:k}),n.jsxs("span",{className:"block text-[11px] leading-snug text-ui-muted",children:["fehlt · ",S.join(", ")," · steht in der Ersatzschrift"]})]}),n.jsx(ni,{datei:k})]},k))}):null,d.length?n.jsx("ul",{className:"mb-3 flex flex-col","aria-label":"Hochgeladene Schriften",children:d.map(k=>n.jsx(Sr,{schnitt:k,abweichungen:g.get(k.datei)??[]},k.datei))}):null]}):null,n.jsx(se,{children:"Importieren"}),n.jsxs("p",{className:"mb-2 text-[11px] leading-snug text-ui-muted",children:["Eine ",n.jsx("span",{className:"font-mono",children:".nzci.json"}),' aus dem CI-Generator („Entwurf sichern"). Sie geht durch dieselbe Prüfliste wie dort. Schriften, die weder in der Bibliothek noch in diesem Browser liegen, reichst du danach als'," ",n.jsx("span",{className:"font-mono",children:".ttf"})," nach. Ein Erscheinungsbild gilt der Folie; die Leisten bleiben, wie sie sind."]}),n.jsxs("label",{className:"inline-flex cursor-pointer items-center gap-2 rounded-sm border border-ui bg-ui-surface px-3 py-1.5 text-ui-body font-medium text-ui-ink hover:border-ui-strong hover:bg-ui-subtle",children:[n.jsx(B,{name:"upload",size:15}),"Datei wählen…",n.jsx("input",{type:"file",accept:".json,application/json",className:"sr-only",onChange:k=>{var $;const S=($=k.target.files)==null?void 0:$[0];k.target.value="",S&&b(S)}})]}),n.jsx(vr,{stand:o,deckMarke:i,uebernimm:v,verwirf:()=>h({art:"leer"}),stelleUm:k=>l({theme:k})})]})]})})}function vr({stand:e,deckMarke:t,uebernimm:a,verwirf:i,stelleUm:l}){var m;if(e.art==="leer")return null;if(e.art==="liest")return n.jsxs("p",{className:"mt-3 text-ui-body text-ui-muted",children:["„",e.datei,'" wird gelesen …']});if(e.art==="uebernommen")return n.jsxs("div",{className:"mt-3 border border-ui bg-ui-subtle px-3 py-2",role:"status",children:[n.jsxs("p",{className:"flex items-center gap-2 text-ui-body text-ui-ink",children:[n.jsx(B,{name:"circle-check",size:15}),"„",e.label,'" ist angemeldet.']}),e.ablagefehler?n.jsx("p",{className:"mt-1 text-[11px] leading-snug text-ui-warn",children:e.ablagefehler}):null,t===e.id?n.jsx("p",{className:"mt-1 text-[11px] leading-snug text-ui-muted",children:"Das offene Deck trägt diese Marke und steht jetzt darin."}):n.jsxs(V,{variant:"primary",className:"mt-2",icon:"arrow-right",onClick:()=>l(e.id),children:["Dieses Deck auf „",e.label,'" umstellen']})]});const{ergebnis:c,datei:o}=e;if(!c.ok)return n.jsxs("div",{className:"mt-3 border border-ui-danger bg-ui-danger-bg px-3 py-2",role:"alert",children:[n.jsxs("p",{className:"text-ui-body text-ui-danger",children:["„",o,'" lässt sich nicht importieren. ',c.grund]}),(m=c.befunde)!=null&&m.length?n.jsx("ul",{className:"mt-1 list-disc pl-4 text-[11px] leading-snug text-ui-ink",children:c.befunde.map((u,d)=>n.jsxs("li",{children:[u.feld,": ",u.text]},d))}):null]});const{vorschlag:h}=c,{entwurf:x}=h,{befunde:s}=h,r=h.fehlendeSchnitte.filter(({datei:u})=>!us(u));return n.jsxs("div",{className:"mt-3 border border-ui bg-ui-surface px-3 py-2","aria-label":"Befund zum Import",children:[n.jsxs("p",{className:"text-ui-body text-ui-ink",children:["„",x.label,'"'," ",n.jsxs("span",{className:"font-mono text-[11px] text-ui-faint",children:["(",x.id,")"]})]}),h.ersetzt?n.jsxs("p",{className:"mt-1 text-[11px] leading-snug text-ui-warn",children:["Ersetzt das importierte Erscheinungsbild „",x.id,'". Die Fassung von vorher geht verloren — wer sie behalten will, sichert sie vorher oben in der Liste.']}):null,r.length?n.jsxs("div",{className:"mt-1 text-[11px] leading-snug text-ui-warn",children:["Diese Schriftdateien liegen hier nicht; ihr Text steht auf dem Bildschirm und in jeder Ausgabe in einer Ersatzschrift, bis du sie als .ttf nachreichst:",n.jsx("ul",{className:"mt-1 flex flex-col gap-1",children:r.map(({datei:u})=>n.jsxs("li",{className:"flex items-center gap-2",children:[n.jsx("span",{className:"min-w-0 flex-1 truncate font-mono text-ui-ink",children:u}),n.jsx(ni,{datei:u})]},u))})]}):null,h.verworfen.length?n.jsxs("p",{className:"mt-1 text-[11px] leading-snug text-ui-warn",children:["Nicht zu gebrauchen und auf nozillas Wert gefallen: ",h.verworfen.join(", "),"."]}):null,s.length?n.jsx("ul",{className:"mt-1 flex flex-col gap-1",children:s.map((u,d)=>n.jsxs("li",{className:"border border-ui-strong px-2 py-1 text-[11px] leading-snug text-ui-ink",children:[n.jsxs("span",{className:"font-semibold",children:["Läuft, ist aber falsch · ",u.feld]})," ",u.text]},d))}):null,n.jsxs("div",{className:"mt-2 flex gap-2",children:[n.jsx(V,{variant:"primary",icon:"check",onClick:()=>a(h),children:h.ersetzt?"Ersetzen":"Anmelden"}),n.jsx(V,{variant:"ghost",onClick:i,children:"Verwerfen"})]})]})}function ni({datei:e}){const t=p(c=>c.zeigeHinweis),[a,i]=w.useState(null),l=async c=>{const o=await fs(e,await c.arrayBuffer());if(o.grund){i(o.grund);return}i(null),o.gemerkt||t(`„${c.name}" gilt bis zum nächsten Neuladen — dieser Browser bietet keine dauerhafte Ablage an.`)};return n.jsxs("span",{className:"flex shrink-0 flex-col items-end",children:[n.jsxs("label",{className:"inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-ui bg-ui-surface px-2 py-1 text-[11px] font-medium text-ui-ink hover:border-ui-strong hover:bg-ui-subtle focus-within:outline focus-within:outline-2 focus-within:outline-ui-accent",children:[n.jsx(B,{name:"upload",size:13}),".ttf nachreichen",n.jsx("input",{type:"file",accept:".ttf,font/ttf","aria-label":`${e} als TrueType nachreichen`,className:"sr-only",onChange:c=>{var h;const o=(h=c.target.files)==null?void 0:h[0];c.target.value="",o&&l(o)}})]}),a?n.jsx("span",{role:"alert",className:"mt-1 max-w-64 text-right text-[11px] leading-snug text-ui-danger",children:a}):null]})}function Sr({schnitt:e,abweichungen:t}){const a=()=>{window.confirm(`„${e.familie} ${e.gewicht}" aus diesem Browser entfernen?`)&&ms(e.datei)};return n.jsxs("li",{className:"flex items-center gap-2 border-b border-ui py-1.5 last:border-b-0","aria-label":`Schrift ${e.familie} ${e.gewicht}`,children:[n.jsxs("span",{className:"min-w-0 flex-1",children:[n.jsxs("span",{className:"block text-ui-body text-ui-ink",children:[e.familie," ",e.gewicht,e.kursiv?" kursiv":""]}),n.jsxs("span",{className:"block font-mono text-[11px] text-ui-faint",children:[e.datei," · ",Math.round(e.bytes.byteLength/1024)," kB · hochgeladen"]}),t.map(i=>n.jsxs("span",{role:"alert",className:"mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-ui-ink",children:[n.jsx(B,{name:"triangle-exclamation",size:12,className:"mt-0.5 shrink-0 text-ui-warn"}),n.jsxs("span",{children:[i,". Bildschirm und Export zeichnen beide die Datei — was in diesem Schnitt stehen soll, steht in ihrem."]})]},i))]}),n.jsx(F,{icon:"trash",tone:"danger",label:`„${e.familie} ${e.gewicht}" entfernen`,onClick:a})]})}function zr(){const e=p(f=>f.deck),t=p(f=>f.toggleSearch),a=p(f=>f.goTo),i=p(f=>f.select),l=p(f=>f.clearSelection),c=p(f=>f.ersetzeImDeck),[o,h]=w.useState(""),[x,s]=w.useState(""),[r,m]=w.useState(null),u=w.useRef(null);bn(),w.useEffect(()=>{var f,E;(f=u.current)==null||f.focus(),(E=u.current)==null||E.select()},[]);const d=w.useMemo(()=>ra(e,o),[e,o]),g=w.useMemo(()=>aa(e,o),[e,o]),b=()=>{const f=c(o.trim(),x);m(f===0?"Nichts zu ersetzen.":`${ae(f,"Stelle","Stellen")} ersetzt. ⌘Z nimmt es in einem Zug zurück.`)},v=f=>{a(f.slideIndex),f.elementId?i([f.elementId]):l()};return n.jsx("div",{className:"absolute right-3 top-3 z-popover w-[26rem] animate-pop-in",role:"dialog","aria-label":"Suchen und Ersetzen",children:n.jsxs("div",{className:"nz-panel overflow-hidden shadow-ui-xl",children:[n.jsxs("div",{className:"flex items-center gap-2 border-b border-ui px-3 py-2",children:[n.jsx("input",{ref:u,className:"nz-field flex-1",value:o,placeholder:"Im Deck suchen","aria-label":"Im Deck suchen",onChange:f=>{h(f.target.value),m(null)}}),n.jsx(F,{icon:"xmark",label:"Suche schließen (Esc)",onClick:()=>t(!1)})]}),n.jsxs("div",{className:"flex items-center gap-2 border-b border-ui px-3 py-2",children:[n.jsx("input",{className:"nz-field flex-1",value:x,placeholder:"Ersetzen durch","aria-label":"Ersetzen durch",onChange:f=>{s(f.target.value),m(null)}}),n.jsx(V,{icon:"check",onClick:b,disabled:g===0,title:"Ersetzt jeden Fund im ganzen Deck — Groß und Klein bleiben unbeachtet.",children:g>0?`Alle ${g}`:"Alle"})]}),r?n.jsx("p",{className:"border-b border-ui px-3 py-1.5 text-ui-label text-ui-muted",children:r}):null,n.jsx("div",{className:"max-h-[60vh] overflow-y-auto",children:o.trim().length<2?n.jsx("p",{className:"px-3 py-3 text-ui-body text-ui-faint",children:"Mindestens zwei Zeichen. Gesucht wird im Fließtext, in den Notizen und in jedem Textfeld jedes Elements."}):d.length===0?n.jsx("p",{className:"px-3 py-3 text-ui-body text-ui-faint",children:"Nichts gefunden."}):n.jsx("ul",{children:d.map((f,E)=>n.jsx("li",{children:n.jsx("button",{type:"button",onClick:()=>v(f),className:H("block w-full px-3 py-2 text-left transition-colors duration-fast","hover:bg-ui-subtle"),children:n.jsxs("span",{className:"flex items-baseline gap-2",children:[n.jsx("span",{className:"tabular-nums text-ui-label font-semibold text-ui-faint",children:f.slideIndex+1}),n.jsxs("span",{className:"min-w-0 flex-1",children:[n.jsxs("span",{className:"block truncate text-ui-label uppercase tracking-wide text-ui-faint",children:[f.feld," · ",he(e.slides[f.slideIndex],f.slideIndex)]}),n.jsxs("span",{className:"block truncate text-ui-body text-ui-muted",children:[f.vorher,n.jsx("mark",{className:"bg-ui-accent px-0.5 text-ui-on-accent",children:f.treffer}),f.nachher]})]})]})})},`${f.slideIndex}-${f.elementId??f.wo}-${E}`))})}),d.length>0?n.jsxs("p",{className:"border-t border-ui px-3 py-1.5 text-ui-label text-ui-faint",children:[ae(g,"Fundstelle","Fundstellen")," auf"," ",ae(new Set(d.map(f=>f.slideIndex)).size,"Folie","Folien")]}):null]})})}const tt={fehler:2,warnung:1,hinweis:0};function Nr(e){const t=[],a=new Set(Lt(e,z.height).map(({folie:i,element:l})=>`${i}:${l.id}`));return e.meta.theme&&!un(e.meta.theme)&&t.push({rang:"warnung",folie:null,ziel:"marken",text:`Das Deck trägt die Marke „${e.meta.theme}", die dieser Browser nicht kennt. Jede Folie steht deshalb in nozilla, in jeder Ausgabe. Die Marke kommt als .nzci.json aus dem CI-Generator.`}),e.slides.forEach((i,l)=>{const c=[],o=(s,r,m)=>c.push({rang:s,folie:l,element:m,text:r});i.meta.unreadable!==void 0&&o("fehler","Der nzl-Block dieser Folie ließ sich nicht lesen — meist ein Doppelpunkt zu viel im YAML. Layout und Elemente fehlen deshalb; der Block bleibt beim Sichern unverändert erhalten, bis jemand die Folie ändert.");const h=vt(i);if(h>0)o("fehler",`Der Fließtext läuft ${h} Einheiten unter die Folienkante. Dort zeigt ihn keine Ausgabe.`);else{const s=jt(i);s>0&&o("warnung",`Der Fließtext läuft ${s} Einheiten über den Satzspiegel — dort unten sitzt die Fußzeile.`)}const x=Re(i.meta.background);for(const s of i.elements){const r=kt(s);if(a.has(`${l}:${s.id}`)){o("fehler",`${r} liegt unter der Folienkante: keine Ausgabe zeigt es, und auf der Fläche trifft es kein Klick.`,s.id);continue}const m=fn(s);if(m>0&&o("warnung",`${r}: der Inhalt läuft ${m} Einheiten aus dem Kasten. Auf dem Bildschirm steht die Zeile noch, im PDF über dem Rand, in PowerPoint abgeschnitten.`,s.id),Dt(s,x)&&o("warnung",`${r} hat genau die Farbe seines Untergrunds. Es steht in der Ebenenliste, lässt sich anwählen — und ist nirgends zu sehen.`,s.id),s.kind==="chart"){const{ungelesen:u}=At(s.data);if(u.length>0){const d=u[0],g=d.length>40?`${d.slice(0,40)}…`:d;o("warnung",u.length===1?`${r}: eine Zeile trägt keine lesbare Zahl und wird nicht gezeichnet — „${g}".`:`${r}: ${u.length} Zeilen tragen keine lesbare Zahl und werden nicht gezeichnet, die erste ist „${g}".`,s.id)}}s.kind==="image"&&(s.src.trim()?s.alt.trim()||o("hinweis",`${r} hat keinen Alternativtext. In jeder Ausgabe ist es damit ein stummer Fleck; wer die Folie nicht sehen kann, hat nichts.`,s.id):o("warnung",`${r} hat noch keine Quelle — auf der Folie bleibt es leer.`,s.id))}c.sort((s,r)=>tt[r.rang]-tt[s.rang]),t.push(...c)}),t}function Er(e){const t={fehler:0,warnung:0,hinweis:0};for(const a of e)t[a.rang]+=1;return t}const en={fehler:{wort:"Nicht zu sehen",icon:"triangle-exclamation",ton:"text-ui-warn"},warnung:{wort:"Läuft, ist aber falsch",icon:"triangle-exclamation",ton:"text-ui-warn"},hinweis:{wort:"Zu wissen",icon:"circle-info",ton:"text-ui-faint"}};function Dr(){const e=p(s=>s.deck),t=p(s=>s.togglePruefung),a=p(s=>s.goTo),i=p(s=>s.select),l=p(s=>s.clearSelection),c=p(s=>s.toggleMarken);pe(),q(),Se(e),re();const o=w.useMemo(()=>Nr(e),[e]),h=Er(o),x=s=>{if(s.folie===null){s.ziel==="marken"&&(t(!1),c(!0));return}a(s.folie),s.element?i([s.element]):l()};return n.jsx("div",{className:"absolute right-3 top-3 z-popover w-[26rem] animate-pop-in",role:"dialog","aria-label":"Prüfliste des Decks",children:n.jsxs("div",{className:"nz-panel overflow-hidden shadow-ui-xl",children:[n.jsxs("div",{className:"flex items-center gap-2 border-b border-ui px-3 py-2",children:[n.jsx("h2",{className:"flex-1 text-ui-title font-semibold",children:"Prüfliste"}),n.jsx(F,{icon:"xmark",label:"Prüfliste schließen (Esc)",onClick:()=>t(!1)})]}),n.jsx("div",{className:"max-h-[60vh] overflow-y-auto",children:o.length===0?n.jsx("p",{className:"px-3 py-3 text-ui-body text-ui-faint",children:"Nichts zu beanstanden. Geprüft wird, was in keiner Ausgabe zu sehen wäre, was anders herauskommt als es aussieht, und was einer Hilfstechnik fehlt."}):n.jsx("ul",{children:o.map((s,r)=>n.jsx("li",{children:n.jsx("button",{type:"button",onClick:()=>x(s),className:H("block w-full px-3 py-2 text-left transition-colors duration-fast","hover:bg-ui-subtle"),children:n.jsxs("span",{className:"flex items-baseline gap-2",children:[n.jsx("span",{className:"tabular-nums text-ui-label font-semibold text-ui-faint",children:s.folie===null?"—":s.folie+1}),n.jsxs("span",{className:"min-w-0 flex-1",children:[n.jsxs("span",{className:"flex items-center gap-1 text-ui-label uppercase tracking-wide text-ui-faint",children:[n.jsx(B,{name:en[s.rang].icon,size:12,className:en[s.rang].ton}),en[s.rang].wort," ·"," ",s.folie===null?"Deck":he(e.slides[s.folie],s.folie)]}),n.jsx("span",{className:"block text-ui-body text-ui-muted",children:s.text})]})]})})},`${s.folie}-${s.element??"folie"}-${r}`))})}),o.length>0?n.jsxs("p",{className:"border-t border-ui px-3 py-1.5 text-ui-label text-ui-faint",children:[h.fehler>0?`${ae(h.fehler,"Fehler","Fehler")} · `:"",h.warnung>0?`${ae(h.warnung,"Warnung","Warnungen")} · `:"",ae(h.hinweis,"Hinweis","Hinweise")]}):null]})})}const Mr=232;function it(){re();const e=p(s=>s.deck),t=p(s=>s.slideIndex),a=p(s=>s.goTo),i=p(s=>s.toggleOverview),l=p(s=>s.moveSlide),c=p(s=>s.duplicateSlide),o=p(s=>s.deleteSlide),h=p(s=>s.addSlide),x=w.useRef(null);return w.useEffect(()=>{var s;(s=x.current)==null||s.scrollIntoView({block:"nearest"})},[t]),n.jsxs("div",{className:"absolute inset-0 z-modal flex flex-col bg-ui-canvas/95 backdrop-blur-sm",role:"dialog","aria-label":"Folienübersicht",children:[n.jsxs("div",{className:"flex h-12 shrink-0 items-center gap-2 border-b border-ui bg-ui-surface px-3",children:[n.jsx("h2",{className:"text-ui-title font-semibold",children:"Übersicht"}),n.jsx("span",{className:"text-[11px] text-ui-faint",children:ae(e.slides.length,"Folie","Folien")}),n.jsxs("div",{className:"ml-auto flex items-center gap-1",children:[n.jsx(F,{icon:"plus",label:"Folie hinzufügen",onClick:()=>h(e.slides.length)}),n.jsx(F,{icon:"xmark",label:"Übersicht schließen (Esc)",onClick:()=>i(!1)})]})]}),n.jsx("div",{className:"min-h-0 flex-1 overflow-y-auto p-4",children:n.jsx("ul",{className:"grid gap-4",style:{gridTemplateColumns:`repeat(auto-fill, minmax(${Mr}px, 1fr))`},children:e.slides.map((s,r)=>n.jsxs("li",{className:"group relative",children:[n.jsxs("button",{ref:r===t?x:void 0,type:"button",onClick:()=>{a(r),i(!1)},className:H("block w-full overflow-hidden rounded-sm border bg-ui-surface text-left transition-all","duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-ui-lg",r===t?"border-ui-accent shadow-ui-md ring-2 ring-ui-accent":"border-ui"),children:[n.jsx("span",{className:"block overflow-hidden bg-ui-surface",style:{aspectRatio:`${z.width} / ${z.height}`},children:n.jsx(ze,{slide:s,deck:e,slideNumber:r+1,totalSlides:e.slides.length,className:"h-full w-full"})}),n.jsxs("span",{className:"flex items-center gap-2 border-t border-ui px-2 py-1.5",children:[n.jsx("span",{className:"tabular-nums text-[11px] font-semibold text-ui-faint",children:r+1}),n.jsx("span",{className:"truncate text-[12px] font-medium",children:he(s,r)})]})]}),n.jsxs("div",{className:"absolute right-1.5 top-1.5 flex gap-0.5 bg-ui-surface/90 p-0.5 opacity-0 shadow-ui-sm transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100",children:[n.jsx(F,{icon:"arrow-left",label:"Nach vorn schieben",disabled:r===0,onClick:()=>l(r,r-1),className:"h-6 w-6",size:13}),n.jsx(F,{icon:"arrow-right",label:"Nach hinten schieben",disabled:r===e.slides.length-1,onClick:()=>l(r,r+1),className:"h-6 w-6",size:13}),n.jsx(F,{icon:"plus",label:"Folie duplizieren",onClick:()=>c(r),className:"h-6 w-6",size:13}),n.jsx(F,{icon:"xmark",label:"Folie löschen",tone:"danger",onClick:()=>o(r),className:"h-6 w-6",size:13})]})]},s.id))})})]})}function Fr({height:e=20,className:t}){const[a,i,l,c]=_e.viewBox;return n.jsxs("svg",{height:e,width:l/c*e,viewBox:`${a} ${i} ${l} ${c}`,className:t,role:"img","aria-label":"nozilla",children:[n.jsx("path",{d:_e.letters,fill:"currentColor"}),n.jsx("path",{d:_e.period,fill:gs.palette.signal})]})}const Ae={version:"1.0.0",commit:"38a4a00",built:"2026-11-02T11:18:58+01:00"};function Cr(){const e=new Date(Ae.built);return Number.isNaN(e.getTime())?Ae.built:e.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}function Ir(){return w.useSyncExternalStore(Wt,Fn,Fn),{mode:xs(),resolved:ps()}}function kn(e="menu"){const[t,a]=w.useState(!1),i=w.useRef(null),l=w.useRef(null),c=w.useCallback(()=>a(!1),[]);return w.useEffect(()=>{if(!t)return;const o=x=>{var s;(s=i.current)!=null&&s.contains(x.target)||a(!1)},h=x=>{var s;x.key==="Escape"&&(x.stopPropagation(),a(!1),(s=l.current)==null||s.focus())};return document.addEventListener("mousedown",o),document.addEventListener("keydown",h),()=>{document.removeEventListener("mousedown",o),document.removeEventListener("keydown",h)}},[t]),{offen:t,huelle:i,knopf:l,schliessen:c,knopfProps:{ref:l,active:t,"aria-haspopup":e,"aria-expanded":t,"aria-pressed":void 0,onClick:()=>a(o=>!o)}}}const st={system:{label:"System",icon:"circle-half-stroke"},light:{label:"Hell",icon:"sun"},dark:{label:"Dunkel",icon:"moon"}};function $r(){const e=kn("dialog"),t=e.offen,{mode:a,resolved:i}=Ir(),l=p(c=>c.toggleTour);return n.jsxs("div",{className:"relative",ref:e.huelle,"data-tour":"einstellungen",children:[n.jsx(F,{icon:"gears",label:"Einstellungen",...e.knopfProps}),t?n.jsxs("div",{className:"nz-panel absolute right-0 top-9 z-popover w-64 animate-pop-in p-1 shadow-ui-lg",role:"dialog","aria-label":"Einstellungen",children:[n.jsx(se,{children:"Erscheinung"}),n.jsx("div",{className:"grid grid-cols-3 gap-1 px-2 pb-1",children:bs.map(c=>n.jsxs("button",{type:"button","aria-pressed":a===c,onClick:()=>ks(c),className:H("flex flex-col items-center gap-1 rounded-sm border px-1 py-2","text-[11px] transition-colors duration-fast ease-standard",a===c?"border-ui-accent-border bg-ui-accent-soft text-ui-ink":"border-transparent text-ui-muted hover:bg-ui-subtle"),children:[n.jsx(B,{name:st[c].icon,size:15}),st[c].label]},c))}),n.jsxs("p",{className:"px-2 pb-2 text-[11px] leading-snug text-ui-faint",children:["Gilt für die Leisten, nie für die Folie. Ein Export sieht immer gleich aus.",a==="system"?` Das System steht gerade auf ${i==="dark"?"dunkel":"hell"}.`:""]}),n.jsx("div",{className:"border-t border-ui p-1",children:n.jsxs("button",{type:"button",onClick:()=>{var c;e.schliessen(),(c=e.knopf.current)==null||c.focus(),l(!0)},className:"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-ui-body text-ui-ink hover:bg-ui-subtle",children:[n.jsx(B,{name:"signs-post",size:15}),"Geführte Tour"]})}),n.jsxs("div",{className:"border-t border-ui",children:[n.jsx(se,{children:"Stand"}),n.jsxs("dl",{className:"px-2 pb-2 text-[11px] text-ui-muted",children:[n.jsx(nn,{term:"Version",value:Ae.version}),n.jsx(nn,{term:"Commit",value:Ae.commit}),n.jsx(nn,{term:"Vom",value:Cr()})]})]})]}):null]})}function nn({term:e,value:t}){return n.jsxs("div",{className:"flex justify-between gap-2",children:[n.jsx("dt",{children:e}),n.jsx("dd",{className:"font-mono text-ui-ink",children:t})]})}function Tr(){const e=p(C=>C.deck),t=p(C=>C.fileName),a=p(C=>C.dirty),i=p(C=>C.slideIndex),l=p(C=>C.deck.slides.length),c=p(C=>C.zoom),o=p(C=>C.showGrid),h=p(C=>C.snap),x=p(C=>C.overviewOpen),s=p(C=>C.searchOpen),r=p(C=>C.pruefungOpen),m=p(ka),u=p(wa),d=p(C=>C.setZoom),g=p(C=>C.toggleGrid),b=p(C=>C.setSnap),v=p(C=>C.toggleOverview),f=p(C=>C.toggleSearch),E=p(C=>C.togglePruefung),N=p(C=>C.togglePrompt),k=p(C=>C.setMode),S=p(C=>C.undo),$=p(C=>C.redo),O=p(C=>C.addSlide),[Z,y]=w.useState(null),T=async()=>{y("Sichere");try{await xn()}finally{y(null)}};return n.jsxs("header",{className:"relative flex h-12 shrink-0 items-center gap-2 border-b border-ui bg-ui-surface px-3",children:[n.jsx(Fr,{className:"mr-1"}),n.jsxs("div",{className:"flex min-w-0 flex-col leading-tight",children:[n.jsx("span",{className:"truncate text-ui-title font-semibold",children:e.meta.title}),n.jsxs("span",{className:"truncate text-[11px] text-ui-faint",children:[t,a?" · nicht gesichert":""]})]}),n.jsx(le,{className:"mx-1"}),n.jsx(Pr,{onSave:T}),n.jsx(Ar,{busy:Z,setBusy:y}),n.jsx($r,{}),n.jsx(le,{className:"mx-1"}),n.jsxs("div",{className:"flex items-center gap-2","data-tour":"verlauf",children:[n.jsx(F,{icon:"rotate",label:"Rückgängig (⌘Z)",disabled:!m,onClick:S,className:"-scale-x-100"}),n.jsx(F,{icon:"rotate",label:"Wiederholen (⇧⌘Z)",disabled:!u,onClick:$})]}),n.jsx(le,{className:"mx-1"}),n.jsxs("div",{className:"flex items-center gap-2","data-tour":"deckwerkzeuge",children:[n.jsx(F,{icon:"plus",label:"Folie hinzufügen (N)",onClick:()=>O()}),n.jsx(F,{icon:"table",label:"Folienübersicht (⌘K)",active:x,onClick:()=>v()}),n.jsx(F,{icon:"magnifying-glass",label:"Suchen und Ersetzen (⌘F)",active:s,onClick:()=>f()}),n.jsx(F,{icon:"list-check",label:"Prüfliste",active:r,onClick:()=>E()})]}),n.jsx(V,{icon:"wand-magic-sparkles","data-tour":"prompt",onClick:()=>N(!0),children:"Prompt"}),n.jsxs("div",{className:"ml-auto flex items-center gap-2",children:[n.jsxs("span",{className:"tabular-nums text-[11px] text-ui-faint",children:[Math.min(i+1,l)," / ",l]}),n.jsx(le,{}),n.jsxs("div",{className:"flex items-center gap-2","data-tour":"ansicht",children:[n.jsx(F,{icon:"layer-group",label:"An Raster und Hilfslinien einrasten",active:h.grid||h.smart,onClick:()=>b({grid:!h.grid,smart:!h.smart})}),n.jsx(F,{icon:"table",label:"Raster zeigen (G)",active:o,onClick:g}),n.jsx(oe,{value:c==="fit"?"fit":"custom",onChange:C=>d(C==="fit"?"fit":1),options:[{value:"fit",label:"Passend"},{value:"custom",label:"100%"}]})]}),n.jsx(le,{}),n.jsx(V,{variant:"primary",icon:"play","data-tour":"vortragen",onClick:()=>k("present"),children:"Vortragen"})]}),Z?n.jsxs("span",{role:"status",className:"pointer-events-none absolute left-1/2 top-14 z-toast -translate-x-1/2 bg-ui-inverse px-3 py-1 text-[11px] text-ui-on-inverse shadow-ui-lg",children:[Z,"…"]}):null,n.jsx(Lr,{})]})}function Pr({onSave:e}){const t=p(s=>s.newDeck),a=p(s=>s.loadMarkdown),i=p(s=>s.toggleMarken),l=kn(),{offen:c,schliessen:o}=l,h=s=>()=>{o(),s()},x=s=>{ge()&&a(s.source,{fileName:s.file})};return n.jsxs("div",{className:"relative",ref:l.huelle,"data-tour":"datei",children:[n.jsx(V,{icon:"file-lines",...l.knopfProps,children:"Datei"}),c?n.jsxs("div",{className:"nz-panel absolute left-0 top-9 z-popover w-64 animate-pop-in p-1 shadow-ui-lg",role:"menu",children:[n.jsx(_,{icon:"file-lines",label:"Neues Deck",hint:"⌘⇧N — leer anfangen",onClick:h(()=>{ge()&&t()})}),n.jsx(_,{icon:"folder",label:"Markdown-Deck öffnen",hint:"⌘O",onClick:h(()=>void Qt())}),n.jsx(_,{icon:"download",label:"Markdown sichern",hint:"⌘S",onClick:h(e)}),n.jsxs("div",{className:"border-t border-ui pt-1",children:[n.jsx(se,{children:"Beispiele"}),Gt.map(s=>n.jsx(_,{icon:"book",label:s.label,onClick:h(()=>x(s))},s.file))]}),n.jsxs("div",{className:"border-t border-ui pt-1",children:[n.jsx(se,{children:"Erscheinungsbild"}),n.jsx(_,{icon:"palette",label:"Eigenes Design erstellen",hint:"Eigene Seite, eigener Tab",href:"./ci.html",onClick:o}),n.jsx(_,{icon:"upload",label:"Erscheinungsbilder…",hint:"Importieren, sichern, entfernen",onClick:h(()=>i(!0))})]})]}):null]})}function Ar({busy:e,setBusy:t}){const a=p(b=>b.deck),i=p(b=>b.slideIndex),l=p(b=>b.zeigeHinweis),c=kn(),{offen:o,schliessen:h}=c,[x,s]=w.useState("embedded"),[r,m]=w.useState("folie");re();const u=()=>{const b=x==="embedded"?"Text bleibt markierbar":"Text als Konturen";return r==="folie"?`Vektorseiten, ${b}`:`${qn[r]}, ${b}`},d=()=>ws(()=>import("./index-DGAySJjj.js"),__vite__mapDeps([0,1,2]),import.meta.url),g=async(b,v)=>{h(),l(null),t(b);try{await v()}catch(f){f instanceof DOMException&&f.name==="AbortError"||(console.error(f),l(`${b} — gescheitert. ${xe(f)}`))}finally{t(null)}};return n.jsxs("div",{className:"relative",ref:c.huelle,"data-tour":"export",children:[n.jsx(V,{icon:"share",disabled:!!e,...c.knopfProps,children:"Export"}),o?n.jsxs("div",{className:H("nz-panel absolute left-0 top-9 z-popover w-64 animate-pop-in p-1 shadow-ui-lg"),role:"menu",children:[n.jsx(_,{icon:"file-lines",label:"Markdown (Deck und Layout)",hint:".md — wieder einlesbar",onClick:()=>g("Schreibe Markdown",()=>Yt(a))}),n.jsx(_,{icon:"square",label:"SVG — diese Folie",hint:`${z.width}×${z.height}, echte Pfade`,onClick:()=>g("Zeichne SVG",async()=>(await d()).exportSvg(a,{slideIndex:i,text:x}))}),n.jsx(_,{icon:"image",label:"PNG — diese Folie",hint:`${z.width*ln}×${z.height*ln}, zum Verschicken`,onClick:()=>g("Rastere PNG",async()=>(await d()).exportPng(a,{slideIndex:i}))}),n.jsx(_,{icon:"layer-group",label:"SVG — ganzes Deck",hint:"Eine Datei, Folien untereinander",onClick:()=>g("Zeichne SVG",async()=>(await d()).exportSvg(a,{text:x}))}),n.jsx(_,{icon:"book",label:"PDF — ganzes Deck",hint:u(),onClick:()=>g("Zeichne PDF",async()=>(await d()).exportPdf(a,{text:x,seite:r}))}),n.jsx(_,{icon:"file-lines",label:"PDF — Handout mit Notizen",hint:"Hochformat, je Seite eine Folie und ihre Notizen",onClick:()=>g("Setze Handout",async()=>(await d()).exportHandoutPdf(a))}),n.jsx(_,{icon:"play",label:"PDF — diese Folie",hint:`Eine Seite · ${u()}`,onClick:()=>g("Zeichne PDF",async()=>(await d()).exportPdf(a,{slideIndex:i,text:x,seite:r}))}),n.jsx(_,{icon:"table",label:"PowerPoint (.pptx)",hint:"Bearbeitbar — auch für Google Slides",onClick:()=>g("Baue PPTX",async()=>(await d()).exportPptx(a))}),n.jsxs("div",{className:"border-t border-ui px-2 pb-1.5 pt-2",children:[n.jsx("span",{className:"nz-label",children:"Schrift in SVG und PDF"}),n.jsx(oe,{value:x,onChange:s,className:"w-full",options:va.map(b=>({value:b,label:Sa[b],title:za[b]}))}),n.jsx("p",{className:"mt-1.5 text-[11px] leading-snug text-ui-faint",children:x==="embedded"?"Die Marken-Schnitte liegen in der Datei. Text bleibt markierbar und durchsuchbar.":"Jede Glyphe wird zur Kontur — gleiches Bild auch dort, wo eingebettete Schriften ignoriert werden."})]}),n.jsxs("div",{className:"border-t border-ui px-2 pb-1.5 pt-2",children:[n.jsx("span",{className:"nz-label",children:"Seitenformat im PDF"}),n.jsx(oe,{value:r,onChange:m,className:"w-full",options:Na.map(b=>({value:b,label:qn[b],title:Ea[b]}))}),n.jsx("p",{className:"mt-1.5 text-[11px] leading-snug text-ui-faint",children:r==="folie"?`Die Seite ist die Folie — ${z.width} × ${z.height}, ohne Rand.`:"Die Folie liegt mittig auf einem echten A4-Bogen und wird dabei nicht kleiner gerechnet. Das Handout bringt seine eigene Seite mit."})]}),n.jsxs("p",{className:"border-t border-ui px-2 py-1.5 text-[11px] text-ui-faint",children:["Ein Export läuft durch dieselbe Strecke wie die Fläche — die CI von ",Rt.name," ","inbegriffen."]})]}):null]})}function _({icon:e,label:t,hint:a,onClick:i,href:l}){const c=n.jsxs(n.Fragment,{children:[n.jsx("span",{className:"mt-0.5 text-ui-faint",children:n.jsx(B,{name:e,size:15})}),n.jsxs("span",{className:"min-w-0",children:[n.jsx("span",{className:"block truncate text-ui-body font-medium",children:t}),a?n.jsx("span",{className:"block truncate text-[11px] text-ui-faint",children:a}):null]})]}),o="flex w-full items-start gap-2 px-2 py-1.5 text-left text-ui-ink transition-colors duration-fast hover:bg-ui-subtle";return l?n.jsx("a",{role:"menuitem",href:l,target:"_blank",rel:"noreferrer",onClick:i,className:o,children:c}):n.jsx("button",{type:"button",role:"menuitem",onClick:i,className:o,children:c})}function Lr(){const e=p(l=>l.hinweis),t=p(l=>l.hinweisAktion),a=p(l=>l.zeigeHinweis),i=p(l=>l.toggleMarken);return e?n.jsxs("div",{role:"alert",className:"absolute left-1/2 top-14 z-toast flex max-w-xl -translate-x-1/2 items-start gap-2 border border-ui-warn bg-ui-warn-bg px-3 py-2 text-ui-body text-ui-ink shadow-ui-lg",children:[n.jsx(B,{name:"triangle-exclamation",size:15,className:"mt-0.5 shrink-0 text-ui-warn"}),n.jsx("span",{className:"min-w-0",children:e}),t==="marken"?n.jsx(V,{className:"shrink-0",onClick:()=>{a(null),i(!0)},children:"Erscheinungsbilder…"}):null,n.jsx(F,{icon:"xmark",label:"Hinweis schließen",onClick:()=>a(null)})]}):null}function Or(){const e=p(l=>l.sicherungGescheitert),[t,a]=w.useState(!1);if(!e)return null;const i=async()=>{a(!0);try{await xn()}finally{a(!1)}};return n.jsxs("div",{role:"alert",className:"flex shrink-0 items-center gap-2 border-b border-ui-warn bg-ui-warn-bg px-3 py-2 text-ui-body text-ui-ink",children:[n.jsx(B,{name:"triangle-exclamation",size:15,className:"shrink-0 text-ui-warn"}),n.jsxs("span",{className:"min-w-0 flex-1",children:["Diese Sitzung lässt sich nicht mehr im Browser merken — meist, weil ein eingebettetes Bild zu groß ist. ",n.jsx("strong",{children:"Sichere das Deck als Datei"}),", sonst ist die Arbeit weg, sobald das Fenster zugeht."]}),n.jsx(V,{icon:"download",onClick:i,disabled:t,className:"shrink-0",children:"Sichern"})]})}const at=74;function Br(){re();const e=p(h=>h.deck),t=p(h=>h.slideIndex),a=p(h=>h.goTo),i=p(h=>h.addSlide),l=p(h=>h.moveSlide),c=w.useRef(null),o=w.useRef(null);return w.useEffect(()=>{var h;(h=c.current)==null||h.scrollIntoView({inline:"nearest",block:"nearest"})},[t]),n.jsxs("nav",{"data-tour":"filmstreifen",className:"flex h-[104px] shrink-0 items-center gap-2 border-t border-ui bg-ui-surface px-2","aria-label":"Folien",children:[n.jsx("div",{className:"flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2",children:e.slides.map((h,x)=>n.jsxs("button",{ref:x===t?c:void 0,type:"button",draggable:!0,onDragStart:()=>{o.current=x},onDragOver:s=>s.preventDefault(),onDrop:()=>{o.current!==null&&o.current!==x&&l(o.current,x),o.current=null},onClick:()=>a(x),title:`${x+1}. ${he(h,x)}`,"aria-label":`Folie ${x+1}: ${he(h,x)}`,"aria-current":x===t,className:H("group relative shrink-0 overflow-hidden rounded-sm border bg-ui-surface transition-all","duration-fast ease-standard hover:-translate-y-px hover:shadow-ui-md",x===t?"border-ui-accent shadow-ui-sm ring-1 ring-ui-accent":"border-ui"),style:{width:at*z.width/z.height,height:at},children:[n.jsx(ze,{slide:h,deck:e,slideNumber:x+1,totalSlides:e.slides.length,className:"pointer-events-none h-full w-full"}),n.jsx("span",{className:H("absolute left-1 top-1 rounded-xs px-1 text-[10px] font-bold tabular-nums",x===t?"bg-ui-accent text-ui-on-accent":"bg-ui-surface/85 text-ui-muted"),children:x+1})]},h.id))}),n.jsx(F,{icon:"plus",label:"Folie danach einfügen",onClick:()=>i()})]})}const rt={left:{offen:"chevron-left",zu:"chevron-right"},right:{offen:"chevron-right",zu:"chevron-left"},bottom:{offen:"chevron-down",zu:"chevron-up"}},Rr={left:"left-0 top-1/2 h-10 w-4 -translate-y-1/2 rounded-r-sm border-y border-r",right:"right-0 top-1/2 h-10 w-4 -translate-y-1/2 rounded-l-sm border-y border-l",bottom:"bottom-0 left-1/2 h-4 w-10 -translate-x-1/2 rounded-t-sm border-x border-t"};function tn({panel:e,side:t,name:a,shortcut:i}){const l=p(h=>h.panels[e]),c=p(h=>h.togglePanel),o=`${a} ${l?"einklappen":"ausklappen"} (${i})`;return n.jsx("button",{type:"button",title:o,"aria-label":o,"aria-expanded":l,"data-panel-handle":e,onClick:()=>c(e),className:H("absolute z-chrome flex items-center justify-center border-ui bg-ui-surface","text-ui-faint transition-colors duration-fast ease-standard","hover:bg-ui-sunken hover:text-ui-ink",Rr[t]),children:n.jsx(B,{name:l?rt[t].offen:rt[t].zu,size:12})})}const ti=[{ziel:null,titel:"Willkommen",text:"Hier entstehen Folien, die sich wie ein Whiteboard benehmen: den Text schreibst du in Markdown, alles andere legst du frei auf die Fläche. Herauskommen kann dabei nur Material, das der CI entspricht. Mit → und ← blätterst du durch die Tour, Esc beendet sie."},{ziel:"datei",titel:"Datei",text:"Ein neues Deck anfangen, eine Markdown-Datei öffnen (⌘O) oder sichern (⌘S), dazu zwei Beispiel-Decks. Darunter legst du im CI-Generator ein eigenes Erscheinungsbild an oder importierst eines. Was offen ist, sichert sich zusätzlich im Browser von selbst."},{ziel:"export",titel:"Export",text:"SVG und PNG einer Folie, das ganze Deck als PDF, ein Handout mit Notizen und PowerPoint. Jede Ausgabe läuft durch dieselbe Zeichenstrecke wie die Fläche — was du hier siehst, steht auch in der Datei."},{ziel:"einstellungen",titel:"Einstellungen",text:"Die Leisten hell, dunkel oder wie das System — das gilt nur für das Werkzeug und nie für die Folie. Hier startest du auch diese Tour wieder."},{ziel:"verlauf",titel:"Rückgängig und Wiederholen",text:"⌘Z nimmt zurück, ⇧⌘Z stellt wieder her. Ein getipptes Wort ist dabei ein Schritt und nicht jeder Buchstabe einzeln."},{ziel:"deckwerkzeuge",titel:"Folien, Übersicht, Suche, Prüfliste",text:"Eine Folie anlegen (N), alle Folien auf einen Blick (⌘K) und im ganzen Deck suchen und ersetzen (⌘F). Die Prüfliste sammelt jede Warnung des Decks auf einer Liste: übervolle Kästen, unsichtbare Flächen, fehlende Bilder."},{ziel:"prompt",titel:"Prompt",text:"Ein Deck von einem Sprachmodell schreiben lassen: den Auftrag ausfüllen, den Prompt kopieren, die Antwort unten wieder einfügen — und das Deck ist offen. Der Prompt kennt genau das Dateiformat, das dieses Werkzeug liest."},{ziel:"ansicht",titel:"Ansicht",text:"Einrasten an Raster und Hilfslinien, das Raster zeigen (G) und die Zoomstufe: passend ins Fenster oder in voller Größe. Nichts davon landet in der Datei."},{ziel:"bibliothek",leiste:"library",titel:"Bausteine und Zeichen",text:"Überschriften, Karten, Diagramme, Tabellen, Formen und Verbinder — und im zweiten Reiter die Zeichen des Erscheinungsbilds. Ein Klick setzt den Baustein auf die Folie. Der Ton darüber färbt alles, was eine eigene Fläche hat. ⌘1 klappt die Leiste zu und wieder auf."},{ziel:"flaeche",titel:"Die Folie",text:"Genau das, was ein Export zeigt. Elemente anklicken und ziehen, an den Griffen Größe und Drehung ändern; die Pfeiltasten schieben, ⌫ löscht. Ein Bild oder eine .md-Datei kannst du einfach ins Fenster ziehen."},{ziel:"filmstreifen",leiste:"rail",titel:"Filmstreifen",text:"Alle Folien der Reihe nach. Ein Klick springt hin, Ziehen ordnet um, das Plus fügt eine Folie danach ein. ⌘2 klappt den Streifen zu."},{ziel:"inspektor",leiste:"inspector",titel:"Inspektor",text:"Drei Reiter. Folie: Layout, Untergrund, Übergang, der Fließtext als Markdown und die Notizen für den Vortrag. Element: alles am ausgewählten Element — der Reiter folgt der Auswahl. Deck: Titel, Fußzeile, Erscheinungsbild und Folienformat. ⌘3 klappt ihn zu."},{ziel:"vortragen",titel:"Vortragen",text:"Zeigt das Deck im ganzen Fenster. Weiter mit → oder der Leertaste, N blendet die Notizen ein, F schaltet auf Vollbild, Esc führt zurück. Die Referentenansicht öffnet ein zweites Fenster mit Notizen und der nächsten Folie."},{ziel:null,titel:"Das war die Tour",text:'Die wichtigsten Tasten stehen als Tabelle auf der letzten Folie des Beispiels „nozilla-Design" (Datei → Beispiele). Die Tour findest du jederzeit wieder unter dem Zahnrad.'}];function Hr(){const e=p(o=>o.toggleTour),t=p(o=>o.panels),a=p(o=>o.togglePanel),i=w.useCallback(()=>e(!1),[e]),l=w.useCallback(()=>Zt(),[]),c=w.useCallback(o=>{o.leiste&&!t[o.leiste]&&a(o.leiste,!0)},[t,a]);return n.jsx(vs,{schritte:ti,beenden:i,merken:l,vorbereiten:c,anlass:t})}function Wr(){const e=p(a=>a.tourOpen),t=p(a=>a.toggleTour);return n.jsx(ys,{anzahl:ti.length,gesehen:()=>js(),merken:()=>Zt(),starten:()=>t(!0),verborgen:e,wiederfinden:"Später findest du sie unter dem Zahnrad."})}const Zr="nz-vortrag";function ii(){return typeof BroadcastChannel>"u"?null:new BroadcastChannel(Zr)}function lt(e){return Number.isFinite(e)?e:Number.MAX_SAFE_INTEGER}const si="referent";function Gr(e){return new URLSearchParams(e).get(si)==="1"}function Kr(){const e=w.useRef(null),t=w.useRef(null),[a,i]=w.useState(!1),l=p(s=>s.slideIndex),c=p(s=>s.revealStep),o=p(s=>s.deck.slides.length),h=p(s=>s.deck);w.useEffect(()=>{const s=ii();if(e.current=s,!s)return;const r=()=>{const u=p.getState();return{slideIndex:u.slideIndex,revealStep:lt(u.revealStep),totalSlides:u.deck.slides.length}},m=()=>{s.postMessage({art:"deck",markdown:je(p.getState().deck)}),s.postMessage({art:"stand",stand:r()})};return s.onmessage=u=>{const d=p.getState();u.data.art==="hallo"?(m(),i(!0)):u.data.art==="tschuess"?i(!1):u.data.art==="weiter"?d.advance():u.data.art==="zurueck"&&d.retreat()},m(),()=>{s.postMessage({art:"ende"}),s.onmessage=null,s.close()}},[]),w.useEffect(()=>{var s;(s=e.current)==null||s.postMessage({art:"stand",stand:{slideIndex:l,revealStep:lt(c),totalSlides:o}})},[l,c,o]),w.useEffect(()=>{var s;(s=e.current)==null||s.postMessage({art:"deck",markdown:je(h)})},[h]);const x=w.useCallback(()=>{if(t.current&&!t.current.closed){t.current.focus();return}const s=`${window.location.pathname}?${si}=1`;t.current=window.open(s,"nz-referent","width=1100,height=760"),i(!!t.current)},[]);return{offen:a,oeffnen:x}}function Vr(){var k;re();const e=p(S=>S.deck),t=p(de),a=p(S=>S.slideIndex),i=p(S=>S.revealStep),l=p(S=>S.notesOpen),c=p(S=>S.advance),o=p(S=>S.retreat),h=p(S=>S.setMode),x=p(S=>S.toggleNotes),[s,r]=Xt(),m=Kr(),[u,d]=w.useState(!0),g=u?"pointer-events-auto":"pointer-events-none",b=w.useRef(void 0),v=w.useCallback(()=>{d(!0),window.clearTimeout(b.current),b.current=window.setTimeout(()=>d(!1),2200)},[]);w.useEffect(()=>(v(),()=>window.clearTimeout(b.current)),[v]);const f=r.width>0&&r.height>0?Math.min(r.width/z.width,r.height/z.height):0;if(!t)return null;const E=sn(t),N=`nz-transition-${t.meta.transition}`;return n.jsxs("div",{ref:s,className:"relative flex h-full w-full items-center justify-center overflow-hidden bg-ui-inverse",onPointerMove:v,onClick:S=>{S.target.closest("button, [data-vortrag-beiwerk]")||c()},children:[n.jsx("div",{className:H("nz-stage nz-stage--present overflow-hidden",N),style:{width:z.width*f,height:z.height*f,animationDuration:`${hn.duration.slide}ms`},children:n.jsx(ze,{slide:t,deck:e,slideNumber:a+1,totalSlides:e.slides.length,revealStep:i,animateReveals:!0,className:"h-full w-full"})},`${t.id}-${a}`),n.jsxs("div",{className:H("pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4","transition-opacity duration-base ease-standard",u?"opacity-100":"opacity-0"),children:[n.jsxs("div",{"data-vortrag-beiwerk":!0,className:H("flex items-center gap-1 rounded-md bg-ui-surface/95 px-2 py-1 shadow-ui-xl",g),children:[n.jsx(F,{icon:"arrow-left",label:"Zurück",onClick:o}),n.jsxs("span",{className:"min-w-16 text-center tabular-nums text-[12px] text-ui-muted",children:[a+1," / ",e.slides.length,E>0?` · ${Math.min(i,E)}/${E}`:""]}),n.jsx(F,{icon:"arrow-right",label:"Weiter",onClick:c})]}),n.jsxs("div",{"data-vortrag-beiwerk":!0,className:H("flex items-center gap-1 rounded-md bg-ui-surface/95 px-2 py-1 shadow-ui-xl",g),children:[n.jsx(F,{icon:"list-check",label:"Notizen für den Vortrag (N)",active:l,onClick:()=>x()}),n.jsx(F,{icon:"table",label:"Übersicht (⌘K)",onClick:()=>p.getState().toggleOverview(!0)}),n.jsx(F,{icon:"chalkboard",label:"Referentenansicht öffnen",active:m.offen,onClick:m.oeffnen}),n.jsx(F,{icon:"xmark",label:"Präsentation verlassen (Esc)",onClick:()=>h("edit")})]})]}),l?n.jsxs("aside",{"data-vortrag-beiwerk":!0,className:"pointer-events-auto absolute right-4 top-4 w-80 rounded-lg bg-ui-surface p-3 shadow-ui-xl",children:[n.jsxs("h3",{className:"mb-1 text-ui-label font-bold uppercase tracking-wide text-ui-faint",children:["Notizen · ",he(t,a)]}),n.jsx("p",{className:"whitespace-pre-wrap text-ui-body text-ui-muted",children:((k=t.meta.notes)==null?void 0:k.trim())||"Für diese Folie ist nichts notiert."})]}):null,n.jsx("div",{className:H("pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3","transition-opacity duration-base ease-standard",u?"opacity-70":"opacity-0"),children:n.jsx("p",{className:"rounded-pill bg-ui-surface/90 px-3 py-1 text-[11px] text-ui-muted",children:"→ / Leertaste weiter · ← zurück · F Vollbild · Esc verlassen"})})]})}function _r(e){const t=e.slice(0,3).join(", "),a=e.length-3,i=a>0?`${t} und ${a} weitere`:t;return e.length===1?`Ein Bild ließ sich nicht laden und fehlt in der Ausgabe: ${i}`:`${e.length} Bilder ließen sich nicht laden und fehlen in der Ausgabe: ${i}`}function Ur(e){const t=[];if(e.zeichen.length>0){const a=e.zeichen.slice(0,3).join(" "),i=e.zeichen.length-3;t.push(e.zeichen.length===1?`Ein Zeichen führt keine der Schriften und fehlt in der Ausgabe: ${a}`:`${e.zeichen.length} Zeichen führt keine der Schriften und fehlen in der Ausgabe: ${a}${i>0?` und ${i} weitere`:""}`)}if(e.schnitte.length>0){const a=e.schnitte.slice(0,3).join(", "),i=e.schnitte.length-3,l=e.schnitte.length===1?"Ein Schnitt ließ sich nicht laden; sein Text steht in der Ersatzschrift":`${e.schnitte.length} Schnitte ließen sich nicht laden; ihr Text steht in der Ersatzschrift`;t.push(`${l}: ${a}${i>0?` und ${i} weitere`:""}`)}return t.join(" · ")}function qr(){ya(),ja();const e=p(f=>f.mode),t=p(f=>f.overviewOpen),a=p(f=>f.promptOpen),i=p(f=>f.searchOpen),l=p(f=>f.pruefungOpen),c=p(f=>f.markenOpen),o=p(f=>f.tourOpen),h=p(f=>f.panels),x=p(f=>f.deck),s=p(de),r=p(f=>f.slideIndex),m=p(f=>f.loadMarkdown),u=p(f=>f.loadDeck),d=p(f=>f.addElement),[g,b]=w.useState(!1);Ta(),Oa(),w.useEffect(()=>{const f=Fa();f?(u(f.deck,{fileName:f.fileName}),f.slideIndex&&p.getState().goTo(f.slideIndex),p.setState({dirty:!0})):m(In.source,{fileName:In.file});const E=Ss(Ht());E&&p.getState().zeigeHinweis(E,"marken");const N=Ca(),k=Ia();return Cn(S=>{p.getState().zeigeHinweis(_r(S))}),$n(S=>{p.getState().zeigeHinweis(Ur(S))}),()=>{N(),k(),Cn(null),$n(null)}},[]);const v=w.useCallback(async f=>{var N;f.preventDefault(),b(!1);const E=(N=f.dataTransfer.files)==null?void 0:N[0];if(E){if(/\.(md|markdown|txt)$/i.test(E.name)||E.type.startsWith("text/")){if(!ge())return;const k=await zs(E);m(k.text,{fileName:k.name});return}if(E.type.startsWith("image/")){const k=await Vt(E),S=p.getState().deck.slides[p.getState().slideIndex],$=dn((S==null?void 0:S.elements)??[],k);d({...k,x:$.x,y:$.y})}}},[d,m]);return e==="present"?n.jsxs("div",{className:"h-full w-full",children:[n.jsx(Vr,{}),t?n.jsx(it,{}):null]}):n.jsxs("div",{className:"relative flex h-full w-full flex-col overflow-hidden",onDragOver:f=>{f.preventDefault(),b(!0)},onDragLeave:f=>{f.currentTarget===f.target&&b(!1)},onDrop:v,children:[n.jsx(Tr,{}),n.jsx(Or,{}),n.jsxs("div",{className:"flex min-h-0 flex-1",children:[h.library?n.jsx(er,{}):null,n.jsxs("main",{className:"flex min-w-0 flex-1 flex-col",children:[n.jsxs("div",{className:"relative flex min-h-0 flex-1 flex-col",children:[s?n.jsx(Ga,{slide:s,deck:x,slideNumber:r+1,totalSlides:x.slides.length}):null,n.jsx(tn,{panel:"library",side:"left",name:"Bausteine",shortcut:"⌘1"}),n.jsx(tn,{panel:"rail",side:"bottom",name:"Filmstreifen",shortcut:"⌘2"}),n.jsx(tn,{panel:"inspector",side:"right",name:"Inspektor",shortcut:"⌘3"})]}),h.rail?n.jsx(Br,{}):null]}),h.inspector?n.jsx(ir,{}):null]}),t?n.jsx(it,{}):null,a?n.jsx(yr,{}):null,i?n.jsx(zr,{}):null,l?n.jsx(Dr,{}):null,c?n.jsx(jr,{}):null,n.jsx(Wr,{}),o?n.jsx(Hr,{}):null,n.jsx("div",{className:H("pointer-events-none absolute inset-0 z-modal flex items-center justify-center","border-2 border-dashed border-ui-accent bg-ui-select-wash transition-opacity duration-fast",g?"opacity-100":"opacity-0"),"aria-hidden":!g,children:n.jsxs("p",{className:"rounded-md bg-ui-surface px-4 py-3 text-ui-title font-semibold shadow-ui-xl",children:["Ein ",n.jsx("code",{className:"font-mono",children:".md"}),"-Deck hierher ziehen zum Öffnen, ein Bild zum Platzieren"]})})]})}function Yr(){var m;const[e,t]=w.useState(null),[a,i]=w.useState(null),[l,c]=w.useState(!1),o=w.useRef(null);w.useEffect(()=>{const u=ii();if(o.current=u,!u)return;u.onmessage=g=>{const b=g.data;b.art==="deck"?(c(!1),t(Le(b.markdown))):b.art==="stand"?(c(!1),i(b.stand)):b.art==="ende"&&c(!0)},u.postMessage({art:"hallo"});const d=()=>u.postMessage({art:"tschuess"});return window.addEventListener("pagehide",d),()=>{window.removeEventListener("pagehide",d),d(),u.onmessage=null,u.close()}},[]);const h=q();w.useEffect(()=>{const u=e==null?void 0:e.meta.theme,d=u&&un(u)?u:"nozilla";d!==Be().id&&ft(d),gt(Te(e==null?void 0:e.meta.format)?e.meta.format:"16-9")},[e,h]);const x=u=>{var d;return(d=o.current)==null?void 0:d.postMessage(u)};w.useEffect(()=>{const u=d=>{d.key==="ArrowRight"||d.key===" "||d.key==="PageDown"?(d.preventDefault(),x({art:"weiter"})):(d.key==="ArrowLeft"||d.key==="PageUp")&&(d.preventDefault(),x({art:"zurueck"}))};return window.addEventListener("keydown",u),()=>window.removeEventListener("keydown",u)},[]);const s=e&&a?e.slides[a.slideIndex]:void 0,r=e&&a?e.slides[a.slideIndex+1]:void 0;return l?n.jsxs(ot,{children:[n.jsx("p",{className:"text-ui-title",children:"Der Vortrag ist beendet."}),n.jsx(V,{onClick:()=>window.close(),children:"Fenster schließen"})]}):!e||!a||!s?n.jsxs(ot,{children:[n.jsx("p",{className:"text-ui-title",children:"Warte auf den Vortrag …"}),n.jsx("p",{className:"max-w-prose text-ui-body text-ui-muted",children:"Dieses Fenster folgt dem Vortrag im anderen. Läuft dort keiner, bleibt es leer."})]}):n.jsxs("div",{className:"flex h-full w-full flex-col gap-3 bg-ui-canvas p-4",children:[n.jsxs("div",{className:"grid min-h-0 flex-1 grid-rows-[3fr_2fr] gap-3",children:[n.jsxs("div",{className:"grid min-h-0 grid-cols-[3fr_2fr] gap-4",children:[n.jsx(ct,{slide:s,deck:e,titel:"Jetzt",step:a.revealStep,nummer:a.slideIndex+1,gesamt:a.totalSlides}),r?n.jsx(ct,{slide:r,deck:e,titel:"Als Nächstes",nummer:a.slideIndex+2,gesamt:a.totalSlides}):n.jsxs("div",{className:"flex flex-col gap-1",children:[n.jsx("h2",{className:"text-ui-label uppercase tracking-wide text-ui-faint",children:"Als Nächstes"}),n.jsx("div",{className:"flex flex-1 items-center justify-center border border-dashed border-ui text-ui-body text-ui-faint",children:"Letzte Folie"})]})]}),n.jsxs("div",{className:"min-h-0 overflow-y-auto border-t border-ui pt-3",children:[n.jsxs("h2",{className:"mb-1 text-ui-label uppercase tracking-wide text-ui-faint",children:["Notizen · ",he(s,a.slideIndex)]}),n.jsx("p",{className:"whitespace-pre-wrap text-ui-read text-ui-ink",children:((m=s.meta.notes)==null?void 0:m.trim())||"Für diese Folie ist nichts notiert."})]})]}),n.jsxs("div",{className:"flex shrink-0 items-center gap-3",children:[n.jsx(F,{icon:"arrow-left",label:"Zurück",onClick:()=>x({art:"zurueck"})}),n.jsxs("span",{className:"tabular-nums text-ui-title font-semibold",children:[a.slideIndex+1," / ",a.totalSlides]}),n.jsx(F,{icon:"arrow-right",label:"Weiter",onClick:()=>x({art:"weiter"})}),n.jsx(Jr,{})]})]})}function ot({children:e}){return n.jsx("div",{className:"flex h-full w-full flex-col items-center justify-center gap-3 bg-ui-canvas p-8 text-center",children:e})}function ct({slide:e,deck:t,titel:a,step:i,nummer:l,gesamt:c}){return n.jsxs("div",{className:"flex min-h-0 flex-col gap-1",children:[n.jsx("h2",{className:"text-ui-label uppercase tracking-wide text-ui-faint",children:a}),n.jsx(ze,{slide:e,deck:t,slideNumber:l,totalSlides:c,revealStep:i,className:"min-h-0 flex-1"})]})}function Jr(){const[e,t]=w.useState(()=>Date.now()),[a,i]=w.useState(()=>Date.now());w.useEffect(()=>{const o=window.setInterval(()=>i(Date.now()),1e3);return()=>window.clearInterval(o)},[]);const l=Math.max(0,Math.floor((a-e)/1e3)),c=w.useMemo(()=>{const o=Math.floor(l/60),h=l%60;return`${String(o).padStart(2,"0")}:${String(h).padStart(2,"0")}`},[l]);return n.jsxs("div",{className:"ml-auto flex items-center gap-2",children:[n.jsx("span",{className:"tabular-nums text-ui-title font-semibold","aria-label":"Verstrichene Zeit",children:c}),n.jsx(F,{icon:"rotate",label:"Uhr zurückstellen",onClick:()=>{t(Date.now()),i(Date.now())}})]})}Ns();We();gn();Es(()=>{We(),gn()});Wt(()=>We());Ds();mt(()=>We());window.addEventListener("storage",e=>{(e.key===Ms||e.key===null)&&Fs()});const ai=document.getElementById("root");if(!ai)throw new Error("Root container #root is missing from index.html");const Qr=Gr(window.location.search)?n.jsx(Yr,{}):n.jsx(qr,{});Cs(()=>gn());const Xr=Promise.race([Is(),new Promise(e=>window.setTimeout(e,1500))]);Xr.then(()=>{$s.createRoot(ai).render(n.jsx(w.StrictMode,{children:Qr}))});export{Da as M,ll as P,ln as S,rl as a,al as b,Ea as c,ol as d,Yt as e,qn as f,tl as g,Na as h,Sa as i,va as j,il as l,nl as m,sl as s,za as t};
//# sourceMappingURL=index-Blf5CYFw.js.map
