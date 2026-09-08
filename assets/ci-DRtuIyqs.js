var kn=Object.defineProperty;var wn=(e,t,n)=>t in e?kn(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var de=(e,t,n)=>wn(e,typeof t!="symbol"?t+"":t,n);import{n as x,t as Sn,c as Fn,w as zn,a as he,b as jn,r as Le,d as yn,u as $n,z as De,p as vn,j as s,e as p,f as J,o as Nn,B as j,I as pe,g as Ke,h as En,s as Dn,l as An,i as Tn,k as Y,m as Pn,q as Mn,v as On,x as Wn,y as Rn,A as Cn,C as Gn,D as xe,E as He,F as Zn,G as Bn,H as In,J as Ln}from"./index-BPOGGHB4.js";function U(e){if(!/^#[0-9a-f]{6}$/i.test(e.trim()))return null;const t=Number.parseInt(e.trim().slice(1),16);return[t>>16&255,t>>8&255,t&255]}function Ae(e){const t=U(e);if(!t)return 0;const n=t.map(i=>{const a=i/255;return a<=.03928?a/12.92:((a+.055)/1.055)**2.4});return .2126*n[0]+.7152*n[1]+.0722*n[2]}function Kn(e,t){const[n,i]=[Ae(e),Ae(t)].sort((a,r)=>r-a);return(n+.05)/(i+.05)}const H=4.5,Hn=3;function Vn(e,t){const n=U(e),i=U(t);return!n||!i?0:Math.max(Math.abs(n[0]-i[0]),Math.abs(n[1]-i[1]),Math.abs(n[2]-i[2]))}const Un=8;function Jn(e,t){return Vn(e,t)>=Un}const P=Object.keys(x.palette),N=Object.keys(x.textScale),X=Object.keys(x.stroke),_=Object.keys(x.shadowOffset),v=Object.keys(x.fontFamily),q=["headline","labelSmall","codeInline"],Z=["helvetica","times","courier"],Xn=["nozilla","ohne-signatur"];let Te=0;function ae(){return Te+=1,`s${Te}`}function _n(){return x.webfont.faces.map(e=>({...e,kennung:ae()}))}function qn(){return{family:"",weight:400,style:"normal",file:"",kennung:ae()}}const Ve=["normal","italic"];function le(){return{id:"",label:"",markenname:"",produkt:"",palette:{...x.palette},textScale:{...x.textScale},sonderstufen:{headline:x.typeScale.headline.size,labelSmall:x.typeScale.labelSmall.size,codeInline:x.typeScale.codeInline.size},auszeichnungEnger:0,stroke:{...x.stroke},shadowOffset:{...x.shadowOffset},fontFamily:{...x.fontFamily},pdfFontFamily:{...x.pdfFontFamily},webfontFaces:_n(),wortmarke:null,zeichen:"nozilla"}}function Pe(e,t){const n=U(e)??[0,0,0],i=a=>`rgba(${n[0]}, ${n[1]}, ${n[2]}, ${a.toFixed(2)})`;return{70:i(t[0]),50:i(t[1]),20:i(t[2])}}const Ue=[.72,.5,.18],Je=[.64,.4,.18];function Xe(e){const t=new Map;for(const i of N)t.set(x.textScale[i],i);const n=Object.entries(x.typeScale).map(([i,a])=>{const r=t.get(a.size),l=e.sonderstufen[i],c=r?e.textScale[r]:l??a.size;return[i,{...a,size:c,tracking:a.family==="display"?a.tracking-e.auszeichnungEnger:a.tracking}]});return Object.fromEntries(n)}function Me(e){if(!e.wortmarke)throw new Error("Ohne Wortmarke gibt es kein Erscheinungsbild.");const t={...e.palette},n=Pe(t.ink,Ue),i=Pe(t.paper,Je);return{id:e.id,label:e.label,brand:{...x.brand,name:e.markenname,product:e.produkt},wordmark:zn(e.wortmarke.svg,{letters:e.wortmarke.letters,accent:e.wortmarke.accent||void 0}),icons:tt(e.zeichen),palette:t,inkAlpha:n,paperAlpha:i,color:Fn(t,n),elementTones:Sn(t,n,i),textScale:{...e.textScale},typeScale:Xe(e),fontFamily:{...e.fontFamily},webfont:{...x.webfont,faces:e.webfontFaces.map(({family:a,weight:r,style:l,file:c})=>({family:a,weight:r,style:l,file:c}))},pdfFontFamily:{...e.pdfFontFamily},stroke:{...e.stroke},shadowOffset:{...e.shadowOffset}}}const _e=["id","label","markenname","produkt","palette","fontFamily","pdfFontFamily","webfontFaces","textScale","sonderstufen","auszeichnungEnger","stroke","shadowOffset"];function Qn(e,t){const n=[...new Set(Le(e).map(i=>i.fill).filter(i=>i&&i.toLowerCase()!=="none"))];return{svg:e,dateiname:t,letters:n[0]??"",accent:n[1]??""}}function Yn(e,t){return e!==null?{stand:e,veraltet:!1}:{stand:t,veraltet:t!==null}}function et(e){return e.wortmarke?Me(e):Me({...e,wortmarke:nt})}const nt={svg:['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48">','<path fill="#111111" d="M0 14 H24 V34 H0 Z M32 14 H56 V34 H32 Z M64 14 H88 V34 H64 Z',' M96 14 H120 V34 H96 Z M128 14 H152 V34 H128 Z"/>','<path fill="#E4003A" d="M164 26 H176 V38 H164 Z"/>',"</svg>"].join(""),dateiname:"(Platzhalter)",letters:"#111111",accent:"#E4003A"};function tt(e){return e==="nozilla"?he:{categories:[...he.categories],icons:Object.fromEntries(Object.entries(he.icons).map(([t,n])=>[t,{...n,prims:jn(n.prims)}]))}}const ke="nz-ci:entwurf:v1";function we(){try{return typeof sessionStorage>"u"?null:sessionStorage}catch{return null}}function it(e){const t=we();if(!t)return"Der Entwurf lässt sich nicht für ein Neuladen merken: dieser Browser gibt keine Sitzungsablage her (ein privates Fenster tut das oft nicht). Ein ⌘R verliert ihn.";try{return t.setItem(ke,JSON.stringify(e)),null}catch(n){return`Der Entwurf ließ sich nicht für ein Neuladen merken: ${String(n)}. Ein ⌘R verliert ihn ab jetzt.`}}function qe(){var e;try{(e=we())==null||e.removeItem(ke)}catch{}}function rt(){const e=we();if(!e)return null;let t=null;try{t=e.getItem(ke)}catch{return null}if(!t)return null;try{const n=JSON.parse(t);return!n||typeof n!="object"||Array.isArray(n)?null:Qe(n)}catch{return null}}function Qe(e){const t=le(),n=e??{},i=[],a=[],r=(g,b)=>{g in n&&(b?i:a).push(g)},l=(g,b)=>typeof g=="string"?g:b,c=(g,b)=>typeof g=="number"&&Number.isFinite(g)?g:b,o=(g,b)=>{const S=l(n[g],b);return r(g,typeof n[g]=="string"),S},u=(g,b,S,A)=>{const W=S&&typeof S=="object"?S:{},oe=F=>A(W[F],b[F])===W[F],ce=Object.fromEntries(Object.entries(b).map(([F,K])=>[F,A(W[F],K)]));let y=!1,M=!1;for(const F of Object.keys(b))F in W&&(oe(F)?y=!0:(a.push(`${g}.${F}`),M=!0));return(y||!M)&&r(g,y),ce},h=n.wortmarke,d=h&&typeof h=="object"&&typeof h.svg=="string"?{svg:h.svg,dateiname:l(h.dateiname,""),letters:l(h.letters,""),accent:l(h.accent,"")}:null,m=Array.isArray(n.webfontFaces)?n.webfontFaces:t.webfontFaces;return n.wortmarke!==null&&r("wortmarke",d!==null),r("webfontFaces",Array.isArray(n.webfontFaces)),r("auszeichnungEnger",typeof n.auszeichnungEnger=="number"),r("zeichen",n.zeichen==="ohne-signatur"||n.zeichen==="nozilla"),{entwurf:{id:o("id",t.id),label:o("label",t.label),markenname:o("markenname",t.markenname),produkt:o("produkt",t.produkt),palette:u("palette",t.palette,n.palette,l),textScale:u("textScale",t.textScale,n.textScale,c),sonderstufen:u("sonderstufen",t.sonderstufen,n.sonderstufen,c),auszeichnungEnger:c(n.auszeichnungEnger,t.auszeichnungEnger),stroke:u("stroke",t.stroke,n.stroke,c),shadowOffset:u("shadowOffset",t.shadowOffset,n.shadowOffset,c),fontFamily:u("fontFamily",t.fontFamily,n.fontFamily,l),pdfFontFamily:u("pdfFontFamily",t.pdfFontFamily,n.pdfFontFamily,(g,b)=>Z.includes(g)?g:b),webfontFaces:m.map(g=>{const b=g??{};return{family:l(b.family,""),weight:c(b.weight,Number.NaN),style:b.style==="italic"?"italic":"normal",file:l(b.file,""),kennung:ae()}}),wortmarke:d,zeichen:n.zeichen==="ohne-signatur"?"ohne-signatur":"nozilla"},genommen:i,verworfen:a}}function be(e){return Oe(e)!==Oe(le())}function Oe(e){return JSON.stringify({...e,webfontFaces:e.webfontFaces.map(({family:t,weight:n,style:i,file:a})=>({family:t,weight:n,style:i,file:a}))})}function $(e){const t=(e.match(/'/g)??[]).length,n=(e.match(/"/g)??[]).length,i=JSON.stringify(e);return t>n?i:`'${i.slice(1,-1).replace(/\\"/g,'"').replace(/'/g,"\\'")}'`}function st(e){return[...e].map(n=>n<" "?" ":n).join("").replace(/[\u0085\u180E\u200B]/g," ").replace(/\s+/g," ").replace(/\*\//g,"* /").trim()}function Ye(e){return/^[A-Za-z_$][\w$]*$/.test(e)?e:$(e)}const en="Kleinschrift, Ziffern und Bindestriche, beginnend mit einem Buchstaben — ein Bindestrich aber nur vor einem Buchstaben (probe-haus ja, probe-2024 nein)";function Se(e){return e.replace(/-([a-z])/g,(t,n)=>n.toUpperCase())}const at=new Set(["break","case","catch","class","const","continue","debugger","default","delete","do","else","enum","export","extends","false","finally","for","function","if","import","in","instanceof","new","null","return","super","switch","this","throw","true","try","typeof","var","void","while","with","implements","interface","let","package","private","protected","public","static","yield","await","arguments","eval","undefined","NaN","Infinity","palette","inkAlpha","paperAlpha","textScale","sonderstufen","stufeMitWert","typeScale","faces","wortmarke","colorsFromPalette","nozillaIcons","nozillaTheme","tonesFromPalette","wordmarkFromSvg","withoutSignature","BrandTheme","TypeScale","TypeStyle"]);function nn(e){const t=Se(e);return/^[A-Za-z_$][\w$]*$/.test(t)?at.has(t)?`Aus „${e}" wird der Exportname „${t}", und der ist vergeben — entweder von JavaScript selbst oder von einem Namen, den die erzeugte Datei daneben schon benutzt.`:null:`Aus „${e}" wird der Exportname „${t}", und das ist kein gültiger Bezeichner. Der Schlüssel darf Bindestriche tragen — aber nur vor einem Buchstaben, denn nur die zieht der Emitter zusammen.`}function lt(e){const t=[P.filter(i=>i.startsWith("signal")),P.filter(i=>i.startsWith("paper")||i==="white"),P.filter(i=>i.startsWith("ink"))],n=new Set(t.flat());return t.push(P.filter(i=>!n.has(i))),t.filter(i=>i.length>0).map(i=>i.map(a=>`  ${Ye(a)}: ${$(e.palette[a])},`).join(`
`)).join(`

`)}function We(e,t,n){const i=n.replace("#",""),a=[0,2,4].map(l=>Number.parseInt(i.slice(l,l+2),16)),r=[70,50,20].map((l,c)=>`  ${l}: 'rgba(${a[0]}, ${a[1]}, ${a[2]}, ${t[c].toFixed(2)})',`).join(`
`);return`const ${e} = {
${r}
};`}function ot(e){return e.webfontFaces.map(t=>["  {",`    family: ${$(t.family)},`,`    weight: ${Fe(t.weight,`Gewicht von ${t.family}`)},`,`    style: ${$(t.style)},`,`    file: ${$(t.file)},`,"  },"].join(`
`)).join(`
`)}function ee(e,t,n="  "){return t.map(i=>`${n}${Ye(i)}: ${Fe(e[i],i)},`).join(`
`)}function Fe(e,t){if(!Number.isFinite(e))throw new Error(`„${t}" trägt keine Zahl (${e}) — daraus wird keine Designdatei.`);return e}function ct(e){const t=nn(e.id);if(t)throw new Error(t);const n=e.wortmarke;if(!n)throw new Error("Ohne Wortmarke gibt es keine Designdatei. Sie ist Pflicht und hat mit Absicht keine Voreinstellung — die erzeugte Datei trüge sonst eine leere Füllfarbe und zeichnete nichts.");const i=ze(e.id),a=Se(e.id),r=`/**
 * ${st(e.label)} — dieses Erscheinungsbild.
 *
 * Angelegt mit dem CI-Generator (ci.html). Wer hier von Hand ändert, ändert
 * die Wahrheit — der Generator liest diese Datei nicht zurück.
 *
 * Was hier steht, ist eine **Belegung von Rollen** und kein neues Regelwerk.
 * Was nicht wechselt, steht im Kopf von \`src/theme/brandTheme.ts\`: Radius 0,
 * harte Versatzschatten, 1280 × 720 und das 64 × 64-Raster der Zeichen bei
 * 4 px Strich.
 *
 * Anmelden nicht vergessen — \`brandThemes\` in \`src/themes/index.ts\`:
 *
 * \`\`\`ts
 * import { ${a} } from './${e.id}';
 * const brandThemes: BrandTheme[] = [musterkunde, ${a}];
 * \`\`\`
 *
 * Eine Datei, die hier liegt und nicht angemeldet ist, führt der Inspektor als
 * „nicht installiert" — das Deck sieht dann nach einem Fehler des Werkzeugs
 * aus, obwohl nur eine Zeile fehlt.
 */`,l=`import {
  colorsFromPalette,
  nozillaIcons,
  nozillaTheme,
  tonesFromPalette,
  wordmarkFromSvg,
  type BrandTheme,
  type TypeScale,
  type TypeStyle,
} from '@/theme';${e.zeichen==="ohne-signatur"?`
import { withoutSignature } from '@/assets/icons';`:""}
import wortmarke from './${i}?raw';`,c=`/**
 * Die Palette. Einmal genannt — Tonrollen und semantische Tokens werden daraus
 * gemischt, damit keine Farbe an zwei Stellen steht.
 *
 * \`paper\` ist das Papier dieser Marke, \`white\` ihr reines Weiß. Die beiden
 * müssen zwei sein: sie belegen je einen Untergrund („Creme" und „Weiß") und je
 * eine Flächenrolle, und wer ihnen denselben Wert gibt, bekommt vier
 * Menüeinträge, die dasselbe malen.
 */
const palette = {
${lt(e)}
};

/**
 * Tinte und Papier mit Deckkraft — die Werte gehören zu *dieser* Palette.
 *
 * \`paperAlpha\` ist das Papier und nicht das Weiß: es malt den gedämpften Text
 * auf einer Folie in Tinte, und der soll denselben Unterton haben wie der laute
 * darüber.
 */
${We("inkAlpha",Ue,e.palette.ink)}
${We("paperAlpha",Je,e.palette.paper)}`,o=`/**
 * Die Größenleiter dieser Marke — acht Stufen, und sonst gibt es keine.
 */
const textScale = {
${ee(e.textScale,N)}
};

/**
 * Die drei Größen, die auf keiner Stufe der Leiter sitzen: die
 * Kampagnengröße, die Fußzeile unterhalb der Leiter und der Code im Fließtext,
 * der knapp darunter steht, weil eine Monospace breiter baut.
 */
const sonderstufen: Record<string, number> = {
${ee(e.sonderstufen,q)}
};

/**
 * Die Hierarchie: Struktur von nozilla, Größen aus der Leiter oben.
 *
 * Zugeordnet wird über den *Wert* und nicht über eine getippte Tabelle — eine
 * Tabelle „Rolle → Größe" auf Modulebene war hier schon einmal eine
 * eingefrorene CI.
 */
const stufeMitWert = new Map<number, keyof typeof textScale>(
  (Object.keys(nozillaTheme.textScale) as Array<keyof typeof textScale>).map((stufe) => [
    nozillaTheme.textScale[stufe],
    stufe,
  ]),
);

const typeScale = Object.fromEntries(
  Object.entries(nozillaTheme.typeScale).map(([name, stil]) => {
    const stufe = stufeMitWert.get(stil.size);
    return [
      name,
      {
        ...stil,
        size: stufe ? textScale[stufe] : (sonderstufen[name] ?? stil.size),
        tracking: stil.family === 'display' ? stil.tracking - ${Fe(e.auszeichnungEnger,"Laufweite")} : stil.tracking,
      } satisfies TypeStyle,
    ];
  }),
) as TypeScale;`,u=`/**
 * Die selbst gehosteten Schnitte. Zu jeder \`.woff2\` muss unter
 * \`public/fonts/\` auch die gleichnamige \`.ttf\` liegen: WOFF2 kann nichts
 * lesen, was Glyphen braucht, und PDF wie Umriss-Leser brauchen \`glyf\`.
 */
const faces = [
${ot(e)}
];`,h=`export const ${a}: BrandTheme = {
  id: ${$(e.id)},
  label: ${$(e.label)},

  brand: {
    ...nozillaTheme.brand,
    name: ${$(e.markenname)},
    product: ${$(e.produkt)},
  },

  /*
     Aus der SVG-Datei gelesen, nicht als Bild eingebunden: nur so landet die
     Marke in SVG *und* PDF als echter Vektor und nimmt die Tinte der Fläche an,
     auf der sie sitzt. Zugeordnet wird über die Füllfarbe — eine
     Zeichensoftware sortiert Pfade um, wie sie will.
  */
  wordmark: wordmarkFromSvg(wortmarke, {
    letters: ${$(n.letters)},${n.accent?`
    accent: ${$(n.accent)},`:""}
  }),
  ${e.zeichen==="nozilla"?"icons: nozillaIcons,":`/*
     Der geliehene Katalog ohne nozillas Signatur: der 6 × 6 große Punkt unten
     rechts ist deren Erkennungszeichen und keine Eigenschaft des Dialekts. Er
     nähme die Signalfarbe dieser Marke an und setzte trotzdem eine fremde
     Handschrift auf jede Folie.

     Eigene Zeichen kommen hierher — 64 × 64, 4 px, square caps, miter joins,
     Farbe nur über die Rollen ink | signal | signal-soft | signal-deep. Ein Set
     *ersetzt*: wer nur die eigenen einträgt, hat nur die eigenen.
  */
  icons: {
    categories: [...nozillaIcons.categories],
    icons: Object.fromEntries(
      Object.entries(nozillaIcons.icons).map(([name, icon]) => [
        name,
        { ...icon, prims: withoutSignature(icon.prims) },
      ]),
    ),
  },`}

  palette,
  inkAlpha,
  paperAlpha,
  color: colorsFromPalette(palette, inkAlpha),
  elementTones: tonesFromPalette(palette, inkAlpha, paperAlpha),

  textScale,
  typeScale,
  /*
     Hinter der eigenen Schrift steht die *andere* dieses Erscheinungsbilds, und
     erst danach das System. Der Export sucht ein fehlendes Zeichen in genau
     dieser Reihenfolge; nennt der Stapel keine zweite Marken-Schrift, findet er
     nichts, und das Zeichen fällt aus PNG und PDF heraus.
  */
  fontFamily: {
${v.map(d=>`    ${d}: ${$(e.fontFamily[d])},`).join(`
`)}
  },
  webfont: { ...nozillaTheme.webfont, faces },
  pdfFontFamily: {
${v.map(d=>`    ${d}: ${$(e.pdfFontFamily[d])},`).join(`
`)}
  },

  stroke: {
${ee(e.stroke,X,"    ")}
  },
  shadowOffset: {
${ee(e.shadowOffset,_,"    ")}
  },
};`;return[r,l,c,o,u,h].join(`

`)+`
`}function ze(e){return`${e}-wortmarke.svg`}function ut(e){const t=Se(e.id);return`1 · Die beiden Dateien ablegen

   src/themes/${e.id}.ts
   src/themes/${ze(e.id)}

2 · Anmelden — src/themes/index.ts

   import { ${t} } from './${e.id}';
   const brandThemes: BrandTheme[] = [musterkunde, ${t}];

3 · Die Schriften

   Zu jeder .woff2 gehört die gleichnamige .ttf unter public/fonts/.
   Fehlt die .ttf, sehen Fläche und SVG richtig aus — PDF und PNG nicht.

4 · Prüfen

   npm run build && npm run test

   Ein Deck stellt man mit  theme: ${e.id}  im Frontmatter um.`}function je(e,t){return`nz-ci-${e.toLowerCase().replace(/ß/g,"ss")}-${t}`}const B={leiter:{eine:"Größenleiter",ueberschrift:"Größenleiter"},sonder:{eine:"Stufe",ueberschrift:"Stufen außerhalb der Leiter"},laufweite:{eine:"Laufweite",ueberschrift:"Laufweite der Auszeichnung"},strich:{eine:"Strichstärke",ueberschrift:"Strichstärken"},schatten:{eine:"Schattenversatz",ueberschrift:"Schattenversätze"}};function T(e,t){return je("Maße",`${e}-${t}`)}const dt=new Set(["nozilla","musterkunde"]);function ht(e){const t=[],n="Marke";if(!e.id.trim())t.push({rang:"fehler",feld:n,text:"Der Schlüssel fehlt."});else if(!/^[a-z][a-z0-9-]*$/.test(e.id))t.push({rang:"fehler",feld:n,text:`„${e.id}" taugt nicht als Schlüssel: Kleinschrift, Ziffern und Bindestriche, beginnend mit einem Buchstaben. Er steht so im Frontmatter jedes Decks (theme: …).`});else if(dt.has(e.id))t.push({rang:"fehler",feld:n,text:`„${e.id}" ist vergeben. Ein bereits angemeldeter Schlüssel ersetzt das dortige Erscheinungsbild kommentarlos — bei „nozilla" also die eigene CI.`});else{const i=nn(e.id);i&&t.push({rang:"fehler",feld:n,text:i})}return e.label.trim()||t.push({rang:"fehler",feld:n,text:"Der Name für die Auswahl fehlt."}),e.markenname.trim()||t.push({rang:"warnung",feld:n,text:"Ohne Markennamen steht in jedem exportierten PDF und jeder PPTX ein leerer Urheber."}),e.produkt.trim()||t.push({rang:"warnung",feld:n,text:"Ohne Produktnamen steht in jedem SVG eine leere Beschreibung und in jeder PPTX eine leere Anwendung."}),t}const ft=[{vorn:"ink",hinten:"white",wo:"Fließtext auf einer weißen Folie",schwelle:H},{vorn:"ink",hinten:"paper",wo:"Fließtext auf einer cremefarbenen Folie",schwelle:H},{vorn:"ink",hinten:"signal",wo:"Schrift auf einer Signalfläche",schwelle:H},{vorn:"paper",hinten:"ink",wo:"Schrift auf einer Folie in Tinte",schwelle:H},{vorn:"ink",hinten:"signalSoft",wo:"Code auf einer Signalfolie",schwelle:H},{vorn:"paper",hinten:"ink800",wo:"Code auf einer Folie in Tinte",schwelle:Hn}],mt=[{a:"paper",b:"white",wo:'die Untergründe „Creme" und „Weiß" und die Flächenrollen daneben'},{a:"signalSoft",b:"signal",wo:"der Code-Untergrund auf einer Signalfolie"},{a:"ink800",b:"ink",wo:"der Code-Untergrund auf einer Folie in Tinte"},{a:"signalStrong",b:"signal",wo:"der gedrückte Zustand einer Signalfläche"}];function gt(e,t=new Set){const n=[];for(const i of mt){const a=e[i.a],r=e[i.b];!a||!r||t.has(i.a)||t.has(i.b)||Jn(a,r)||n.push({rang:"warnung",feld:"Farbe",text:`„${i.a}" und „${i.b}" sind dieselbe Farbe. Betroffen ist ${i.wo} — nichts geht kaputt, die Wahl tut nur nichts.`})}return n}function pt(e){const t=[],n="Farbe",i=e.palette,a=new Set;for(const r of P){const l=(i[r]??"").trim();U(l)||(a.add(r),t.push({rang:"fehler",feld:n,anker:je(n,r),text:`„${r}" ist kein #RRGGBB: „${l}". Kurzschreibweise, rgb() und Farbnamen lassen withAlpha() schon beim Anlegen werfen — und tonesOutsidePalette() vergleicht Zeichenketten, #ffffff und #FFFFFF sind für sie zwei Farben.`}))}t.push(...gt(i,a));for(const r of ft){if(a.has(r.vorn)||a.has(r.hinten))continue;const l=Kn(i[r.vorn],i[r.hinten]);l<r.schwelle&&t.push({rang:"warnung",feld:n,text:`${r.wo}: Kontrast ${l.toFixed(1)} : 1, verlangt sind ${r.schwelle} : 1. Diese Paarung steht fest im Mischer — sie lässt sich nur über die Palette reparieren, nicht in der erzeugten Datei.`})}return t}function fe(e){return e.split(",").map(t=>t.trim().replace(/^['"]|['"]$/g,"")).filter(Boolean)}function bt(e){var c;const t=[],n="Schrift",i=new Set(e.webfontFaces.map(o=>o.family)),a=o=>fe(e.fontFamily[o])[0]??"";for(const o of v){const u=e.fontFamily[o]??"",h=fe(u),d=h[0]??"";if(!d){t.push({rang:"fehler",feld:n,text:`Der Stapel für „${o}" ist leer.`});continue}i.has(d)||t.push({rang:"fehler",feld:n,text:`„${d}" steht vorn im Stapel für „${o}", aber in keinem Schnitt. resolveFace() vergleicht buchstabengleich; passt der Name nicht, findet der Export keine Datei und fällt still auf die PDF-Ersatzschrift zurück — kein Fehler, keine Warnung, nur eine andere Schrift.`});const m=new Set([o]);for(const f of h){const g=v.find(b=>a(b)===f);g&&m.add(g)}m.size<2&&t.push({rang:"warnung",feld:n,text:`Der Stapel für „${o}" führt zu keiner zweiten Marken-Schrift. Keine Schrift führt jedes Zeichen — Space Mono kennt ⌘, ⌫, ⇧ und ⌥ nicht —, und der Export sucht ein fehlendes Zeichen der Reihe nach in den Schriften der *anderen Rollen*. Eine Familie, die keinen Stapel anführt, zählt dabei nicht: nenne an zweiter Stelle die Schrift, die vorn in einem anderen Stapel steht.`})}const r=new Set(v.flatMap(o=>fe(e.fontFamily[o])));for(const o of i)o.trim()&&!r.has(o)&&t.push({rang:"warnung",feld:n,text:`„${o}" hat Schnitte, aber kein Stapel nennt sie. Die Dateien werden in jeder Sitzung geladen und nie gezeichnet.`});for(const o of i)e.webfontFaces.filter(h=>h.family===o).some(h=>h.style==="normal")||t.push({rang:"fehler",feld:n,text:`„${o}" hat keinen aufrechten Schnitt (style: normal).`});const l=new Map;for(const o of Object.values(Xe(e))){const u=a(o.family);u&&(l.has(u)||l.set(u,new Set),(c=l.get(u))==null||c.add(o.weight))}for(const[o,u]of l){if(!i.has(o))continue;const h=new Set(e.webfontFaces.filter(m=>m.family===o&&m.style==="normal").map(m=>m.weight)),d=[...u].filter(m=>!h.has(m)).sort((m,f)=>m-f);d.length&&t.push({rang:"warnung",feld:n,text:`Die Hierarchie setzt „${o}" in ${d.join(", ")}, und dafür gibt es keinen Schnitt. resolveFace() nimmt dann den nächstliegenden: der Bildschirm simuliert fett, PNG, PDF und PPTX zeichnen den vorhandenen Schnitt — und die beiden zeigen Verschiedenes.`})}for(const o of e.webfontFaces)o.family.trim()||t.push({rang:"fehler",feld:n,text:"Ein Schnitt ohne Familie gehört nicht in die Liste."}),o.file.trim()||t.push({rang:"fehler",feld:n,text:`Der Schnitt „${o.family||"(ohne Familie)"} ${o.weight}" nennt keine Datei.`}),(!Number.isInteger(o.weight)||o.weight<100||o.weight>900)&&t.push({rang:"fehler",feld:n,text:`„${o.family||"(ohne Familie)"}" trägt das Gewicht ${o.weight}. Ein @font-face kennt 100 bis 900 — alles andere macht die Regel ungültig, und der Schnitt gilt still als 400.`}),o.file.trim()&&!o.file.endsWith(".woff2")&&t.push({rang:"fehler",feld:n,text:`„${o.file}" ist kein WOFF2. loadTtf() tauscht für den Export nur die Endung — die Angabe muss die WOFF2-Datei nennen.`});for(const o of v){const u=e.pdfFontFamily[o];Z.includes(u)||t.push({rang:"fehler",feld:n,text:`„${u}" ist keine der drei PDF-Kernschriften (${Z.join(", ")}).`})}return t}function xt(e){const t=[],n=(r,l,c)=>Number.isFinite(r)?!0:(t.push({rang:"fehler",feld:"Maße",anker:T(l,c),text:`„${c}" trägt keine Zahl. Ein leeres Zahlenfeld schreibt NaN in die Designdatei, und die übersetzt damit anstandslos.`}),!1),i=(r,l,c)=>n(r,l,c)?r<=0?(t.push({rang:"fehler",feld:"Maße",anker:T(l,c),text:`„${c}" ist keine Größe: ${r}.`}),!1):!0:!1,a=(r,l,c,o,u,h)=>{!Number.isFinite(r)||r>=o&&r<=u||t.push({rang:"warnung",feld:"Maße",anker:T(l,c),text:`„${c}" trägt ${r}. ${h} Die Datei entsteht trotzdem — zu sehen ist es erst auf der Folie.`})};for(const r of N)i(e.textScale[r],"leiter",r)&&a(e.textScale[r],"leiter",r,6,400,"Die Folie ist 1280 × 720 groß; darunter liest es niemand mehr, darüber ist es keine Schrift mehr.");for(const[r,l]of Object.entries(e.stroke))i(l,"strich",r)&&a(l,"strich",r,.25,20,"Ein Strich von dieser Stärke ist eine Fläche.");for(const[r,l]of Object.entries(e.sonderstufen))i(l,"sonder",r)&&a(l,"sonder",r,6,400,"Dieselbe Spanne wie für die Leiter.");n(e.auszeichnungEnger,"laufweite","Laufweite der Auszeichnung")&&a(e.auszeichnungEnger,"laufweite","Laufweite der Auszeichnung",-.1,.1,"Sie steht in em und verschiebt die Laufweite der Hierarchie; ein Zehntel Geviert ist bereits sehr viel.");for(const[r,l]of Object.entries(e.shadowOffset)){if(r==="none"){n(l,"schatten",r)&&l!==0&&t.push({rang:"warnung",feld:"Maße",anker:T("schatten",r),text:`„none" trägt ${l} statt 0 — dann hat „kein Schatten" einen Schatten.`});continue}i(l,"schatten",r)&&a(l,"schatten",r,1,64,"Ein Versatz von dieser Größe schiebt die Fläche aus der Folie.")}for(let r=1;r<N.length;r+=1){const l=e.textScale[N[r-1]],c=e.textScale[N[r]];!Number.isFinite(l)||!Number.isFinite(c)||c<=l&&t.push({rang:"warnung",feld:"Maße",text:`Die Leiter steigt nicht: „${N[r]}" (${c}) ist nicht größer als „${N[r-1]}" (${l}).`})}return t}const ie=256*1024;function kt(e){const t="Wortmarke",n=e.wortmarke;if(!n)return[{rang:"fehler",feld:t,text:"Die Wortmarke fehlt. Sie ist Pflicht und hat mit Absicht keine Voreinstellung — fehlte sie, trüge ein Deck unter fremder Marke die von nozilla."}];const i=[];if(n.svg.length>ie)return i.push({rang:"fehler",feld:t,text:`Die Datei ist ${Math.round(n.svg.length/1024)} kB groß; mehr als ${Math.round(ie/1024)} kB liest dieses Formular nicht. Eine Wortmarke ist ein Schriftzug aus ein paar Pfaden — so viel Inhalt kommt von eingebetteten Bildern oder einem nachgezeichneten Verlauf, und beides landet nicht auf der Folie.`}),i;const a=yn(n.svg);a?(a[2]<=0||a[3]<=0)&&i.push({rang:"fehler",feld:t,text:`Die viewBox hat die Größe ${a[2]} × ${a[3]}. Daraus lässt sich nichts zeichnen — die Marke fiele aus jeder Ausgabe heraus, ohne dass etwas anschlägt.`}):i.push({rang:"fehler",feld:t,text:"Die SVG-Datei hat keine lesbare viewBox."});const r=$n(n.svg);r.transformationen>0&&i.push({rang:"fehler",feld:t,text:`Die Datei trägt ${De(r.transformationen,"Transformation","Transformationen")} (transform=…). Dieser Leser wendet sie nicht an — die Pfade landen dort, wo ihre Zahlen stehen, und das ist bei einer Inkscape-Ebene weit außerhalb der viewBox. Exportiere die Datei mit eingerechneten Transformationen (Inkscape: „Transformationen speichern: optimiert“; Illustrator und Figma: Gruppe vorher auflösen).`}),r.formen>0&&i.push({rang:"fehler",feld:t,text:`Die Datei enthält ${De(r.formen,"Form","Formen")}, die kein <path> ist — Rechteck, Kreis, Ellipse, Linie, Polygon oder ein Verweis. Gelesen werden nur Pfade; diese Formen fallen aus jeder Ausgabe heraus. Wandle sie vor dem Export in Pfade um (Inkscape und Illustrator: „In Pfad umwandeln“).`});const l=Le(n.svg),c=l.map(f=>f.fill),o=(f,g)=>f.toUpperCase()===g.toUpperCase(),u=l.map((f,g)=>{try{return vn(f.d),null}catch(b){return`Pfad ${g+1}: ${b instanceof Error?b.message:String(b)}`}}).filter(f=>f!==null);u.length>0&&i.push({rang:"fehler",feld:t,text:`${u.length===1?"Ein Pfad lässt":`${u.length} Pfade lassen`} sich nicht lesen: ${u.slice(0,2).join(" · ")}. Gezeichnet wird daraus nichts — die Vorschau bliebe leer, und in der fertigen Marke fehlte der Schriftzug.`});const h=f=>!!f&&f.toLowerCase()!=="none",d=c.filter(f=>!f).length;d&&i.push({rang:"fehler",feld:t,text:`${d===1?"Ein Pfad trägt":`${d} Pfade tragen`} keine Füllfarbe — auch keine von einem <g> geerbte. Zugeordnet wird über die Füllfarbe; ${d===1?"dieser Pfad fällt":"diese Pfade fallen"} aus jeder Ausgabe heraus. Häufigste Ursache: die Farben stehen in einer CSS-Klasse im <style>-Block. Exportiere die Datei mit fill an den Pfaden.`}),n.letters.trim()?c.some(f=>o(f,n.letters))||i.push({rang:"fehler",feld:t,text:`Kein Pfad in „${n.letters}". Zugeordnet wird über die Füllfarbe, die in der Datei steht — nicht über die Palette und nicht über die Reihenfolge der Pfade. Gefunden wurden: ${[...new Set(c)].filter(h).join(", ")||"(keine)"}.`}):i.push({rang:"fehler",feld:t,text:"Die Buchstabenfarbe fehlt. Sie ist keine Einstellung, sondern die Zuordnung: ohne sie weiß keine Ausgabe, welche Pfade der Schriftzug sind."}),n.accent&&!c.some(f=>o(f,n.accent))&&i.push({rang:"warnung",feld:t,text:`Kein Pfad in „${n.accent}" — der Akzent am Wortende bliebe leer. Wer keinen hat, lässt das Feld frei.`});const m=[...new Set(c.filter(h).map(f=>f.toUpperCase()))].filter(f=>!o(f,n.letters)).filter(f=>!n.accent||!o(f,n.accent));return m.length&&i.push({rang:"warnung",feld:t,text:`Die Datei nennt ${m.length===1?"eine Füllfarbe":`${m.length} Füllfarben`}, die weder Buchstaben noch Akzent ${m.length===1?"ist":"sind"}: ${m.join(", ")}. Diese Pfade werden nirgends gezeichnet — die Wortmarke kennt genau zwei Farben. Wer sie braucht, färbt sie in der Datei auf eine der beiden um.`}),n.accent?i.push({rang:"hinweis",feld:t,text:"Die Akzentfarbe wählt nur die Pfade aus; gemalt wird der Akzent auf der Folie immer in der Signalfarbe."}):i.push({rang:"hinweis",feld:t,text:"Ohne Akzentfarbe wird kein Akzent gezeichnet. Das ist erlaubt — nicht jede Marke hat einen Punkt am Wortende."}),i}function wt(e){var t;return[{rang:"hinweis",feld:"Werkzeug",text:"Die Leisten wechseln nie mit. Sie gehören dem Arbeitsplatz, nicht dem Deck — ein cremefarbener Editor um eine cremefarbene Folie macht beides unlesbar."},{rang:"hinweis",feld:"Werkzeug",text:"Radius 0, harte Versatzschatten, 1280 × 720 und das 64er-Raster der Zeichen bleiben. Das sind keine Einstellungen, sondern das, wofür dieses Werkzeug gebaut ist."},{rang:"hinweis",feld:"Zeichen",text:e.zeichen==="nozilla"?`Die ${Object.keys(((t=x.icons)==null?void 0:t.icons)??{}).length} nozilla-Zeichen kommen mit — samt dem 6 × 6 großen Punkt unten rechts, der die Signalfarbe dieser Marke annimmt.`:"Der Katalog kommt ohne nozillas Signatur. Eigene Zeichen trägt man in der erzeugten Datei nach; sie ersetzen den Katalog dann, sie ergänzen ihn nicht."}]}function St(e){return[...ht(e),...pt(e),...bt(e),...xt(e),...kt(e),...wt(e)]}function Ft(e){return e.some(t=>t.rang==="fehler")}function zt(e){return Math.max(0,Math.min(255,Math.round(e))).toString(16).padStart(2,"0")}function jt(e){if(e===void 0)return!0;const t=Number.parseFloat(e);return Number.isFinite(t)?e.trim().endsWith("%")?t>=100:t>=1:!0}function tn(e){const t=(e??"").trim();if(!t)return null;if(/^#[0-9a-fA-F]{6}$/.test(t)){const i=t.toUpperCase();return{wert:i,wie:i===t?"":"in Großschrift gebracht"}}if(/^#[0-9a-fA-F]{3}$/.test(t))return{wert:`#${[...t.slice(1)].map(a=>a+a).join("")}`.toUpperCase(),wie:`aus der Kurzform „${t}" ausgeschrieben`};if(/^[0-9a-fA-F]{6}$/.test(t))return{wert:`#${t.toUpperCase()}`,wie:"die fehlende Raute ergänzt"};if(/^[0-9a-fA-F]{3}$/.test(t))return{wert:`#${[...t].map(a=>a+a).join("")}`.toUpperCase(),wie:`aus der Kurzform „${t}" ausgeschrieben`};const n=/^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)\s*(?:[,/]\s*([0-9.%]+)\s*)?\)$/i.exec(t);if(n){const i=[n[1],n[2],n[3]].map(Number);if(i.some(l=>!Number.isFinite(l)))return null;const a=`#${i.map(zt).join("")}`.toUpperCase(),r=!jt(n[4]);return{wert:a,wie:r?`aus „${t}" gerechnet — die Deckkraft fiel dabei weg, eine Palettenrolle ist immer deckend`:`aus „${t}" gerechnet`}}return null}function O({titel:e,hinweis:t,children:n}){return s.jsxs("section",{className:"border-b border-ui px-4 py-4",children:[s.jsx("h2",{className:"text-ui-title font-semibold text-ui-ink",children:e}),t?s.jsx("p",{className:"mt-1 text-[11px] leading-snug text-ui-faint",children:t}):null,s.jsx("div",{className:"mt-3 flex flex-col gap-3",children:n})]})}function G({label:e,wert:t,auf:n,hinweis:i,platzhalter:a,einheit:r}){const l=p.useId();return s.jsxs("div",{children:[s.jsx("label",{htmlFor:l,className:"block text-[11px] font-medium text-ui-muted",children:e}),s.jsxs("div",{className:"mt-1 flex items-center gap-2",children:[s.jsx("input",{id:l,type:"text",value:t,placeholder:a,onChange:c=>n(c.target.value),className:"h-8 min-w-0 flex-1 rounded-sm border border-ui bg-ui-surface px-2 text-ui-body text-ui-ink placeholder:text-ui-faint focus:border-ui-strong focus:outline-none"}),r?s.jsx("span",{className:"shrink-0 text-[11px] text-ui-faint",children:r}):null]}),i?s.jsx("p",{className:"mt-1 text-[11px] leading-snug text-ui-faint",children:i}):null]})}function V({label:e,wert:t,auf:n,einheit:i,schritt:a,anker:r}){const l=p.useId(),c=r??l;return s.jsxs("div",{className:"flex items-center gap-2",children:[s.jsx("label",{htmlFor:c,className:"w-24 shrink-0 font-mono text-[11px] text-ui-muted",children:e}),s.jsx("input",{id:c,type:"number",step:a??1,value:Number.isFinite(t)?t:"",onChange:o=>n(Number.parseFloat(o.target.value)),className:"h-8 w-24 rounded-sm border border-ui bg-ui-surface px-2 text-right tabular-nums text-ui-body text-ui-ink focus:border-ui-strong focus:outline-none"}),i?s.jsx("span",{className:"text-[11px] text-ui-faint",children:i}):null]})}function yt({label:e,rolle:t,wert:n,auf:i,hinweis:a,anker:r}){const l=p.useId(),c=r??l,o=/^#[0-9a-f]{6}$/i.test(n),u=o?[1,3,5].map(g=>Number.parseInt(n.slice(g,g+2),16)).join(", "):"—",[h,d]=p.useState(null),m=()=>{const g=tn(n);!g||g.wert===n||(i(g.wert),d({wie:g.wie,fuer:g.wert}))},f=h&&h.fuer===n?h.wie:null;return s.jsxs("div",{className:"flex items-start gap-2",children:[o?s.jsx("input",{type:"color","aria-label":`${e} wählen`,value:n,onChange:g=>i(g.target.value.toUpperCase()),className:"mt-0.5 h-8 w-8 shrink-0 cursor-pointer rounded-sm border border-ui bg-ui-surface p-0.5"}):s.jsx("span",{"aria-hidden":"true",title:"Kein lesbarer Wert — der Wähler zeigte sonst ein Schwarz, das niemand gewählt hat.",className:"mt-0.5 h-8 w-8 shrink-0 rounded-sm border border-ui-danger bg-ui-sunken"}),s.jsxs("div",{className:"min-w-0 flex-1",children:[s.jsxs("label",{htmlFor:c,className:"block text-[11px] font-medium text-ui-muted",children:[e,e===t?null:s.jsx("span",{className:"ml-1 font-mono text-ui-faint",children:t})]}),s.jsxs("div",{className:"mt-1 flex items-center gap-2",children:[s.jsx("input",{id:c,type:"text",value:n,spellCheck:!1,onChange:g=>{d(null),i(g.target.value)},onBlur:m,className:J("h-8 w-28 shrink-0 rounded-sm border bg-ui-surface px-2 font-mono text-ui-body focus:outline-none",o?"border-ui text-ui-ink focus:border-ui-strong":"border-ui-danger text-ui-danger")}),s.jsxs("span",{className:"truncate font-mono text-[11px] text-ui-faint",children:["rgb(",u,")"]})]}),f?s.jsxs("p",{className:"mt-1 text-[11px] leading-snug text-ui-ink",children:["Übernommen: ",f,"."]}):null,a?s.jsx("p",{className:"mt-1 text-[11px] leading-snug text-ui-faint",children:a}):null]})]})}function rn({label:e,wert:t,optionen:n,auf:i,hinweis:a}){const r=p.useId();return s.jsxs("div",{children:[s.jsx("label",{htmlFor:r,className:"block text-[11px] font-medium text-ui-muted",children:e}),s.jsx("select",{id:r,value:t,onChange:l=>i(l.target.value),className:"mt-1 h-8 w-full rounded-sm border border-ui bg-ui-surface px-2 text-ui-body text-ui-ink focus:border-ui-strong focus:outline-none",children:n.map(l=>s.jsx("option",{value:l.value,children:l.label},l.value))}),a?s.jsx("p",{className:"mt-1 text-[11px] leading-snug text-ui-faint",children:a}):null]})}const sn={signal:"Die Handlungsfarbe. Nur Knöpfe, Marker, echte Aufforderungen.",signalStrong:"Eine Stufe dunkler — der gedrückte Zustand.",signalSoft:"Die weiche Stufe. Trägt den Code-Untergrund auf einer Signalfolie.",signalDeep:"Die dunkelste Stufe. Schattiert innerhalb einer Zeichnung, nie auf einer Fläche.",paper:'Das Papier der Marke — der Untergrund „Creme" und die Flächenrolle „Papier".',paperAlt:"Die zweite Papierstufe. Trägt den Code-Untergrund auf Weiß.",paperDeep:"Die tiefste Papierstufe.",white:'Das reine Weiß — der Untergrund „Weiß" und die Flächenrolle „Weiß".',ink:'Die Tinte: Schrift, Kontur, Schatten und der Untergrund „Tinte".',ink900:"Fast-Tinte, eine Stufe heller.",ink800:"Trägt den Code-Untergrund auf einer Folie in Tinte.",ink700:"Fast-Tinte, dritte Stufe.",ink600:"Fast-Tinte, vierte Stufe.",warn:"Achtung. Funktional, nie Dekoration.",danger:"Fehler. Funktional, nie Dekoration.",info:"Hinweis. Funktional, nie Dekoration."},an={headline:"Kampagnengröße — zwischen den beiden obersten Stufen der Leiter.",labelSmall:"Fußzeile und Foliennummer — unterhalb der Leiter, weil eine Folie weitermuss.",codeInline:"Code im Fließtext — knapp darunter, weil eine Monospace breiter baut."},$t={nozilla:"Der nozilla-Katalog, wie er ist (mit Signatur)","ohne-signatur":"Der Katalog ohne nozillas Signatur"},re={display:"Auszeichnung",body:"Fließtext",mono:"Monospace"},ln={xl4:"Der Folientitel.",xl3:"Die zweite Überschrift.",xl2:"Die dritte Überschrift.",xl:"Die vierte Überschrift, und die Zahl in einer Kennzahl.",lg:"Großer Fließtext — der Aufhänger unter einem Titel.",base:"Der Fließtext.",sm:"Klein: Label, Bildunterschrift, Achsenbeschriftung.",xs:"Das Kleinste, das noch gelesen werden soll."},on={hair:"Trennlinie, Achse, Raster.",rule:"Der Rahmen einer Fläche.",strong:"Der Strich der Zeichen und der Rahmen einer betonten Fläche.",heavy:"Der lauteste Strich — Auswahl, Unterstreichung."},cn={none:'Kein Schatten. Muss 0 sein, sonst hat „kein Schatten" einen.',sm:"Der kleine harte Versatz.",md:"Der mittlere — die Voreinstellung einer Karte.",lg:"Der große, für das, was vorn liegt."};function I(e,t,n,i=!0){const a=typeof n=="number"?n:`"${n}"`;return`  "${e}": ${a}${i?",":""}   // ${t}`}function C(e){return e.map(([t,n,i],a)=>I(t,n,i,a<e.length-1))}function vt(e){const t=(n,i,a="  },")=>[n,...i.map(r=>`  ${r}`),a,""];switch(e){case"id":return[I("id",en,"probenhaus")];case"label":return[I("label","der Name in der Auswahlliste","Probenhaus")];case"markenname":return[I("markenname","steht als Urheber in jedem PDF und jeder PPTX","Probenhaus GmbH")];case"produkt":return[I("produkt","steht in der Beschreibung jedes SVG","Probenhaus Folien"),""];case"palette":return t('  "palette": {   // sechzehn Rollen, jede als #RRGGBB',C(P.map(n=>[n,sn[n],x.palette[n]])));case"fontFamily":return t('  "fontFamily": {   // je ein CSS-Stapel; der erste Name muss unten einen Schnitt haben',C(v.map(n=>[n,`${re[n]} — dahinter die andere Marken-Schrift, dann das System`,x.fontFamily[n]])));case"pdfFontFamily":return t(`  "pdfFontFamily": {   // die Ersatzschrift im PDF, nur ${Z.join(" | ")}`,C(v.map(n=>[n,re[n],x.pdfFontFamily[n]])));case"webfontFaces":return['  "webfontFaces": [   // jeder selbst gehostete Schnitt, als .woff2','    { "family": "Zilla Slab", "weight": 400, "style": "normal", "file": "zilla-slab-400.woff2" }',"  ],",""];case"textScale":return t('  "textScale": {   // die Größenleiter in Folien-Einheiten; sie muss steigen',C(N.map(n=>[n,ln[n],x.textScale[n]])));case"sonderstufen":return t('  "sonderstufen": {   // drei Größen, die auf keiner Stufe der Leiter sitzen',C(q.map(n=>[n,an[n],x.typeScale[n].size])));case"auszeichnungEnger":return[I("auszeichnungEnger","um wie viel em die Auszeichnung enger läuft; 0 lässt die Leiter, wie sie ist",0),""];case"stroke":return t('  "stroke": {   // Strichstärken in Folien-Einheiten',C(X.map(n=>[n,on[n],x.stroke[n]])));case"shadowOffset":return t('  "shadowOffset": {   // harte Versätze, kein Weichzeichner',C(_.map(n=>[n,cn[n],x.shadowOffset[n]])),"  }").slice(0,-1)}}function Nt(e){const t=[e.id&&`- Schlüssel (id): ${e.id}`,e.label&&`- Name in der Auswahl: ${e.label}`,e.markenname&&`- Markenname: ${e.markenname}`,e.produkt&&`- Produktname: ${e.produkt}`].filter(Boolean);return["Du belegst das Erscheinungsbild einer Marke für ein Präsentationswerkzeug.","Antworte mit **einem** JSON-Objekt und sonst nichts — kein einleitender","Satz, keine Erklärung dahinter, keine Kommentare im JSON.","",["## Woher die Werte kommen","","Nimm die Markenrichtlinien, die ich dir gebe. Wo sie schweigen, leite ab —",'und schreibe an *keiner* Stelle „TODO" oder einen Platzhalter: ein Feld,',"das du nicht belegen kannst, lässt du weg. Der Generator behält dafür","seinen bisherigen Wert und sagt es.",""].join(`
`),t.length?["## Das steht schon fest","",...t,"","Übernimm diese Werte unverändert.",""].join(`
`):"","## Die Form","","```json","{",..._e.flatMap(vt),"}","```","","## Woran der Entwurf sonst scheitert","","Diese Regeln prüft der Generator, nachdem er deine Antwort gelesen hat.","Halte sie ein, dann bleibt die Liste leer.","","1. Jede Farbe als `#RRGGBB`. Keine Kurzform, kein `rgb()`, kein Farbname.","2. `ink` muss auf `white`, auf `paper` und auf `signal` lesbar sein (4,5 : 1),","   und `paper` auf `ink`. Das ist der Fehler, der bei einer neuen Marke fast","   sicher vorkommt: eine dunkle Signalfarbe bekommt schwarze Schrift darauf,","   auf jeder Signalfolie. Reparieren lässt er sich nur über die Palette.","3. `paper` und `white` müssen zwei sichtbar verschiedene Farben sein — sonst","   malen vier Menüeinträge dieselbe. Dasselbe gilt für `signalSoft`/`signal`,","   `ink800`/`ink` und `signalStrong`/`signal`.","4. Die Größenleiter steigt von `xs` bis `xl4`, ohne Gleichstand.","5. Jeder Schriftstapel nennt **zwei** Schriften dieser Marke. Keine Schrift","   führt jedes Zeichen — ⌘, ⌫, ⇧ und ⌥ fehlen den meisten —, und der Export","   sucht ein fehlendes Zeichen in genau dieser Reihenfolge.","6. Der erste Name jedes Stapels muss buchstabengleich einer `family` unter","   `webfontFaces` entsprechen. Passt er nicht, findet der Export keine Datei","   und setzt still in der Ersatzschrift.",'7. Jede `family` braucht mindestens einen Schnitt mit `"style": "normal"`,',"   Gewichte von 100 bis 900, Dateinamen auf `.woff2`.","8. `shadowOffset.none` ist 0.","","## Was du nicht lieferst","","- Die Wortmarke. Sie ist eine SVG-Datei und wird im Generator hochgeladen.","- Die Zeichen. Der Katalog kommt mit; eigene trägt man später von Hand nach.","- Abgeleitete Werte: semantische Tokens, Flächenrollen, Deckkraftstufen,","  Zeilenhöhen, Radien, das Folienmaß. Sie werden aus der Palette gemischt","  oder sind Struktur — danach zu fragen wäre die Fehlerklasse und nicht die","  Gründlichkeit."].join(`
`)}function Et(e){return Nn(e)}function Dt(e){const t=e.indexOf("{");return t<0?e:e.slice(t)}function At(e){const t=e.indexOf("{");if(t<0)return e;let n=0,i=!1,a=!1;for(let r=t;r<e.length;r+=1){const l=e[r];if(i){a?a=!1:l==="\\"?a=!0:l==='"'&&(i=!1);continue}if(l==='"')i=!0;else if(l==="{")n+=1;else if(l==="}"&&(n-=1,n===0))return e.slice(t,r+1)}return e.slice(t)}function se(e){return e==='"'||e==="“"||e==="”"||e==="„"}function Tt(e){let t="",n=!1,i=!1;for(let a=0;a<e.length;a+=1){const r=e[a];if(n){t+=r,i?i=!1:r==="\\"?i=!0:se(r)&&(n=!1);continue}if(se(r)){n=!0,t+=r;continue}if(r==="/"&&e[a+1]==="/"){const l=e.indexOf(`
`,a);if(l<0)break;a=l-1;continue}if(r==="/"&&e[a+1]==="*"){const l=e.indexOf("*/",a+2);if(l<0)break;a=l+1;continue}t+=r}return t}function Pt(e){let t="",n=!1,i=!1;for(let a=0;a<e.length;a+=1){const r=e[a];if(n){t+=r,i?i=!1:r==="\\"?i=!0:se(r)&&(n=!1);continue}if(se(r)&&(n=!0),r===","){const c=e.slice(a+1).replace(/^\s*/,"")[0];if(c==="}"||c==="]")continue}t+=r}return t}function Mt(e){return e.replace(/[“”„«»]/g,'"').replace(/[‘’]/g,"'")}const Ot=[{was:"den Codezaun abgenommen",tu:Et},{was:"den Vorspann bis zur ersten Klammer weggeschnitten",tu:Dt},{was:"Kommentare entfernt — JSON kennt keine",tu:Tt},{was:"ein Komma vor einer schließenden Klammer entfernt",tu:Pt},{was:"typografische Anführungszeichen begradigt",tu:Mt},{was:"den Nachsatz hinter dem Objekt weggeschnitten",tu:At}];function Wt(e){let t=0,n=!1,i=!1,a="",r="",l="",c=!1;const o=[],u=[];for(let h=0;h<e.length;h+=1){const d=e[h];if(n){i?i=!1:d==="\\"?i=!0:d==='"'?n=!1:c&&(l+=d);continue}if(d==='"'){n=!0,t===1&&(l="",c=!0);continue}if(d===":"&&t===1){r=l||r,c=!1;continue}if(d==="{"||d==="["?(t+=1,u[t]=d,o[t]=-1):d==="}"||d==="]"?(t-=1,t>=1&&(o[t]=h+1,t===1&&(a=r))):d===","&&t>=1&&(o[t]=h,t===1&&(a=r)),t===0&&h>0)return null}if(t<=0)return null;for(let h=t;h>=1;h-=1){if(o[h]===void 0||o[h]<0)continue;const d=e.slice(0,o[h]).replace(/,\s*$/,""),m=[];for(let f=h;f>=1;f-=1)m.push(u[f]==="["?"]":"}");try{const f=JSON.parse(d+m.join(""));if(!f||typeof f!="object"||Array.isArray(f))continue;return{objekt:f,letzterSchluessel:a,offenerSchluessel:r,zeichen:e.length}}catch{}}return null}function Rt(e){const t=[];let n=e,i="";const a=()=>{try{const l=JSON.parse(n);return l&&typeof l=="object"&&!Array.isArray(l)?l:(i="Die Antwort ist zwar lesbar, aber kein Objekt.",null)}catch(l){return i=String(l instanceof Error?l.message:l),null}};let r=a();if(r)return{objekt:r,getan:t,fehler:"",abbruch:null};for(const l of Ot){const c=l.tu(n);if(c!==n&&(n=c,t.push(l.was),r=a(),r))return{objekt:r,getan:t,fehler:"",abbruch:null}}return{objekt:null,getan:t,fehler:i,abbruch:Wt(n)}}let Ct=class{constructor(){de(this,"befunde",[]);de(this,"genommen",new Set)}melde(t,n,i){this.befunde.push({rang:t,feld:n,text:i})}nahm(t){this.genommen.add(t)}gruppe(t,n,i,a,r){if(i===void 0)return this.melde("fehlt",t,`${n} kam nicht — die bisherigen Werte bleiben stehen.`),{};if(!i||typeof i!="object"||Array.isArray(i))return this.melde("uebergangen",t,`${n} ist kein Objekt und wurde übergangen.`),{};const l=i,c={},o=[];for(const h of a){if(!(h in l)){o.push(h);continue}const d=r(l[h],h);d!==null&&(c[h]=d)}const u=Object.keys(l).filter(h=>!a.includes(h));return u.length&&this.melde("uebergangen",t,`${n} bringt ${u.length===1?"eine Rolle":`${u.length} Rollen`} mit, die es hier nicht gibt: ${u.join(", ")}.`),o.length&&this.melde("fehlt",t,`${n} lässt ${o.length===1?"eine Rolle":`${o.length} Rollen`} aus: ${o.join(", ")}. Der bisherige Wert bleibt stehen.`),c}};function me(e,t,n,i){if(i===void 0)return e.melde("fehlt",t,`„${n}" kam nicht — der bisherige Wert bleibt stehen.`),null;if(typeof i!="string")return e.melde("uebergangen",t,`„${n}" ist keine Zeichenkette und wurde übergangen.`),null;const a=i.trim();return a!==i&&e.melde("korrigiert",t,`„${n}": Leerraum am Rand entfernt.`),a}function L(e,t,n,i,a=["px"]){if(typeof i=="number")return Number.isFinite(i)?i:(e.melde("uebergangen",t,`„${n}" ist keine endliche Zahl und wurde übergangen.`),null);if(typeof i=="string"){const r=/^\s*(-?[0-9]*\.?[0-9]+)\s*([a-z%]*)\s*$/i.exec(i);if(r){const l=r[2].toLowerCase(),c=Number.parseFloat(r[1]);return l?a.includes(l)?(e.melde("korrigiert",t,`„${n}": „${i}" als Zahl ${c} gelesen — die Einheit ${l} entspricht hier der Folien-Einheit.`),c):(e.melde("uebergangen",t,l==="pt"?`„${n}": „${i}" wurde nicht übernommen. Eine Folien-Einheit ist ¾ Punkt, ${c}pt wären also ${(c*(4/3)).toFixed(2)} — ob „pt" so gemeint war oder nur hingeschrieben, lässt sich hier nicht entscheiden. Der bisherige Wert bleibt stehen.`:`„${n}": die Einheit ${l} hat hier keine Bedeutung; verlangt ist eine Folien-Einheit (${a.join(", ")} oder ohne Einheit). Der bisherige Wert bleibt stehen.`),null):(e.melde("korrigiert",t,`„${n}": „${i}" als Zahl ${c} gelesen.`),c)}}return e.melde("uebergangen",t,`„${n}" ist keine Zahl: ${JSON.stringify(i)}.`),null}function Gt(e,t,n,i){if(typeof i!="string")return e.melde("uebergangen",t,`„${n}" ist keine Farbe: ${JSON.stringify(i)}.`),null;const a=tn(i);return a?(a.wie&&e.melde("korrigiert",t,`„${n}": ${a.wie} → ${a.wert}.`),a.wert):(e.melde("uebergangen",t,`„${n}": aus „${i}" wird keine Farbe. Verlangt ist #RRGGBB.`),null)}function Zt(e,t){const n="Schrift";if(t===void 0)return e.melde("fehlt",n,"Es kamen keine Schnitte — die bisherige Liste bleibt stehen."),null;if(!Array.isArray(t))return e.melde("uebergangen",n,'„webfontFaces" ist keine Liste und wurde übergangen.'),null;if(t.length===0)return e.melde("uebergangen",n,"Die Liste der Schnitte ist leer. Ohne einen einzigen Schnitt gäbe es keine Marken-Schrift — die bisherige Liste bleibt stehen."),null;const i=[];return t.forEach((a,r)=>{const l=r+1;if(!a||typeof a!="object"||Array.isArray(a)){e.melde("uebergangen",n,`Der ${l}. Schnitt ist kein Objekt.`);return}const c=a,o=typeof c.family=="string"?c.family.trim():"",u=typeof c.file=="string"?c.file.trim():"";if(!o){e.melde("uebergangen",n,`Der ${l}. Schnitt nennt keine Familie.`);return}const d=L(e,n,`Gewicht des ${l}. Schnitts`,c.weight??400)??Number.NaN;let m="normal";const f=typeof c.style=="string"?c.style.trim().toLowerCase():"";f==="italic"||f==="oblique"||f==="kursiv"?(m="italic",f!=="italic"&&e.melde("korrigiert",n,`Der ${l}. Schnitt: „${c.style}" → italic.`)):f&&!Ve.includes(f)&&e.melde("korrigiert",n,`Der ${l}. Schnitt: „${c.style}" ist kein @font-face-Stil, gesetzt wird normal.`),i.push({family:o,weight:d,style:m,file:u,kennung:ae()})}),i.length?i:(e.melde("uebergangen",n,"Aus der Liste der Schnitte war keiner zu gebrauchen — die bisherige bleibt stehen."),null)}const Re=_e;function un(e){const t=e.offenerSchluessel;return t&&t!==e.letzterSchluessel?`ab „${t}"`:e.letzterSchluessel?`mit dem Feld nach „${e.letzterSchluessel}"`:"von vorn"}function Bt(e,t){return dn(JSON.stringify(e.objekt),t)}function It(e,t){const n=[],i=u=>typeof u=="string"?u||"(leer)":String(u),a=(u,h,d,m,f)=>{Object.is(d,m)||n.push({feld:u,name:h,gruppe:f,war:i(d),wird:i(m)})};for(const u of["id","label","markenname","produkt"])a("Marke",u,e[u],t[u]);for(const u of P)a("Farbe",u,e.palette[u],t.palette[u]);for(const u of N)a("Maße",u,e.textScale[u],t.textScale[u],"leiter");for(const u of q)a("Maße",u,e.sonderstufen[u],t.sonderstufen[u],"sonder");for(const u of X)a("Maße",u,e.stroke[u],t.stroke[u],"strich");for(const u of _)a("Maße",u,e.shadowOffset[u],t.shadowOffset[u],"schatten");a("Maße","auszeichnungEnger",e.auszeichnungEnger,t.auszeichnungEnger,"laufweite");for(const u of v)a("Schrift",u,e.fontFamily[u],t.fontFamily[u]),a("Schrift",`${u} (PDF)`,e.pdfFontFamily[u],t.pdfFontFamily[u]);const r=u=>`${u.family} ${u.weight} ${u.style} ${u.file}`,l=(u,h)=>{const d=[...h];return u.filter(m=>{const f=d.indexOf(m);return f<0?!0:(d.splice(f,1),!1)})},c=l(e.webfontFaces.map(r),t.webfontFaces.map(r)),o=l(t.webfontFaces.map(r),e.webfontFaces.map(r));return(c.length||o.length)&&n.push({feld:"Schrift",name:"Schnitte",war:c.length?c.join(" · "):`${e.webfontFaces.length} Schnitte, keiner fällt weg`,wird:o.length?o.join(" · "):`${t.webfontFaces.length} Schnitte, keiner kommt dazu`}),n}function dn(e,t){const n=new Ct;if(!e.trim())return{entwurf:null,befunde:[{rang:"fehler",feld:"Rücklauf",text:"Das Feld ist leer."}],aenderungen:[],abbruch:null};const{objekt:i,getan:a,fehler:r,abbruch:l}=Rt(e);if(!i)return{entwurf:null,befunde:l?[{rang:"fehler",feld:"Rücklauf",text:`Die Antwort hört nach ${l.zeichen} Zeichen mitten im Satz auf — zuletzt vollständig war „${l.letzterSchluessel||"(nichts)"}"${l.offenerSchluessel&&l.offenerSchluessel!==l.letzterSchluessel?`, abgerissen ist sie in „${l.offenerSchluessel}"`:""}. Das ist meist keine Panne, sondern die Längengrenze des Modells: bitte es, ${un(l)} fortzusetzen, und füge den Rest hier an.`},{rang:"uebergangen",feld:"Rücklauf",text:`Die Meldung des Lesers, für den Fall dass es doch etwas anderes ist: ${r}`}]:[{rang:"fehler",feld:"Rücklauf",text:`Daraus wird kein JSON-Objekt${a.length?`, auch nachdem ${a.join(", ")} wurde`:""}: ${r}`}],aenderungen:[],abbruch:l};for(const d of a)n.melde("korrigiert","Rücklauf",`Es war kein reines JSON — ${d}.`);const c=Object.keys(i).filter(d=>!Re.includes(d));c.length&&n.melde("uebergangen","Rücklauf",`Diese Felder kennt der Generator nicht und übergeht sie: ${c.join(", ")}.`);const o={...t,palette:{...t.palette},textScale:{...t.textScale},sonderstufen:{...t.sonderstufen},stroke:{...t.stroke},shadowOffset:{...t.shadowOffset},fontFamily:{...t.fontFamily},pdfFontFamily:{...t.pdfFontFamily},webfontFaces:[...t.webfontFaces]};for(const d of["id","label","markenname","produkt"]){const m=me(n,"Marke",d,i[d]);m!==null&&(o[d]=m,n.nahm(d))}const u=(d,m,f)=>{Object.assign(d,f),Object.keys(f).length&&n.nahm(m)};if(u(o.palette,"palette",n.gruppe("Farbe","Die Palette",i.palette,P,(d,m)=>Gt(n,"Farbe",m,d))),u(o.textScale,"textScale",n.gruppe("Maße","Die Größenleiter",i.textScale,N,(d,m)=>L(n,"Maße",m,d))),u(o.sonderstufen,"sonderstufen",n.gruppe("Maße","Die Stufen außerhalb der Leiter",i.sonderstufen,q,(d,m)=>L(n,"Maße",m,d))),u(o.stroke,"stroke",n.gruppe("Maße","Die Strichstärken",i.stroke,X,(d,m)=>L(n,"Maße",m,d))),u(o.shadowOffset,"shadowOffset",n.gruppe("Maße","Die Schattenversätze",i.shadowOffset,_,(d,m)=>L(n,"Maße",m,d))),i.auszeichnungEnger===void 0)n.melde("fehlt","Maße",'„auszeichnungEnger" kam nicht — der bisherige Wert bleibt stehen.');else{const d=L(n,"Maße","auszeichnungEnger",i.auszeichnungEnger,["em"]);d!==null&&(o.auszeichnungEnger=d,n.nahm("auszeichnungEnger"))}u(o.fontFamily,"fontFamily",n.gruppe("Schrift","Die Schriftstapel",i.fontFamily,v,(d,m)=>me(n,"Schrift",m,d))),u(o.pdfFontFamily,"pdfFontFamily",n.gruppe("Schrift","Die PDF-Ersatzschriften",i.pdfFontFamily,v,(d,m)=>{const f=me(n,"Schrift",m,d);if(f===null)return null;const g=f.toLowerCase();return Z.includes(g)?(g!==f&&n.melde("korrigiert","Schrift",`„${m}": „${f}" → ${g}.`),g):(n.melde("uebergangen","Schrift",`„${f}" ist keine der drei PDF-Kernschriften (${Z.join(", ")}) — der bisherige Wert für „${m}" bleibt stehen.`),null)}));const h=Zt(n,i.webfontFaces);return h&&(o.webfontFaces=h,n.nahm("webfontFaces")),n.melde("gelesen","Rücklauf",`Übernommen: ${n.genommen.size} von ${Re.length} Feldern. Was nicht kam oder nicht taugte, steht unten; die Prüfliste rechts urteilt danach über das Ganze.`),{entwurf:o,befunde:n.befunde,aenderungen:It(t,o),abbruch:null}}const Ce={fehler:{titel:"Nicht gelesen",klasse:"border-ui-danger bg-ui-danger-bg text-ui-danger"},korrigiert:{titel:"Geändert",klasse:"border-ui-strong bg-ui-subtle text-ui-ink"},uebergangen:{titel:"Übergangen",klasse:"border-ui-strong bg-ui-subtle text-ui-ink"},fehlt:{titel:"Kam nicht",klasse:"border-ui bg-ui-surface text-ui-muted"},gelesen:{titel:"Gelesen",klasse:"border-ui bg-ui-surface text-ui-muted"}},Lt=["fehler","korrigiert","uebergangen","fehlt","gelesen"];function Kt({entwurf:e,setzeEntwurf:t,weiter:n,antwort:i,setAntwort:a,vorschlag:r,setVorschlag:l,rueckgaengig:c}){const[o,u]=p.useState(null),h=p.useMemo(()=>Nt(e),[e]),d=r!==null&&r.gelesenGegen!==e,m=async()=>{try{await navigator.clipboard.writeText(h),u("Der Prompt liegt in der Zwischenablage.")}catch{u("Die Zwischenablage ließ sich nicht beschreiben — der Prompt steht unten zum Markieren.")}},f=()=>l({...dn(i,e),gelesenGegen:e}),g=()=>{!(r!=null&&r.entwurf)||d||(t(r.entwurf),l(null))},b=()=>{if(!(r!=null&&r.abbruch))return;const S=Bt(r.abbruch,e);l({...S,gelesenGegen:e})};return s.jsxs(s.Fragment,{children:[s.jsx(O,{titel:"Anfang",hinweis:"Hier entsteht ein eigenes Theme: Farben, Schriften, Maße, Wortmarke. In acht Schritten, rechts immer die Folie dazu. Vorbelegt ist die nozilla-CI — geändert wird nur, was anders sein soll.",children:s.jsx(j,{variant:"primary",icon:"chevron-right",onClick:n,children:"Von Hand ausfüllen"})}),s.jsxs(O,{titel:"Oder: aus den Markenrichtlinien",hinweis:"Den Prompt kopieren, einem Sprachmodell zusammen mit den Richtlinien geben, die Antwort hier einfügen. Der Weg dazwischen ist die Zwischenablage — nichts verlässt diesen Rechner von selbst.",children:[s.jsxs("div",{className:"flex items-center gap-2",children:[s.jsx(j,{icon:"copy",onClick:()=>void m(),children:"Prompt kopieren"}),o?s.jsx("span",{className:"text-[11px] text-ui-muted",children:o}):null]}),s.jsxs("details",{className:"rounded-sm border border-ui bg-ui-sunken",children:[s.jsxs("summary",{className:"cursor-pointer px-2 py-1.5 text-[11px] text-ui-muted",children:["Den Prompt ansehen (",h.split(`
`).length," Zeilen)"]}),s.jsx("pre",{className:"max-h-64 overflow-auto border-t border-ui px-2 py-2 font-mono text-[10px] leading-relaxed text-ui-muted",children:h})]}),s.jsxs("label",{className:"block text-[11px] font-medium text-ui-muted",children:["Die Antwort des Modells",s.jsx("textarea",{value:i,onChange:S=>a(S.target.value),spellCheck:!1,rows:8,placeholder:'{ "id": "probenhaus", "palette": { … } }',className:"mt-1 block w-full rounded-sm border border-ui bg-ui-surface px-2 py-1.5 font-mono text-[11px] leading-relaxed text-ui-ink placeholder:text-ui-faint focus:border-ui-strong focus:outline-none"})]}),s.jsx("p",{className:"text-[11px] leading-snug text-ui-faint",children:"Der Codezaun darf drin bleiben, ein Satz davor auch, und Kommentare im JSON ebenfalls. Was davon herausgenommen werden musste, steht danach im Bericht."}),s.jsxs("div",{className:"flex items-center gap-2",children:[s.jsx(j,{icon:"check",disabled:!i.trim(),onClick:f,children:"Antwort lesen"}),c?s.jsx(j,{variant:"ghost",onClick:c,children:"Rückgängig"}):null]})]}),r?s.jsx(Ht,{vorschlag:r,veraltet:d,lies:f,uebernimm:g,teil:b}):null]})}function Ht({vorschlag:e,veraltet:t,lies:n,uebernimm:i,teil:a}){const{befunde:r,aenderungen:l,abbruch:c,entwurf:o}=e;return s.jsxs("section",{"aria-label":"Bericht zum Rücklauf",className:"border-b border-ui px-4 py-4",children:[s.jsx("h2",{className:"text-ui-title font-semibold text-ui-ink",children:"Das würde daraus"}),t?s.jsxs("p",{className:"mt-2 border border-ui-strong bg-ui-subtle px-2 py-1.5 text-[11px] leading-snug text-ui-ink",children:["Der Entwurf hat sich seit dem Lesen geändert — dieser Vorschlag rechnet gegen einen Stand, den es nicht mehr gibt."," ",s.jsx("button",{type:"button",onClick:n,className:"underline underline-offset-2",children:"Noch einmal lesen"})]}):null,c?s.jsxs("div",{className:"mt-2",children:[s.jsxs(j,{variant:"primary",onClick:a,children:["Den vollständigen Anfang lesen (",Object.keys(c.objekt).length," Felder)"]}),s.jsxs("p",{className:"mt-1 text-[11px] leading-snug text-ui-faint",children:["Angeboten, nicht genommen: vollständig war zuletzt „",c.letzterSchluessel||"(nichts)",'", alles danach bleibt draußen. Fortsetzen lässt sich das Modell ',un(c),"."]})]}):null,o?s.jsxs("div",{className:"mt-2",children:[s.jsx(j,{variant:"primary",disabled:t||!l.length,onClick:i,children:l.length===1?"Einen Wert übernehmen":`${l.length} Werte übernehmen`}),l.length?null:s.jsx("p",{className:"mt-1 text-[11px] leading-snug text-ui-faint",children:"Die Antwort ließ sich lesen und ändert nichts — sie nennt durchweg die Werte, die schon dastehen."})]}):null,l.length?s.jsx(Vt,{aenderungen:l}):null,s.jsx("h3",{className:"mb-2 mt-4 text-ui-title font-semibold text-ui-ink",children:"Beim Lesen"}),s.jsx("div",{className:"flex flex-col gap-1.5",children:Lt.flatMap(u=>r.filter(h=>h.rang===u).map((h,d)=>s.jsxs("p",{className:J("border px-2 py-1.5 text-[11px] leading-snug",Ce[u].klasse),children:[s.jsxs("span",{className:"font-semibold",children:[Ce[u].titel," · ",h.feld]})," ",h.text]},`${u}-${d}`)))})]})}function Vt({aenderungen:e}){const t=[...new Set(e.map(n=>n.feld))];return s.jsx("div",{className:"mt-3",children:t.map(n=>s.jsxs("div",{className:"mb-2",children:[s.jsx("p",{className:"text-[11px] font-medium text-ui-muted",children:n}),s.jsx("table",{className:"w-full table-fixed border-collapse text-[11px]",children:s.jsx("tbody",{children:e.filter(i=>i.feld===n).map(i=>s.jsxs("tr",{className:"align-top",children:[s.jsx("td",{className:"w-28 truncate py-0.5 pr-2 font-mono text-ui-muted",children:i.gruppe&&i.gruppe!=="laufweite"?`${B[i.gruppe].eine} ${i.name}`:i.name}),s.jsx("td",{className:"w-24 truncate py-0.5 pr-1 font-mono text-ui-faint line-through",children:i.war}),s.jsx("td",{className:"truncate py-0.5 font-mono text-ui-ink",children:i.wird})]},`${n}-${i.gruppe??""}-${i.name}`))})})]},n))})}const Ut={"palette.signalStrong":"Kein Zeichner liest sie; sie geht als accent2 in die .pptx.","palette.paperDeep":"Malt die Fläche *neben* der Folie und geht als accent4 in die .pptx — auf der Folie steht sie nie.","palette.ink900":"Steht in der CI und wird von keiner Ausgabe dieses Werkzeugs gelesen.","palette.ink700":"Kein Zeichner liest sie; sie geht als accent5 und folHlink in die .pptx.","palette.ink600":"Kein Zeichner liest sie; sie geht als accent6 in die .pptx.","palette.warn":"Steht in der CI und wird von keiner Ausgabe dieses Werkzeugs gelesen.","palette.danger":"Steht in der CI und wird von keiner Ausgabe dieses Werkzeugs gelesen.","palette.info":"Steht in der CI und wird von keiner Ausgabe dieses Werkzeugs gelesen."},hn=`---
title: Probe
footer: Probe · So sieht diese CI aus.
---

<!-- nzl
layout: title
elements:
  - id: marke
    kind: wordmark
    x: 88
    y: 208
    w: 420
    h: 96
  - id: zeichen
    kind: icon
    x: 984
    y: 208
    w: 96
    h: 96
    icon: rocket
-->

# Die erste Überschrift

Der Fließtext darunter, in der Schrift des Fließtextes.

---

<!-- nzl
layout: split
background: cream
elements:
  - id: papier
    kind: card
    x: 704
    y: 152
    w: 480
    h: 128
    tone: paper
    variant: feature
    label: Ton
    title: Papier
    body: Der warme Hausfarbton dieser Marke.
  - id: weiss
    kind: card
    x: 704
    y: 296
    w: 480
    h: 128
    tone: white
    variant: feature
    label: Ton
    title: Weiß
    body: Das reine Weiß daneben — die beiden müssen zwei sein.
  - id: signalkarte
    kind: card
    x: 704
    y: 440
    w: 480
    h: 128
    tone: signal
    variant: feature
    label: Ton
    title: Signal
    body: Nur echte Handlungsaufforderungen.
-->

## Untergrund Creme, drei Flächenrollen

Fließtext in der Größe des Fließtextes, damit die Zeile zu beurteilen ist.
Ein **fetter** Einschub, ein *kursiver*, ein ==Marker== in der Signalfarbe
und ein \`codeInline\` in der Monospace.

\`\`\`ts
const codeblock = 'auf seinem eigenen Untergrund';
\`\`\`

---

<!-- nzl
layout: split
background: ink
elements:
  - id: tinte
    kind: card
    x: 704
    y: 200
    w: 480
    h: 160
    tone: ink
    variant: stat
    label: Auf Tinte
    title: 72 %
    body: Der gedämpfte Nebensatz trägt den Unterton des Papiers.
-->

## Untergrund Tinte

Hier steht das Papier als Schrift, und die gedämpfte Stufe daneben muss
denselben Unterton haben wie dieser Satz.

\`\`\`ts
const auchHier = 'ein Codeblock braucht seinen Untergrund';
\`\`\`

---

<!-- nzl
layout: default
background: signal
-->

## Untergrund Signal

Schwarz auf der Handlungsfarbe — das Paar, das im Mischer fest verdrahtet ist
und sich nur über die Palette reparieren lässt.

\`\`\`ts
const codeAufSignal = 'auf der weichen Stufe des Signals';
\`\`\`

---

<!-- nzl
layout: default
elements:
  - id: kampagne
    kind: text
    x: 88
    y: 152
    w: 1104
    h: 208
    typeStyle: display
    text: Kampagne.
  - id: schlagzeile
    kind: text
    x: 88
    y: 392
    w: 1104
    h: 136
    typeStyle: headline
    text: Die Schlagzeile darunter.
-->

---

<!-- nzl
layout: split
elements:
  - id: haar
    kind: shape
    x: 704
    y: 168
    w: 88
    h: 88
    fill: outline
    strokeWeight: hair
  - id: linie
    kind: shape
    x: 832
    y: 168
    w: 88
    h: 88
    fill: outline
    strokeWeight: rule
  - id: stark
    kind: shape
    x: 960
    y: 168
    w: 88
    h: 88
    fill: outline
    strokeWeight: strong
  - id: schwer
    kind: shape
    x: 1088
    y: 168
    w: 88
    h: 88
    fill: outline
    strokeWeight: heavy
  - id: ohne
    kind: shape
    x: 704
    y: 320
    w: 88
    h: 88
    fill: framed
    tone: white
    shadow: none
  - id: klein
    kind: shape
    x: 832
    y: 320
    w: 88
    h: 88
    fill: framed
    tone: white
    shadow: sm
  - id: mittel
    kind: shape
    x: 960
    y: 320
    w: 88
    h: 88
    fill: framed
    tone: white
    shadow: md
  - id: gross
    kind: shape
    x: 1088
    y: 320
    w: 88
    h: 88
    fill: framed
    tone: white
    shadow: lg
  - id: pixelzeichen
    kind: icon
    x: 704
    y: 472
    w: 96
    h: 96
    icon: core-pixel-crown
-->

### Auf hellem Papier

Vier Strichstärken, vier Schattenstufen und ein Pixelzeichen: nur dort steht
die tiefe Stufe der Signalfarbe. Der Codeblock darunter liegt auf der zweiten
Papierstufe — die gibt es nur auf diesem Untergrund.

\`\`\`ts
const aufPapier = 'die zweite Papierstufe';
\`\`\`
`,E=[{id:"anfang",titel:"Anfang"},{id:"marke",titel:"Marke"},{id:"farbe",titel:"Farbe"},{id:"schrift",titel:"Schrift"},{id:"masse",titel:"Maße"},{id:"wortmarke",titel:"Wortmarke"},{id:"zeichen",titel:"Zeichen"},{id:"fertig",titel:"Fertig"}],Jt={Rücklauf:"anfang",Marke:"marke",Farbe:"farbe",Schrift:"schrift",Maße:"masse",Wortmarke:"wortmarke",Zeichen:"zeichen",Werkzeug:"fertig"};function te(e){const t=Jt[e];return E.findIndex(n=>n.id===t)}function Xt({entwurf:e,aendere:t}){return s.jsxs(O,{titel:"Marke",hinweis:"Der Schlüssel steht im Frontmatter jedes Decks (theme: …) und lässt sich später nicht mehr ändern, ohne jede Datei anzufassen.",children:[s.jsx(G,{label:"Schlüssel",wert:e.id,auf:n=>t({id:n}),platzhalter:"probenhaus",hinweis:`${en}.`}),s.jsx(G,{label:"Name in der Auswahl",wert:e.label,auf:n=>t({label:n}),platzhalter:"Probenhaus"}),s.jsx(G,{label:"Markenname",wert:e.markenname,auf:n=>t({markenname:n}),hinweis:"Steht als Urheber in jedem PDF und jeder PPTX."}),s.jsx(G,{label:"Produktname",wert:e.produkt,auf:n=>t({produkt:n}),hinweis:"Steht in der Beschreibung des SVG."})]})}function _t({entwurf:e,aendere:t}){return s.jsx(O,{titel:"Farbe",hinweis:"Sechzehn Rollen. Daraus mischt das Werkzeug neunundzwanzig semantische Tokens und die vier Flächenrollen — danach zu fragen wäre die Fehlerklasse, nicht die Gründlichkeit.",children:P.map(n=>s.jsx(yt,{rolle:n,label:n,anker:je("Farbe",n),wert:e.palette[n],hinweis:[sn[n],Ut[`palette.${n}`]].filter(Boolean).join(" "),auf:i=>t({palette:{...e.palette,[n]:i}})},n))})}function qt({entwurf:e,aendere:t}){return s.jsxs(O,{titel:"Schrift",hinweis:"Hinter der eigenen Schrift steht die andere dieser Marke, und erst danach das System. Keine Schrift führt jedes Zeichen — ohne eine zweite fällt ⌘ aus PNG und PDF heraus.",children:[v.map(n=>s.jsx(G,{label:re[n],wert:e.fontFamily[n],auf:i=>t({fontFamily:{...e.fontFamily,[n]:i}})},n)),s.jsx("p",{className:"pt-1 text-[11px] font-medium text-ui-muted",children:"Ersatz im PDF"}),v.map(n=>s.jsx(rn,{label:re[n],wert:e.pdfFontFamily[n],optionen:Z.map(i=>({value:i,label:i})),auf:i=>t({pdfFontFamily:{...e.pdfFontFamily,[n]:i}})},n)),s.jsx(Qt,{entwurf:e,aendere:t})]})}function Qt({entwurf:e,aendere:t}){const n=(i,a)=>t({webfontFaces:e.webfontFaces.map(r=>r.kennung===i?{...r,...a}:r)});return s.jsxs("div",{children:[s.jsxs("p",{className:"pt-1 text-[11px] font-medium text-ui-muted",children:["Schnitte unter ",s.jsx("span",{className:"font-mono",children:"public/fonts/"})]}),s.jsxs("p",{className:"mb-2 text-[11px] leading-snug text-ui-faint",children:["Zu jeder ",s.jsx("span",{className:"font-mono",children:".woff2"})," gehört die gleichnamige"," ",s.jsx("span",{className:"font-mono",children:".ttf"}),": WOFF2 kann nichts lesen, was Glyphen braucht, und PDF wie Umriss-Leser brauchen sie."]}),s.jsx("div",{className:"flex flex-col gap-1",children:e.webfontFaces.map((i,a)=>s.jsxs("div",{className:"flex gap-1",children:[s.jsx("input",{type:"text","aria-label":`Familie des ${a+1}. Schnitts`,value:i.family,onChange:r=>n(i.kennung,{family:r.target.value}),className:"h-7 w-24 min-w-0 rounded-sm border border-ui bg-ui-surface px-1.5 text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"}),s.jsx("input",{type:"number","aria-label":`Gewicht des ${a+1}. Schnitts`,value:Number.isFinite(i.weight)?i.weight:"",step:100,onChange:r=>n(i.kennung,{weight:Number.parseInt(r.target.value,10)}),className:"h-7 w-14 rounded-sm border border-ui bg-ui-surface px-1.5 text-right tabular-nums text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"}),s.jsx("select",{"aria-label":`Stil des ${a+1}. Schnitts`,value:i.style,onChange:r=>n(i.kennung,{style:r.target.value}),className:"h-7 w-20 rounded-sm border border-ui bg-ui-surface px-1 text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none",children:Ve.map(r=>s.jsx("option",{value:r,children:r==="normal"?"aufrecht":"kursiv"},r))}),s.jsx("input",{type:"text","aria-label":`Datei des ${a+1}. Schnitts`,value:i.file,onChange:r=>n(i.kennung,{file:r.target.value}),className:"h-7 min-w-0 flex-1 rounded-sm border border-ui bg-ui-surface px-1.5 font-mono text-[11px] text-ui-ink focus:border-ui-strong focus:outline-none"}),s.jsx(pe,{icon:"trash",label:`${a+1}. Schnitt entfernen${i.family?` (${i.family} ${i.weight})`:""}`,tone:"danger",size:13,className:"h-7 w-7",onClick:()=>t({webfontFaces:e.webfontFaces.filter(r=>r.kennung!==i.kennung)})})]},i.kennung))}),s.jsx(j,{icon:"plus",className:"mt-2 h-7",onClick:()=>t({webfontFaces:[...e.webfontFaces,qn()]}),children:"Schnitt"}),s.jsxs("p",{className:"mt-1 text-[11px] leading-snug text-ui-faint",children:["Vorbelegt sind die ",x.webfont.faces.length," Schnitte, die schon unter"," ",s.jsx("span",{className:"font-mono",children:"public/fonts/"})," liegen."]})]})}function Yt({entwurf:e,aendere:t}){return s.jsxs(O,{titel:"Maße",hinweis:"Die Leiter der Marke. Zeilenhöhe, Schnitt und Versalien bleiben die der Hierarchie — wer sie ändern muss, ändert sie in der erzeugten Datei.",children:[s.jsx("p",{className:"text-[11px] font-medium text-ui-muted",children:B.leiter.ueberschrift}),N.map(n=>s.jsxs("div",{children:[s.jsx(V,{label:n,anker:T("leiter",n),einheit:"px",wert:e.textScale[n],auf:i=>t({textScale:{...e.textScale,[n]:i}})}),s.jsx("p",{className:"ml-26 text-[11px] leading-snug text-ui-faint",children:ln[n]})]},n)),s.jsx("p",{className:"pt-2 text-[11px] font-medium text-ui-muted",children:B.sonder.ueberschrift}),q.map(n=>s.jsxs("div",{children:[s.jsx(V,{label:n,anker:T("sonder",n),einheit:"px",wert:e.sonderstufen[n],auf:i=>t({sonderstufen:{...e.sonderstufen,[n]:i}})}),s.jsx("p",{className:"ml-26 text-[11px] leading-snug text-ui-faint",children:an[n]})]},n)),s.jsx("p",{className:"pt-2 text-[11px] font-medium text-ui-muted",children:B.laufweite.ueberschrift}),s.jsx(V,{label:"enger um",anker:T("laufweite","Laufweite der Auszeichnung"),einheit:"em",schritt:.005,wert:e.auszeichnungEnger,auf:n=>t({auszeichnungEnger:n})}),s.jsx("p",{className:"text-[11px] leading-snug text-ui-faint",children:"Eine Grotesk verträgt in großen Graden mehr Enge als eine Slab-Serif. Null lässt die Laufweite der Hierarchie stehen."}),s.jsx("p",{className:"pt-2 text-[11px] font-medium text-ui-muted",children:B.strich.ueberschrift}),X.map(n=>s.jsxs("div",{children:[s.jsx(V,{label:n,anker:T("strich",n),einheit:"px",schritt:.5,wert:e.stroke[n],auf:i=>t({stroke:{...e.stroke,[n]:i}})}),s.jsx("p",{className:"ml-26 text-[11px] leading-snug text-ui-faint",children:on[n]})]},n)),s.jsx("p",{className:"pt-2 text-[11px] font-medium text-ui-muted",children:B.schatten.ueberschrift}),_.map(n=>s.jsxs("div",{children:[s.jsx(V,{label:n,anker:T("schatten",n),einheit:"px",wert:e.shadowOffset[n],auf:i=>t({shadowOffset:{...e.shadowOffset,[n]:i}})}),s.jsx("p",{className:"ml-26 text-[11px] leading-snug text-ui-faint",children:cn[n]})]},n)),s.jsx("p",{className:"text-[11px] leading-snug text-ui-faint",children:"Ein harter Versatz, kein Weichzeichner. Das ist Struktur und keine Einstellung."})]})}function ei({entwurf:e,aendere:t}){const n=e.wortmarke,[i,a]=p.useState(null),r=async l=>{var o;const c=(o=l.files)==null?void 0:o[0];if(l.value="",!!c){if(c.size>ie){a(`„${c.name}" ist ${Math.round(c.size/1024)} kB groß; mehr als ${Math.round(ie/1024)} kB liest dieses Formular nicht. Eine Wortmarke ist ein Schriftzug aus ein paar Pfaden — so viel Inhalt kommt von eingebetteten Bildern oder einem nachgezeichneten Verlauf, und beides landet nicht auf der Folie.`);return}a(null),t({wortmarke:Qn(await c.text(),c.name)})}};return s.jsxs(O,{titel:"Wortmarke",hinweis:"Als Geometrie, nicht als Bild — nur so landet sie in SVG und PDF als echter Vektor und nimmt die Tinte der Fläche an, auf der sie sitzt.",children:[s.jsxs("label",{className:"block text-[11px] font-medium text-ui-muted",children:["SVG-Datei",s.jsx("input",{type:"file",accept:".svg,image/svg+xml",onChange:l=>void r(l.currentTarget),className:"mt-1 block w-full text-[11px] text-ui-muted file:mr-2 file:h-8 file:rounded-sm file:border file:border-ui file:bg-ui-surface file:px-3 file:text-ui-body file:text-ui-ink"})]}),i?s.jsx("p",{role:"alert",className:"border border-ui-danger bg-ui-danger-bg px-2 py-1.5 text-[11px] leading-snug text-ui-danger",children:i}):null,n?s.jsxs(s.Fragment,{children:[s.jsx("p",{className:"font-mono text-[11px] text-ui-faint",children:n.dateiname}),s.jsx(G,{label:"Füllfarbe der Buchstaben",wert:n.letters,auf:l=>t({wortmarke:{...n,letters:l}}),hinweis:"Wie sie in der Datei steht — nicht die Farbe der Marke."}),s.jsx(G,{label:"Füllfarbe des Akzents",wert:n.accent,auf:l=>t({wortmarke:{...n,accent:l}}),hinweis:"Leer lassen, wenn die Marke keinen Akzent am Wortende hat. Gemalt wird er immer in der Signalfarbe."})]}):null]})}function ni({entwurf:e,aendere:t}){return s.jsx(O,{titel:"Zeichen",hinweis:"Ein Set ersetzt, es ergänzt nicht. Eigene Zeichen trägt man in der erzeugten Datei nach — sie ersetzen den Katalog dann.",children:s.jsx(rn,{label:"Katalog",wert:e.zeichen,optionen:Xn.map(n=>({value:n,label:$t[n]})),auf:n=>t({zeichen:n})})})}const Ge="nz-ci-entwurf-fonts";function ti(e){return Pn(e,()=>{const t=Ke(hn);return t.slides.map((n,i)=>{const a=Mn(n,t,{slideNumber:i+1,totalSlides:t.slides.length});return{markup:Wn(a.prims),hintergrund:a.background,ueberlauf:n.elements.map(r=>({id:r.id,ueber:On(r)})).filter(r=>r.ueber>0)}})})}function ii({theme:e,blatt:t}){const n=p.useMemo(()=>e?En(e.webfont.faces):"",[e]);p.useEffect(()=>{var c;if(!n||!e)return;const l=(c=document.getElementById(Ge))==null?void 0:c.textContent;Dn(Ge,n),l!==n&&An(e.webfont.faces)},[n,e]);const i=Tn(),a=p.useMemo(()=>{if(!e)return null;try{return ti(e)}catch{return null}},[e,i]);if(!a)return s.jsx("div",{className:"flex h-full items-center justify-center p-8 text-center text-ui-body text-ui-faint",children:"Sobald Schlüssel, Palette und Wortmarke stehen, wird hier eine echte Folie gezeichnet — mit demselben Markup, das der SVG-Export erzeugt."});const r=a[Math.min(t,a.length-1)];return s.jsxs("div",{className:"flex h-full flex-col gap-2",children:[s.jsx("div",{className:"w-full shrink-0 border border-ui",style:{aspectRatio:`${Y.width} / ${Y.height}`},children:s.jsx("svg",{viewBox:`0 0 ${Y.width} ${Y.height}`,width:"100%",height:"100%",role:"img","aria-label":`Probefolie ${t+1} von ${a.length}`,dangerouslySetInnerHTML:{__html:r.markup}})}),r.ueberlauf.length>0?s.jsxs("p",{className:"shrink-0 border border-ui-danger bg-ui-danger-bg px-2 py-1.5 text-[11px] leading-snug text-ui-danger",children:[r.ueberlauf.length===1?"Ein Element läuft":`${r.ueberlauf.length} Elemente laufen`," ","aus dem Kasten (",r.ueberlauf.map(l=>`${l.ueber} px`).join(", "),"). Eine breiter laufende Schrift bricht, was von Hand gelegt ist — der Kasten wächst nicht mit."]}):null]})}const ge=Ke(hn).slides.length;let ne=null;function Ze(){if(ne)return ne;const e=rt(),t=e!==null&&be(e.entwurf)&&window.confirm(`Den Entwurf „${e.entwurf.label.trim()||e.entwurf.id.trim()||"ohne Namen"}" von vorhin fortsetzen?`);return t||qe(),ne=t&&e?{entwurf:e.entwurf,verworfen:e.verworfen}:{entwurf:le(),verworfen:[]},ne}function Be(e,t){if(!t.length)return null;const n=t.length===1;return`${e} ${n?"Ein Feld trug":`${t.length} Felder trugen`} etwas, das dieses Formular nicht lesen kann, und ${n?"steht":"stehen"} jetzt auf der Vorbelegung: ${t.join(", ")}.`}function ri(){const[e,t]=p.useState(()=>Ze().entwurf),[n,i]=p.useState(0),[a,r]=p.useState(0),[l,c]=p.useState(()=>Be("Der Entwurf von vorhin ist zurück.",Ze().verworfen)),[o,u]=p.useState(()=>be(e)),h=p.useRef(null),d=p.useRef(null),[m,f]=p.useState(""),[g,b]=p.useState(null),S=p.useRef(null),A=k=>{u(!0),S.current=null,t(w=>({...w,...k}))},W=k=>{u(!0),S.current=e,t(k)},oe=()=>{const k=S.current;k&&(S.current=null,t(k),b(null))};p.useEffect(()=>{if(!o)return;const k=w=>w.preventDefault();return window.addEventListener("beforeunload",k),()=>window.removeEventListener("beforeunload",k)},[o]),p.useEffect(()=>{if(!o)return;const k=window.setTimeout(()=>{const w=it(e);w&&c(w)},500);return()=>window.clearTimeout(k)},[e,o]);const ce=p.useCallback(()=>{window.close(),window.setTimeout(()=>{window.closed||(window.location.href="./index.html")},150)},[]),y=p.useCallback((k,w)=>{var R;i(Math.max(0,Math.min(E.length-1,k))),(R=h.current)==null||R.scrollTo({top:0}),requestAnimationFrame(()=>{var Q;const z=w?document.getElementById(w):null;if(z){z.focus(),z.scrollIntoView({block:"center"});return}(Q=d.current)==null||Q.focus()})},[]);p.useEffect(()=>{const k=w=>{w.key!=="Enter"||!(w.metaKey||w.ctrlKey)||(w.preventDefault(),y(n+1))};return window.addEventListener("keydown",k),()=>window.removeEventListener("keydown",k)},[y,n]);const M=p.useMemo(()=>St(e),[e]),F=Ft(M),K=p.useMemo(()=>{if(!si(M,e.wortmarke!==null))return null;try{return et(e)}catch{return null}},[e,M]),ue=p.useMemo(()=>F?null:ct(e),[e,F]),ye=p.useRef(null),$e=p.useRef("");K&&(ye.current=K),ue!==null&&($e.current=ue);const{stand:ve,veraltet:Ne}=Yn(K,ye.current),mn=ue??$e.current,gn=!e.wortmarke&&ve!==null,Ee=async(k,w,R)=>{try{await Cn(k,w,R),c(null)}catch(z){if(z instanceof DOMException&&z.name==="AbortError")return;c(`Die Datei ließ sich nicht aushändigen: ${String(z)}`)}},pn=async k=>{var R;const w=(R=k.files)==null?void 0:R[0];if(k.value="",!!w&&!(be(e)&&!window.confirm(`Den offenen Entwurf durch „${w.name}" ersetzen?`)))try{const z=JSON.parse(await w.text());if(!z||typeof z!="object"||Array.isArray(z))throw new Error("kein Entwurf");const{entwurf:Q,genommen:bn,verworfen:xn}=Qe(z);if(!bn.length)throw new Error("kein Feld, das dieses Formular kennt");W(Q),c(Be(`„${w.name}" ist angekommen.`,xn)),y(1)}catch(z){c(`„${w.name}" ist kein gesicherter Entwurf: ${String(z)}`)}},D=E[n];return s.jsxs("div",{className:"flex h-screen flex-col bg-ui-sunken text-ui-ink",children:[s.jsxs("header",{className:"flex h-12 shrink-0 items-center gap-3 border-b border-ui bg-ui-surface px-4",children:[s.jsx(Rn,{name:"palette",size:18}),s.jsxs("div",{className:"flex min-w-0 flex-col leading-tight",children:[s.jsx("span",{className:"text-ui-title font-semibold",children:"CI-Generator"}),s.jsx("span",{className:"truncate text-[11px] text-ui-faint",children:"Ein eigenes Erscheinungsbild anlegen — jede Rolle einmal belegt"})]}),s.jsxs("div",{className:"ml-auto flex items-center gap-2",children:[s.jsx(j,{variant:"ghost",disabled:!o,onClick:()=>void Ee(JSON.stringify(e,null,2),`${e.id||"entwurf"}.nzci.json`,"application/json"),children:"Entwurf sichern"}),s.jsxs("label",{className:"cursor-pointer rounded-sm px-3 py-1.5 text-ui-body font-medium text-ui-muted hover:bg-ui-sunken hover:text-ui-ink focus-within:outline focus-within:outline-2 focus-within:outline-ui-accent",children:["Entwurf laden",s.jsx("input",{type:"file",accept:".json,application/json",className:"sr-only",onChange:k=>void pn(k.currentTarget)})]}),s.jsx(j,{variant:"ghost",disabled:!o,onClick:()=>{window.confirm("Den Entwurf verwerfen und von vorn anfangen?")&&(qe(),t(le()),u(!1),c(null),r(0),f(""),b(null),S.current=null,y(0))},children:"Zurücksetzen"}),s.jsx(j,{variant:"ghost",icon:"chevron-right",className:"[&>svg]:-scale-x-100",onClick:ce,children:"Zurück zum Werkzeug"})]})]}),s.jsx(ai,{jetzt:n,befunde:M,auf:y}),l?s.jsx("p",{role:"alert",className:"shrink-0 border-b border-ui-danger bg-ui-danger-bg px-4 py-2 text-ui-body text-ui-danger",children:l}):null,s.jsxs("div",{className:"flex min-h-0 flex-1",children:[s.jsxs("div",{className:"flex w-[440px] shrink-0 flex-col border-r border-ui bg-ui-surface",children:[s.jsxs("div",{ref:h,id:"nz-ci-schritt",role:"tabpanel","aria-labelledby":`nz-ci-reiter-${D.id}`,className:"min-h-0 flex-1 overflow-y-auto",children:[s.jsxs("h2",{ref:d,tabIndex:-1,className:"sr-only",children:["Schritt ",n+1," von ",E.length,": ",D.titel]}),D.id==="anfang"?s.jsx(Kt,{entwurf:e,setzeEntwurf:W,weiter:()=>y(1),antwort:m,setAntwort:f,vorschlag:g,setVorschlag:b,rueckgaengig:S.current?oe:null}):null,D.id==="marke"?s.jsx(Xt,{entwurf:e,aendere:A}):null,D.id==="farbe"?s.jsx(_t,{entwurf:e,aendere:A}):null,D.id==="schrift"?s.jsx(qt,{entwurf:e,aendere:A}):null,D.id==="masse"?s.jsx(Yt,{entwurf:e,aendere:A}):null,D.id==="wortmarke"?s.jsx(ei,{entwurf:e,aendere:A}):null,D.id==="zeichen"?s.jsx(ni,{entwurf:e,aendere:A}):null,D.id==="fertig"?s.jsx(oi,{entwurf:e,quelltext:mn,fehlerhaft:F,sichere:Ee}):null]}),s.jsxs("div",{className:"flex shrink-0 items-center gap-2 border-t border-ui px-4 py-3",children:[s.jsx(j,{icon:"chevron-right",className:"[&>svg]:-scale-x-100",disabled:n===0,onClick:()=>y(n-1),children:"Zurück"}),s.jsx(j,{variant:"primary",trailingIcon:"chevron-right",disabled:n>=E.length-1,onClick:()=>y(n+1),children:"Weiter"}),s.jsxs("span",{className:"ml-auto text-[11px] text-ui-faint",children:["Schritt ",n+1," von ",E.length]})]})]}),s.jsxs("div",{className:"flex min-w-0 flex-1 flex-col overflow-hidden p-4",children:[s.jsxs("div",{className:"mb-2 flex shrink-0 items-center gap-2",children:[s.jsx("h2",{className:"text-ui-title font-semibold",children:"Probefolie"}),s.jsxs("span",{className:"text-[11px] text-ui-faint",children:[a+1," / ",ge]}),s.jsxs("div",{className:"ml-auto flex gap-1",children:[s.jsx(pe,{icon:"chevron-right",label:"Vorige Probefolie",className:"-scale-x-100",disabled:a===0,onClick:()=>r(k=>Math.max(0,k-1))}),s.jsx(pe,{icon:"chevron-right",label:"Nächste Probefolie",disabled:a>=ge-1,onClick:()=>r(k=>Math.min(ge-1,k+1))})]})]}),Ne?s.jsx("p",{className:"mb-2 shrink-0 border border-ui-strong bg-ui-subtle px-2 py-1.5 text-[11px] leading-snug text-ui-ink",children:"Nicht mehr aktuell: der Entwurf trägt gerade einen Fehler. Zu sehen ist der letzte Stand, aus dem sich zeichnen ließ — was offen ist, steht unten."}):null,gn?s.jsx("p",{className:"mb-2 shrink-0 border border-ui-strong bg-ui-subtle px-2 py-1.5 text-[11px] leading-snug text-ui-ink",children:"Die Wortmarke unten rechts ist ein Platzhalter — sie fehlt noch. Die Farben und die Schrift stimmen; die Datei entsteht erst, wenn eine echte da ist."}):null,s.jsx("div",{className:J("shrink-0",Ne&&"opacity-60"),children:s.jsx(ii,{theme:ve,blatt:a})}),s.jsx("div",{className:"mt-4 flex min-h-24 flex-1 flex-col overflow-y-auto",children:s.jsx(li,{befunde:M,jetzt:n,auf:y})})]})]})]})}function si(e,t){return e.every(n=>n.rang!=="fehler"||!(n.feld==="Farbe"||n.feld==="Maße"||n.feld==="Wortmarke"&&t))}function ai({jetzt:e,befunde:t,auf:n}){const i=E.map(()=>({fehler:0,warnung:0}));for(const r of t){const l=te(r.feld);l<0||(r.rang==="fehler"&&(i[l].fehler+=1),r.rang==="warnung"&&(i[l].warnung+=1))}const a=r=>{const l=r.key==="ArrowRight"?e+1:r.key==="ArrowLeft"?e-1:r.key==="Home"?0:r.key==="End"?E.length-1:null;if(l===null)return;r.preventDefault();const c=Math.max(0,Math.min(E.length-1,l));n(c,`nz-ci-reiter-${E[c].id}`)};return s.jsx("div",{role:"tablist","aria-label":"Schritte",onKeyDown:a,className:"flex shrink-0 items-stretch gap-1 overflow-x-auto border-b border-ui bg-ui-surface px-4 py-2",children:E.map((r,l)=>{const c=i[l],o=l===e,u=[`Schritt ${l+1}: ${r.titel}`,c.fehler?`${c.fehler} mal „Fehler"`:"",c.warnung?`${c.warnung} mal „läuft, ist aber falsch"`:""].filter(Boolean).join(", ");return s.jsxs("button",{type:"button",role:"tab",id:`nz-ci-reiter-${r.id}`,"aria-label":u,"aria-selected":o,"aria-controls":"nz-ci-schritt",tabIndex:o?0:-1,onClick:()=>n(l),className:J("flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 py-1 text-[11px] transition-colors",o?"border-ui-strong bg-ui-accent-soft font-semibold text-ui-ink":"border-transparent text-ui-muted hover:bg-ui-sunken hover:text-ui-ink"),children:[s.jsx("span",{className:"tabular-nums text-ui-faint",children:l+1}),r.titel,c.fehler?s.jsx("span",{"aria-hidden":"true",className:"rounded-sm bg-ui-danger-bg px-1 font-semibold text-ui-danger",children:c.fehler}):null,!c.fehler&&c.warnung?s.jsx("span",{"aria-hidden":"true",className:"rounded-sm border border-ui-strong px-1 text-ui-muted",children:c.warnung}):null]},r.id)})})}const Ie={fehler:{titel:"Fehler",klasse:"border-ui-danger bg-ui-danger-bg text-ui-danger"},warnung:{titel:"Läuft, ist aber falsch",klasse:"border-ui-strong bg-ui-subtle text-ui-ink"},hinweis:{titel:"Zu wissen",klasse:"border-ui bg-ui-surface text-ui-muted"}};function li({befunde:e,jetzt:t,auf:n}){const a=["fehler","warnung","hinweis"].flatMap(r=>{const l=e.filter(o=>o.rang===r&&te(o.feld)===t),c=e.filter(o=>o.rang===r&&te(o.feld)!==t);return[...l,...c].map(o=>({befund:o,rang:r}))});return s.jsxs("div",{className:"shrink-0",children:[s.jsx("h2",{className:"mb-2 text-ui-title font-semibold",children:"Prüfliste"}),s.jsx("div",{className:"flex flex-col gap-1.5",children:a.map(({befund:r,rang:l},c)=>{const o=te(r.feld),u=o>=0&&o!==t;return s.jsxs("p",{className:J("border px-2 py-1.5 text-[11px] leading-snug",Ie[l].klasse),children:[s.jsxs("span",{className:"font-semibold",children:[Ie[l].titel," · ",r.feld]})," ",r.text," ",o>=0&&(u||r.anker)?s.jsx("button",{type:"button",onClick:()=>n(o,r.anker),className:"underline underline-offset-2 hover:no-underline",children:u?`Zu Schritt ${o+1}`:"Zum Feld"}):null]},`${l}-${c}`)})})]})}function oi({entwurf:e,quelltext:t,fehlerhaft:n,sichere:i}){return s.jsxs("section",{className:"px-4 py-4",children:[s.jsx("h2",{className:"text-ui-title font-semibold text-ui-ink",children:"Fertig"}),s.jsxs("p",{className:"mt-1 text-[11px] leading-snug text-ui-faint",children:["Zwei Dateien, vier Handgriffe. Solange in der Prüfliste ein Fehler steht, entsteht keine Datei — eine mit ",s.jsx("span",{className:"font-mono",children:"NaN"})," darin übersetzt anstandslos und setzt danach jahrelang leise falsch."]}),s.jsxs("div",{className:"mt-3 flex gap-2",children:[s.jsx(j,{variant:"primary",icon:"download",disabled:n||!e.wortmarke,onClick:()=>void i(t,`${e.id}.ts`,"text/plain"),children:"Designdatei"}),s.jsx(j,{icon:"download",disabled:!e.wortmarke||!e.id.trim(),onClick:()=>{var a;return void i(((a=e.wortmarke)==null?void 0:a.svg)??"",ze(e.id),"image/svg+xml")},children:"Wortmarke"})]}),s.jsx("h3",{className:"mb-2 mt-4 text-ui-title font-semibold",children:"Danach"}),s.jsx("pre",{className:"whitespace-pre-wrap rounded-sm border border-ui bg-ui-sunken p-3 font-mono text-[11px] leading-relaxed text-ui-muted",children:ut(e)}),s.jsxs("h3",{className:"mb-2 mt-4 text-ui-title font-semibold",children:["src/themes/",e.id||"…",".ts"]}),n&&t?s.jsx("p",{className:"mb-2 border border-ui-strong bg-ui-subtle px-2 py-1.5 text-[11px] leading-snug text-ui-ink",children:"Nicht mehr aktuell: zu sehen ist der letzte Stand, aus dem sich eine Datei bauen ließ. Was offen ist, steht in der Prüfliste — und der Knopf oben bleibt so lange gesperrt."}):null,s.jsx("pre",{className:"overflow-x-auto rounded-sm border border-ui bg-ui-sunken p-3 font-mono text-[10px] leading-relaxed text-ui-ink",children:t||"Die Datei entsteht, sobald kein Fehler mehr in der Prüfliste steht."})]})}Gn();xe();He();Zn(()=>{xe(),He()});Bn(()=>xe());In();const fn=document.getElementById("root");if(!fn)throw new Error("Root container #root is missing from ci.html");Ln.createRoot(fn).render(s.jsx(p.StrictMode,{children:s.jsx(ri,{})}));
//# sourceMappingURL=ci-DRtuIyqs.js.map
