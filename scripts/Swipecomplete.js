/**
 * AutoSwipe v2.1 — Autocomplete for contenteditable <pre> editors
 *
 * Designed to integrate with editors that use:
 *   - A <pre contenteditable> for input (transparent text)
 *   - A separate <pre> overlay for syntax highlighting
 *
 * Ghost text is injected into the highlight overlay so it never
 * corrupts the actual editor content.
 *
 * Usage:
 *   AutoSwipe.init({
 *     editor: '#editor',              // contenteditable element
 *     highlighter: '#highlighted',    // syntax highlight overlay
 *     language: 'auto',
 *     getContent: () => editor.innerText,
 *     onAccept: (text) => { ... }
 *   });
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) define([], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AutoSwipe = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ══════════════════════════════════════════
     DICTIONARIES
     ══════════════════════════════════════════ */

  const DICT = {
    html: {
      tags: [
        'div','span','section','article','header','footer','nav','main','aside',
        'h1','h2','h3','h4','h5','h6','p','a','img','ul','ol','li',
        'table','thead','tbody','tfoot','tr','th','td','form','input','button',
        'textarea','select','option','optgroup','label','fieldset','legend',
        'video','audio','source','canvas','svg','path','circle','rect','line','polygon',
        'details','summary','dialog','template','slot','picture',
        'figure','figcaption','mark','time','progress','meter',
        'iframe','embed','object','script','style','link','meta',
        'html','head','body','title','base','noscript',
        'br','hr','wbr','pre','code','blockquote','cite',
        'strong','em','b','i','u','small','sub','sup','del','ins',
        'abbr','address','bdo','map','area','col','colgroup',
        'datalist','output','ruby','rt','rp','data','track','param',
      ],
      attributes: [
        'class','id','style','src','href','alt','title','type','name',
        'value','placeholder','action','method','target','rel',
        'width','height','disabled','readonly','required','checked',
        'selected','multiple','autofocus','autocomplete','novalidate',
        'min','max','step','pattern','maxlength','minlength',
        'for','tabindex','role','aria-label','aria-hidden','aria-describedby',
        'aria-expanded','aria-controls','aria-live','aria-atomic',
        'data-','hidden','contenteditable','draggable','spellcheck',
        'loading','decoding','fetchpriority','crossorigin','integrity',
        'sandbox','allow','allowfullscreen','autoplay','controls','loop','muted',
        'poster','preload','sizes','srcset','media','colspan','rowspan',
        'scope','headers','wrap','rows','cols','accept','capture',
        'formaction','formmethod','formtarget','formnovalidate','formenctype',
        'dirname','list','form','enctype','download','ping','referrerpolicy',
        'xmlns','viewBox','fill','stroke','stroke-width','stroke-linecap',
        'stroke-linejoin','d','cx','cy','r','rx','ry','x','y','x1','y1','x2','y2',
        'points','transform','opacity',
      ],
      snippets: {
        '<!do':          '<!DOCTYPE html>',
        '<!doctype':     '<!DOCTYPE html>',
        '<html':         '<html lang="en">',
        '<meta char':    '<meta charset="UTF-8">',
        '<meta view':    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<link css':     '<link rel="stylesheet" href="">',
        '<link rel="stylesheet"': '<link rel="stylesheet" href="">',
        '<link icon':    '<link rel="icon" href="" type="image/x-icon">',
        '<script src':   '<script src=""><\/script>',
        '<a href':       '<a href=""></a>',
        '<img src':      '<img src="" alt="">',
        '<input type="text"':     '<input type="text" name="" id="" placeholder="">',
        '<input type="email"':    '<input type="email" name="" id="" placeholder="">',
        '<input type="password"': '<input type="password" name="" id="">',
        '<input type="submit"':   '<input type="submit" value="">',
        '<input type="checkbox"': '<input type="checkbox" name="" id="">',
        '<input type="radio"':    '<input type="radio" name="" id="" value="">',
        '<input type="number"':   '<input type="number" name="" id="" min="" max="">',
        '<input type="range"':    '<input type="range" name="" id="" min="" max="">',
        '<input type="file"':     '<input type="file" name="" id="" accept="">',
        '<input type="hidden"':   '<input type="hidden" name="" value="">',
        '<input type="date"':     '<input type="date" name="" id="">',
        '<input type="color"':    '<input type="color" name="" id="">',
        '<form':         '<form action="" method="post">\n  \n</form>',
        '<select':       '<select name="" id="">\n  <option value="">Select</option>\n</select>',
        '<table':        '<table>\n  <thead>\n    <tr>\n      <th></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td></td>\n    </tr>\n  </tbody>\n</table>',
        '<ul':           '<ul>\n  <li></li>\n</ul>',
        '<ol':           '<ol>\n  <li></li>\n</ol>',
        '<video src':    '<video src="" controls></video>',
        '<audio src':    '<audio src="" controls></audio>',
        '<picture':      '<picture>\n  <source srcset="" type="">\n  <img src="" alt="">\n</picture>',
        '<details':      '<details>\n  <summary></summary>\n  \n</details>',
        '<dialog':       '<dialog id="">\n  \n</dialog>',
        '<template':     '<template id="">\n  \n</template>',
        '<svg':          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  \n</svg>',
        '<canvas':       '<canvas id="" width="" height=""></canvas>',
        'html5':         '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>',
        'html:5':        '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>',
      }
    },

    css: {
      properties: [
        'display','position','top','right','bottom','left','z-index','inset',
        'float','clear','overflow','overflow-x','overflow-y',
        'width','height','min-width','max-width','min-height','max-height',
        'margin','margin-top','margin-right','margin-bottom','margin-left',
        'margin-block','margin-inline',
        'padding','padding-top','padding-right','padding-bottom','padding-left',
        'padding-block','padding-inline',
        'border','border-top','border-right','border-bottom','border-left',
        'border-width','border-style','border-color','border-radius',
        'border-top-left-radius','border-top-right-radius',
        'border-bottom-left-radius','border-bottom-right-radius',
        'outline','outline-width','outline-style','outline-color','outline-offset',
        'background','background-color','background-image','background-size',
        'background-position','background-repeat','background-attachment',
        'background-clip','background-origin','background-blend-mode',
        'color','opacity','visibility',
        'font','font-family','font-size','font-weight','font-style',
        'font-variant','font-stretch','font-display',
        'line-height','letter-spacing','word-spacing','text-align',
        'text-decoration','text-transform','text-indent','text-shadow',
        'text-overflow','white-space','word-break','word-wrap','overflow-wrap',
        'vertical-align','direction','writing-mode',
        'flex','flex-direction','flex-wrap','flex-flow','flex-grow',
        'flex-shrink','flex-basis','justify-content','align-items',
        'align-content','align-self','order','gap','row-gap','column-gap',
        'grid','grid-template','grid-template-columns','grid-template-rows',
        'grid-template-areas','grid-column','grid-row','grid-area',
        'grid-column-start','grid-column-end','grid-row-start','grid-row-end',
        'grid-auto-columns','grid-auto-rows','grid-auto-flow',
        'place-items','place-content','place-self',
        'transform','transform-origin','transition','transition-property',
        'transition-duration','transition-timing-function','transition-delay',
        'animation','animation-name','animation-duration',
        'animation-timing-function','animation-delay','animation-iteration-count',
        'animation-direction','animation-fill-mode','animation-play-state',
        'box-shadow','box-sizing','cursor','pointer-events','user-select',
        'resize','appearance','filter','backdrop-filter','mix-blend-mode',
        'clip-path','mask','object-fit','object-position',
        'scroll-behavior','scroll-snap-type','scroll-snap-align',
        'list-style','list-style-type','list-style-position','list-style-image',
        'table-layout','border-collapse','border-spacing','caption-side',
        'content','counter-reset','counter-increment',
        'will-change','contain','isolation','aspect-ratio',
        'accent-color','caret-color','color-scheme',
        'container-type','container-name',
        '-webkit-overflow-scrolling','touch-action',
        '-webkit-tap-highlight-color','-webkit-text-fill-color',
      ],
      values: {
        'display':          ['none','block','inline','inline-block','flex','inline-flex','grid','inline-grid','contents','table','table-row','table-cell','list-item','flow-root'],
        'position':         ['static','relative','absolute','fixed','sticky'],
        'flex-direction':   ['row','row-reverse','column','column-reverse'],
        'flex-wrap':        ['nowrap','wrap','wrap-reverse'],
        'justify-content':  ['flex-start','flex-end','center','space-between','space-around','space-evenly','start','end'],
        'align-items':      ['stretch','flex-start','flex-end','center','baseline','start','end'],
        'align-content':    ['stretch','flex-start','flex-end','center','space-between','space-around'],
        'text-align':       ['left','right','center','justify','start','end'],
        'text-decoration':  ['none','underline','overline','line-through'],
        'text-transform':   ['none','capitalize','uppercase','lowercase'],
        'overflow':         ['visible','hidden','scroll','auto','clip'],
        'cursor':           ['pointer','default','auto','move','text','wait','help','crosshair','not-allowed','grab','grabbing','col-resize','row-resize','zoom-in','zoom-out','none'],
        'font-weight':      ['normal','bold','bolder','lighter','100','200','300','400','500','600','700','800','900'],
        'font-style':       ['normal','italic','oblique'],
        'visibility':       ['visible','hidden','collapse'],
        'white-space':      ['normal','nowrap','pre','pre-wrap','pre-line','break-spaces'],
        'word-break':       ['normal','break-all','keep-all','break-word'],
        'box-sizing':       ['content-box','border-box'],
        'border-style':     ['none','solid','dashed','dotted','double','groove','ridge','inset','outset'],
        'background-size':  ['auto','cover','contain'],
        'background-repeat':['repeat','no-repeat','repeat-x','repeat-y','space','round'],
        'background-position':['center','top','bottom','left','right','top left','top right','bottom left','bottom right'],
        'object-fit':       ['fill','contain','cover','none','scale-down'],
        'grid-auto-flow':   ['row','column','dense','row dense','column dense'],
        'list-style-type':  ['none','disc','circle','square','decimal','lower-alpha','upper-alpha','lower-roman','upper-roman'],
        'animation-fill-mode':     ['none','forwards','backwards','both'],
        'animation-direction':     ['normal','reverse','alternate','alternate-reverse'],
        'scroll-behavior':  ['auto','smooth'],
        'resize':           ['none','both','horizontal','vertical'],
        'user-select':      ['auto','none','text','all'],
        'pointer-events':   ['auto','none'],
        'appearance':       ['none','auto'],
        'touch-action':     ['auto','none','manipulation','pan-x','pan-y','pan-left','pan-right','pan-up','pan-down','pinch-zoom'],
      },
      snippets: {
        'flexcenter':       'display: flex;\n  justify-content: center;\n  align-items: center;',
        'gridcenter':       'display: grid;\n  place-items: center;',
        'flexcolumn':       'display: flex;\n  flex-direction: column;',
        'flexbetween':      'display: flex;\n  justify-content: space-between;\n  align-items: center;',
        'absolute-fill':    'position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;',
        'absolute-center':  'position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);',
        'fixed-fill':       'position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;',
        'truncate':         'overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;',
        'line-clamp':       'display: -webkit-box;\n  -webkit-line-clamp: 3;\n  -webkit-box-orient: vertical;\n  overflow: hidden;',
        'visually-hidden':  'position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0,0,0,0);\n  border: 0;',
        'no-scrollbar':     'scrollbar-width: none;\n  -ms-overflow-style: none;',
        'smooth-scroll':    'scroll-behavior: smooth;',
        'reset-button':     'appearance: none;\n  background: none;\n  border: none;\n  padding: 0;\n  cursor: pointer;',
        'reset-list':       'list-style: none;\n  margin: 0;\n  padding: 0;',
        '@media mobile':    '@media (max-width: 768px) {\n  \n}',
        '@media tablet':    '@media (max-width: 1024px) {\n  \n}',
        '@media desktop':   '@media (min-width: 1025px) {\n  \n}',
        '@media dark':      '@media (prefers-color-scheme: dark) {\n  \n}',
        '@media light':     '@media (prefers-color-scheme: light) {\n  \n}',
        '@media reduced':   '@media (prefers-reduced-motion: reduce) {\n  \n}',
        '@media print':     '@media print {\n  \n}',
        '@keyframes':       '@keyframes name {\n  0% {\n    \n  }\n  100% {\n    \n  }\n}',
        '@font-face':       '@font-face {\n  font-family: "";\n  src: url("") format("");\n  font-weight: normal;\n  font-style: normal;\n  font-display: swap;\n}',
        '@container':       '@container (min-width: ) {\n  \n}',
        '@import':          '@import url("");',
        '@layer':           '@layer name {\n  \n}',
        ':root':            ':root {\n  --: ;\n}',
        'var(':             'var(--)',
        'calc(':            'calc()',
        'clamp(':           'clamp(, , )',
        'min(':             'min(, )',
        'max(':             'max(, )',
        'linear-gradient':  'linear-gradient(to right, , )',
        'radial-gradient':  'radial-gradient(circle, , )',
        'conic-gradient':   'conic-gradient(from 0deg, , )',
      },
      atRules: ['@media','@keyframes','@font-face','@import','@supports','@charset','@layer','@container','@property','@scope','@starting-style','@counter-style'],
      pseudoClasses: [
        ':hover',':focus',':active',':visited',':first-child',':last-child',
        ':nth-child()',':nth-of-type()',':first-of-type',':last-of-type',
        ':only-child',':only-of-type',':not()',':is()',':where()',':has()',
        ':focus-visible',':focus-within',':checked',':disabled',':enabled',
        ':required',':optional',':valid',':invalid',':placeholder-shown',
        ':empty',':target',':root',':lang()',
        '::before','::after','::first-line','::first-letter',
        '::placeholder','::selection','::marker','::backdrop',
        '::file-selector-button',
      ],
    },

    js: {
      keywords: [
        'const','let','var','function','return','if','else','else if',
        'for','while','do','switch','case','break','continue','default',
        'try','catch','finally','throw','new','delete','typeof','instanceof',
        'in','of','void','this','super','class','extends','constructor',
        'static','get','set','async','await','yield','import','export',
        'from','as','debugger',
        'true','false','null','undefined','NaN','Infinity',
      ],
      globals: [
        'console','document','window','navigator','location','history',
        'localStorage','sessionStorage','fetch','setTimeout','setInterval',
        'clearTimeout','clearInterval','requestAnimationFrame',
        'cancelAnimationFrame','Promise','Map','Set','WeakMap','WeakSet',
        'Symbol','Proxy','Reflect','JSON','Math','Date','RegExp',
        'Error','TypeError','ReferenceError','SyntaxError','RangeError',
        'Array','Object','String','Number','Boolean','Function',
        'URL','URLSearchParams','FormData','Headers','Request','Response',
        'AbortController','AbortSignal','Event','CustomEvent',
        'MutationObserver','IntersectionObserver','ResizeObserver',
        'WebSocket','Worker','Notification','BroadcastChannel',
        'TextEncoder','TextDecoder','Blob','File','FileReader',
        'crypto','performance','queueMicrotask','structuredClone',
        'MediaMetadata','MediaSession',
        'getComputedStyle','matchMedia',
        'alert','confirm','prompt','atob','btoa',
        'encodeURI','decodeURI','encodeURIComponent','decodeURIComponent',
        'parseInt','parseFloat','isNaN','isFinite',
      ],
      methods: {
        'console':  ['log','error','warn','info','debug','table','dir','time','timeEnd','group','groupEnd','clear','assert','count','trace'],
        'document': ['getElementById','getElementsByClassName','getElementsByTagName','querySelector','querySelectorAll','createElement','createDocumentFragment','createTextNode','addEventListener','removeEventListener','createRange','execCommand','write','writeln','open','close'],
        'Array':    ['from','isArray','of'],
        'Object':   ['keys','values','entries','assign','freeze','seal','create','defineProperty','defineProperties','getOwnPropertyNames','getOwnPropertyDescriptor','getPrototypeOf','hasOwn','fromEntries','groupBy','is'],
        'JSON':     ['parse','stringify'],
        'Math':     ['floor','ceil','round','random','max','min','abs','pow','sqrt','log','log2','log10','sin','cos','tan','PI','E','sign','trunc','cbrt','hypot'],
        'Promise':  ['resolve','reject','all','allSettled','race','any','withResolvers'],
        'window':   ['addEventListener','removeEventListener','open','close','scroll','scrollTo','scrollBy','getComputedStyle','matchMedia','requestAnimationFrame','cancelAnimationFrame','setTimeout','setInterval','clearTimeout','clearInterval','alert','confirm','prompt','postMessage','focus','blur','print','atob','btoa'],
        'navigator':['clipboard','mediaSession','serviceWorker','geolocation','permissions','share','canShare','vibrate','sendBeacon','userAgent','language','languages','onLine','platform','maxTouchPoints'],
        'localStorage':['getItem','setItem','removeItem','clear','key'],
        'sessionStorage':['getItem','setItem','removeItem','clear','key'],
      },
      arrayMethods: [
        'push','pop','shift','unshift','splice','slice','concat',
        'join','reverse','sort','indexOf','lastIndexOf','includes',
        'find','findIndex','findLast','findLastIndex',
        'filter','map','reduce','reduceRight','forEach','every','some',
        'flat','flatMap','fill','copyWithin','entries','keys','values',
        'at','with','toSorted','toReversed','toSpliced',
        'length','toString',
      ],
      stringMethods: [
        'charAt','charCodeAt','codePointAt','concat','includes',
        'endsWith','startsWith','indexOf','lastIndexOf',
        'match','matchAll','replace','replaceAll','search',
        'slice','split','substring','toLowerCase','toUpperCase',
        'trim','trimStart','trimEnd','padStart','padEnd',
        'repeat','at','normalize','localeCompare',
        'length','toString',
      ],
      numberMethods: [
        'toFixed','toPrecision','toString','valueOf',
      ],
      domMethods: [
        'querySelector','querySelectorAll','getElementById',
        'getElementsByClassName','getElementsByTagName',
        'addEventListener','removeEventListener','dispatchEvent',
        'appendChild','removeChild','replaceChild','insertBefore',
        'cloneNode','contains','closest','matches',
        'getAttribute','setAttribute','removeAttribute','hasAttribute','toggleAttribute',
        'classList','className','innerHTML','outerHTML','textContent','innerText',
        'style','dataset','children','childNodes','parentElement','parentNode',
        'nextElementSibling','previousElementSibling','nextSibling','previousSibling',
        'firstElementChild','lastElementChild','firstChild','lastChild',
        'append','prepend','before','after','remove','replaceWith','replaceChildren',
        'getBoundingClientRect','getClientRects','scrollIntoView',
        'focus','blur','click',
        'offsetWidth','offsetHeight','offsetTop','offsetLeft','offsetParent',
        'scrollWidth','scrollHeight','scrollTop','scrollLeft',
        'clientWidth','clientHeight','clientTop','clientLeft',
        'insertAdjacentHTML','insertAdjacentElement','insertAdjacentText',
      ],
      classListMethods: [
        'add','remove','toggle','contains','replace','item','entries','forEach','keys','values','length','value',
      ],
      styleMethods: [
        'cssText','setProperty','getPropertyValue','removeProperty',
        'display','position','width','height','margin','padding',
        'background','backgroundColor','color','fontSize','fontWeight',
        'border','borderRadius','opacity','transform','transition',
        'animation','zIndex','overflow','cursor','pointerEvents',
        'flexDirection','justifyContent','alignItems','gap',
        'gridTemplateColumns','gridTemplateRows',
        'top','right','bottom','left',
        'maxWidth','maxHeight','minWidth','minHeight',
        'textAlign','textDecoration','lineHeight','letterSpacing',
        'boxShadow','textShadow','outline',
        'visibility','userSelect','whiteSpace',
      ],
      events: [
        'click','dblclick','mousedown','mouseup','mousemove',
        'mouseenter','mouseleave','mouseover','mouseout',
        'keydown','keyup','keypress',
        'submit','reset','change','input','focus','blur','focusin','focusout',
        'scroll','resize','load','unload','error',
        'DOMContentLoaded','beforeunload','hashchange','popstate',
        'touchstart','touchmove','touchend','touchcancel',
        'pointerdown','pointermove','pointerup','pointercancel',
        'drag','dragstart','dragend','dragenter','dragleave','dragover','drop',
        'animationstart','animationend','animationiteration',
        'transitionstart','transitionend','transitioncancel',
        'contextmenu','wheel','copy','cut','paste','select',
        'fullscreenchange','visibilitychange','online','offline',
        'storage','message','beforeinstallprompt',
      ],
      snippets: {
        'function ':         'function name() {\n  \n}',
        'const fn':          'const name = () => {\n  \n};',
        'arrow':             '() => {\n  \n}',
        'async function':    'async function name() {\n  \n}',
        'async arrow':       'const name = async () => {\n  \n};',
        'if (':              'if () {\n  \n}',
        'if else':           'if () {\n  \n} else {\n  \n}',
        'for (let':          'for (let i = 0; i < ; i++) {\n  \n}',
        'for...of':          'for (const item of ) {\n  \n}',
        'for...in':          'for (const key in ) {\n  \n}',
        'foreach':           '.forEach((item, index) => {\n  \n});',
        'while (':           'while () {\n  \n}',
        'switch (':          'switch () {\n  case :\n    break;\n  default:\n    break;\n}',
        'try {':             'try {\n  \n} catch (error) {\n  console.error(error);\n}',
        'try catch finally': 'try {\n  \n} catch (error) {\n  console.error(error);\n} finally {\n  \n}',
        'class ':            'class Name {\n  constructor() {\n    \n  }\n}',
        'class extends':     'class Name extends Base {\n  constructor() {\n    super();\n    \n  }\n}',
        'import ':           'import {  } from "";',
        'import default':    'import name from "";',
        'export default':    'export default ',
        'export const':      'export const name = ',
        'export function':   'export function name() {\n  \n}',
        'promise':           'new Promise((resolve, reject) => {\n  \n});',
        'settimeout':        'setTimeout(() => {\n  \n}, );',
        'setinterval':       'setInterval(() => {\n  \n}, );',
        'fetch(':            "fetch('')\n  .then(res => res.json())\n  .then(data => {\n    \n  })\n  .catch(err => console.error(err));",
        'async fetch':       "const response = await fetch('');\nconst data = await response.json();",
        'addeventlistener':  "addEventListener('', (e) => {\n  \n});",
        'queryselector':     "document.querySelector('');",
        'queryselectorall':  "document.querySelectorAll('');",
        'getelementbyid':    "document.getElementById('');",
        'createelement':     "document.createElement('');",
        'console.log':       'console.log();',
        'console.error':     'console.error();',
        'console.warn':      'console.warn();',
        'console.table':     'console.table();',
        'iife':              '(() => {\n  \n})();',
        'debounce':          'function debounce(fn, delay) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), delay);\n  };\n}',
        'throttle':          'function throttle(fn, limit) {\n  let inThrottle;\n  return function(...args) {\n    if (!inThrottle) {\n      fn.apply(this, args);\n      inThrottle = true;\n      setTimeout(() => inThrottle = false, limit);\n    }\n  };\n}',
        'localstorage get':  "JSON.parse(localStorage.getItem(''));",
        'localstorage set':  "localStorage.setItem('', JSON.stringify());",
        'raf':               'requestAnimationFrame(function loop() {\n  \n  requestAnimationFrame(loop);\n});',
        'domready':          "document.addEventListener('DOMContentLoaded', () => {\n  \n});",
        'window.onload':     "window.addEventListener('load', () => {\n  \n});",
        'structuredclone':   'structuredClone()',
        'object.keys':       'Object.keys()',
        'object.values':     'Object.values()',
        'object.entries':    'Object.entries()',
        'array.from':        'Array.from()',
        'json.parse':        'JSON.parse()',
        'json.stringify':    'JSON.stringify()',
        'map ':              'new Map()',
        'set ':              'new Set()',
        'weakmap':           'new WeakMap()',
        'weakset':           'new WeakSet()',
        'proxy':             'new Proxy(target, {\n  get(target, prop) {\n    \n  },\n  set(target, prop, value) {\n    \n    return true;\n  }\n});',
        'destructure array': 'const [, ] = ;',
        'destructure object':'const { ,  } = ;',
        'template literal':  '`${}`',
        'regex':             '/pattern/flags',
      }
    }
  };

  /* ══════════════════════════════════════════
     HELPERS
     ══════════════════════════════════════════ */

  const _mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /** Get the plain-text character offset of the cursor inside `el` */
  function getCursorOffset(el) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
    return range.toString().length;
  }

  /** Place the cursor at a character offset inside `el` */
  function setCursorOffset(el, offset) {
    const sel = window.getSelection();
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    let count = 0, node;
    while ((node = walker.nextNode())) {
      const len = node.textContent.length;
      if (count + len >= offset) {
        range.setStart(node, offset - count);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      count += len;
    }
    // Past end — put at very end
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /** Get a rect for the current cursor position */
  function getCursorRect() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rects = range.getClientRects();
    if (rects.length > 0) return rects[0];
    // Fallback: insert temp span
    const span = document.createElement('span');
    span.textContent = '\u200b';
    range.insertNode(span);
    const rect = span.getBoundingClientRect();
    span.parentNode.removeChild(span);
    sel.removeAllRanges();
    sel.addRange(range);
    return rect;
  }

  /* ══════════════════════════════════════════
     CORE CLASS
     ══════════════════════════════════════════ */

  class AutoSwipeEditor {
    constructor(opts) {
      // Resolve elements
      this.editorEl = typeof opts.editor === 'string'
        ? document.querySelector(opts.editor) : opts.editor;
      this.highlightEl = typeof opts.highlighter === 'string'
        ? document.querySelector(opts.highlighter) : opts.highlighter;

      if (!this.editorEl) throw new Error('AutoSwipe: editor element not found');
      if (!this.highlightEl) throw new Error('AutoSwipe: highlighter element not found');

      this.opts = Object.assign({
        language: 'auto',
        swipeThreshold: 50,
        maxSuggestions: 6,
        debounceDelay: 100,
        tabAccept: true,
        showIndicator: true,
        getContent: () => this.editorEl.innerText,
        onAccept: null,
        onSuggest: null,
        customDictionary: null,
      }, opts);

      // State
      this.ghostText = '';
      this.suggestions = [];
      this.selectedIndex = -1;
      this._timer = null;
      this._touchX = 0;
      this._touchY = 0;
      this._touchT = 0;
      this._composing = false;
      this._currentLang = this.opts.language === 'auto' ? 'html' : this.opts.language;
      this._freq = {};
      this._lastContent = '';

      this._buildUI();
      this._bind();
    }

    /* ── UI Elements ─────────────────────── */

    _buildUI() {
      // Flash overlay
      this._flash = document.createElement('div');
      this._flash.className = 'as-accept-flash';
      document.body.appendChild(this._flash);

      // Swipe indicator
      if (this.opts.showIndicator) {
        this._indicator = document.createElement('div');
        this._indicator.className = 'as-swipe-indicator';
        this._indicator.innerHTML = _mobile
          ? `<span class="as-swipe-arrow"><svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg></span> Swipe to accept`
          : `<span style="font-weight:700;opacity:0.7">Tab</span> to accept`;
        document.body.appendChild(this._indicator);
      }

      // Dropdown
      this._dropdown = document.createElement('div');
      this._dropdown.className = 'as-dropdown';
      this._dropdown.setAttribute('role', 'listbox');
      document.body.appendChild(this._dropdown);
    }

    /* ── Event Binding ───────────────────── */

    _bind() {
      this._onInputBound = () => { if (!this._composing) this._scheduleUpdate(); };
      this._onKeyDownBound = (e) => this._onKeyDown(e);
      this._onTouchStartBound = (e) => this._onTouchStart(e);
      this._onTouchEndBound = (e) => this._onTouchEnd(e);
      this._onCompStartBound = () => { this._composing = true; };
      this._onCompEndBound = () => { this._composing = false; this._scheduleUpdate(); };
      this._onBlurBound = () => { setTimeout(() => this._clear(), 200); };
      this._onFocusBound = () => { setTimeout(() => this._scheduleUpdate(), 120); };

      this.editorEl.addEventListener('input', this._onInputBound);
      this.editorEl.addEventListener('keydown', this._onKeyDownBound);
      this.editorEl.addEventListener('touchstart', this._onTouchStartBound, { passive: true });
      this.editorEl.addEventListener('touchend', this._onTouchEndBound);
      this.editorEl.addEventListener('compositionstart', this._onCompStartBound);
      this.editorEl.addEventListener('compositionend', this._onCompEndBound);
      this.editorEl.addEventListener('blur', this._onBlurBound);
      this.editorEl.addEventListener('focus', this._onFocusBound);

      // Prevent blur when clicking dropdown
      this._dropdown.addEventListener('pointerdown', (e) => e.preventDefault());
      this._dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.as-dropdown-item');
        if (item) this._acceptByIndex(parseInt(item.dataset.index, 10));
      });
    }

    /* ── Language Detection ───────────────── */

    _detectLang(text) {
      if (this.opts.language !== 'auto') return this.opts.language;
      let h = 0, c = 0, j = 0;
      if (/<[a-zA-Z]/.test(text)) h += 5;
      if (/<\/\w+>/.test(text)) h += 5;
      if (/<!DOCTYPE/i.test(text)) h += 10;
      if (/\sclass="/.test(text) || /\sid="/.test(text)) h += 3;
      if (/[{}]/.test(text) && /:\s*[^;]+;/.test(text)) c += 5;
      if (/@media|@keyframes|@font-face/.test(text)) c += 8;
      if (/\b(display|margin|padding|background|font-size|border|flex|grid)\s*:/.test(text)) c += 6;
      if (/:hover|::before|::after/.test(text)) c += 4;
      if (/\b(const|let|var|function|=>|return)\b/.test(text)) j += 5;
      if (/\b(document|window|console)\b/.test(text)) j += 5;
      if (/\b(if|else|for|while|switch|try|catch)\b/.test(text)) j += 3;
      if (/\b(import|export|require)\b/.test(text)) j += 4;
      if (/===|!==|\|\||&&/.test(text)) j += 3;

      // Context-aware: check if cursor is inside <style> or <script>
      const cursorPos = getCursorOffset(this.editorEl);
      const before = text.substring(0, cursorPos);
      const lastStyleOpen = before.lastIndexOf('<style');
      const lastStyleClose = before.lastIndexOf('</style');
      const lastScriptOpen = before.lastIndexOf('<script');
      const lastScriptClose = before.lastIndexOf('<\/script');

      if (lastStyleOpen > lastStyleClose && lastStyleOpen !== -1) return 'css';
      if (lastScriptOpen > lastScriptClose && lastScriptOpen !== -1) return 'js';

      const max = Math.max(h, c, j);
      if (max === 0) return this._currentLang;
      if (h === max) return 'html';
      if (c === max) return 'css';
      return 'js';
    }

    /* ── Context ─────────────────────────── */

    _getContext() {
      const text = this.opts.getContent();
      const cursorPos = getCursorOffset(this.editorEl);
      const before = text.substring(0, cursorPos);
      const after = text.substring(cursorPos);
      const currentLine = before.split('\n').pop() || '';
      const trimmedLine = currentLine.trimStart();
      this._currentLang = this._detectLang(text);
      return { text, cursorPos, before, after, currentLine, trimmedLine, lang: this._currentLang };
    }

    /* ── Matching ────────────────────────── */

    _lastWord(line) {
      const m = line.match(/([a-zA-Z0-9\-_@.:<!#"'($/\\]+)$/);
      return m ? m[1] : '';
    }

    _match(list, prefix, tag) {
      if (!prefix || prefix.length < 1) return [];
      const low = prefix.toLowerCase();
      return list
        .filter(item => {
          const il = item.toLowerCase();
          return il.startsWith(low) && il !== low;
        })
        .map(item => ({
          text: item,
          completion: item.substring(prefix.length),
          tag,
          score: 10,
        }));
    }

    /* ── Suggestion Engine ───────────────── */

    _suggest(ctx) {
      const { trimmedLine, lang } = ctx;
      if (!trimmedLine || trimmedLine.length < 1) return [];
      let r = [];
      switch (lang) {
        case 'html': r = this._suggestHTML(ctx); break;
        case 'css':  r = this._suggestCSS(ctx); break;
        case 'js':   r = this._suggestJS(ctx); break;
      }
      if (this.opts.customDictionary) {
        r = r.concat(this._match(this.opts.customDictionary, this._lastWord(trimmedLine), 'snippet'));
      }
      // Sort: frequency then score
      r.sort((a, b) => {
        const fa = this._freq[a.text] || 0, fb = this._freq[b.text] || 0;
        return fb !== fa ? fb - fa : (b.score || 0) - (a.score || 0);
      });
      // Dedup
      const seen = new Set();
      r = r.filter(x => { if (seen.has(x.text)) return false; seen.add(x.text); return true; });
      return r.slice(0, this.opts.maxSuggestions);
    }

    /* ── HTML Suggestions ────────────────── */

    _suggestHTML(ctx) {
      const { trimmedLine, before } = ctx;
      const r = [], d = DICT.html;

      // Snippets
      for (const [trigger, expansion] of Object.entries(d.snippets)) {
        const tl = trigger.toLowerCase(), ll = trimmedLine.toLowerCase();
        if (tl.startsWith(ll) && tl !== ll && ll.length >= 2) {
          r.push({ text: expansion, completion: expansion, tag: 'snippet', score: 15, isSnippet: true, replaceLen: trimmedLine.length });
        }
      }

      // Attribute context: inside an open tag
      const attrCtx = before.match(/<(\w+)(?:\s+[\w\-]+(?:="[^"]*")?)*\s+([\w\-]*)$/);
      if (attrCtx && attrCtx[2]) {
        const am = this._match(d.attributes, attrCtx[2], 'html');
        am.forEach(m => { if (!m.text.endsWith('-')) m.completion += '=""'; });
        r.push(...am);
      }

      // Opening tag <tag
      const tagM = trimmedLine.match(/<(\w+)$/);
      if (tagM && tagM[1]) {
        const selfClose = ['img','br','hr','input','meta','link','source','embed','wbr','area','base','col','track','param'];
        const tm = this._match(d.tags, tagM[1], 'html');
        tm.forEach(t => { t.completion += selfClose.includes(t.text) ? '>' : '></' + t.text + '>'; });
        r.push(...tm);
      }

      // Closing tag </tag
      const closeM = trimmedLine.match(/<\/(\w*)$/);
      if (closeM) {
        const partial = closeM[1];
        // Find last unclosed tag
        const opens = (before.match(/<(\w+)[^>]*>/g) || []).map(t => t.match(/<(\w+)/)[1]);
        const closes = (before.match(/<\/(\w+)>/g) || []).map(t => t.match(/<\/(\w+)/)[1]);
        const unclosed = [];
        const cc = [...closes];
        for (const o of opens) { const i = cc.indexOf(o); if (i >= 0) cc.splice(i, 1); else unclosed.push(o); }
        if (unclosed.length) {
          const last = unclosed[unclosed.length - 1];
          if (!partial || last.startsWith(partial))
            r.push({ text: last + '>', completion: last.substring(partial.length) + '>', tag: 'html', score: 20 });
        }
        if (partial) {
          const cm = this._match(d.tags, partial, 'html');
          cm.forEach(m => { m.completion += '>'; });
          r.push(...cm);
        }
      }

      return r;
    }

    /* ── CSS Suggestions ─────────────────── */

    _suggestCSS(ctx) {
      const { trimmedLine, before } = ctx;
      const r = [], d = DICT.css;

      // Snippets
      for (const [trigger, expansion] of Object.entries(d.snippets)) {
        const tl = trigger.toLowerCase(), ll = trimmedLine.toLowerCase();
        if (tl.startsWith(ll) && tl !== ll && ll.length >= 2)
          r.push({ text: expansion, completion: expansion, tag: 'snippet', score: 15, isSnippet: true, replaceLen: trimmedLine.length });
      }

      const openB = (before.match(/{/g) || []).length;
      const closeB = (before.match(/}/g) || []).length;
      const inside = openB > closeB;

      // Property value: "property: partial"
      const valM = trimmedLine.match(/^([\w-]+)\s*:\s*([\w-]*)$/);
      if (valM && inside) {
        const vals = d.values[valM[1]];
        if (vals && valM[2]) r.push(...this._match(vals, valM[2], 'css'));
        else if (vals && !valM[2]) vals.slice(0, this.opts.maxSuggestions).forEach(v => r.push({ text: v, completion: v, tag: 'css', score: 8 }));
        return r;
      }

      // Property name
      if (inside) { const pw = this._lastWord(trimmedLine); if (pw) r.push(...this._match(d.properties, pw, 'css')); }

      // At-rules
      const atM = trimmedLine.match(/@[\w-]*$/);
      if (atM) r.push(...this._match(d.atRules, atM[0], 'css'));

      // Pseudo
      const psM = trimmedLine.match(/:{1,2}[\w-]*$/);
      if (psM) r.push(...this._match(d.pseudoClasses, psM[0], 'css'));

      // Fallback
      if (r.length === 0 && trimmedLine.length >= 2) {
        const pw = this._lastWord(trimmedLine);
        if (pw && pw.length >= 2) r.push(...this._match(d.properties, pw, 'css'));
      }

      return r;
    }

    /* ── JS Suggestions ──────────────────── */

    _suggestJS(ctx) {
      const { trimmedLine } = ctx;
      const r = [], d = DICT.js;

      // Snippets
      for (const [trigger, expansion] of Object.entries(d.snippets)) {
        const tl = trigger.toLowerCase(), ll = trimmedLine.toLowerCase();
        if (tl.startsWith(ll) && tl !== ll && ll.length >= 2)
          r.push({ text: expansion, completion: expansion, tag: 'snippet', score: 15, isSnippet: true, replaceLen: trimmedLine.length });
      }

      // Dot methods: "obj.partial"
      const dotM = trimmedLine.match(/(\w+)\.\s*([\w]*)$/);
      if (dotM) {
        const obj = dotM[1], partial = dotM[2];
        const known = d.methods[obj];
        if (known) {
          r.push(...(partial
            ? this._match(known, partial, 'js')
            : known.slice(0, this.opts.maxSuggestions).map(m => ({ text: m, completion: m, tag: 'js', score: 10 }))
          ));
        }

        // classList context
        const clMatch = trimmedLine.match(/\.classList\.\s*([\w]*)$/);
        if (clMatch) {
          r.push(...this._match(d.classListMethods, clMatch[1] || '', 'js'));
          return r;
        }

        // style context
        const stMatch = trimmedLine.match(/\.style\.\s*([\w]*)$/);
        if (stMatch) {
          r.push(...this._match(d.styleMethods, stMatch[1] || '', 'js'));
          return r;
        }

        // Context hints
        const ol = obj.toLowerCase();
        const arrHints = ['arr','array','list','items','data','results','elements','rows','cols','children','entries','files','matches','keys','values'];
        const strHints = ['str','string','name','text','title','msg','message','label','value','url','path','html','content','tag','src','href','key','filename','classname'];
        const numHints = ['num','number','count','total','index','length','size','width','height','offset','scroll','client','top','left','right','bottom','x','y','z'];
        const domHints = ['el','elem','element','node','btn','container','wrapper','div','form','input','section','modal','sidebar','overlay','canvas','header','footer','nav','parent','child'];

        if (arrHints.some(k => ol.includes(k))) r.push(...this._match(d.arrayMethods, partial || '', 'js'));
        if (strHints.some(k => ol.includes(k))) r.push(...this._match(d.stringMethods, partial || '', 'js'));
        if (numHints.some(k => ol === k)) r.push(...this._match(d.numberMethods, partial || '', 'js'));
        if (domHints.some(k => ol.includes(k))) r.push(...this._match(d.domMethods, partial || '', 'js'));

        // Fallback for unknown objects
        if (partial && r.length < 3) {
          r.push(...this._match(d.arrayMethods, partial, 'js'));
          r.push(...this._match(d.stringMethods, partial, 'js'));
          r.push(...this._match(d.domMethods, partial, 'js'));
        }

        return r;
      }

      // Event names inside addEventListener('...')
      const evtM = trimmedLine.match(/addEventListener\(\s*['"](\w*)$/);
      if (evtM) { r.push(...this._match(d.events, evtM[1], 'js')); return r; }

      // Keywords + globals
      const lw = this._lastWord(trimmedLine);
      if (lw && lw.length >= 2) {
        r.push(...this._match(d.keywords, lw, 'js'));
        r.push(...this._match(d.globals, lw, 'js'));
      }

      return r;
    }

    /* ── Ghost Text in Highlight Overlay ─── */

    _renderGhost(ghostStr) {
      this.ghostText = ghostStr || '';

      // Remove any existing ghost
      const existing = this.highlightEl.querySelector('.as-ghost');
      if (existing) existing.remove();

      if (!this.ghostText) return;

      // We need to find where in the highlighted HTML to inject the ghost.
      // Strategy: get cursor offset, scan highlighted text nodes to the same offset, inject there.
      const cursorOff = getCursorOffset(this.editorEl);
      const walker = document.createTreeWalker(this.highlightEl, NodeFilter.SHOW_TEXT, null, false);
      let count = 0, targetNode = null, targetOff = 0;

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const len = node.textContent.length;
        if (count + len >= cursorOff) {
          targetNode = node;
          targetOff = cursorOff - count;
          break;
        }
        count += len;
      }

      if (!targetNode) {
        // Append at end
        const ghost = document.createElement('span');
        ghost.className = 'as-ghost';
        ghost.textContent = this.ghostText;
        this.highlightEl.appendChild(ghost);
        return;
      }

      // Split the text node and insert ghost span
      const ghost = document.createElement('span');
      ghost.className = 'as-ghost';
      ghost.textContent = this.ghostText;

      if (targetOff < targetNode.textContent.length) {
        const afterText = targetNode.textContent.substring(targetOff);
        targetNode.textContent = targetNode.textContent.substring(0, targetOff);
        const afterNode = document.createTextNode(afterText);
        targetNode.parentNode.insertBefore(ghost, targetNode.nextSibling);
        targetNode.parentNode.insertBefore(afterNode, ghost.nextSibling);
      } else {
        targetNode.parentNode.insertBefore(ghost, targetNode.nextSibling);
      }
    }

    _removeGhost() {
      const g = this.highlightEl.querySelector('.as-ghost');
      if (g) g.remove();
      this.ghostText = '';
    }

    /* ── Indicator ───────────────────────── */

    _showHint() {
      if (this._indicator) this._indicator.classList.add('as-visible');
    }

    _hideHint() {
      if (this._indicator) this._indicator.classList.remove('as-visible');
    }

    /* ── Dropdown ────────────────────────── */

    _showDropdown() {
      if (this.suggestions.length <= 1) { this._hideDropdown(); return; }

      this._dropdown.innerHTML = '';
      this.suggestions.forEach((s, i) => {
        const item = document.createElement('div');
        item.className = 'as-dropdown-item' + (i === this.selectedIndex ? ' as-selected' : '');
        item.dataset.index = i;
        item.setAttribute('role', 'option');
        const tagCls = ({ html: 'as-tag-html', css: 'as-tag-css', js: 'as-tag-js', snippet: 'as-tag-snippet' })[s.tag] || 'as-tag-js';
        const preview = s.isSnippet
          ? s.text.split('\n')[0].substring(0, 40) + (s.text.includes('\n') ? '…' : '')
          : s.text;
        item.innerHTML = `<span class="as-tag ${tagCls}">${s.tag}</span><span class="as-preview">${esc(preview)}</span>`;
        this._dropdown.appendChild(item);
      });

      // Position near cursor
      const rect = getCursorRect();
      if (rect) {
        let top = rect.bottom + 4;
        let left = rect.left;
        const dh = this._dropdown.offsetHeight || 200;
        if (top + dh > window.innerHeight) top = rect.top - dh - 4;
        if (left + 220 > window.innerWidth) left = window.innerWidth - 230;
        if (left < 4) left = 4;
        if (top < 0) top = 4;
        this._dropdown.style.top = top + 'px';
        this._dropdown.style.left = left + 'px';
      }
      this._dropdown.classList.add('as-open');
    }

    _hideDropdown() {
      this._dropdown.classList.remove('as-open');
      this.selectedIndex = -1;
    }

    _updateDropdownSel() {
      const items = this._dropdown.querySelectorAll('.as-dropdown-item');
      items.forEach((el, i) => el.classList.toggle('as-selected', i === this.selectedIndex));
      const sel = this._dropdown.querySelector('.as-selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    _updateGhostFromSel() {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
        const s = this.suggestions[this.selectedIndex];
        const ghost = s.isSnippet ? s.text.substring(s.replaceLen || 0) : s.completion;
        this._renderGhost(ghost);
      }
    }

    /* ── Accept / Clear ──────────────────── */

    _accept() {
      if (!this.ghostText && !this.suggestions.length) return false;
      const s = this.suggestions[Math.max(0, this.selectedIndex)] || this.suggestions[0];
      return s ? this._apply(s) : false;
    }

    _acceptByIndex(idx) {
      if (idx < 0 || idx >= this.suggestions.length) return false;
      return this._apply(this.suggestions[idx]);
    }

    _apply(suggestion) {
      this._removeGhost();

      const text = this.opts.getContent();
      const cursorPos = getCursorOffset(this.editorEl);
      let newText, newCursorPos;

      if (suggestion.isSnippet && suggestion.replaceLen) {
        const before = text.substring(0, cursorPos - suggestion.replaceLen);
        const after = text.substring(cursorPos);
        newText = before + suggestion.text + after;
        newCursorPos = before.length + suggestion.text.length;
      } else {
        const before = text.substring(0, cursorPos);
        const after = text.substring(cursorPos);
        newText = before + suggestion.completion + after;
        newCursorPos = cursorPos + suggestion.completion.length;
      }

      // Set content
      this.editorEl.textContent = newText;
      setCursorOffset(this.editorEl, newCursorPos);

      // Track frequency
      this._freq[suggestion.text] = (this._freq[suggestion.text] || 0) + 1;

      // Flash
      this._flash.classList.remove('as-active');
      void this._flash.offsetWidth;
      this._flash.classList.add('as-active');
      setTimeout(() => this._flash.classList.remove('as-active'), 350);

      if (this.opts.onAccept) this.opts.onAccept(suggestion, newText);

      this._clear();
      return true;
    }

    _clear() {
      this._removeGhost();
      this.ghostText = '';
      this.suggestions = [];
      this.selectedIndex = -1;
      this._hideDropdown();
      this._hideHint();
    }

    /* ── Input Scheduling ────────────────── */

    _scheduleUpdate() {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._update(), this.opts.debounceDelay);
    }

    _update() {
      const content = this.opts.getContent();
      // Avoid re-processing identical content
      if (content === this._lastContent && this.suggestions.length > 0) return;
      this._lastContent = content;

      const ctx = this._getContext();
      this.suggestions = this._suggest(ctx);

      if (this.suggestions.length > 0) {
        const best = this.suggestions[0];
        const ghost = best.isSnippet ? best.text.substring(best.replaceLen || 0) : best.completion;
        this.selectedIndex = 0;
        // Render ghost inside highlight overlay (after Prism has run)
        // Use a microtask to run after any pending highlight update
        Promise.resolve().then(() => {
          this._renderGhost(ghost);
        });
        this._showHint();
        if (this.suggestions.length > 1) this._showDropdown();
        else this._hideDropdown();
        if (this.opts.onSuggest) this.opts.onSuggest(this.suggestions);
      } else {
        this._clear();
      }
    }

    /* ── Keyboard ────────────────────────── */

    _onKeyDown(e) {
      // Tab to accept
      if (e.key === 'Tab' && this.opts.tabAccept && this.ghostText) {
        e.preventDefault();
        e.stopPropagation();
        this._accept();
        return;
      }

      // Dropdown nav
      if (this._dropdown.classList.contains('as-open')) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
          this._updateDropdownSel();
          this._updateGhostFromSel();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
          this._updateDropdownSel();
          this._updateGhostFromSel();
          return;
        }
        if (e.key === 'Enter' && this.selectedIndex >= 0) {
          e.preventDefault();
          e.stopPropagation();
          this._acceptByIndex(this.selectedIndex);
          return;
        }
      }

      // Escape
      if (e.key === 'Escape') {
        this._clear();
        return;
      }

      // Any typing clears ghost (will regenerate from input event)
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
        this._removeGhost();
      }
    }

    /* ── Touch / Swipe ───────────────────── */

    _onTouchStart(e) {
      if (e.touches.length !== 1) return;
      this._touchX = e.touches[0].clientX;
      this._touchY = e.touches[0].clientY;
      this._touchT = Date.now();
    }

    _onTouchEnd(e) {
      if (!this.ghostText || !this._touchX) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this._touchX;
      const dy = Math.abs(t.clientY - this._touchY);
      const dt = Date.now() - this._touchT;
      if (dx > this.opts.swipeThreshold && dy < 80 && dt < 500) {
        e.preventDefault();
        this._accept();
      }
      this._touchX = 0;
      this._touchY = 0;
    }

    /* ══════════════════════════════════════
       PUBLIC API
       ══════════════════════════════════════ */

    setLanguage(lang) {
      if (['html', 'css', 'js', 'auto'].includes(lang)) {
        this.opts.language = lang;
        if (lang !== 'auto') this._currentLang = lang;
      }
      return this;
    }

    getLanguage() { return this._currentLang; }

    addWords(words) {
      if (!this.opts.customDictionary) this.opts.customDictionary = [];
      this.opts.customDictionary.push(...words);
      return this;
    }

    addSnippets(snippets, lang) {
      const target = lang || this._currentLang;
      if (DICT[target] && DICT[target].snippets) Object.assign(DICT[target].snippets, snippets);
      return this;
    }

    refresh() { this._scheduleUpdate(); return this; }

    destroy() {
      this._clear();
      clearTimeout(this._timer);
      this.editorEl.removeEventListener('input', this._onInputBound);
      this.editorEl.removeEventListener('keydown', this._onKeyDownBound);
      this.editorEl.removeEventListener('touchstart', this._onTouchStartBound);
      this.editorEl.removeEventListener('touchend', this._onTouchEndBound);
      this.editorEl.removeEventListener('compositionstart', this._onCompStartBound);
      this.editorEl.removeEventListener('compositionend', this._onCompEndBound);
      this.editorEl.removeEventListener('blur', this._onBlurBound);
      this.editorEl.removeEventListener('focus', this._onFocusBound);
      if (this._flash && this._flash.parentNode) this._flash.parentNode.removeChild(this._flash);
      if (this._indicator && this._indicator.parentNode) this._indicator.parentNode.removeChild(this._indicator);
      if (this._dropdown && this._dropdown.parentNode) this._dropdown.parentNode.removeChild(this._dropdown);
    }
  }

  /* ══════════════════════════════════════════
     STATIC API
     ══════════════════════════════════════════ */

  return {
    version: '2.1.0',

    /**
     * AutoSwipe.init({
     *   editor: '#editor',
     *   highlighter: '#highlighted',
     *   language: 'auto',
     *   getContent: () => myEditor.innerText,
     *   onAccept: (suggestion, newText) => { ... }
     * })
     */
    init(opts) {
      return new AutoSwipeEditor(opts);
    }
  };

}));
