!function(e,n){"use strict";"function"==typeof define&&define.amd?define("stackframe",[],n):"object"==typeof exports?module.exports=n():e.StackFrame=n()}(this,function(){"use strict";function e(e){return!isNaN(parseFloat(e))&&isFinite(e)}function n(e,n,t,r,o,i){void 0!==e&&this.setFunctionName(e),void 0!==n&&this.setArgs(n),void 0!==t&&this.setFileName(t),void 0!==r&&this.setLineNumber(r),void 0!==o&&this.setColumnNumber(o),void 0!==i&&this.setSource(i)}return n.prototype={getFunctionName:function(){return this.functionName},setFunctionName:function(e){this.functionName=String(e)},getArgs:function(){return this.args},setArgs:function(e){if("[object Array]"!==Object.prototype.toString.call(e))throw new TypeError("Args must be an Array");this.args=e},getFileName:function(){return this.fileName},setFileName:function(e){this.fileName=String(e)},getLineNumber:function(){return this.lineNumber},setLineNumber:function(n){if(!e(n))throw new TypeError("Line Number must be a Number");this.lineNumber=Number(n)},getColumnNumber:function(){return this.columnNumber},setColumnNumber:function(n){if(!e(n))throw new TypeError("Column Number must be a Number");this.columnNumber=Number(n)},getSource:function(){return this.source},setSource:function(e){this.source=String(e)},toString:function(){var n=this.getFunctionName()||"{anonymous}",t="("+(this.getArgs()||[]).join(",")+")",r=this.getFileName()?"@"+this.getFileName():"",o=e(this.getLineNumber())?":"+this.getLineNumber():"",i=e(this.getColumnNumber())?":"+this.getColumnNumber():"";return n+t+r+o+i}},n});var SourceMap=function(e){function n(r){if(t[r])return t[r].exports;var o=t[r]={exports:{},id:r,loaded:!1};return e[r].call(o.exports,o,o.exports,n),o.loaded=!0,o.exports}var t={};return n.m=e,n.c=t,n.p="",n(0)}([function(e,n,t){function r(e){var n=e;return"string"==typeof e&&(n=JSON.parse(e.replace(/^\)\]\}'/,""))),null!=n.sections?new a(n):new o(n)}function o(e){var n=e;"string"==typeof e&&(n=JSON.parse(e.replace(/^\)\]\}'/,"")));var t=s.getArg(n,"version"),r=s.getArg(n,"sources"),o=s.getArg(n,"names",[]),i=s.getArg(n,"sourceRoot",null),a=s.getArg(n,"sourcesContent",null),u=s.getArg(n,"mappings"),l=s.getArg(n,"file",null);if(t!=this._version)throw new Error("Unsupported version: "+t);r=r.map(String).map(s.normalize).map(function(e){return i&&s.isAbsolute(i)&&s.isAbsolute(e)?s.relative(i,e):e}),this._names=c.fromArray(o.map(String),!0),this._sources=c.fromArray(r,!0),this.sourceRoot=i,this.sourcesContent=a,this._mappings=u,this.file=l}function i(){this.generatedLine=0,this.generatedColumn=0,this.source=null,this.originalLine=null,this.originalColumn=null,this.name=null}function a(e){var n=e;"string"==typeof e&&(n=JSON.parse(e.replace(/^\)\]\}'/,"")));var t=s.getArg(n,"version"),o=s.getArg(n,"sections");if(t!=this._version)throw new Error("Unsupported version: "+t);this._sources=new c,this._names=new c;var i={line:-1,column:0};this._sections=o.map(function(e){if(e.url)throw new Error("Support for url field in sections not implemented.");var n=s.getArg(e,"offset"),t=s.getArg(n,"line"),o=s.getArg(n,"column");if(t<i.line||t===i.line&&o<i.column)throw new Error("Section offsets must be ordered and non-overlapping.");return i=n,{generatedOffset:{generatedLine:t+1,generatedColumn:o+1},consumer:new r(s.getArg(e,"map"))}})}var s=t(1),u=t(2),c=t(3).ArraySet,l=t(4),f=t(6).quickSort;r.fromSourceMap=function(e){return o.fromSourceMap(e)},r.prototype._version=3,r.prototype.__generatedMappings=null,Object.defineProperty(r.prototype,"_generatedMappings",{get:function(){return this.__generatedMappings||this._parseMappings(this._mappings,this.sourceRoot),this.__generatedMappings}}),r.prototype.__originalMappings=null,Object.defineProperty(r.prototype,"_originalMappings",{get:function(){return this.__originalMappings||this._parseMappings(this._mappings,this.sourceRoot),this.__originalMappings}}),r.prototype._charIsMappingSeparator=function(e,n){var t=e.charAt(n);return";"===t||","===t},r.prototype._parseMappings=function(e,n){throw new Error("Subclasses must implement _parseMappings")},r.GENERATED_ORDER=1,r.ORIGINAL_ORDER=2,r.GREATEST_LOWER_BOUND=1,r.LEAST_UPPER_BOUND=2,r.prototype.eachMapping=function(e,n,t){var o,i=n||null,a=t||r.GENERATED_ORDER;switch(a){case r.GENERATED_ORDER:o=this._generatedMappings;break;case r.ORIGINAL_ORDER:o=this._originalMappings;break;default:throw new Error("Unknown order of iteration.")}var u=this.sourceRoot;o.map(function(e){var n=null===e.source?null:this._sources.at(e.source);return null!=n&&null!=u&&(n=s.join(u,n)),{source:n,generatedLine:e.generatedLine,generatedColumn:e.generatedColumn,originalLine:e.originalLine,originalColumn:e.originalColumn,name:null===e.name?null:this._names.at(e.name)}},this).forEach(e,i)},r.prototype.allGeneratedPositionsFor=function(e){var n=s.getArg(e,"line"),t={source:s.getArg(e,"source"),originalLine:n,originalColumn:s.getArg(e,"column",0)};if(null!=this.sourceRoot&&(t.source=s.relative(this.sourceRoot,t.source)),!this._sources.has(t.source))return[];t.source=this._sources.indexOf(t.source);var r=[],o=this._findMapping(t,this._originalMappings,"originalLine","originalColumn",s.compareByOriginalPositions,u.LEAST_UPPER_BOUND);if(o>=0){var i=this._originalMappings[o];if(void 0===e.column)for(var a=i.originalLine;i&&i.originalLine===a;)r.push({line:s.getArg(i,"generatedLine",null),column:s.getArg(i,"generatedColumn",null),lastColumn:s.getArg(i,"lastGeneratedColumn",null)}),i=this._originalMappings[++o];else for(var c=i.originalColumn;i&&i.originalLine===n&&i.originalColumn==c;)r.push({line:s.getArg(i,"generatedLine",null),column:s.getArg(i,"generatedColumn",null),lastColumn:s.getArg(i,"lastGeneratedColumn",null)}),i=this._originalMappings[++o]}return r},n.SourceMapConsumer=r,o.prototype=Object.create(r.prototype),o.prototype.consumer=r,o.fromSourceMap=function(e){var n=Object.create(o.prototype),t=n._names=c.fromArray(e._names.toArray(),!0),r=n._sources=c.fromArray(e._sources.toArray(),!0);n.sourceRoot=e._sourceRoot,n.sourcesContent=e._generateSourcesContent(n._sources.toArray(),n.sourceRoot),n.file=e._file;for(var a=e._mappings.toArray().slice(),u=n.__generatedMappings=[],l=n.__originalMappings=[],p=0,g=a.length;g>p;p++){var h=a[p],m=new i;m.generatedLine=h.generatedLine,m.generatedColumn=h.generatedColumn,h.source&&(m.source=r.indexOf(h.source),m.originalLine=h.originalLine,m.originalColumn=h.originalColumn,h.name&&(m.name=t.indexOf(h.name)),l.push(m)),u.push(m)}return f(n.__originalMappings,s.compareByOriginalPositions),n},o.prototype._version=3,Object.defineProperty(o.prototype,"sources",{get:function(){return this._sources.toArray().map(function(e){return null!=this.sourceRoot?s.join(this.sourceRoot,e):e},this)}}),o.prototype._parseMappings=function(e,n){for(var t,r,o,a,u,c=1,p=0,g=0,h=0,m=0,d=0,v=e.length,_=0,y={},w={},b=[],C=[];v>_;)if(";"===e.charAt(_))c++,_++,p=0;else if(","===e.charAt(_))_++;else{for(t=new i,t.generatedLine=c,a=_;v>a&&!this._charIsMappingSeparator(e,a);a++);if(r=e.slice(_,a),o=y[r])_+=r.length;else{for(o=[];a>_;)l.decode(e,_,w),u=w.value,_=w.rest,o.push(u);if(2===o.length)throw new Error("Found a source, but no line and column");if(3===o.length)throw new Error("Found a source and line, but no column");y[r]=o}t.generatedColumn=p+o[0],p=t.generatedColumn,o.length>1&&(t.source=m+o[1],m+=o[1],t.originalLine=g+o[2],g=t.originalLine,t.originalLine+=1,t.originalColumn=h+o[3],h=t.originalColumn,o.length>4&&(t.name=d+o[4],d+=o[4])),C.push(t),"number"==typeof t.originalLine&&b.push(t)}f(C,s.compareByGeneratedPositionsDeflated),this.__generatedMappings=C,f(b,s.compareByOriginalPositions),this.__originalMappings=b},o.prototype._findMapping=function(e,n,t,r,o,i){if(e[t]<=0)throw new TypeError("Line must be greater than or equal to 1, got "+e[t]);if(e[r]<0)throw new TypeError("Column must be greater than or equal to 0, got "+e[r]);return u.search(e,n,o,i)},o.prototype.computeColumnSpans=function(){for(var e=0;e<this._generatedMappings.length;++e){var n=this._generatedMappings[e];if(e+1<this._generatedMappings.length){var t=this._generatedMappings[e+1];if(n.generatedLine===t.generatedLine){n.lastGeneratedColumn=t.generatedColumn-1;continue}}n.lastGeneratedColumn=1/0}},o.prototype.originalPositionFor=function(e){var n={generatedLine:s.getArg(e,"line"),generatedColumn:s.getArg(e,"column")},t=this._findMapping(n,this._generatedMappings,"generatedLine","generatedColumn",s.compareByGeneratedPositionsDeflated,s.getArg(e,"bias",r.GREATEST_LOWER_BOUND));if(t>=0){var o=this._generatedMappings[t];if(o.generatedLine===n.generatedLine){var i=s.getArg(o,"source",null);null!==i&&(i=this._sources.at(i),null!=this.sourceRoot&&(i=s.join(this.sourceRoot,i)));var a=s.getArg(o,"name",null);return null!==a&&(a=this._names.at(a)),{source:i,line:s.getArg(o,"originalLine",null),column:s.getArg(o,"originalColumn",null),name:a}}}return{source:null,line:null,column:null,name:null}},o.prototype.hasContentsOfAllSources=function(){return this.sourcesContent?this.sourcesContent.length>=this._sources.size()&&!this.sourcesContent.some(function(e){return null==e}):!1},o.prototype.sourceContentFor=function(e,n){if(!this.sourcesContent)return null;if(null!=this.sourceRoot&&(e=s.relative(this.sourceRoot,e)),this._sources.has(e))return this.sourcesContent[this._sources.indexOf(e)];var t;if(null!=this.sourceRoot&&(t=s.urlParse(this.sourceRoot))){var r=e.replace(/^file:\/\//,"");if("file"==t.scheme&&this._sources.has(r))return this.sourcesContent[this._sources.indexOf(r)];if((!t.path||"/"==t.path)&&this._sources.has("/"+e))return this.sourcesContent[this._sources.indexOf("/"+e)]}if(n)return null;throw new Error('"'+e+'" is not in the SourceMap.')},o.prototype.generatedPositionFor=function(e){var n=s.getArg(e,"source");if(null!=this.sourceRoot&&(n=s.relative(this.sourceRoot,n)),!this._sources.has(n))return{line:null,column:null,lastColumn:null};n=this._sources.indexOf(n);var t={source:n,originalLine:s.getArg(e,"line"),originalColumn:s.getArg(e,"column")},o=this._findMapping(t,this._originalMappings,"originalLine","originalColumn",s.compareByOriginalPositions,s.getArg(e,"bias",r.GREATEST_LOWER_BOUND));if(o>=0){var i=this._originalMappings[o];if(i.source===t.source)return{line:s.getArg(i,"generatedLine",null),column:s.getArg(i,"generatedColumn",null),lastColumn:s.getArg(i,"lastGeneratedColumn",null)}}return{line:null,column:null,lastColumn:null}},n.BasicSourceMapConsumer=o,a.prototype=Object.create(r.prototype),a.prototype.constructor=r,a.prototype._version=3,Object.defineProperty(a.prototype,"sources",{get:function(){for(var e=[],n=0;n<this._sections.length;n++)for(var t=0;t<this._sections[n].consumer.sources.length;t++)e.push(this._sections[n].consumer.sources[t]);return e}}),a.prototype.originalPositionFor=function(e){var n={generatedLine:s.getArg(e,"line"),generatedColumn:s.getArg(e,"column")},t=u.search(n,this._sections,function(e,n){var t=e.generatedLine-n.generatedOffset.generatedLine;return t?t:e.generatedColumn-n.generatedOffset.generatedColumn}),r=this._sections[t];return r?r.consumer.originalPositionFor({line:n.generatedLine-(r.generatedOffset.generatedLine-1),column:n.generatedColumn-(r.generatedOffset.generatedLine===n.generatedLine?r.generatedOffset.generatedColumn-1:0),bias:e.bias}):{source:null,line:null,column:null,name:null}},a.prototype.hasContentsOfAllSources=function(){return this._sections.every(function(e){return e.consumer.hasContentsOfAllSources()})},a.prototype.sourceContentFor=function(e,n){for(var t=0;t<this._sections.length;t++){var r=this._sections[t],o=r.consumer.sourceContentFor(e,!0);if(o)return o}if(n)return null;throw new Error('"'+e+'" is not in the SourceMap.')},a.prototype.generatedPositionFor=function(e){for(var n=0;n<this._sections.length;n++){var t=this._sections[n];if(-1!==t.consumer.sources.indexOf(s.getArg(e,"source"))){var r=t.consumer.generatedPositionFor(e);if(r){var o={line:r.line+(t.generatedOffset.generatedLine-1),column:r.column+(t.generatedOffset.generatedLine===r.line?t.generatedOffset.generatedColumn-1:0)};return o}}}return{line:null,column:null}},a.prototype._parseMappings=function(e,n){this.__generatedMappings=[],this.__originalMappings=[];for(var t=0;t<this._sections.length;t++)for(var r=this._sections[t],o=r.consumer._generatedMappings,i=0;i<o.length;i++){var a=o[i],u=r.consumer._sources.at(a.source);null!==r.consumer.sourceRoot&&(u=s.join(r.consumer.sourceRoot,u)),this._sources.add(u),u=this._sources.indexOf(u);var c=r.consumer._names.at(a.name);this._names.add(c),c=this._names.indexOf(c);var l={source:u,generatedLine:a.generatedLine+(r.generatedOffset.generatedLine-1),generatedColumn:a.generatedColumn+(r.generatedOffset.generatedLine===a.generatedLine?r.generatedOffset.generatedColumn-1:0),originalLine:a.originalLine,originalColumn:a.originalColumn,name:c};this.__generatedMappings.push(l),"number"==typeof l.originalLine&&this.__originalMappings.push(l)}f(this.__generatedMappings,s.compareByGeneratedPositionsDeflated),f(this.__originalMappings,s.compareByOriginalPositions)},n.IndexedSourceMapConsumer=a},function(e,n){function t(e,n,t){if(n in e)return e[n];if(3===arguments.length)return t;throw new Error('"'+n+'" is a required argument.')}function r(e){var n=e.match(d);return n?{scheme:n[1],auth:n[2],host:n[3],port:n[4],path:n[5]}:null}function o(e){var n="";return e.scheme&&(n+=e.scheme+":"),n+="//",e.auth&&(n+=e.auth+"@"),e.host&&(n+=e.host),e.port&&(n+=":"+e.port),e.path&&(n+=e.path),n}function i(e){var t=e,i=r(e);if(i){if(!i.path)return e;t=i.path}for(var a,s=n.isAbsolute(t),u=t.split(/\/+/),c=0,l=u.length-1;l>=0;l--)a=u[l],"."===a?u.splice(l,1):".."===a?c++:c>0&&(""===a?(u.splice(l+1,c),c=0):(u.splice(l,2),c--));return t=u.join("/"),""===t&&(t=s?"/":"."),i?(i.path=t,o(i)):t}function a(e,n){""===e&&(e="."),""===n&&(n=".");var t=r(n),a=r(e);if(a&&(e=a.path||"/"),t&&!t.scheme)return a&&(t.scheme=a.scheme),o(t);if(t||n.match(v))return n;if(a&&!a.host&&!a.path)return a.host=n,o(a);var s="/"===n.charAt(0)?n:i(e.replace(/\/+$/,"")+"/"+n);return a?(a.path=s,o(a)):s}function s(e,n){""===e&&(e="."),e=e.replace(/\/$/,"");for(var t=0;0!==n.indexOf(e+"/");){var r=e.lastIndexOf("/");if(0>r)return n;if(e=e.slice(0,r),e.match(/^([^\/]+:\/)?\/*$/))return n;++t}return Array(t+1).join("../")+n.substr(e.length+1)}function u(e){return e}function c(e){return f(e)?"$"+e:e}function l(e){return f(e)?e.slice(1):e}function f(e){if(!e)return!1;var n=e.length;if(9>n)return!1;if(95!==e.charCodeAt(n-1)||95!==e.charCodeAt(n-2)||111!==e.charCodeAt(n-3)||116!==e.charCodeAt(n-4)||111!==e.charCodeAt(n-5)||114!==e.charCodeAt(n-6)||112!==e.charCodeAt(n-7)||95!==e.charCodeAt(n-8)||95!==e.charCodeAt(n-9))return!1;for(var t=n-10;t>=0;t--)if(36!==e.charCodeAt(t))return!1;return!0}function p(e,n,t){var r=e.source-n.source;return 0!==r?r:(r=e.originalLine-n.originalLine,0!==r?r:(r=e.originalColumn-n.originalColumn,0!==r||t?r:(r=e.generatedColumn-n.generatedColumn,0!==r?r:(r=e.generatedLine-n.generatedLine,0!==r?r:e.name-n.name))))}function g(e,n,t){var r=e.generatedLine-n.generatedLine;return 0!==r?r:(r=e.generatedColumn-n.generatedColumn,0!==r||t?r:(r=e.source-n.source,0!==r?r:(r=e.originalLine-n.originalLine,0!==r?r:(r=e.originalColumn-n.originalColumn,0!==r?r:e.name-n.name))))}function h(e,n){return e===n?0:e>n?1:-1}function m(e,n){var t=e.generatedLine-n.generatedLine;return 0!==t?t:(t=e.generatedColumn-n.generatedColumn,0!==t?t:(t=h(e.source,n.source),0!==t?t:(t=e.originalLine-n.originalLine,0!==t?t:(t=e.originalColumn-n.originalColumn,0!==t?t:h(e.name,n.name)))))}n.getArg=t;var d=/^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/,v=/^data:.+\,.+$/;n.urlParse=r,n.urlGenerate=o,n.normalize=i,n.join=a,n.isAbsolute=function(e){return"/"===e.charAt(0)||!!e.match(d)},n.relative=s;var _=function(){var e=Object.create(null);return!("__proto__"in e)}();n.toSetString=_?u:c,n.fromSetString=_?u:l,n.compareByOriginalPositions=p,n.compareByGeneratedPositionsDeflated=g,n.compareByGeneratedPositionsInflated=m},function(e,n){function t(e,r,o,i,a,s){var u=Math.floor((r-e)/2)+e,c=a(o,i[u],!0);return 0===c?u:c>0?r-u>1?t(u,r,o,i,a,s):s==n.LEAST_UPPER_BOUND?r<i.length?r:-1:u:u-e>1?t(e,u,o,i,a,s):s==n.LEAST_UPPER_BOUND?u:0>e?-1:e}n.GREATEST_LOWER_BOUND=1,n.LEAST_UPPER_BOUND=2,n.search=function(e,r,o,i){if(0===r.length)return-1;var a=t(-1,r.length,e,r,o,i||n.GREATEST_LOWER_BOUND);if(0>a)return-1;for(;a-1>=0&&0===o(r[a],r[a-1],!0);)--a;return a}},function(e,n,t){function r(){this._array=[],this._set=Object.create(null)}var o=t(1),i=Object.prototype.hasOwnProperty;r.fromArray=function(e,n){for(var t=new r,o=0,i=e.length;i>o;o++)t.add(e[o],n);return t},r.prototype.size=function(){return Object.getOwnPropertyNames(this._set).length},r.prototype.add=function(e,n){var t=o.toSetString(e),r=i.call(this._set,t),a=this._array.length;(!r||n)&&this._array.push(e),r||(this._set[t]=a)},r.prototype.has=function(e){var n=o.toSetString(e);return i.call(this._set,n)},r.prototype.indexOf=function(e){var n=o.toSetString(e);if(i.call(this._set,n))return this._set[n];throw new Error('"'+e+'" is not in the set.')},r.prototype.at=function(e){if(e>=0&&e<this._array.length)return this._array[e];throw new Error("No element indexed by "+e)},r.prototype.toArray=function(){return this._array.slice()},n.ArraySet=r},function(e,n,t){function r(e){return 0>e?(-e<<1)+1:(e<<1)+0}function o(e){var n=1===(1&e),t=e>>1;return n?-t:t}var i=t(5),a=5,s=1<<a,u=s-1,c=s;n.encode=function(e){var n,t="",o=r(e);do n=o&u,o>>>=a,o>0&&(n|=c),t+=i.encode(n);while(o>0);return t},n.decode=function(e,n,t){var r,s,l=e.length,f=0,p=0;do{if(n>=l)throw new Error("Expected more digits in base 64 VLQ value.");if(s=i.decode(e.charCodeAt(n++)),-1===s)throw new Error("Invalid base64 digit: "+e.charAt(n-1));r=!!(s&c),s&=u,f+=s<<p,p+=a}while(r);t.value=o(f),t.rest=n}},function(e,n){var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");n.encode=function(e){if(e>=0&&e<t.length)return t[e];throw new TypeError("Must be between 0 and 63: "+e)},n.decode=function(e){var n=65,t=90,r=97,o=122,i=48,a=57,s=43,u=47,c=26,l=52;return e>=n&&t>=e?e-n:e>=r&&o>=e?e-r+c:e>=i&&a>=e?e-i+l:e==s?62:e==u?63:-1}},function(e,n){function t(e,n,t){var r=e[n];e[n]=e[t],e[t]=r}function r(e,n){return Math.round(e+Math.random()*(n-e))}function o(e,n,i,a){if(a>i){var s=r(i,a),u=i-1;t(e,s,a);for(var c=e[a],l=i;a>l;l++)n(e[l],c)<=0&&(u+=1,t(e,u,l));t(e,u+1,l);var f=u+1;o(e,n,i,f-1),o(e,n,f+1,a)}}n.quickSort=function(e,n){o(e,n,0,e.length-1)}}]);!function(e,n){"use strict";"function"==typeof define&&define.amd?define("stacktrace-gps",["source-map","stackframe"],n):"object"==typeof exports?module.exports=n(require("source-map/lib/source-map-consumer"),require("stackframe")):e.StackTraceGPS=n(e.SourceMap||e.sourceMap,e.StackFrame)}(this,function(e,n){"use strict";function t(e){return new Promise(function(n,t){var r=new XMLHttpRequest;r.open("get",e),r.onerror=t,r.onreadystatechange=function(){4===r.readyState&&(r.status>=200&&r.status<300?n(r.responseText):t(new Error("HTTP status: "+r.status+" retrieving "+e)))},r.send()})}function r(e){if("undefined"!=typeof window&&window.atob)return window.atob(e);throw new Error("You must supply a polyfill for window.atob in this environment")}function o(e){if("undefined"!=typeof JSON&&JSON.parse)return JSON.parse(e);throw new Error("You must supply a polyfill for JSON.parse in this environment")}function i(e,n){for(var t,r=/function\s+([^(]*?)\s*\(([^)]*)\)/,o=/['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*function\b/,i=/['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*(?:eval|new Function)\b/,a=e.split("\n"),s="",u=Math.min(n,20),c=0;u>c;++c){var l=a[n-c-1],f=l.indexOf("//");if(f>=0&&(l=l.substr(0,f)),l){if(s=l+s,t=o.exec(s),t&&t[1])return t[1];if(t=r.exec(s),t&&t[1])return t[1];if(t=i.exec(s),t&&t[1])return t[1]}}}function a(){if("function"!=typeof Object.defineProperty||"function"!=typeof Object.create)throw new Error("Unable to consume source maps in older browsers")}function s(e){if("object"!=typeof e)throw new TypeError("Given StackFrame is not an object");if("string"!=typeof e.fileName)throw new TypeError("Given file name is not a String");if("number"!=typeof e.lineNumber||e.lineNumber%1!==0||e.lineNumber<1)throw new TypeError("Given line number must be a positive integer");if("number"!=typeof e.columnNumber||e.columnNumber%1!==0||e.columnNumber<0)throw new TypeError("Given column number must be a non-negative integer");return!0}function u(e){var n=/\/\/[#@] ?sourceMappingURL=([^\s'"]+)\s*$/.exec(e);if(n&&n[1])return n[1];throw new Error("sourceMappingURL not found")}function c(t,r,o,i,a){var s=new e.SourceMapConsumer(t),u=s.originalPositionFor({line:o,column:i}),c=s.sourceContentFor(u.source);return c&&(a[u.source]=c),new n(u.name,r,u.source,u.line,u.column)}return function l(e){return this instanceof l?(e=e||{},this.sourceCache=e.sourceCache||{},this.ajax=e.ajax||t,this._atob=e.atob||r,this._get=function(n){return new Promise(function(t,r){var o="data:"===n.substr(0,5);if(this.sourceCache[n])t(this.sourceCache[n]);else if(e.offline&&!o)r(new Error("Cannot make network requests in offline mode"));else if(o){var i=/^data:application\/json;([\w=:"-]+;)*base64,/,a=n.match(i);if(a){var s=a[0].length,u=n.substr(s),c=this._atob(u);this.sourceCache[n]=c,t(c)}else r(new Error("The encoding of the inline sourcemap is not supported"))}else{var l=this.ajax(n,{method:"get"});this.sourceCache[n]=l,l.then(t,r)}}.bind(this))},this.pinpoint=function(e){return new Promise(function(n,t){this.getMappedLocation(e).then(function(e){function t(){n(e)}this.findFunctionName(e).then(n,t)["catch"](t)}.bind(this),t)}.bind(this))},this.findFunctionName=function(e){return new Promise(function(t,r){s(e),this._get(e.fileName).then(function(r){var o=i(r,e.lineNumber,e.columnNumber);t(new n(o,e.args,e.fileName,e.lineNumber,e.columnNumber))},r)["catch"](r)}.bind(this))},void(this.getMappedLocation=function(e){return new Promise(function(n,t){a(),s(e);var r=this.sourceCache,i=e.fileName;this._get(i).then(function(a){var s=u(a),l="data:"===s.substr(0,5),f=i.substring(0,i.lastIndexOf("/")+1);"/"===s[0]||l||/^https?:\/\/|^\/\//i.test(s)||(s=f+s),this._get(s).then(function(t){var i=e.lineNumber,a=e.columnNumber;"string"==typeof t&&(t=o(t.replace(/^\)\]\}'/,""))),"undefined"==typeof t.sourceRoot&&(t.sourceRoot=f),n(c(t,e.args,i,a,r))},t)["catch"](t)}.bind(this),t)["catch"](t)}.bind(this))})):new l(e)}}),function(e,n){"use strict";"function"==typeof define&&define.amd?define("stack-generator",["stackframe"],n):"object"==typeof exports?module.exports=n(require("stackframe")):e.StackGenerator=n(e.StackFrame)}(this,function(e){return{backtrace:function(n){var t=[],r=10;"object"==typeof n&&"number"==typeof n.maxStackSize&&(r=n.maxStackSize);for(var o=arguments.callee;o&&t.length<r;){for(var i=new Array(o.arguments.length),a=0;a<i.length;++a)i[a]=o.arguments[a];/function(?:\s+([\w$]+))+\s*\(/.test(o.toString())?t.push(new e(RegExp.$1||void 0,i)):t.push(new e(void 0,i));try{o=o.caller}catch(s){break}}return t}}}),function(e,n){"use strict";"function"==typeof define&&define.amd?define("error-stack-parser",["stackframe"],n):"object"==typeof exports?module.exports=n(require("stackframe")):e.ErrorStackParser=n(e.StackFrame)}(this,function(e){"use strict";function n(e,n,t){if("function"==typeof Array.prototype.map)return e.map(n,t);for(var r=new Array(e.length),o=0;o<e.length;o++)r[o]=n.call(t,e[o]);return r}function t(e,n,t){if("function"==typeof Array.prototype.filter)return e.filter(n,t);for(var r=[],o=0;o<e.length;o++)n.call(t,e[o])&&r.push(e[o]);return r}function r(e,n){if("function"==typeof Array.prototype.indexOf)return e.indexOf(n);for(var t=0;t<e.length;t++)if(e[t]===n)return t;return-1}var o=/(^|@)\S+\:\d+/,i=/^\s*at .*(\S+\:\d+|\(native\))/m,a=/^(eval@)?(\[native code\])?$/;return{parse:function(e){if("undefined"!=typeof e.stacktrace||"undefined"!=typeof e["opera#sourceloc"])return this.parseOpera(e);if(e.stack&&e.stack.match(i))return this.parseV8OrIE(e);if(e.stack)return this.parseFFOrSafari(e);throw new Error("Cannot parse given Error object")},extractLocation:function(e){if(-1===e.indexOf(":"))return[e];var n=/(.+?)(?:\:(\d+))?(?:\:(\d+))?$/,t=n.exec(e.replace(/[\(\)]/g,""));return[t[1],t[2]||void 0,t[3]||void 0]},parseV8OrIE:function(o){var a=t(o.stack.split("\n"),function(e){return!!e.match(i)},this);return n(a,function(n){n.indexOf("(eval ")>-1&&(n=n.replace(/eval code/g,"eval").replace(/(\(eval at [^\()]*)|(\)\,.*$)/g,""));var t=n.replace(/^\s+/,"").replace(/\(eval code/g,"(").split(/\s+/).slice(1),o=this.extractLocation(t.pop()),i=t.join(" ")||void 0,a=r(["eval","<anonymous>"],o[0])>-1?void 0:o[0];return new e(i,void 0,a,o[1],o[2],n)},this)},parseFFOrSafari:function(r){var o=t(r.stack.split("\n"),function(e){return!e.match(a)},this);return n(o,function(n){if(n.indexOf(" > eval")>-1&&(n=n.replace(/ line (\d+)(?: > eval line \d+)* > eval\:\d+\:\d+/g,":$1")),-1===n.indexOf("@")&&-1===n.indexOf(":"))return new e(n);var t=n.split("@"),r=this.extractLocation(t.pop()),o=t.join("@")||void 0;return new e(o,void 0,r[0],r[1],r[2],n)},this)},parseOpera:function(e){return!e.stacktrace||e.message.indexOf("\n")>-1&&e.message.split("\n").length>e.stacktrace.split("\n").length?this.parseOpera9(e):e.stack?this.parseOpera11(e):this.parseOpera10(e)},parseOpera9:function(n){for(var t=/Line (\d+).*script (?:in )?(\S+)/i,r=n.message.split("\n"),o=[],i=2,a=r.length;a>i;i+=2){var s=t.exec(r[i]);s&&o.push(new e(void 0,void 0,s[2],s[1],void 0,r[i]))}return o},parseOpera10:function(n){for(var t=/Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i,r=n.stacktrace.split("\n"),o=[],i=0,a=r.length;a>i;i+=2){var s=t.exec(r[i]);s&&o.push(new e(s[3]||void 0,void 0,s[2],s[1],void 0,r[i]))}return o},parseOpera11:function(r){var i=t(r.stack.split("\n"),function(e){return!!e.match(o)&&!e.match(/^Error created at/)},this);return n(i,function(n){var t,r=n.split("@"),o=this.extractLocation(r.pop()),i=r.shift()||"",a=i.replace(/<anonymous function(: (\w+))?>/,"$2").replace(/\([^\)]*\)/g,"")||void 0;i.match(/\(([^\)]*)\)/)&&(t=i.replace(/^[^\(]+\(([^\)]*)\)$/,"$1"));var s=void 0===t||"[arguments not available]"===t?void 0:t.split(",");return new e(a,s,o[0],o[1],o[2],n)},this)}}}),function(e,n){"use strict";"function"==typeof define&&define.amd?define("stacktrace",["error-stack-parser","stack-generator","stacktrace-gps"],n):"object"==typeof exports?module.exports=n(require("error-stack-parser"),require("stack-generator"),require("stacktrace-gps")):e.StackTrace=n(e.ErrorStackParser,e.StackGenerator,e.StackTraceGPS)}(this,function(e,n,t){function r(e,n){var t={};return[e,n].forEach(function(e){for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n]);return t}),t}function o(e){return e.stack||e["opera#sourceloc"]}var i={filter:function(e){return-1===(e.functionName||"").indexOf("StackTrace$$")&&-1===(e.functionName||"").indexOf("ErrorStackParser$$")&&-1===(e.functionName||"").indexOf("StackTraceGPS$$")&&-1===(e.functionName||"").indexOf("StackGenerator$$")},sourceCache:{}};return{get:function(e){try{throw new Error}catch(n){return o(n)?this.fromError(n,e):this.generateArtificially(e)}},fromError:function(n,o){o=r(i,o);var a=new t(o);return new Promise(function(t){var r=e.parse(n);"function"==typeof o.filter&&(r=r.filter(o.filter)),t(Promise.all(r.map(function(e){return new Promise(function(n){function t(){n(e)}a.pinpoint(e).then(n,t)["catch"](t)})})))}.bind(this))},generateArtificially:function(e){e=r(i,e);var t=n.backtrace(e);return"function"==typeof e.filter&&(t=t.filter(e.filter)),Promise.resolve(t)},instrument:function(e,n,t,r){if("function"!=typeof e)throw new Error("Cannot instrument non-function object");if("function"==typeof e.__stacktraceOriginalFn)return e;var i=function(){try{return this.get().then(n,t)["catch"](t),e.apply(r||this,arguments)}catch(i){throw o(i)&&this.fromError(i).then(n,t)["catch"](t),i}}.bind(this);return i.__stacktraceOriginalFn=e,i},deinstrument:function(e){if("function"!=typeof e)throw new Error("Cannot de-instrument non-function object");return"function"==typeof e.__stacktraceOriginalFn?e.__stacktraceOriginalFn:e},report:function(e,n,t){return new Promise(function(r,o){var i=new XMLHttpRequest;i.onerror=o,i.onreadystatechange=function(){4===i.readyState&&(i.status>=200&&i.status<400?r(i.responseText):o(new Error("POST to "+n+" failed with status: "+i.status)))},i.open("post",n),i.setRequestHeader("Content-Type","application/json");var a={stack:e};void 0!=t&&(a.message=t),i.send(JSON.stringify(a))})}}});
//# sourceMappingURL=stacktrace.min.js.map