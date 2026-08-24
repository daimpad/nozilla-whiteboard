/**
 * Die unveränderlichen Teile eines PPTX-Pakets.
 *
 * Eine `.pptx` besteht nicht nur aus Folien. PowerPoint verlangt einen
 * Folienmaster, mindestens ein Layout, ein Theme und einen Notizenmaster —
 * auch wenn ein Deck nichts davon benutzt. Fehlt einer dieser Teile oder eine
 * seiner Pflichtlisten, meldet PowerPoint die Datei als beschädigt und
 * repariert sie wortlos, wobei es gern Formatierung wegwirft.
 *
 * Die Gerüste hier sind deshalb bewusst vollständig und langweilig: alle zwölf
 * Farben im `clrScheme`, drei Einträge in jeder `fmtScheme`-Liste, neun Ebenen
 * in `txStyles`. Sie tragen die Marke nur an einer Stelle — im `fontScheme`,
 * damit PowerPoint Zilla Slab und Inter in der Schriftauswahl anbietet.
 *
 * Die eigentliche Gestaltung steht auf den Folien selbst. Ein Master, der
 * Farben und Positionen vorgibt, wäre eine zweite Quelle neben
 * `theme.config.ts` — und die erste, die auseinanderläuft.
 */
import { familyName, palette } from '@/theme';

export const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

export const NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const hex = (value: string) => value.replace('#', '').toUpperCase();

/**
 * Der Familienname, den PowerPoint in der Schriftauswahl anzeigt.
 *
 * PowerPoint kennt nur einen Namen pro Lauf; die Ersatzschriften hinter dem
 * CSS-Stapel sind eine Browser-Idee. Aufgelöst wird das im Erscheinungsbild —
 * hier steht nur noch der Name, unter dem dieser Weg ihn kennt.
 */
export const faceName = familyName;

/** Eine `.rels`-Datei aus fertigen `<Relationship/>`-Zeilen. */
export function relationships(rels: readonly string[]): string {
  return (
    XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    rels.join('') +
    '</Relationships>'
  );
}

/* -------------------------------------------------------------------------- */
/* Theme                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Das Farbschema bildet die CI ab, so weit das Schema es zulässt: `dk1` ist
 * Tinte, `lt1` Papier, `lt2` das reine Weiß, `accent1` das Signalgrün. Die
 * übrigen Akzente wiederholen diese Rollen, statt Farben zu erfinden — die
 * Marke hat keine fünf Akzente, und eine Palette, die welche anbietet, lädt zum
 * Verstoß ein.
 *
 * `lt2` trug bis eben `paperAlt` und war damit ein zweites Mal dasselbe Creme:
 * seit die drei Cremetöne einer sind, stand hier eine Farbe doppelt. Jetzt
 * steht dort die Farbe, die ein Deck als Ton `white` auch wirklich benutzt.
 */
function colourScheme(): string {
  const entry = (name: string, value: string) =>
    `<a:${name}><a:srgbClr val="${hex(value)}"/></a:${name}>`;
  return (
    '<a:clrScheme name="nozilla">' +
    `<a:dk1><a:sysClr val="windowText" lastClr="${hex(palette.ink)}"/></a:dk1>` +
    `<a:lt1><a:sysClr val="window" lastClr="${hex(palette.paper)}"/></a:lt1>` +
    entry('dk2', palette.ink800) +
    entry('lt2', palette.white) +
    entry('accent1', palette.signal) +
    entry('accent2', palette.signalStrong) +
    entry('accent3', palette.signalSoft) +
    entry('accent4', palette.paperDeep) +
    entry('accent5', palette.ink700) +
    entry('accent6', palette.ink600) +
    entry('hlink', palette.ink) +
    entry('folHlink', palette.ink700) +
    '</a:clrScheme>'
  );
}

function fontScheme(): string {
  const major = faceName('display');
  const minor = faceName('body');
  const face = (typeface: string) =>
    `<a:latin typeface="${typeface}"/><a:ea typeface=""/><a:cs typeface=""/>`;
  return (
    '<a:fontScheme name="nozilla">' +
    `<a:majorFont>${face(major)}</a:majorFont>` +
    `<a:minorFont>${face(minor)}</a:minorFont>` +
    '</a:fontScheme>'
  );
}

/**
 * Das Formatschema braucht je drei Einträge — das ist Schema-Pflicht, nicht
 * Geschmack. Sie sind hier alle gleich und schlicht: keine Verläufe, keine
 * Weichzeichner. Die Marke kennt beides nicht, und ein Werkzeug, das sie über
 * eine Themenvorlage doch anbietet, wird sie irgendwann benutzen.
 */
function formatScheme(): string {
  const fill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  const line =
    '<a:ln w="12700" cap="flat" cmpd="sng" algn="ctr">' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>';
  const effect = '<a:effectStyle><a:effectLst/></a:effectStyle>';
  return (
    '<a:fmtScheme name="nozilla">' +
    `<a:fillStyleLst>${fill}${fill}${fill}</a:fillStyleLst>` +
    `<a:lnStyleLst>${line}${line}${line}</a:lnStyleLst>` +
    `<a:effectStyleLst>${effect}${effect}${effect}</a:effectStyleLst>` +
    `<a:bgFillStyleLst>${fill}${fill}${fill}</a:bgFillStyleLst>` +
    '</a:fmtScheme>'
  );
}

