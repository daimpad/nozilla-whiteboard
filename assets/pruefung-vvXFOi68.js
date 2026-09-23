import{cM as G,cN as N,d as b,f as $,t as m,b as Z,a as O,s as L,cO as C,cP as S,cQ as I,cR as V,cS as K,e as v,cT as U,cU as _,cr as y,cV as H,cW as X,n as J,cX as q,cY as T}from"./index-wzQ8B2xv.js";function g(e){const n=(e.match(/'/g)??[]).length,i=(e.match(/"/g)??[]).length,t=JSON.stringify(e);return n>i?t:`'${t.slice(1,-1).replace(/\\"/g,'"').replace(/'/g,"\\'")}'`}function Q(e){return[...e].map(i=>i<" "?" ":i).join("").replace(/[\u0085\u180E\u200B]/g," ").replace(/\s+/g," ").replace(/\*\//g,"* /").trim()}function j(e){return/^[A-Za-z_$][\w$]*$/.test(e)?e:g(e)}const be="Kleinschrift, Ziffern und Bindestriche, beginnend mit einem Buchstaben — ein Bindestrich aber nur vor einem Buchstaben (probe-haus ja, probe-2024 nein)";function E(e){return e.replace(/-([a-z])/g,(n,i)=>i.toUpperCase())}const Y=new Set(["break","case","catch","class","const","continue","debugger","default","delete","do","else","enum","export","extends","false","finally","for","function","if","import","in","instanceof","new","null","return","super","switch","this","throw","true","try","typeof","var","void","while","with","implements","interface","let","package","private","protected","public","static","yield","await","arguments","eval","undefined","NaN","Infinity","palette","inkAlpha","paperAlpha","textScale","sonderstufen","stufeMitWert","typeScale","faces","wortmarke","colorsFromPalette","nozillaIcons","nozillaTheme","tonesFromPalette","wordmarkFromSvg","withoutSignature","BrandTheme","TypeScale","TypeStyle"]);function W(e){const n=E(e);return/^[A-Za-z_$][\w$]*$/.test(n)?Y.has(n)?`Aus „${e}" wird der Exportname „${n}", und der ist vergeben — entweder von JavaScript selbst oder von einem Namen, den die erzeugte Datei daneben schon benutzt.`:null:`Aus „${e}" wird der Exportname „${n}", und das ist kein gültiger Bezeichner. Der Schlüssel darf Bindestriche tragen — aber nur vor einem Buchstaben, denn nur die zieht der Emitter zusammen.`}function ee(e){const n=[$.filter(t=>t.startsWith("signal")),$.filter(t=>t.startsWith("paper")||t==="white"),$.filter(t=>t.startsWith("ink"))],i=new Set(n.flat());return n.push($.filter(t=>!i.has(t))),n.filter(t=>t.length>0).map(t=>t.map(l=>`  ${j(l)}: ${g(e.palette[l])},`).join(`
`)).join(`

`)}function A(e,n,i){const t=i.replace("#",""),l=[0,2,4].map(s=>Number.parseInt(t.slice(s,s+2),16)),r=[70,50,20].map((s,o)=>`  ${s}: 'rgba(${l[0]}, ${l[1]}, ${l[2]}, ${n[o].toFixed(2)})',`).join(`
`);return`const ${e} = {
${r}
};`}function ne(e){return e.webfontFaces.map(n=>["  {",`    family: ${g(n.family)},`,`    weight: ${P(n.weight,`Gewicht von ${n.family}`)},`,`    style: ${g(n.style)},`,`    file: ${g(n.file)},`,"  },"].join(`
`)).join(`
`)}function F(e,n,i="  "){return n.map(t=>`${i}${j(t)}: ${P(e[t],t)},`).join(`
`)}function P(e,n){if(!Number.isFinite(e))throw new Error(`„${n}" trägt keine Zahl (${e}) — daraus wird keine Designdatei.`);return e}function ke(e){const n=W(e.id);if(n)throw new Error(n);const i=e.wortmarke;if(!i)throw new Error("Ohne Wortmarke gibt es keine Designdatei. Sie ist Pflicht und hat mit Absicht keine Voreinstellung — die erzeugte Datei trüge sonst eine leere Füllfarbe und zeichnete nichts.");const t=B(e.id),l=E(e.id),r=`/**
 * ${Q(e.label)} — dieses Erscheinungsbild.
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
 * import { ${l} } from './${e.id}';
 * const brandThemes: BrandTheme[] = [musterkunde, ${l}];
 * \`\`\`
 *
 * Eine Datei, die hier liegt und nicht angemeldet ist, führt der Inspektor als
 * „nicht installiert" — das Deck sieht dann nach einem Fehler des Werkzeugs
 * aus, obwohl nur eine Zeile fehlt.
 */`,s=`import {
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
import wortmarke from './${t}?raw';`,o=`/**
 * Die Palette. Einmal genannt — Tonrollen und semantische Tokens werden daraus
 * gemischt, damit keine Farbe an zwei Stellen steht.
 *
 * \`paper\` ist das Papier dieser Marke, \`white\` ihr reines Weiß. Die beiden
 * müssen zwei sein: sie belegen je einen Untergrund („Creme" und „Weiß") und je
 * eine Flächenrolle, und wer ihnen denselben Wert gibt, bekommt vier
 * Menüeinträge, die dasselbe malen.
 */
const palette = {
${ee(e)}
};

/**
 * Tinte und Papier mit Deckkraft — die Werte gehören zu *dieser* Palette.
 *
 * \`paperAlpha\` ist das Papier und nicht das Weiß: es malt den gedämpften Text
 * auf einer Folie in Tinte, und der soll denselben Unterton haben wie der laute
 * darüber.
 */
${A("inkAlpha",G,e.palette.ink)}
${A("paperAlpha",N,e.palette.paper)}`,a=`/**
 * Die Größenleiter dieser Marke — acht Stufen, und sonst gibt es keine.
 */
const textScale = {
${F(e.textScale,m)}
};

/**
 * Die drei Größen, die auf keiner Stufe der Leiter sitzen: die
 * Kampagnengröße, die Fußzeile unterhalb der Leiter und der Code im Fließtext,
 * der knapp darunter steht, weil eine Monospace breiter baut.
 */
const sonderstufen: Record<string, number> = {
${F(e.sonderstufen,Z)}
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
        tracking: stil.family === 'display' ? stil.tracking - ${P(e.auszeichnungEnger,"Laufweite")} : stil.tracking,
      } satisfies TypeStyle,
    ];
  }),
) as TypeScale;`,c=`/**
 * Die selbst gehosteten Schnitte. Zu jeder \`.woff2\` muss unter
 * \`public/fonts/\` auch die gleichnamige \`.ttf\` liegen: WOFF2 kann nichts
 * lesen, was Glyphen braucht, und PDF wie Umriss-Leser brauchen \`glyf\`.
 */
const faces = [
${ne(e)}
];`,f=`export const ${l}: BrandTheme = {
  id: ${g(e.id)},
  label: ${g(e.label)},

  brand: {
    ...nozillaTheme.brand,
    name: ${g(e.markenname)},
    product: ${g(e.produkt)},
  },

  /*
     Aus der SVG-Datei gelesen, nicht als Bild eingebunden: nur so landet die
     Marke in SVG *und* PDF als echter Vektor und nimmt die Tinte der Fläche an,
     auf der sie sitzt. Zugeordnet wird über die Füllfarbe — eine
     Zeichensoftware sortiert Pfade um, wie sie will.
  */
  wordmark: wordmarkFromSvg(wortmarke, {
    letters: ${g(i.letters)},${i.accent?`
    accent: ${g(i.accent)},`:""}
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
${b.map(d=>`    ${d}: ${g(e.fontFamily[d])},`).join(`
`)}
  },
  webfont: { ...nozillaTheme.webfont, faces },
  pdfFontFamily: {
${b.map(d=>`    ${d}: ${g(e.pdfFontFamily[d])},`).join(`
`)}
  },

  stroke: {
${F(e.stroke,O,"    ")}
  },
  shadowOffset: {
${F(e.shadowOffset,L,"    ")}
  },
};`;return[r,s,o,a,c,f].join(`

`)+`
`}function B(e){return`${e}-wortmarke.svg`}function Se(e){const n=E(e.id);return`1 · Die beiden Dateien ablegen

   src/themes/${e.id}.ts
   src/themes/${B(e.id)}

2 · Anmelden — src/themes/index.ts

   import { ${n} } from './${e.id}';
   const brandThemes: BrandTheme[] = [musterkunde, ${n}];

3 · Die Schriften

   Zu jeder .woff2 gehört die gleichnamige .ttf unter public/fonts/.
   Fehlt die .ttf, sehen Fläche und SVG richtig aus — PDF und PNG nicht.

4 · Prüfen

   npm run build && npm run test

   Ein Deck stellt man mit  theme: ${e.id}  im Frontmatter um.`}function x(e,n){return`nz-ci-${e.toLowerCase().replace(/ß/g,"ss")}-${n}`}const te={leiter:{eine:"Größenleiter",ueberschrift:"Größenleiter"},sonder:{eine:"Stufe",ueberschrift:"Stufen außerhalb der Leiter"},laufweite:{eine:"Laufweite",ueberschrift:"Laufweite der Auszeichnung"},strich:{eine:"Strichstärke",ueberschrift:"Strichstärken"},schatten:{eine:"Schattenversatz",ueberschrift:"Schattenversätze"}};function w(e,n){return x("Maße",`${e}-${n}`)}const ie=new Set(["nozilla","musterkunde"]);function re(e,n){const i=[],t="Marke";if(!e.id.trim())i.push({rang:"fehler",feld:t,text:"Der Schlüssel fehlt."});else if(!/^[a-z][a-z0-9-]*$/.test(e.id))i.push({rang:"fehler",feld:t,text:`„${e.id}" taugt nicht als Schlüssel: Kleinschrift, Ziffern und Bindestriche, beginnend mit einem Buchstaben. Er steht so im Frontmatter jedes Decks (theme: …).`});else if(ie.has(e.id))i.push({rang:"fehler",feld:t,text:`„${e.id}" ist vergeben. Ein bereits angemeldeter Schlüssel ersetzt das dortige Erscheinungsbild kommentarlos — bei „nozilla" also die eigene CI.`});else if(n==="designdatei"){const l=W(e.id);l&&i.push({rang:"fehler",feld:t,text:l})}return e.label.trim()||i.push({rang:"fehler",feld:t,text:"Der Name für die Auswahl fehlt."}),e.markenname.trim()||i.push({rang:"warnung",feld:t,text:"Ohne Markennamen steht in jedem exportierten PDF und jeder PPTX ein leerer Urheber."}),e.produkt.trim()||i.push({rang:"warnung",feld:t,text:"Ohne Produktnamen steht in jedem SVG eine leere Beschreibung und in jeder PPTX eine leere Anwendung."}),i}const ae=[{vorn:"ink",hinten:"white",wo:"Fließtext auf einer weißen Folie",schwelle:S},{vorn:"ink",hinten:"paper",wo:"Fließtext auf einer cremefarbenen Folie",schwelle:S},{vorn:"ink",hinten:"signal",wo:"Schrift auf einer Signalfläche",schwelle:S},{vorn:"paper",hinten:"ink",wo:"Schrift auf einer Folie in Tinte",schwelle:S},{vorn:"ink",hinten:"signalSoft",wo:"Code auf einer Signalfolie",schwelle:S},{vorn:"paper",hinten:"ink800",wo:"Code auf einer Folie in Tinte",schwelle:I}],se=[{a:"paper",b:"white",wo:'die Untergründe „Creme" und „Weiß" und die Flächenrollen daneben'},{a:"signalSoft",b:"signal",wo:"der Code-Untergrund auf einer Signalfolie"},{a:"ink800",b:"ink",wo:"der Code-Untergrund auf einer Folie in Tinte"},{a:"signalStrong",b:"signal",wo:"der gedrückte Zustand einer Signalfläche"}],le=[{grund:"signal",stufen:["signalStrong","signalSoft","signalDeep"],wo:"die Signalfläche und der Code darauf"},{grund:"ink",stufen:["ink900","ink800","ink700","ink600"],wo:"die Folie in Tinte und der Code darauf"},{grund:"paper",stufen:["paperAlt","paperDeep"],wo:"die Papierstufen"}];function M(e){const n=[];for(const i of le){const t=T(e[i.grund]??"");if(t)for(const l of i.stufen){const r=T(e[l]??"");!r||r===t||n.push({rang:"warnung",feld:"Farbe",anker:x("Farbe",l),text:`„${l}" liegt in einer anderen Farbfamilie als „${i.grund}" (${r} gegen ${t}). Die Rolle ist als Stufe desselben Tons gedacht. Betroffen ist ${i.wo}. Häufigster Grund: die Rolle kam aus der Vorlage nicht und steht noch auf nozillas Wert.`})}}return n}function R(e,n=new Set){const i=[];for(const t of se){const l=e[t.a],r=e[t.b];!l||!r||n.has(t.a)||n.has(t.b)||q(l,r)||i.push({rang:"warnung",feld:"Farbe",text:`„${t.a}" und „${t.b}" sind dieselbe Farbe. Betroffen ist ${t.wo} — nichts geht kaputt, die Wahl tut nur nichts.`})}return i}function oe(e){const n=[],i="Farbe",t=e.palette,l=new Set;for(const r of $){const s=(t[r]??"").trim();C(s)||(l.add(r),n.push({rang:"fehler",feld:i,anker:x(i,r),text:`„${r}" ist kein #RRGGBB: „${s}". Kurzschreibweise, rgb() und Farbnamen lassen withAlpha() schon beim Anlegen werfen — und tonesOutsidePalette() vergleicht Zeichenketten, #ffffff und #FFFFFF sind für sie zwei Farben.`}))}n.push(...R(t,l)),n.push(...M(t));for(const r of ae){if(l.has(r.vorn)||l.has(r.hinten))continue;const s=V(t[r.vorn],t[r.hinten]);s<r.schwelle&&n.push({rang:"warnung",feld:i,text:`${r.wo}: Kontrast ${s.toFixed(1)} : 1, verlangt sind ${r.schwelle} : 1. Diese Paarung steht fest im Mischer — sie lässt sich nur über die Palette reparieren, nicht in der erzeugten Datei.`})}return n}function he(e){return(e.split(",")[0]??"").trim().replace(/^['"]|['"]$/g,"")}function z(e){return e.split(",").map(n=>n.trim().replace(/^['"]|['"]$/g,"")).filter(Boolean)}function ce(e){var o;const n=[],i="Schrift",t=new Set(e.webfontFaces.map(a=>a.family)),l=a=>z(e.fontFamily[a])[0]??"";for(const a of b){const c=e.fontFamily[a]??"",f=z(c),d=f[0]??"";if(!d){n.push({rang:"fehler",feld:i,text:`Der Stapel für „${a}" ist leer.`});continue}t.has(d)||n.push({rang:"fehler",feld:i,text:`„${d}" steht vorn im Stapel für „${a}", aber in keinem Schnitt. resolveFace() vergleicht buchstabengleich; passt der Name nicht, findet der Export keine Datei und fällt still auf die PDF-Ersatzschrift zurück — kein Fehler, keine Warnung, nur eine andere Schrift.`});const u=new Set([a]);for(const h of f){const p=b.find(k=>l(k)===h);p&&u.add(p)}u.size<2&&n.push({rang:"warnung",feld:i,text:`Der Stapel für „${a}" führt zu keiner zweiten Marken-Schrift. Keine Schrift führt jedes Zeichen — Space Mono kennt ⌘, ⌫, ⇧ und ⌥ nicht —, und der Export sucht ein fehlendes Zeichen der Reihe nach in den Schriften der *anderen Rollen*. Eine Familie, die keinen Stapel anführt, zählt dabei nicht: nenne an zweiter Stelle die Schrift, die vorn in einem anderen Stapel steht.`})}const r=new Set(b.flatMap(a=>z(e.fontFamily[a])));for(const a of t)a.trim()&&!r.has(a)&&n.push({rang:"warnung",feld:i,text:`„${a}" hat Schnitte, aber kein Stapel nennt sie. Die Dateien werden in jeder Sitzung geladen und nie gezeichnet.`});for(const a of t)e.webfontFaces.filter(f=>f.family===a).some(f=>f.style==="normal")||n.push({rang:"fehler",feld:i,text:`„${a}" hat keinen aufrechten Schnitt (style: normal).`});const s=new Map;for(const a of Object.values(K(e))){const c=l(a.family);c&&(s.has(c)||s.set(c,new Set),(o=s.get(c))==null||o.add(a.weight))}for(const[a,c]of s){if(!t.has(a))continue;const f=new Set(e.webfontFaces.filter(u=>u.family===a&&u.style==="normal").map(u=>u.weight)),d=[...c].filter(u=>!f.has(u)).sort((u,h)=>u-h);d.length&&n.push({rang:"warnung",feld:i,text:`Die Hierarchie setzt „${a}" in ${d.join(", ")}, und dafür gibt es keinen Schnitt. resolveFace() nimmt dann den nächstliegenden: der Bildschirm simuliert fett, PNG, PDF und PPTX zeichnen den vorhandenen Schnitt — und die beiden zeigen Verschiedenes.`})}for(const a of e.webfontFaces)a.family.trim()||n.push({rang:"fehler",feld:i,text:"Ein Schnitt ohne Familie gehört nicht in die Liste."}),a.file.trim()||n.push({rang:"fehler",feld:i,text:`Der Schnitt „${a.family||"(ohne Familie)"} ${a.weight}" nennt keine Datei.`}),(!Number.isInteger(a.weight)||a.weight<100||a.weight>900)&&n.push({rang:"fehler",feld:i,text:`„${a.family||"(ohne Familie)"}" trägt das Gewicht ${a.weight}. Ein @font-face kennt 100 bis 900 — alles andere macht die Regel ungültig, und der Schnitt gilt still als 400.`}),a.file.trim()&&!a.file.endsWith(".woff2")&&n.push({rang:"fehler",feld:i,text:`„${a.file}" ist kein WOFF2. loadTtf() tauscht für den Export nur die Endung — die Angabe muss die WOFF2-Datei nennen.`});for(const a of b){const c=e.pdfFontFamily[a];v.includes(c)||n.push({rang:"fehler",feld:i,text:`„${c}" ist keine der drei PDF-Kernschriften (${v.join(", ")}).`})}return n}function de(e){const n=[],i=(r,s,o)=>Number.isFinite(r)?!0:(n.push({rang:"fehler",feld:"Maße",anker:w(s,o),text:`„${o}" trägt keine Zahl. Ein leeres Zahlenfeld schreibt NaN in die Designdatei, und die übersetzt damit anstandslos.`}),!1),t=(r,s,o)=>i(r,s,o)?r<=0?(n.push({rang:"fehler",feld:"Maße",anker:w(s,o),text:`„${o}" ist keine Größe: ${r}.`}),!1):!0:!1,l=(r,s,o,a,c,f)=>{!Number.isFinite(r)||r>=a&&r<=c||n.push({rang:"warnung",feld:"Maße",anker:w(s,o),text:`„${o}" trägt ${r}. ${f} Die Datei entsteht trotzdem — zu sehen ist es erst auf der Folie.`})};for(const r of m)t(e.textScale[r],"leiter",r)&&l(e.textScale[r],"leiter",r,6,400,"Die Folie ist 1280 × 720 groß; darunter liest es niemand mehr, darüber ist es keine Schrift mehr.");for(const[r,s]of Object.entries(e.stroke))t(s,"strich",r)&&l(s,"strich",r,.25,20,"Ein Strich von dieser Stärke ist eine Fläche.");for(const[r,s]of Object.entries(e.sonderstufen))t(s,"sonder",r)&&l(s,"sonder",r,6,400,"Dieselbe Spanne wie für die Leiter.");i(e.auszeichnungEnger,"laufweite","Laufweite der Auszeichnung")&&l(e.auszeichnungEnger,"laufweite","Laufweite der Auszeichnung",-.1,.1,"Sie steht in em und verschiebt die Laufweite der Hierarchie; ein Zehntel Geviert ist bereits sehr viel.");for(const[r,s]of Object.entries(e.shadowOffset)){if(r==="none"){i(s,"schatten",r)&&s!==0&&n.push({rang:"warnung",feld:"Maße",anker:w("schatten",r),text:`„none" trägt ${s} statt 0 — dann hat „kein Schatten" einen Schatten.`});continue}t(s,"schatten",r)&&l(s,"schatten",r,1,64,"Ein Versatz von dieser Größe schiebt die Fläche aus der Folie.")}for(let r=1;r<m.length;r+=1){const s=e.textScale[m[r-1]],o=e.textScale[m[r]];!Number.isFinite(s)||!Number.isFinite(o)||o<=s&&n.push({rang:"warnung",feld:"Maße",text:`Die Leiter steigt nicht: „${m[r]}" (${o}) ist nicht größer als „${m[r-1]}" (${s}).`})}return n}const D=256*1024;function ue(e){const n="Wortmarke",i=e.wortmarke;if(!i)return[{rang:"fehler",feld:n,text:"Die Wortmarke fehlt. Sie ist Pflicht und hat mit Absicht keine Voreinstellung — fehlte sie, trüge ein Deck unter fremder Marke die von nozilla."}];const t=[];if(i.svg.length>D)return t.push({rang:"fehler",feld:n,text:`Die Datei ist ${Math.round(i.svg.length/1024)} kB groß; mehr als ${Math.round(D/1024)} kB liest dieses Formular nicht. Eine Wortmarke ist ein Schriftzug aus ein paar Pfaden — so viel Inhalt kommt von eingebetteten Bildern oder einem nachgezeichneten Verlauf, und beides landet nicht auf der Folie.`}),t;const l=U(i.svg);l?(l[2]<=0||l[3]<=0)&&t.push({rang:"fehler",feld:n,text:`Die viewBox hat die Größe ${l[2]} × ${l[3]}. Daraus lässt sich nichts zeichnen — die Marke fiele aus jeder Ausgabe heraus, ohne dass etwas anschlägt.`}):t.push({rang:"fehler",feld:n,text:"Die SVG-Datei hat keine lesbare viewBox."});const r=_(i.svg);r.transformationen>0&&t.push({rang:"fehler",feld:n,text:`Die Datei trägt ${y(r.transformationen,"Transformation","Transformationen")} (transform=…). Dieser Leser wendet sie nicht an — die Pfade landen dort, wo ihre Zahlen stehen, und das ist bei einer Inkscape-Ebene weit außerhalb der viewBox. Exportiere die Datei mit eingerechneten Transformationen (Inkscape: „Transformationen speichern: optimiert“; Illustrator und Figma: Gruppe vorher auflösen).`}),r.formen>0&&t.push({rang:"fehler",feld:n,text:`Die Datei enthält ${y(r.formen,"Form","Formen")}, die kein <path> ist — Rechteck, Kreis, Ellipse, Linie, Polygon oder ein Verweis. Gelesen werden nur Pfade; diese Formen fallen aus jeder Ausgabe heraus. Wandle sie vor dem Export in Pfade um (Inkscape und Illustrator: „In Pfad umwandeln“).`});const s=H(i.svg),o=s.map(h=>h.fill),a=(h,p)=>h.toUpperCase()===p.toUpperCase(),c=s.map((h,p)=>{try{return X(h.d),null}catch(k){return`Pfad ${p+1}: ${k instanceof Error?k.message:String(k)}`}}).filter(h=>h!==null);c.length>0&&t.push({rang:"fehler",feld:n,text:`${c.length===1?"Ein Pfad lässt":`${c.length} Pfade lassen`} sich nicht lesen: ${c.slice(0,2).join(" · ")}. Gezeichnet wird daraus nichts — die Vorschau bliebe leer, und in der fertigen Marke fehlte der Schriftzug.`});const f=h=>!!h&&h.toLowerCase()!=="none",d=o.filter(h=>!h).length;d&&t.push({rang:"fehler",feld:n,text:`${d===1?"Ein Pfad trägt":`${d} Pfade tragen`} keine Füllfarbe — auch keine von einem <g> geerbte. Zugeordnet wird über die Füllfarbe; ${d===1?"dieser Pfad fällt":"diese Pfade fallen"} aus jeder Ausgabe heraus. Häufigste Ursache: die Farben stehen in einer CSS-Klasse im <style>-Block. Exportiere die Datei mit fill an den Pfaden.`}),i.letters.trim()?o.some(h=>a(h,i.letters))||t.push({rang:"fehler",feld:n,text:`Kein Pfad in „${i.letters}". Zugeordnet wird über die Füllfarbe, die in der Datei steht — nicht über die Palette und nicht über die Reihenfolge der Pfade. Gefunden wurden: ${[...new Set(o)].filter(f).join(", ")||"(keine)"}.`}):t.push({rang:"fehler",feld:n,text:"Die Buchstabenfarbe fehlt. Sie ist keine Einstellung, sondern die Zuordnung: ohne sie weiß keine Ausgabe, welche Pfade der Schriftzug sind."}),i.accent&&!o.some(h=>a(h,i.accent))&&t.push({rang:"warnung",feld:n,text:`Kein Pfad in „${i.accent}" — der Akzent am Wortende bliebe leer. Wer keinen hat, lässt das Feld frei.`});const u=[...new Set(o.filter(f).map(h=>h.toUpperCase()))].filter(h=>!a(h,i.letters)).filter(h=>!i.accent||!a(h,i.accent));return u.length&&t.push({rang:"warnung",feld:n,text:`Die Datei nennt ${u.length===1?"eine Füllfarbe":`${u.length} Füllfarben`}, die weder Buchstaben noch Akzent ${u.length===1?"ist":"sind"}: ${u.join(", ")}. Diese Pfade werden nirgends gezeichnet — die Wortmarke kennt genau zwei Farben. Wer sie braucht, färbt sie in der Datei auf eine der beiden um.`}),i.accent?t.push({rang:"hinweis",feld:n,text:"Die Akzentfarbe wählt nur die Pfade aus; gemalt wird der Akzent auf der Folie immer in der Signalfarbe."}):t.push({rang:"hinweis",feld:n,text:"Ohne Akzentfarbe wird kein Akzent gezeichnet. Das ist erlaubt — nicht jede Marke hat einen Punkt am Wortende."}),t}function fe(e){var n;return[{rang:"hinweis",feld:"Werkzeug",text:"Die Leisten wechseln nie mit. Sie gehören dem Arbeitsplatz, nicht dem Deck — ein cremefarbener Editor um eine cremefarbene Folie macht beides unlesbar."},{rang:"hinweis",feld:"Werkzeug",text:"Radius 0, harte Versatzschatten, 1280 × 720 und das 64er-Raster der Zeichen bleiben. Das sind keine Einstellungen, sondern das, wofür dieses Werkzeug gebaut ist."},{rang:"hinweis",feld:"Zeichen",text:e.zeichen==="nozilla"?`Die ${Object.keys(((n=J.icons)==null?void 0:n.icons)??{}).length} nozilla-Zeichen kommen mit — samt dem 6 × 6 großen Punkt unten rechts, der die Signalfarbe dieser Marke annimmt.`:"Der Katalog kommt ohne nozillas Signatur. Eigene Zeichen trägt man in der erzeugten Datei nach; sie ersetzen den Katalog dann, sie ergänzen ihn nicht."}]}function ge(e,n="designdatei"){return[...re(e,n),...oe(e),...ce(e),...de(e),...ue(e),...fe(e)]}function me(e){return e.some(n=>n.rang==="fehler")}const $e=Object.freeze(Object.defineProperty({__proto__:null,MASSGRUPPE:te,WORTMARKE_HOECHSTLAENGE:D,ankerFuer:x,ersterName:he,massAnker:w,pruefe:ge,rampenbefunde:M,stapelNamen:z,traegtFehler:me,trennbefunde:R},Symbol.toStringTag,{value:"Module"}));export{te as M,be as S,D as W,x as a,Se as b,$e as c,ke as d,he as e,w as m,ge as p,me as t,B as w};
//# sourceMappingURL=pruefung-vvXFOi68.js.map