/**
 * Bewusst eine Funktion und keine Konstante: `colourScheme()` liest die
 * Palette des gerade gewählten Erscheinungsbilds. Auf Modulebene ausgewertet,
 * trüge jede .pptx die Farben des Erscheinungsbilds, das beim Start galt.
 */
function themeXml(): string {
  return (
    XML_DECL +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="nozilla">' +
    '<a:themeElements>' +
    colourScheme() +
    fontScheme() +
    formatScheme() +
    '</a:themeElements>' +
    '<a:objectDefaults/><a:extraClrSchemeLst/>' +
    '</a:theme>'
  );
}

/* -------------------------------------------------------------------------- */
/* Master und Layout                                                           */
/* -------------------------------------------------------------------------- */

const emptyTree =
  '<p:spTree>' +
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
  '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
  '</p:spTree>';

/** Neun Gliederungsebenen — weniger akzeptiert das Schema nicht. */
function txStyles(): string {
  const levels = (size: number) =>
    Array.from({ length: 9 }, (_, index) => {
      const indent = index * 342900;
      return (
        `<a:lvl${index + 1}pPr marL="${indent}" algn="l" rtl="0">` +
        `<a:defRPr sz="${size}"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill>` +
        `<a:latin typeface="+mn-lt"/></a:defRPr></a:lvl${index + 1}pPr>`
      );
    }).join('');
  return (
    '<p:txStyles>' +
    `<p:titleStyle>${levels(4400)}</p:titleStyle>` +
    `<p:bodyStyle>${levels(1800)}</p:bodyStyle>` +
    `<p:otherStyle>${levels(1800)}</p:otherStyle>` +
    '</p:txStyles>'
  );
}

/**
 * `p:clrMap` ordnet die Rollen des Themes den Rollen der Folie zu. Alle acht
 * Attribute sind Pflicht; fehlt eines, öffnet PowerPoint die Datei nicht.
 */
const CLR_MAP =
  '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" ' +
  'accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" ' +
  'folHlink="folHlink"/>';

function slideMasterXml(): string {
  return (
    XML_DECL +
    `<p:sldMaster ${NS}>` +
    `<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${hex(palette.paper)}"/></a:solidFill>` +
    '<a:effectLst/></p:bgPr></p:bg>' +
    emptyTree +
    '</p:cSld>' +
    CLR_MAP +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    txStyles() +
    '</p:sldMaster>'
  );
}

/**
 * Ein einziges, leeres Layout vom Typ `blank`.
 *
 * Die Folien dieses Werkzeugs bringen ihre Gestaltung selbst mit; ein Layout
 * mit Platzhaltern würde beim Öffnen fremde Rahmen einblenden, die niemand
 * bestellt hat.
 */
function slideLayoutXml(): string {
  return (
    XML_DECL +
    `<p:sldLayout ${NS} type="blank" preserve="1">` +
    '<p:cSld name="Leer">' +
    emptyTree +
    '</p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sldLayout>'
  );
}

function notesMasterXml(): string {
  return (
    XML_DECL +
    `<p:notesMaster ${NS}>` +
    '<p:cSld>' +
    '<p:spTree>' +
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
    '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Notizenplatzhalter"/>' +
    '<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>' +
    '<p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="685800" y="4343400"/><a:ext cx="5486400" cy="4114800"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' +
    '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="de-DE"/></a:p></p:txBody>' +
    '</p:sp>' +
    '</p:spTree>' +
    '</p:cSld>' +
    CLR_MAP +
    '<p:notesStyle>' +
    Array.from(
      { length: 9 },
      (_, index) =>
        `<a:lvl${index + 1}pPr marL="${index * 342900}" algn="l" rtl="0">` +
        `<a:defRPr sz="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill>` +
        `<a:latin typeface="+mn-lt"/></a:defRPr></a:lvl${index + 1}pPr>`,
    ).join('') +
    '</p:notesStyle>' +
    '</p:notesMaster>'
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Die festen Teile eines PPTX-Pakets.
 *
 * Die vier oberen sind Getter, keine Werte. Sie tragen Farben und Schriften
 * des Erscheinungsbilds, und das steht erst fest, wenn jemand exportiert —
 * nicht, wenn das Modul geladen wird.
 */
export const PARTS = {
  get theme() {
    return themeXml();
  },
  get slideMaster() {
    return slideMasterXml();
  },
  get slideLayout() {
    return slideLayoutXml();
  },
  get notesMaster() {
    return notesMasterXml();
  },

  rootRels: relationships([
    `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="ppt/presentation.xml"/>`,
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>',
    `<Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/>`,
  ]),

  slideMasterRels: relationships([
    `<Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`,
    `<Relationship Id="rId2" Type="${REL}/theme" Target="../theme/theme1.xml"/>`,
  ]),

  slideLayoutRels: relationships([
    `<Relationship Id="rId1" Type="${REL}/slideMaster" Target="../slideMasters/slideMaster1.xml"/>`,
  ]),

  notesMasterRels: relationships([
    `<Relationship Id="rId1" Type="${REL}/theme" Target="../theme/theme2.xml"/>`,
  ]),

  presProps: XML_DECL + `<p:presentationPr ${NS}/>`,

  viewProps: XML_DECL + `<p:viewPr ${NS}/>`,

  tableStyles:
    XML_DECL +
    '<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>',
} as const;
