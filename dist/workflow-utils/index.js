/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 132:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var parser = __nccwpck_require__(613);
var compiler = __nccwpck_require__(763);

module.exports = {
  parse: function(input) {
    var nodes = parser.parse(input.toString());
    return compiler.compile(nodes);
  }
};


/***/ }),

/***/ 763:
/***/ ((module) => {

"use strict";

function compile(nodes) {
  var assignedPaths = [];
  var valueAssignments = [];
  var currentPath = "";
  var data = Object.create(null);
  var context = data;
  var arrayMode = false;

  return reduce(nodes);

  function reduce(nodes) {
    var node;
    for (var i = 0; i < nodes.length; i++) {
      node = nodes[i];
      switch (node.type) {
      case "Assign":
        assign(node);
        break;
      case "ObjectPath":
        setPath(node);
        break;
      case "ArrayPath":
        addTableArray(node);
        break;
      }
    }

    return data;
  }

  function genError(err, line, col) {
    var ex = new Error(err);
    ex.line = line;
    ex.column = col;
    throw ex;
  }

  function assign(node) {
    var key = node.key;
    var value = node.value;
    var line = node.line;
    var column = node.column;

    var fullPath;
    if (currentPath) {
      fullPath = currentPath + "." + key;
    } else {
      fullPath = key;
    }
    if (typeof context[key] !== "undefined") {
      genError("Cannot redefine existing key '" + fullPath + "'.", line, column);
    }

    context[key] = reduceValueNode(value);

    if (!pathAssigned(fullPath)) {
      assignedPaths.push(fullPath);
      valueAssignments.push(fullPath);
    }
  }


  function pathAssigned(path) {
    return assignedPaths.indexOf(path) !== -1;
  }

  function reduceValueNode(node) {
    if (node.type === "Array") {
      return reduceArrayWithTypeChecking(node.value);
    } else if (node.type === "InlineTable") {
      return reduceInlineTableNode(node.value);
    } else {
      return node.value;
    }
  }

  function reduceInlineTableNode(values) {
    var obj = Object.create(null);
    for (var i = 0; i < values.length; i++) {
      var val = values[i];
      if (val.value.type === "InlineTable") {
        obj[val.key] = reduceInlineTableNode(val.value.value);
      } else if (val.type === "InlineTableValue") {
        obj[val.key] = reduceValueNode(val.value);
      }
    }

    return obj;
  }

  function setPath(node) {
    var path = node.value;
    var quotedPath = path.map(quoteDottedString).join(".");
    var line = node.line;
    var column = node.column;

    if (pathAssigned(quotedPath)) {
      genError("Cannot redefine existing key '" + path + "'.", line, column);
    }
    assignedPaths.push(quotedPath);
    context = deepRef(data, path, Object.create(null), line, column);
    currentPath = path;
  }

  function addTableArray(node) {
    var path = node.value;
    var quotedPath = path.map(quoteDottedString).join(".");
    var line = node.line;
    var column = node.column;

    if (!pathAssigned(quotedPath)) {
      assignedPaths.push(quotedPath);
    }
    assignedPaths = assignedPaths.filter(function(p) {
      return p.indexOf(quotedPath) !== 0;
    });
    assignedPaths.push(quotedPath);
    context = deepRef(data, path, [], line, column);
    currentPath = quotedPath;

    if (context instanceof Array) {
      var newObj = Object.create(null);
      context.push(newObj);
      context = newObj;
    } else {
      genError("Cannot redefine existing key '" + path + "'.", line, column);
    }
  }

  // Given a path 'a.b.c', create (as necessary) `start.a`,
  // `start.a.b`, and `start.a.b.c`, assigning `value` to `start.a.b.c`.
  // If `a` or `b` are arrays and have items in them, the last item in the
  // array is used as the context for the next sub-path.
  function deepRef(start, keys, value, line, column) {
    var traversed = [];
    var traversedPath = "";
    var path = keys.join(".");
    var ctx = start;

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      traversed.push(key);
      traversedPath = traversed.join(".");
      if (typeof ctx[key] === "undefined") {
        if (i === keys.length - 1) {
          ctx[key] = value;
        } else {
          ctx[key] = Object.create(null);
        }
      } else if (i !== keys.length - 1 && valueAssignments.indexOf(traversedPath) > -1) {
        // already a non-object value at key, can't be used as part of a new path
        genError("Cannot redefine existing key '" + traversedPath + "'.", line, column);
      }

      ctx = ctx[key];
      if (ctx instanceof Array && ctx.length && i < keys.length - 1) {
        ctx = ctx[ctx.length - 1];
      }
    }

    return ctx;
  }

  function reduceArrayWithTypeChecking(array) {
    // Ensure that all items in the array are of the same type
    var firstType = null;
    for (var i = 0; i < array.length; i++) {
      var node = array[i];
      if (firstType === null) {
        firstType = node.type;
      } else {
        if (node.type !== firstType) {
          genError("Cannot add value of type " + node.type + " to array of type " +
            firstType + ".", node.line, node.column);
        }
      }
    }

    // Recursively reduce array of nodes into array of the nodes' values
    return array.map(reduceValueNode);
  }

  function quoteDottedString(str) {
    if (str.indexOf(".") > -1) {
      return "\"" + str + "\"";
    } else {
      return str;
    }
  }
}

module.exports = {
  compile: compile
};


/***/ }),

/***/ 613:
/***/ ((module) => {

module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = [],
        peg$c1 = function() { return nodes },
        peg$c2 = peg$FAILED,
        peg$c3 = "#",
        peg$c4 = { type: "literal", value: "#", description: "\"#\"" },
        peg$c5 = void 0,
        peg$c6 = { type: "any", description: "any character" },
        peg$c7 = "[",
        peg$c8 = { type: "literal", value: "[", description: "\"[\"" },
        peg$c9 = "]",
        peg$c10 = { type: "literal", value: "]", description: "\"]\"" },
        peg$c11 = function(name) { addNode(node('ObjectPath', name, line, column)) },
        peg$c12 = function(name) { addNode(node('ArrayPath', name, line, column)) },
        peg$c13 = function(parts, name) { return parts.concat(name) },
        peg$c14 = function(name) { return [name] },
        peg$c15 = function(name) { return name },
        peg$c16 = ".",
        peg$c17 = { type: "literal", value: ".", description: "\".\"" },
        peg$c18 = "=",
        peg$c19 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c20 = function(key, value) { addNode(node('Assign', value, line, column, key)) },
        peg$c21 = function(chars) { return chars.join('') },
        peg$c22 = function(node) { return node.value },
        peg$c23 = "\"\"\"",
        peg$c24 = { type: "literal", value: "\"\"\"", description: "\"\\\"\\\"\\\"\"" },
        peg$c25 = null,
        peg$c26 = function(chars) { return node('String', chars.join(''), line, column) },
        peg$c27 = "\"",
        peg$c28 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c29 = "'''",
        peg$c30 = { type: "literal", value: "'''", description: "\"'''\"" },
        peg$c31 = "'",
        peg$c32 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c33 = function(char) { return char },
        peg$c34 = function(char) { return char},
        peg$c35 = "\\",
        peg$c36 = { type: "literal", value: "\\", description: "\"\\\\\"" },
        peg$c37 = function() { return '' },
        peg$c38 = "e",
        peg$c39 = { type: "literal", value: "e", description: "\"e\"" },
        peg$c40 = "E",
        peg$c41 = { type: "literal", value: "E", description: "\"E\"" },
        peg$c42 = function(left, right) { return node('Float', parseFloat(left + 'e' + right), line, column) },
        peg$c43 = function(text) { return node('Float', parseFloat(text), line, column) },
        peg$c44 = "+",
        peg$c45 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c46 = function(digits) { return digits.join('') },
        peg$c47 = "-",
        peg$c48 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c49 = function(digits) { return '-' + digits.join('') },
        peg$c50 = function(text) { return node('Integer', parseInt(text, 10), line, column) },
        peg$c51 = "true",
        peg$c52 = { type: "literal", value: "true", description: "\"true\"" },
        peg$c53 = function() { return node('Boolean', true, line, column) },
        peg$c54 = "false",
        peg$c55 = { type: "literal", value: "false", description: "\"false\"" },
        peg$c56 = function() { return node('Boolean', false, line, column) },
        peg$c57 = function() { return node('Array', [], line, column) },
        peg$c58 = function(value) { return node('Array', value ? [value] : [], line, column) },
        peg$c59 = function(values) { return node('Array', values, line, column) },
        peg$c60 = function(values, value) { return node('Array', values.concat(value), line, column) },
        peg$c61 = function(value) { return value },
        peg$c62 = ",",
        peg$c63 = { type: "literal", value: ",", description: "\",\"" },
        peg$c64 = "{",
        peg$c65 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c66 = "}",
        peg$c67 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c68 = function(values) { return node('InlineTable', values, line, column) },
        peg$c69 = function(key, value) { return node('InlineTableValue', value, line, column, key) },
        peg$c70 = function(digits) { return "." + digits },
        peg$c71 = function(date) { return  date.join('') },
        peg$c72 = ":",
        peg$c73 = { type: "literal", value: ":", description: "\":\"" },
        peg$c74 = function(time) { return time.join('') },
        peg$c75 = "T",
        peg$c76 = { type: "literal", value: "T", description: "\"T\"" },
        peg$c77 = "Z",
        peg$c78 = { type: "literal", value: "Z", description: "\"Z\"" },
        peg$c79 = function(date, time) { return node('Date', new Date(date + "T" + time + "Z"), line, column) },
        peg$c80 = function(date, time) { return node('Date', new Date(date + "T" + time), line, column) },
        peg$c81 = /^[ \t]/,
        peg$c82 = { type: "class", value: "[ \\t]", description: "[ \\t]" },
        peg$c83 = "\n",
        peg$c84 = { type: "literal", value: "\n", description: "\"\\n\"" },
        peg$c85 = "\r",
        peg$c86 = { type: "literal", value: "\r", description: "\"\\r\"" },
        peg$c87 = /^[0-9a-f]/i,
        peg$c88 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
        peg$c89 = /^[0-9]/,
        peg$c90 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c91 = "_",
        peg$c92 = { type: "literal", value: "_", description: "\"_\"" },
        peg$c93 = function() { return "" },
        peg$c94 = /^[A-Za-z0-9_\-]/,
        peg$c95 = { type: "class", value: "[A-Za-z0-9_\\-]", description: "[A-Za-z0-9_\\-]" },
        peg$c96 = function(d) { return d.join('') },
        peg$c97 = "\\\"",
        peg$c98 = { type: "literal", value: "\\\"", description: "\"\\\\\\\"\"" },
        peg$c99 = function() { return '"'  },
        peg$c100 = "\\\\",
        peg$c101 = { type: "literal", value: "\\\\", description: "\"\\\\\\\\\"" },
        peg$c102 = function() { return '\\' },
        peg$c103 = "\\b",
        peg$c104 = { type: "literal", value: "\\b", description: "\"\\\\b\"" },
        peg$c105 = function() { return '\b' },
        peg$c106 = "\\t",
        peg$c107 = { type: "literal", value: "\\t", description: "\"\\\\t\"" },
        peg$c108 = function() { return '\t' },
        peg$c109 = "\\n",
        peg$c110 = { type: "literal", value: "\\n", description: "\"\\\\n\"" },
        peg$c111 = function() { return '\n' },
        peg$c112 = "\\f",
        peg$c113 = { type: "literal", value: "\\f", description: "\"\\\\f\"" },
        peg$c114 = function() { return '\f' },
        peg$c115 = "\\r",
        peg$c116 = { type: "literal", value: "\\r", description: "\"\\\\r\"" },
        peg$c117 = function() { return '\r' },
        peg$c118 = "\\U",
        peg$c119 = { type: "literal", value: "\\U", description: "\"\\\\U\"" },
        peg$c120 = function(digits) { return convertCodePoint(digits.join('')) },
        peg$c121 = "\\u",
        peg$c122 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$cache = {},
        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 0,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseline();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseline();
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c1();
      }
      s0 = s1;

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseline() {
      var s0, s1, s2, s3, s4, s5, s6;

      var key    = peg$currPos * 49 + 1,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseS();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseS();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseexpression();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseS();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseS();
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsecomment();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parsecomment();
            }
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseNL();
              if (s6 !== peg$FAILED) {
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parseNL();
                }
              } else {
                s5 = peg$c2;
              }
              if (s5 === peg$FAILED) {
                s5 = peg$parseEOF();
              }
              if (s5 !== peg$FAILED) {
                s1 = [s1, s2, s3, s4, s5];
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parseS();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parseS();
          }
        } else {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseNL();
          if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$parseNL();
            }
          } else {
            s2 = peg$c2;
          }
          if (s2 === peg$FAILED) {
            s2 = peg$parseEOF();
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parseNL();
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseexpression() {
      var s0;

      var key    = peg$currPos * 49 + 2,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$parsecomment();
      if (s0 === peg$FAILED) {
        s0 = peg$parsepath();
        if (s0 === peg$FAILED) {
          s0 = peg$parsetablearray();
          if (s0 === peg$FAILED) {
            s0 = peg$parseassignment();
          }
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsecomment() {
      var s0, s1, s2, s3, s4, s5;

      var key    = peg$currPos * 49 + 3,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 35) {
        s1 = peg$c3;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c4); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parseNL();
        if (s5 === peg$FAILED) {
          s5 = peg$parseEOF();
        }
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = peg$c5;
        } else {
          peg$currPos = s4;
          s4 = peg$c2;
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c6); }
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$c2;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c2;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parseNL();
          if (s5 === peg$FAILED) {
            s5 = peg$parseEOF();
          }
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = peg$c5;
          } else {
            peg$currPos = s4;
            s4 = peg$c2;
          }
          if (s4 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c6); }
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c2;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c2;
          }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsepath() {
      var s0, s1, s2, s3, s4, s5;

      var key    = peg$currPos * 49 + 4,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c7;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseS();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseS();
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsetable_key();
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parseS();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parseS();
            }
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 93) {
                s5 = peg$c9;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c10); }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c11(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsetablearray() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      var key    = peg$currPos * 49 + 5,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c7;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 91) {
          s2 = peg$c7;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c8); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseS();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseS();
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsetable_key();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseS();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parseS();
              }
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 93) {
                  s6 = peg$c9;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c10); }
                }
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 93) {
                    s7 = peg$c9;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c10); }
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c12(s4);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsetable_key() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 6,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsedot_ended_table_key_part();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsedot_ended_table_key_part();
        }
      } else {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsetable_key_part();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c13(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsetable_key_part();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c14(s1);
        }
        s0 = s1;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsetable_key_part() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 49 + 7,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseS();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseS();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsekey();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseS();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseS();
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c15(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parseS();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseS();
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsequoted_key();
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parseS();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseS();
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c15(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsedot_ended_table_key_part() {
      var s0, s1, s2, s3, s4, s5, s6;

      var key    = peg$currPos * 49 + 8,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseS();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseS();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsekey();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseS();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseS();
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 46) {
              s4 = peg$c16;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c17); }
            }
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseS();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parseS();
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c15(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parseS();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseS();
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsequoted_key();
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parseS();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseS();
            }
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 46) {
                s4 = peg$c16;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c17); }
              }
              if (s4 !== peg$FAILED) {
                s5 = [];
                s6 = peg$parseS();
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parseS();
                }
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c15(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseassignment() {
      var s0, s1, s2, s3, s4, s5;

      var key    = peg$currPos * 49 + 9,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parsekey();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseS();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseS();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s3 = peg$c18;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c19); }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parseS();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parseS();
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsevalue();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c20(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsequoted_key();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseS();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseS();
          }
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 61) {
              s3 = peg$c18;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c19); }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parseS();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parseS();
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parsevalue();
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c20(s1, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsekey() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 10,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseASCII_BASIC();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseASCII_BASIC();
        }
      } else {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c21(s1);
      }
      s0 = s1;

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsequoted_key() {
      var s0, s1;

      var key    = peg$currPos * 49 + 11,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parsedouble_quoted_single_line_string();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c22(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsesingle_quoted_single_line_string();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c22(s1);
        }
        s0 = s1;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsevalue() {
      var s0;

      var key    = peg$currPos * 49 + 12,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$parsestring();
      if (s0 === peg$FAILED) {
        s0 = peg$parsedatetime();
        if (s0 === peg$FAILED) {
          s0 = peg$parsefloat();
          if (s0 === peg$FAILED) {
            s0 = peg$parseinteger();
            if (s0 === peg$FAILED) {
              s0 = peg$parseboolean();
              if (s0 === peg$FAILED) {
                s0 = peg$parsearray();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseinline_table();
                }
              }
            }
          }
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsestring() {
      var s0;

      var key    = peg$currPos * 49 + 13,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$parsedouble_quoted_multiline_string();
      if (s0 === peg$FAILED) {
        s0 = peg$parsedouble_quoted_single_line_string();
        if (s0 === peg$FAILED) {
          s0 = peg$parsesingle_quoted_multiline_string();
          if (s0 === peg$FAILED) {
            s0 = peg$parsesingle_quoted_single_line_string();
          }
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsedouble_quoted_multiline_string() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 49 + 14,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c23) {
        s1 = peg$c23;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c24); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseNL();
        if (s2 === peg$FAILED) {
          s2 = peg$c25;
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsemultiline_string_char();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsemultiline_string_char();
          }
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c23) {
              s4 = peg$c23;
              peg$currPos += 3;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c24); }
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c26(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsedouble_quoted_single_line_string() {
      var s0, s1, s2, s3;

      var key    = peg$currPos * 49 + 15,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c27;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsestring_char();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsestring_char();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c27;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c28); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c26(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsesingle_quoted_multiline_string() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 49 + 16,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c29) {
        s1 = peg$c29;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c30); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseNL();
        if (s2 === peg$FAILED) {
          s2 = peg$c25;
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsemultiline_literal_char();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsemultiline_literal_char();
          }
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c29) {
              s4 = peg$c29;
              peg$currPos += 3;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c30); }
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c26(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsesingle_quoted_single_line_string() {
      var s0, s1, s2, s3;

      var key    = peg$currPos * 49 + 17,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c31;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseliteral_char();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseliteral_char();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s3 = peg$c31;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c32); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c26(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsestring_char() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 18,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$parseESCAPED();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 34) {
          s2 = peg$c27;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c28); }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c5;
        } else {
          peg$currPos = s1;
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c6); }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c33(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseliteral_char() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 19,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 39) {
        s2 = peg$c31;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = peg$c5;
      } else {
        peg$currPos = s1;
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c6); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c33(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsemultiline_string_char() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 20,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$parseESCAPED();
      if (s0 === peg$FAILED) {
        s0 = peg$parsemultiline_string_delim();
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$currPos;
          peg$silentFails++;
          if (input.substr(peg$currPos, 3) === peg$c23) {
            s2 = peg$c23;
            peg$currPos += 3;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c24); }
          }
          peg$silentFails--;
          if (s2 === peg$FAILED) {
            s1 = peg$c5;
          } else {
            peg$currPos = s1;
            s1 = peg$c2;
          }
          if (s1 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c6); }
            }
            if (s2 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c34(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsemultiline_string_delim() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 49 + 21,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c35;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c36); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseNL();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseNLS();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseNLS();
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c37();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsemultiline_literal_char() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 22,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.substr(peg$currPos, 3) === peg$c29) {
        s2 = peg$c29;
        peg$currPos += 3;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c30); }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = peg$c5;
      } else {
        peg$currPos = s1;
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c6); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c33(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsefloat() {
      var s0, s1, s2, s3;

      var key    = peg$currPos * 49 + 23,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parsefloat_text();
      if (s1 === peg$FAILED) {
        s1 = peg$parseinteger_text();
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 101) {
          s2 = peg$c38;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c39); }
        }
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 69) {
            s2 = peg$c40;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c41); }
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseinteger_text();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c42(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsefloat_text();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c43(s1);
        }
        s0 = s1;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsefloat_text() {
      var s0, s1, s2, s3, s4, s5;

      var key    = peg$currPos * 49 + 24,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 43) {
        s1 = peg$c44;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c45); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c25;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parseDIGITS();
        if (s3 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s4 = peg$c16;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parseDIGITS();
            if (s5 !== peg$FAILED) {
              s3 = [s3, s4, s5];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c46(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 45) {
          s1 = peg$c47;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c48); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parseDIGITS();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 46) {
              s4 = peg$c16;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c17); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parseDIGITS();
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c49(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseinteger() {
      var s0, s1;

      var key    = peg$currPos * 49 + 25,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parseinteger_text();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c50(s1);
      }
      s0 = s1;

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseinteger_text() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 49 + 26,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 43) {
        s1 = peg$c44;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c45); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c25;
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseDIGIT_OR_UNDER();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseDIGIT_OR_UNDER();
          }
        } else {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          peg$silentFails++;
          if (input.charCodeAt(peg$currPos) === 46) {
            s4 = peg$c16;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          peg$silentFails--;
          if (s4 === peg$FAILED) {
            s3 = peg$c5;
          } else {
            peg$currPos = s3;
            s3 = peg$c2;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c46(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 45) {
          s1 = peg$c47;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c48); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseDIGIT_OR_UNDER();
          if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$parseDIGIT_OR_UNDER();
            }
          } else {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            peg$silentFails++;
            if (input.charCodeAt(peg$currPos) === 46) {
              s4 = peg$c16;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c17); }
            }
            peg$silentFails--;
            if (s4 === peg$FAILED) {
              s3 = peg$c5;
            } else {
              peg$currPos = s3;
              s3 = peg$c2;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c49(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseboolean() {
      var s0, s1;

      var key    = peg$currPos * 49 + 27,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c51) {
        s1 = peg$c51;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c52); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c53();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 5) === peg$c54) {
          s1 = peg$c54;
          peg$currPos += 5;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c55); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c56();
        }
        s0 = s1;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsearray() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 49 + 28,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c7;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsearray_sep();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsearray_sep();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 93) {
            s3 = peg$c9;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c10); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c57();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 91) {
          s1 = peg$c7;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c8); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsearray_value();
          if (s2 === peg$FAILED) {
            s2 = peg$c25;
          }
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s3 = peg$c9;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c10); }
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c58(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 91) {
            s1 = peg$c7;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
          if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$parsearray_value_list();
            if (s3 !== peg$FAILED) {
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$parsearray_value_list();
              }
            } else {
              s2 = peg$c2;
            }
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 93) {
                s3 = peg$c9;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c10); }
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c59(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 91) {
              s1 = peg$c7;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c8); }
            }
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$parsearray_value_list();
              if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                  s2.push(s3);
                  s3 = peg$parsearray_value_list();
                }
              } else {
                s2 = peg$c2;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parsearray_value();
                if (s3 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 93) {
                    s4 = peg$c9;
                    peg$currPos++;
                  } else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c10); }
                  }
                  if (s4 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c60(s2, s3);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          }
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsearray_value() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 49 + 29,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsearray_sep();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsearray_sep();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsevalue();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsearray_sep();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsearray_sep();
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c61(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsearray_value_list() {
      var s0, s1, s2, s3, s4, s5, s6;

      var key    = peg$currPos * 49 + 30,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsearray_sep();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsearray_sep();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsevalue();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsearray_sep();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsearray_sep();
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s4 = peg$c62;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c63); }
            }
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parsearray_sep();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parsearray_sep();
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c61(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsearray_sep() {
      var s0;

      var key    = peg$currPos * 49 + 31,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$parseS();
      if (s0 === peg$FAILED) {
        s0 = peg$parseNL();
        if (s0 === peg$FAILED) {
          s0 = peg$parsecomment();
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseinline_table() {
      var s0, s1, s2, s3, s4, s5;

      var key    = peg$currPos * 49 + 32,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c64;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c65); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseS();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseS();
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseinline_table_assignment();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseinline_table_assignment();
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parseS();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parseS();
            }
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 125) {
                s5 = peg$c66;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c67); }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c68(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseinline_table_assignment() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      var key    = peg$currPos * 49 + 33,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseS();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseS();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsekey();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseS();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseS();
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 61) {
              s4 = peg$c18;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c19); }
            }
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseS();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parseS();
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parsevalue();
                if (s6 !== peg$FAILED) {
                  s7 = [];
                  s8 = peg$parseS();
                  while (s8 !== peg$FAILED) {
                    s7.push(s8);
                    s8 = peg$parseS();
                  }
                  if (s7 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 44) {
                      s8 = peg$c62;
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c63); }
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = [];
                      s10 = peg$parseS();
                      while (s10 !== peg$FAILED) {
                        s9.push(s10);
                        s10 = peg$parseS();
                      }
                      if (s9 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c69(s2, s6);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c2;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parseS();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseS();
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsekey();
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parseS();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseS();
            }
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 61) {
                s4 = peg$c18;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c19); }
              }
              if (s4 !== peg$FAILED) {
                s5 = [];
                s6 = peg$parseS();
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parseS();
                }
                if (s5 !== peg$FAILED) {
                  s6 = peg$parsevalue();
                  if (s6 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c69(s2, s6);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsesecfragment() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 34,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s1 = peg$c16;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseDIGITS();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c70(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsedate() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      var key    = peg$currPos * 49 + 35,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseDIGIT_OR_UNDER();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseDIGIT_OR_UNDER();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseDIGIT_OR_UNDER();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseDIGIT_OR_UNDER();
            if (s5 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 45) {
                s6 = peg$c47;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c48); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parseDIGIT_OR_UNDER();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseDIGIT_OR_UNDER();
                  if (s8 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 45) {
                      s9 = peg$c47;
                      peg$currPos++;
                    } else {
                      s9 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c48); }
                    }
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parseDIGIT_OR_UNDER();
                      if (s10 !== peg$FAILED) {
                        s11 = peg$parseDIGIT_OR_UNDER();
                        if (s11 !== peg$FAILED) {
                          s2 = [s2, s3, s4, s5, s6, s7, s8, s9, s10, s11];
                          s1 = s2;
                        } else {
                          peg$currPos = s1;
                          s1 = peg$c2;
                        }
                      } else {
                        peg$currPos = s1;
                        s1 = peg$c2;
                      }
                    } else {
                      peg$currPos = s1;
                      s1 = peg$c2;
                    }
                  } else {
                    peg$currPos = s1;
                    s1 = peg$c2;
                  }
                } else {
                  peg$currPos = s1;
                  s1 = peg$c2;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$c2;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$c2;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c2;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c2;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c71(s1);
      }
      s0 = s1;

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsetime() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      var key    = peg$currPos * 49 + 36,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseDIGIT_OR_UNDER();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseDIGIT_OR_UNDER();
        if (s3 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s4 = peg$c72;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c73); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parseDIGIT_OR_UNDER();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseDIGIT_OR_UNDER();
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 58) {
                  s7 = peg$c72;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c73); }
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseDIGIT_OR_UNDER();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseDIGIT_OR_UNDER();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parsesecfragment();
                      if (s10 === peg$FAILED) {
                        s10 = peg$c25;
                      }
                      if (s10 !== peg$FAILED) {
                        s2 = [s2, s3, s4, s5, s6, s7, s8, s9, s10];
                        s1 = s2;
                      } else {
                        peg$currPos = s1;
                        s1 = peg$c2;
                      }
                    } else {
                      peg$currPos = s1;
                      s1 = peg$c2;
                    }
                  } else {
                    peg$currPos = s1;
                    s1 = peg$c2;
                  }
                } else {
                  peg$currPos = s1;
                  s1 = peg$c2;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$c2;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$c2;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c2;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c2;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c74(s1);
      }
      s0 = s1;

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsetime_with_offset() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16;

      var key    = peg$currPos * 49 + 37,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseDIGIT_OR_UNDER();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseDIGIT_OR_UNDER();
        if (s3 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s4 = peg$c72;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c73); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parseDIGIT_OR_UNDER();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseDIGIT_OR_UNDER();
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 58) {
                  s7 = peg$c72;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c73); }
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseDIGIT_OR_UNDER();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseDIGIT_OR_UNDER();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parsesecfragment();
                      if (s10 === peg$FAILED) {
                        s10 = peg$c25;
                      }
                      if (s10 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 45) {
                          s11 = peg$c47;
                          peg$currPos++;
                        } else {
                          s11 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c48); }
                        }
                        if (s11 === peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 43) {
                            s11 = peg$c44;
                            peg$currPos++;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c45); }
                          }
                        }
                        if (s11 !== peg$FAILED) {
                          s12 = peg$parseDIGIT_OR_UNDER();
                          if (s12 !== peg$FAILED) {
                            s13 = peg$parseDIGIT_OR_UNDER();
                            if (s13 !== peg$FAILED) {
                              if (input.charCodeAt(peg$currPos) === 58) {
                                s14 = peg$c72;
                                peg$currPos++;
                              } else {
                                s14 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c73); }
                              }
                              if (s14 !== peg$FAILED) {
                                s15 = peg$parseDIGIT_OR_UNDER();
                                if (s15 !== peg$FAILED) {
                                  s16 = peg$parseDIGIT_OR_UNDER();
                                  if (s16 !== peg$FAILED) {
                                    s2 = [s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16];
                                    s1 = s2;
                                  } else {
                                    peg$currPos = s1;
                                    s1 = peg$c2;
                                  }
                                } else {
                                  peg$currPos = s1;
                                  s1 = peg$c2;
                                }
                              } else {
                                peg$currPos = s1;
                                s1 = peg$c2;
                              }
                            } else {
                              peg$currPos = s1;
                              s1 = peg$c2;
                            }
                          } else {
                            peg$currPos = s1;
                            s1 = peg$c2;
                          }
                        } else {
                          peg$currPos = s1;
                          s1 = peg$c2;
                        }
                      } else {
                        peg$currPos = s1;
                        s1 = peg$c2;
                      }
                    } else {
                      peg$currPos = s1;
                      s1 = peg$c2;
                    }
                  } else {
                    peg$currPos = s1;
                    s1 = peg$c2;
                  }
                } else {
                  peg$currPos = s1;
                  s1 = peg$c2;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$c2;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$c2;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c2;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c2;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c74(s1);
      }
      s0 = s1;

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parsedatetime() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 49 + 38,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parsedate();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 84) {
          s2 = peg$c75;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c76); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsetime();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 90) {
              s4 = peg$c77;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c78); }
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c79(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsedate();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 84) {
            s2 = peg$c75;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c76); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsetime_with_offset();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c80(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseS() {
      var s0;

      var key    = peg$currPos * 49 + 39,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      if (peg$c81.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c82); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseNL() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 40,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      if (input.charCodeAt(peg$currPos) === 10) {
        s0 = peg$c83;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c84); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 13) {
          s1 = peg$c85;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c86); }
        }
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 10) {
            s2 = peg$c83;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c84); }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseNLS() {
      var s0;

      var key    = peg$currPos * 49 + 41,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$parseNL();
      if (s0 === peg$FAILED) {
        s0 = peg$parseS();
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseEOF() {
      var s0, s1;

      var key    = peg$currPos * 49 + 42,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      peg$silentFails++;
      if (input.length > peg$currPos) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c6); }
      }
      peg$silentFails--;
      if (s1 === peg$FAILED) {
        s0 = peg$c5;
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseHEX() {
      var s0;

      var key    = peg$currPos * 49 + 43,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      if (peg$c87.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c88); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseDIGIT_OR_UNDER() {
      var s0, s1;

      var key    = peg$currPos * 49 + 44,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      if (peg$c89.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c90); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 95) {
          s1 = peg$c91;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c92); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c93();
        }
        s0 = s1;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseASCII_BASIC() {
      var s0;

      var key    = peg$currPos * 49 + 45,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      if (peg$c94.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c95); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseDIGITS() {
      var s0, s1, s2;

      var key    = peg$currPos * 49 + 46,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseDIGIT_OR_UNDER();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseDIGIT_OR_UNDER();
        }
      } else {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c96(s1);
      }
      s0 = s1;

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseESCAPED() {
      var s0, s1;

      var key    = peg$currPos * 49 + 47,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c97) {
        s1 = peg$c97;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c98); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c99();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c100) {
          s1 = peg$c100;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c101); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c102();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c103) {
            s1 = peg$c103;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c104); }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c105();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c106) {
              s1 = peg$c106;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c107); }
            }
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c108();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c109) {
                s1 = peg$c109;
                peg$currPos += 2;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c110); }
              }
              if (s1 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c111();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 2) === peg$c112) {
                  s1 = peg$c112;
                  peg$currPos += 2;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c113); }
                }
                if (s1 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c114();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 2) === peg$c115) {
                    s1 = peg$c115;
                    peg$currPos += 2;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c116); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c117();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$parseESCAPED_UNICODE();
                  }
                }
              }
            }
          }
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseESCAPED_UNICODE() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      var key    = peg$currPos * 49 + 48,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c118) {
        s1 = peg$c118;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c119); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parseHEX();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseHEX();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseHEX();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseHEX();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseHEX();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseHEX();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseHEX();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parseHEX();
                      if (s10 !== peg$FAILED) {
                        s3 = [s3, s4, s5, s6, s7, s8, s9, s10];
                        s2 = s3;
                      } else {
                        peg$currPos = s2;
                        s2 = peg$c2;
                      }
                    } else {
                      peg$currPos = s2;
                      s2 = peg$c2;
                    }
                  } else {
                    peg$currPos = s2;
                    s2 = peg$c2;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$c2;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c120(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c121) {
          s1 = peg$c121;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c122); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parseHEX();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseHEX();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseHEX();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseHEX();
                if (s6 !== peg$FAILED) {
                  s3 = [s3, s4, s5, s6];
                  s2 = s3;
                } else {
                  peg$currPos = s2;
                  s2 = peg$c2;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c120(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }


      var nodes = [];

      function genError(err, line, col) {
        var ex = new Error(err);
        ex.line = line;
        ex.column = col;
        throw ex;
      }

      function addNode(node) {
        nodes.push(node);
      }

      function node(type, value, line, column, key) {
        var obj = { type: type, value: value, line: line(), column: column() };
        if (key) obj.key = key;
        return obj;
      }

      function convertCodePoint(str, line, col) {
        var num = parseInt("0x" + str);

        if (
          !isFinite(num) ||
          Math.floor(num) != num ||
          num < 0 ||
          num > 0x10FFFF ||
          (num > 0xD7FF && num < 0xE000)
        ) {
          genError("Invalid Unicode escape code: " + str, line, col);
        } else {
          return fromCodePoint(num);
        }
      }

      function fromCodePoint() {
        var MAX_SIZE = 0x4000;
        var codeUnits = [];
        var highSurrogate;
        var lowSurrogate;
        var index = -1;
        var length = arguments.length;
        if (!length) {
          return '';
        }
        var result = '';
        while (++index < length) {
          var codePoint = Number(arguments[index]);
          if (codePoint <= 0xFFFF) { // BMP code point
            codeUnits.push(codePoint);
          } else { // Astral code point; split in surrogate halves
            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            codePoint -= 0x10000;
            highSurrogate = (codePoint >> 10) + 0xD800;
            lowSurrogate = (codePoint % 0x400) + 0xDC00;
            codeUnits.push(highSurrogate, lowSurrogate);
          }
          if (index + 1 == length || codeUnits.length > MAX_SIZE) {
            result += String.fromCharCode.apply(null, codeUnits);
            codeUnits.length = 0;
          }
        }
        return result;
      }


    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();


/***/ }),

/***/ 716:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getKoalaServicesEnvironmentConfig = getKoalaServicesEnvironmentConfig;
exports.getFileContentFromGithub = getFileContentFromGithub;
const fs = __importStar(__nccwpck_require__(896));
const glob_1 = __nccwpck_require__(363);
const path_1 = __importDefault(__nccwpck_require__(928));
const toml = __importStar(__nccwpck_require__(132));
async function getKoalaServicesEnvironmentConfig({ rootDir, outputFormat, envFilter, serviceFilter, token, branch = 'main', logEnabled = false, logs, actionTag }) {
    const configMatrix = [];
    log("info", `input: ${JSON.stringify({ rootDir, outputFormat, envFilter, serviceFilter, token, branch, logEnabled })}`);
    // read the file content of the rootDir/.monorepo-koala.json file
    let monorepoKoalaJSONContent = "";
    let monoRepoConfigNotFound = false;
    // log the current rootDir after resolving the path
    const resolvedRootDir = await path_1.default.resolve(rootDir);
    function log(level, message) {
        logs.push({ level, message });
        if (logEnabled) {
            if (level === 'info') {
                console.log(message);
            }
            else if (level === 'error') {
                console.error(message);
            }
        }
    }
    log('info', `Resolving root directory: ${resolvedRootDir}`);
    const monorepoKoalaJSONPath = path_1.default.join(resolvedRootDir, '.koala-monorepo.json');
    try {
        monorepoKoalaJSONContent = await fs.promises.readFile(monorepoKoalaJSONPath, 'utf-8');
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            monoRepoConfigNotFound = true;
            log('error', `No .koala-monorepo.json file found at ${monorepoKoalaJSONPath}`);
            throw new Error('No .koala-monorepo.json file found at ' + monorepoKoalaJSONPath);
        }
        else {
            throw error;
        }
    }
    if (monorepoKoalaJSONContent !== "") {
        log('info', `Found .koala-monorepo.json file: ${monorepoKoalaJSONPath}`);
        // in case .koala-monorepo.json is found, we need to get the service config from it
        const monorepoKoalaJSONData = JSON.parse(monorepoKoalaJSONContent);
        log('info', `Found .koala-monorepo.json data: ${JSON.stringify(monorepoKoalaJSONData)}`);
        const hasEnvFilter = envFilter && envFilter !== '';
        // const hasServiceFilter = serviceFilter && serviceFilter !== '';
        if (monorepoKoalaJSONData.services.length > 0) {
            for (const service of monorepoKoalaJSONData.services) {
                const deploymentRepo = service.deploymentRepo || '';
                const deploymentFolderPath = service.deploymentFolderPath || '';
                const codeFolderPath = service.path;
                // in case of central deployment repo, we need to get the service config from the central deployment repo
                if (deploymentRepo) {
                    log("info", `Fetching service config from central deployment repo: ${deploymentRepo}`);
                    const { owner, repo } = parseRepositoryName(deploymentRepo);
                    const serviceConfigContent = await getFileContentFromGithub(log, owner, repo, branch, `${deploymentFolderPath}/.koala.toml`, token);
                    const serviceConfigData = toml.parse(serviceConfigContent);
                    const koalaConfig = serviceConfigData;
                    if (hasEnvFilter) {
                        const foundEnv = koalaConfig.Environments?.find(env => env.Name === envFilter);
                        if (foundEnv) {
                            configMatrix.push({
                                service_dir: path_1.default.relative(rootDir, codeFolderPath),
                                service_name: koalaConfig.ServiceName,
                                service_repo: `${koalaConfig.Repo.GitUser}/${koalaConfig.Repo.Name}`,
                                cluster: foundEnv.Cluster,
                                cluster_location: foundEnv.Location,
                                overlay: foundEnv.Name,
                                auto_deploy: (foundEnv.EnvDeploymentConfig?.AutoDeploy ?? false).toString().toLowerCase(),
                                cloud_provider: foundEnv.CloudProvider,
                                deployment_repo: deploymentRepo,
                                deployment_folder_path: path_1.default.relative(rootDir, deploymentFolderPath),
                            });
                        }
                    }
                    else {
                        configMatrix.push({
                            service_dir: path_1.default.relative(rootDir, codeFolderPath),
                            service_name: koalaConfig.ServiceName,
                            service_repo: `${koalaConfig.Repo.GitUser}/${koalaConfig.Repo.Name}`,
                            deployment_repo: deploymentRepo,
                            deployment_folder_path: path_1.default.relative(rootDir, deploymentFolderPath),
                        });
                    }
                }
                else {
                    // in case the service is not in the central deployment repo, we need to get the service config from the current repo
                    const relativeServiceDir = path_1.default.join(resolvedRootDir, service.path);
                    log("info", `Relative service directory: ${relativeServiceDir}`);
                    const koalaFile = path_1.default.join(relativeServiceDir, '.koala.toml');
                    log("info", `Koala file path: ${koalaFile}`);
                    const tomlContent = fs.readFileSync(koalaFile, 'utf-8');
                    const koalaConfig = toml.parse(tomlContent);
                    if (hasEnvFilter) {
                        const foundEnv = koalaConfig.Environments?.find(env => env.Name === envFilter);
                        if (foundEnv) {
                            configMatrix.push({
                                service_dir: path_1.default.relative(rootDir, relativeServiceDir),
                                service_name: koalaConfig.ServiceName,
                                service_repo: `${koalaConfig.Repo.GitUser}/${koalaConfig.Repo.Name}`,
                                cluster: foundEnv.Cluster,
                                cluster_location: foundEnv.Location,
                                overlay: foundEnv.Name,
                                auto_deploy: (foundEnv.EnvDeploymentConfig?.AutoDeploy ?? false).toString().toLowerCase(),
                                cloud_provider: foundEnv.CloudProvider,
                                deployment_repo: '',
                                deployment_folder_path: ''
                            });
                        }
                    }
                    else {
                        configMatrix.push({
                            service_dir: path_1.default.relative(rootDir, relativeServiceDir),
                            service_name: koalaConfig.ServiceName,
                            service_repo: `${koalaConfig.Repo.GitUser}/${koalaConfig.Repo.Name}`,
                            deployment_repo: '',
                            deployment_folder_path: ''
                        });
                    }
                }
            }
        }
        else if (!monoRepoConfigNotFound) {
            // in case .koala-monorepo.json is not found, we need to get the service config from the current repo by looking for the koala.toml file
            const koalaFiles = await (0, glob_1.glob)(`${rootDir}/**/*/.koala.toml`, { ignore: 'node_modules/**' });
            log("info", `Found koala files: ${koalaFiles.join(', ')}`);
            for (const file of koalaFiles) {
                const tomlContent = fs.readFileSync(file, 'utf-8');
                const koalaConfig = toml.parse(tomlContent);
                if (hasEnvFilter) {
                    const foundEnv = koalaConfig.Environments?.find(env => env.Name === envFilter);
                    if (foundEnv) {
                        configMatrix.push({
                            service_dir: path_1.default.relative(rootDir, path_1.default.dirname(file)),
                            service_name: koalaConfig.ServiceName,
                            service_repo: `${koalaConfig.Repo.GitUser}/${koalaConfig.Repo.Name}`,
                            cluster: foundEnv.Cluster,
                            cluster_location: foundEnv.Location,
                            overlay: foundEnv.Name,
                            auto_deploy: (foundEnv.EnvDeploymentConfig?.AutoDeploy ?? false).toString().toLowerCase(),
                            cloud_provider: foundEnv.CloudProvider,
                            deployment_repo: '',
                            deployment_folder_path: ''
                        });
                    }
                }
                else {
                    configMatrix.push({
                        service_dir: path_1.default.dirname(file),
                        service_name: koalaConfig.ServiceName,
                        service_repo: `${koalaConfig.Repo.GitUser}/${koalaConfig.Repo.Name}`,
                        deployment_repo: '',
                        deployment_folder_path: ''
                    });
                }
            }
        }
        else {
            // in case we failed reading the .koala-monorepo.json file, we need to throw an error
            throw new Error('Failed to read .koala-monorepo.json file');
        }
    }
    if (configMatrix.length > 0 && actionTag) {
        // only if there is at least one service, we can calculate the service_tag
        // all service of a monorepo are in the same repo, therefore we can use the either of the service_repo get the git refs of all the services
        const repository = configMatrix[0].service_repo;
        if (!repository) {
            throw new Error('No repository found');
        }
        const gitRefs = await getGitRefs(log, repository, token);
        const tagsOnly = gitRefs.filter(ref => ref.ref.startsWith('refs/tags/')).map(ref => ({
            ref: ref.ref.replace('refs/tags/', ''),
            hash: ref.hash
        }));
        log('info', `Git refs: ${JSON.stringify(tagsOnly)}`);
        // max service name length
        const maxServiceNameLength = Math.max(...configMatrix.map(service => `${service.service_name}`.length));
        const maxFinalTagLength = 63;
        const counterLength = 2;
        const underscoresLength = 2;
        const tagPrefixAvailableLength = maxFinalTagLength - maxServiceNameLength - counterLength - underscoresLength;
        // iterate over the services and calculate the deploy_tag according to the format and counter
        for (const service of configMatrix) {
            const truncatedServiceTag = `${service.service_name}_${actionTag.slice(0, tagPrefixAvailableLength)}`;
            // find all the refs that match the tagWithoutCounter and get the index from the top index in the list
            const relevantTags = tagsOnly.filter(ref => ref.ref.startsWith(truncatedServiceTag));
            // get the index from parsing the ref text of each ref
            const indexes = relevantTags.map(ref => parseInt(ref.ref.match(/\d+$/)?.[0] ?? '0'));
            const index = indexes.length > 0 ? Math.max(...indexes) : 0;
            const newIndex = isNaN(index) ? 0 : index + 1;
            // index should be fromatted with two digits 01 02 03 ... 10 11 12 ... 99
            const formattedIndex = newIndex.toString().padStart(2, '0');
            service.service_tag = `${truncatedServiceTag}_${formattedIndex}`;
        }
    }
    let result = [...configMatrix];
    const hasServiceFilter = serviceFilter && serviceFilter !== '';
    if (hasServiceFilter) {
        result = configMatrix.find(service => service.service_name === serviceFilter);
    }
    if (outputFormat === "github-matrix") {
        return JSON.stringify({ include: githubParamsReUse(result) });
    }
    if (outputFormat === "json") {
        return JSON.stringify(result);
    }
    throw new Error("Invalid output format");
}
// because github is limited to 10 inputs hacking 2 parameters to be reused
function githubParamsReUse(services) {
    return services.map(service => {
        const overide = {};
        if (service.deployment_repo) {
            overide.deployment_repo = service.deployment_repo;
            overide.deployment_folder_path = service.deployment_folder_path;
        }
        else {
            overide.deployment_repo = service.service_repo;
            overide.deployment_folder_path = service.service_dir;
        }
        return {
            ...service,
            ...overide
        };
    });
}
async function getFileContentFromGithub(log, repoOwner, repoName, branch, filePath, token) {
    log('error', `Fetching file ${filePath} from GitHub: ${path_1.default.join(repoOwner, repoName)} on branch ${branch}`);
    const tokensToUse = [{
            token: token,
            name: 'token'
        }, {
            token: process.env.GITHUB_ACTION_TOKEN,
            name: 'GITHUB_ACTION_TOKEN'
        }, {
            token: process.env.GITHUB_TOKEN,
            name: 'GITHUB_TOKEN'
        }]
        .filter(token => {
        const notFound = [undefined, 'public'].includes(token.token);
        if (notFound) {
            log('error', `${token.name} is not set`);
        }
        else {
            log('info', `${token.name} is set`);
        }
        return !notFound;
    });
    for (const tokenToUse of tokensToUse) {
        const hasMoreTokens = tokensToUse.indexOf(tokenToUse) < tokensToUse.length - 1;
        try {
            const url = `https://api.github.com/repos/${path_1.default.join(repoOwner, repoName, 'contents', filePath)}?ref=${branch}`;
            const headers = {
                'Accept': 'application/vnd.github.v3.raw'
            };
            if (tokenToUse.token != undefined && tokenToUse.token !== 'public') {
                log('info', `Using token: ${tokenToUse.token.substring(0, 5)}...[${tokenToUse.token.length}]`);
                headers['Authorization'] = `Bearer ${tokenToUse.token}`;
            }
            const response = await fetch(url, {
                headers
            });
            if (!response.ok) {
                log('error', `Failed to fetch file ${filePath} from GitHub: ${response.statusText} for ${path_1.default.join(repoOwner, repoName)} on branch ${branch}`);
                throw new Error(`Failed to fetch file ${filePath} from GitHub: ${response.statusText} for ${path_1.default.join(repoOwner, repoName)} on branch ${branch}`);
            }
            return await response.text();
        }
        catch (err) {
            if (hasMoreTokens) {
                continue;
            }
            else {
                throw err;
            }
        }
    }
    if (tokensToUse.length === 0) {
        throw new Error('No tokens to use');
    }
    return '';
}
async function getGitRefs(log, repository, token) {
    log('error', `Fetching refs for ${repository}`);
    const tokensToUse = [{
            token: token,
            name: 'token'
        }, {
            token: process.env.GITHUB_ACTION_TOKEN,
            name: 'GITHUB_ACTION_TOKEN'
        }, {
            token: process.env.GITHUB_TOKEN,
            name: 'GITHUB_TOKEN'
        }]
        .filter(token => {
        const notFound = [undefined, 'public'].includes(token.token);
        if (notFound) {
            log('error', `${token.name} is not set`);
        }
        else {
            log('info', `${token.name} is set`);
        }
        return !notFound;
    });
    for (const tokenToUse of tokensToUse) {
        const hasMoreTokens = tokensToUse.indexOf(tokenToUse) < tokensToUse.length - 1;
        try {
            const basicAuth = Buffer.from(`x-access-token:${tokenToUse.token}`).toString('base64');
            const headers = {
                'Authorization': `Basic ${basicAuth}`
            };
            const url = `https://github.com/${repository.toLowerCase()}/info/refs?service=git-upload-pack`;
            const response = await fetch(url, {
                headers
            });
            if (!response.ok) {
                log('error', `Failed to fetch refs for ${repository}: ${response.statusText}`);
            }
            const responseText = await response.text();
            return parsePacketLines(responseText);
        }
        catch (err) {
            if (hasMoreTokens) {
                continue;
            }
            else {
                throw err;
            }
        }
    }
    if (tokensToUse.length === 0) {
        throw new Error('No tokens to use');
    }
    log('error', `Failed to fetch refs for ${repository}`);
    return [];
}
function parseRepositoryName(name) {
    return {
        owner: name.split('/')[0],
        repo: name.split('/')[1],
    };
}
function parsePacketLines(response) {
    return response.split('\n').slice(1).map((line, index) => {
        if (index == 0) {
            const hash = line.split(' ')[0].slice(-40);
            const gitRef = {
                hash: hash,
                ref: "HEAD"
            };
            return gitRef;
        }
        const [hash, ref] = line.split(' ');
        const gitRef = {
            hash: hash.slice(-40),
            ref: ref
        };
        return gitRef;
    }).slice(0, -1);
}
//# sourceMappingURL=get-services-env-config.js.map

/***/ }),

/***/ 896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 53:
/***/ ((module) => {

"use strict";
module.exports = require("node:diagnostics_channel");

/***/ }),

/***/ 474:
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ 24:
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ 455:
/***/ ((module) => {

"use strict";
module.exports = require("node:fs/promises");

/***/ }),

/***/ 760:
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ 75:
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ 193:
/***/ ((module) => {

"use strict";
module.exports = require("node:string_decoder");

/***/ }),

/***/ 136:
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ 928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 649:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.range = exports.balanced = void 0;
const balanced = (a, b, str) => {
    const ma = a instanceof RegExp ? maybeMatch(a, str) : a;
    const mb = b instanceof RegExp ? maybeMatch(b, str) : b;
    const r = ma !== null && mb != null && (0, exports.range)(ma, mb, str);
    return (r && {
        start: r[0],
        end: r[1],
        pre: str.slice(0, r[0]),
        body: str.slice(r[0] + ma.length, r[1]),
        post: str.slice(r[1] + mb.length),
    });
};
exports.balanced = balanced;
const maybeMatch = (reg, str) => {
    const m = str.match(reg);
    return m ? m[0] : null;
};
const range = (a, b, str) => {
    let begs, beg, left, right = undefined, result;
    let ai = str.indexOf(a);
    let bi = str.indexOf(b, ai + 1);
    let i = ai;
    if (ai >= 0 && bi > 0) {
        if (a === b) {
            return [ai, bi];
        }
        begs = [];
        left = str.length;
        while (i >= 0 && !result) {
            if (i === ai) {
                begs.push(i);
                ai = str.indexOf(a, i + 1);
            }
            else if (begs.length === 1) {
                const r = begs.pop();
                if (r !== undefined)
                    result = [r, bi];
            }
            else {
                beg = begs.pop();
                if (beg !== undefined && beg < left) {
                    left = beg;
                    right = bi;
                }
                bi = str.indexOf(b, i + 1);
            }
            i = ai < bi && ai >= 0 ? ai : bi;
        }
        if (begs.length && right !== undefined) {
            result = [left, right];
        }
    }
    return result;
};
exports.range = range;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 968:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EXPANSION_MAX_REWRITES = exports.EXPANSION_MAX_DEPTH = exports.EXPANSION_MAX_LENGTH = exports.EXPANSION_MAX = void 0;
exports.expand = expand;
const balanced_match_1 = __nccwpck_require__(649);
const escSlash = '\0SLASH' + Math.random() + '\0';
const escOpen = '\0OPEN' + Math.random() + '\0';
const escClose = '\0CLOSE' + Math.random() + '\0';
const escComma = '\0COMMA' + Math.random() + '\0';
const escPeriod = '\0PERIOD' + Math.random() + '\0';
const escSlashPattern = new RegExp(escSlash, 'g');
const escOpenPattern = new RegExp(escOpen, 'g');
const escClosePattern = new RegExp(escClose, 'g');
const escCommaPattern = new RegExp(escComma, 'g');
const escPeriodPattern = new RegExp(escPeriod, 'g');
const slashPattern = /\\\\/g;
const openPattern = /\\{/g;
const closePattern = /\\}/g;
const commaPattern = /\\,/g;
const periodPattern = /\\\./g;
exports.EXPANSION_MAX = 100_000;
// `EXPANSION_MAX` caps the *number* of expansions, but not their length. An
// input like `'{a,b}'.repeat(1500)` stays under that count - its output is
// truncated to 100k results - while making every result ~1500 characters
// long. The result set, and the intermediate arrays built while combining
// brace sets, then grow large enough to exhaust memory and crash the process
// (CVE-2026-14257). `EXPANSION_MAX_LENGTH` bounds the total number of
// characters the accumulator may hold at any point, so memory stays flat no
// matter how many brace groups are chained. The limit sits well above any
// realistic expansion (100k results hitting `EXPANSION_MAX` measure ~1M
// characters) so legitimate input is unaffected.
exports.EXPANSION_MAX_LENGTH = 4_000_000;
// `expand_` recurses once per level of brace *nesting* - both when expanding a
// set's comma members and when re-wrapping a set whose body is a single part.
// The CVE-2026-14257 fix made the *tail* iterative (recursion on `m.post`, one
// level per chained group), which left nesting depth unbounded: about 3,100
// levels of `{{{...a,b...}}}` - only ~6KB of input - exhausted the native stack
// and crashed the process. `EXPANSION_MAX_DEPTH` bounds how deep the parser
// will follow nesting. It sits far above any realistic pattern and well below
// the depth at which the stack runs out.
exports.EXPANSION_MAX_DEPTH = 1_000;
// Bash keeps a quirk where a brace group followed by a comma set still expands
// (`{a},b}`). The parser implements it by rewriting the string and restarting
// the scan, absorbing one `}` per pass. `n` trailing braces therefore cost `n`
// full passes over a string that itself grows by one `escClose` sentinel each
// time - quadratic in `n`, with a ~26x constant from the sentinel's length.
// 128KB of `'{a}' + '}'.repeat(n) + ',z}'` blocked the event loop for 27
// seconds to produce two results. `EXPANSION_MAX_REWRITES` bounds how many
// times the scan may restart. Real `{a},b}` input needs a handful.
exports.EXPANSION_MAX_REWRITES = 1_000;
function numeric(str) {
    return !isNaN(str) ? parseInt(str, 10) : str.charCodeAt(0);
}
function escapeBraces(str) {
    return str
        .replace(slashPattern, escSlash)
        .replace(openPattern, escOpen)
        .replace(closePattern, escClose)
        .replace(commaPattern, escComma)
        .replace(periodPattern, escPeriod);
}
function unescapeBraces(str) {
    return str
        .replace(escSlashPattern, '\\')
        .replace(escOpenPattern, '{')
        .replace(escClosePattern, '}')
        .replace(escCommaPattern, ',')
        .replace(escPeriodPattern, '.');
}
// Like `target.push(...items)` but doesn't overflow the stack
function pushAll(target, items) {
    for (let i = 0; i < items.length; i++) {
        target.push(items[i]);
    }
}
/**
 * Basically just str.split(","), but handling cases
 * where we have nested braced sections, which should be
 * treated as individual members, like {a,{b,c},d}
 */
function parseCommaParts(str) {
    const parts = [];
    // Walk the brace groups iteratively. Recursing on `post` once per group let a
    // chain of them exhaust the stack - the parsing-side counterpart to
    // the `expand_` overflow fixed for CVE-2026-14257, and not something `max` or
    // `maxLength` can bound, since it happens before expansion.
    //
    // The part the next chunk continues
    let carry = '';
    for (;;) {
        const m = (0, balanced_match_1.balanced)('{', '}', str);
        if (!m) {
            const tail = str.split(',');
            tail[0] = carry + tail[0];
            pushAll(parts, tail);
            return parts;
        }
        const { pre, body, post } = m;
        const p = pre.split(',');
        p[0] = carry + p[0];
        p[p.length - 1] += '{' + body + '}';
        if (!post.length) {
            pushAll(parts, p);
            return parts;
        }
        carry = p.pop();
        pushAll(parts, p);
        str = post;
    }
}
function expand(str, options = {}) {
    if (!str) {
        return [];
    }
    const { max = exports.EXPANSION_MAX, maxLength = exports.EXPANSION_MAX_LENGTH, maxDepth = exports.EXPANSION_MAX_DEPTH, maxRewrites = exports.EXPANSION_MAX_REWRITES, } = options;
    // I don't know why Bash 4.3 does this, but it does.
    // Anything starting with {} will have the first two bytes preserved
    // but *only* at the top level, so {},a}b will not expand to anything,
    // but a{},b}c will be expanded to [a}c,abc].
    // One could argue that this is a bug in Bash, but since the goal of
    // this module is to match Bash's rules, we escape a leading {}
    if (str.slice(0, 2) === '{}') {
        str = '\\{\\}' + str.slice(2);
    }
    return expand_(escapeBraces(str), max, maxLength, maxDepth, 0, maxRewrites, true).map(unescapeBraces);
}
function embrace(str) {
    return '{' + str + '}';
}
function isPadded(el) {
    return /^-?0\d/.test(el);
}
function lte(i, y) {
    return i <= y;
}
function gte(i, y) {
    return i >= y;
}
// Build `{ acc[a] + pre + values[v] }` for every combination, capping the
// number of results at `max` and the total number of characters at `maxLength`.
// This is the one place output grows, so bounding it here keeps the single
// accumulator - and therefore memory - flat regardless of how many brace groups
// are combined (CVE-2026-14257).
function combine(acc, pre, values, max, maxLength, dropEmpties) {
    const out = [];
    let length = 0;
    for (let a = 0; a < acc.length; a++) {
        for (let v = 0; v < values.length; v++) {
            if (out.length >= max)
                return out;
            const expansion = acc[a] + pre + values[v];
            // Bash drops empty results at the top level. Skip them before they count
            // against `max`, so `max` bounds the number of *kept* results.
            if (dropEmpties && !expansion)
                continue;
            if (length + expansion.length > maxLength)
                return out;
            out.push(expansion);
            length += expansion.length;
        }
    }
    return out;
}
// The expansion values of a single numeric (`1..5`) or alphabetic (`a..e..2`)
// sequence body.
function expandSequence(body, isAlphaSequence, max, maxLength) {
    const n = body.split(/\.\./);
    const N = [];
    // A sequence body always splits into two or three parts, but the compiler
    // can't know that.
    /* c8 ignore start */
    if (n[0] === undefined || n[1] === undefined) {
        return N;
    }
    /* c8 ignore stop */
    const x = numeric(n[0]);
    const y = numeric(n[1]);
    const width = Math.max(n[0].length, n[1].length);
    let incr = n.length === 3 && n[2] !== undefined ?
        Math.max(Math.abs(numeric(n[2])), 1)
        : 1;
    let test = lte;
    const reverse = y < x;
    if (reverse) {
        incr *= -1;
        test = gte;
    }
    const pad = n.some(isPadded);
    let length = 0;
    for (let i = x; test(i, y) && N.length < max; i += incr) {
        let c;
        if (isAlphaSequence) {
            c = String.fromCharCode(i);
            if (c === '\\') {
                c = '';
            }
        }
        else {
            c = String(i);
            if (pad) {
                const need = width - c.length;
                if (need > 0) {
                    const z = new Array(need + 1).join('0');
                    if (i < 0) {
                        c = '-' + z + c.slice(1);
                    }
                    else {
                        c = z + c;
                    }
                }
            }
        }
        if (length + c.length > maxLength)
            break;
        N.push(c);
        length += c.length;
    }
    return N;
}
function expand_(str, max, maxLength, maxDepth, depth, maxRewrites, isTop) {
    // Too deeply nested to keep following: treat the rest as literal, the same
    // way a group that cannot expand is already handled. Truncating rather than
    // throwing keeps `expand` total, matching `max` and `maxLength`.
    if (depth > maxDepth) {
        return [str];
    }
    // Consume the string's top-level brace groups left to right, threading a
    // running set of combined prefixes (`acc`). Expanding the tail iteratively -
    // rather than recursing on `m.post` once per group - keeps the native stack
    // depth constant, so deeply chained input (`'{a,b}'.repeat(3000)`) can no
    // longer overflow the stack, and leaves a single accumulator whose size
    // `maxLength` bounds directly (CVE-2026-14257).
    let acc = [''];
    // Bash drops empty results, but only when the *first* top-level group is a
    // comma set - a sequence like `{a..\}` may legitimately yield ''. The drop
    // is on the final strings, so it is applied to whichever `combine` produces
    // them (the one with no brace set left in the tail).
    // How many times the `{a},b}` rewrite below has restarted the scan. Each pass
    // re-reads the whole string, so leaving this unbounded is quadratic.
    let rewrites = 0;
    let dropEmpties = false;
    let firstGroup = true;
    for (;;) {
        const m = (0, balanced_match_1.balanced)('{', '}', str);
        // No brace set left: the rest of the string is literal.
        if (!m) {
            return combine(acc, str, [''], max, maxLength, dropEmpties);
        }
        // no need to expand pre, since it is guaranteed to be free of brace-sets
        const pre = m.pre;
        if (/\$$/.test(pre)) {
            acc = combine(acc, pre + '{' + m.body + '}', [''], max, maxLength, dropEmpties && !m.post.length);
            firstGroup = false;
            if (!m.post.length)
                break;
            str = m.post;
            continue;
        }
        const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
        const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
        const isSequence = isNumericSequence || isAlphaSequence;
        const isOptions = m.body.indexOf(',') >= 0;
        if (!isSequence && !isOptions) {
            // {a},b}
            if (rewrites < maxRewrites && m.post.match(/,(?!,).*\}/)) {
                rewrites++;
                str = m.pre + '{' + m.body + escClose + m.post;
                isTop = true;
                continue;
            }
            // Nothing here expands, so the whole remaining string is literal.
            return combine(acc, pre + '{' + m.body + '}' + m.post, [''], max, maxLength, dropEmpties);
        }
        if (firstGroup) {
            dropEmpties = isTop && !isSequence;
            firstGroup = false;
        }
        let values;
        if (isSequence) {
            values = expandSequence(m.body, isAlphaSequence, max, maxLength);
        }
        else {
            let n = parseCommaParts(m.body);
            if (n.length === 1 && n[0] !== undefined) {
                // x{{a,b}}y ==> x{a}y x{b}y
                n = expand_(n[0], max, maxLength, maxDepth, depth + 1, maxRewrites, false).map(embrace);
                //XXX is this necessary? Can't seem to hit it in tests.
                /* c8 ignore start */
                if (n.length === 1) {
                    acc = combine(acc, pre + n[0], [''], max, maxLength, dropEmpties && !m.post.length);
                    if (!m.post.length)
                        break;
                    str = m.post;
                    continue;
                }
                /* c8 ignore stop */
            }
            // Values that `combine` is going to drop as empty produce no result, so
            // they must not count against `max` - otherwise `{a,,b}` with `max: 2`
            // would stop at `['a', '']` and yield one result instead of two. Skipping
            // them outright keeps `values` bounded while leaving `max` a bound on
            // *kept* results.
            let dropsEmpties = dropEmpties && !m.post.length && !pre;
            for (let d = 0; dropsEmpties && d < acc.length; d++) {
                if (acc[d]) {
                    dropsEmpties = false;
                }
            }
            values = [];
            let valuesLength = 0;
            outer: for (let j = 0; j < n.length; j++) {
                const expanded = expand_(n[j], max, maxLength, maxDepth, depth + 1, maxRewrites, false);
                for (let k = 0; k < expanded.length; k++) {
                    const v = expanded[k];
                    if (dropsEmpties && !v)
                        continue;
                    if (values.length >= max ||
                        valuesLength + v.length > maxLength) {
                        break outer;
                    }
                    values.push(v);
                    valuesLength += v.length;
                }
            }
        }
        acc = combine(acc, pre, values, max, maxLength, dropEmpties && !m.post.length);
        if (!m.post.length)
            break;
        str = m.post;
    }
    return acc;
}
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 981:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Glob = void 0;
const minimatch_1 = __nccwpck_require__(507);
const node_url_1 = __nccwpck_require__(136);
const path_scurry_1 = __nccwpck_require__(577);
const pattern_js_1 = __nccwpck_require__(813);
const walker_js_1 = __nccwpck_require__(157);
// if no process global, just call it linux.
// so we default to case-sensitive, / separators
const defaultPlatform = (typeof process === 'object' &&
    process &&
    typeof process.platform === 'string') ?
    process.platform
    : 'linux';
/**
 * An object that can perform glob pattern traversals.
 */
class Glob {
    absolute;
    cwd;
    root;
    dot;
    dotRelative;
    follow;
    ignore;
    magicalBraces;
    mark;
    matchBase;
    maxDepth;
    nobrace;
    nocase;
    nodir;
    noext;
    noglobstar;
    pattern;
    platform;
    realpath;
    scurry;
    stat;
    signal;
    windowsPathsNoEscape;
    withFileTypes;
    includeChildMatches;
    /**
     * The options provided to the constructor.
     */
    opts;
    /**
     * An array of parsed immutable {@link Pattern} objects.
     */
    patterns;
    /**
     * All options are stored as properties on the `Glob` object.
     *
     * See {@link GlobOptions} for full options descriptions.
     *
     * Note that a previous `Glob` object can be passed as the
     * `GlobOptions` to another `Glob` instantiation to re-use settings
     * and caches with a new pattern.
     *
     * Traversal functions can be called multiple times to run the walk
     * again.
     */
    constructor(pattern, opts) {
        /* c8 ignore start */
        if (!opts)
            throw new TypeError('glob options required');
        /* c8 ignore stop */
        this.withFileTypes = !!opts.withFileTypes;
        this.signal = opts.signal;
        this.follow = !!opts.follow;
        this.dot = !!opts.dot;
        this.dotRelative = !!opts.dotRelative;
        this.nodir = !!opts.nodir;
        this.mark = !!opts.mark;
        if (!opts.cwd) {
            this.cwd = '';
        }
        else if (opts.cwd instanceof URL || opts.cwd.startsWith('file://')) {
            opts.cwd = (0, node_url_1.fileURLToPath)(opts.cwd);
        }
        this.cwd = opts.cwd || '';
        this.root = opts.root;
        this.magicalBraces = !!opts.magicalBraces;
        this.nobrace = !!opts.nobrace;
        this.noext = !!opts.noext;
        this.realpath = !!opts.realpath;
        this.absolute = opts.absolute;
        this.includeChildMatches = opts.includeChildMatches !== false;
        this.noglobstar = !!opts.noglobstar;
        this.matchBase = !!opts.matchBase;
        this.maxDepth =
            typeof opts.maxDepth === 'number' ? opts.maxDepth : Infinity;
        this.stat = !!opts.stat;
        this.ignore = opts.ignore;
        if (this.withFileTypes && this.absolute !== undefined) {
            throw new Error('cannot set absolute and withFileTypes:true');
        }
        if (typeof pattern === 'string') {
            pattern = [pattern];
        }
        this.windowsPathsNoEscape =
            !!opts.windowsPathsNoEscape ||
                opts.allowWindowsEscape ===
                    false;
        if (this.windowsPathsNoEscape) {
            pattern = pattern.map(p => p.replace(/\\/g, '/'));
        }
        if (this.matchBase) {
            if (opts.noglobstar) {
                throw new TypeError('base matching requires globstar');
            }
            pattern = pattern.map(p => (p.includes('/') ? p : `./**/${p}`));
        }
        this.pattern = pattern;
        this.platform = opts.platform || defaultPlatform;
        this.opts = { ...opts, platform: this.platform };
        if (opts.scurry) {
            this.scurry = opts.scurry;
            if (opts.nocase !== undefined &&
                opts.nocase !== opts.scurry.nocase) {
                throw new Error('nocase option contradicts provided scurry option');
            }
        }
        else {
            const Scurry = opts.platform === 'win32' ? path_scurry_1.PathScurryWin32
                : opts.platform === 'darwin' ? path_scurry_1.PathScurryDarwin
                    : opts.platform ? path_scurry_1.PathScurryPosix
                        : path_scurry_1.PathScurry;
            this.scurry = new Scurry(this.cwd, {
                nocase: opts.nocase,
                fs: opts.fs,
            });
        }
        this.nocase = this.scurry.nocase;
        // If you do nocase:true on a case-sensitive file system, then
        // we need to use regexps instead of strings for non-magic
        // path portions, because statting `aBc` won't return results
        // for the file `AbC` for example.
        const nocaseMagicOnly = this.platform === 'darwin' || this.platform === 'win32';
        const mmo = {
            // default nocase based on platform
            ...opts,
            dot: this.dot,
            matchBase: this.matchBase,
            nobrace: this.nobrace,
            nocase: this.nocase,
            nocaseMagicOnly,
            nocomment: true,
            noext: this.noext,
            nonegate: true,
            optimizationLevel: 2,
            platform: this.platform,
            windowsPathsNoEscape: this.windowsPathsNoEscape,
            debug: !!this.opts.debug,
        };
        const mms = this.pattern.map(p => new minimatch_1.Minimatch(p, mmo));
        const [matchSet, globParts] = mms.reduce((set, m) => {
            set[0].push(...m.set);
            set[1].push(...m.globParts);
            return set;
        }, [[], []]);
        this.patterns = matchSet.map((set, i) => {
            const g = globParts[i];
            /* c8 ignore start */
            if (!g)
                throw new Error('invalid pattern object');
            /* c8 ignore stop */
            return new pattern_js_1.Pattern(set, g, 0, this.platform);
        });
    }
    async walk() {
        // Walkers always return array of Path objects, so we just have to
        // coerce them into the right shape.  It will have already called
        // realpath() if the option was set to do so, so we know that's cached.
        // start out knowing the cwd, at least
        return [
            ...(await new walker_js_1.GlobWalker(this.patterns, this.scurry.cwd, {
                ...this.opts,
                maxDepth: this.maxDepth !== Infinity ?
                    this.maxDepth + this.scurry.cwd.depth()
                    : Infinity,
                platform: this.platform,
                nocase: this.nocase,
                includeChildMatches: this.includeChildMatches,
            }).walk()),
        ];
    }
    walkSync() {
        return [
            ...new walker_js_1.GlobWalker(this.patterns, this.scurry.cwd, {
                ...this.opts,
                maxDepth: this.maxDepth !== Infinity ?
                    this.maxDepth + this.scurry.cwd.depth()
                    : Infinity,
                platform: this.platform,
                nocase: this.nocase,
                includeChildMatches: this.includeChildMatches,
            }).walkSync(),
        ];
    }
    stream() {
        return new walker_js_1.GlobStream(this.patterns, this.scurry.cwd, {
            ...this.opts,
            maxDepth: this.maxDepth !== Infinity ?
                this.maxDepth + this.scurry.cwd.depth()
                : Infinity,
            platform: this.platform,
            nocase: this.nocase,
            includeChildMatches: this.includeChildMatches,
        }).stream();
    }
    streamSync() {
        return new walker_js_1.GlobStream(this.patterns, this.scurry.cwd, {
            ...this.opts,
            maxDepth: this.maxDepth !== Infinity ?
                this.maxDepth + this.scurry.cwd.depth()
                : Infinity,
            platform: this.platform,
            nocase: this.nocase,
            includeChildMatches: this.includeChildMatches,
        }).streamSync();
    }
    /**
     * Default sync iteration function. Returns a Generator that
     * iterates over the results.
     */
    iterateSync() {
        return this.streamSync()[Symbol.iterator]();
    }
    [Symbol.iterator]() {
        return this.iterateSync();
    }
    /**
     * Default async iteration function. Returns an AsyncGenerator that
     * iterates over the results.
     */
    iterate() {
        return this.stream()[Symbol.asyncIterator]();
    }
    [Symbol.asyncIterator]() {
        return this.iterate();
    }
}
exports.Glob = Glob;
//# sourceMappingURL=glob.js.map

/***/ }),

/***/ 197:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hasMagic = void 0;
const minimatch_1 = __nccwpck_require__(507);
/**
 * Return true if the patterns provided contain any magic glob characters,
 * given the options provided.
 *
 * Brace expansion is not considered "magic" unless the `magicalBraces` option
 * is set, as brace expansion just turns one string into an array of strings.
 * So a pattern like `'x{a,b}y'` would return `false`, because `'xay'` and
 * `'xby'` both do not contain any magic glob characters, and it's treated the
 * same as if you had called it on `['xay', 'xby']`. When `magicalBraces:true`
 * is in the options, brace expansion _is_ treated as a pattern having magic.
 */
const hasMagic = (pattern, options = {}) => {
    if (!Array.isArray(pattern)) {
        pattern = [pattern];
    }
    for (const p of pattern) {
        if (new minimatch_1.Minimatch(p, options).hasMagic())
            return true;
    }
    return false;
};
exports.hasMagic = hasMagic;
//# sourceMappingURL=has-magic.js.map

/***/ }),

/***/ 637:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// give it a pattern, and it'll be able to tell you if
// a given path should be ignored.
// Ignoring a path ignores its children if the pattern ends in /**
// Ignores are always parsed in dot:true mode
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Ignore = void 0;
const minimatch_1 = __nccwpck_require__(507);
const pattern_js_1 = __nccwpck_require__(813);
const defaultPlatform = (typeof process === 'object' &&
    process &&
    typeof process.platform === 'string') ?
    process.platform
    : 'linux';
/**
 * Class used to process ignored patterns
 */
class Ignore {
    relative;
    relativeChildren;
    absolute;
    absoluteChildren;
    platform;
    mmopts;
    constructor(ignored, { nobrace, nocase, noext, noglobstar, platform = defaultPlatform, }) {
        this.relative = [];
        this.absolute = [];
        this.relativeChildren = [];
        this.absoluteChildren = [];
        this.platform = platform;
        this.mmopts = {
            dot: true,
            nobrace,
            nocase,
            noext,
            noglobstar,
            optimizationLevel: 2,
            platform,
            nocomment: true,
            nonegate: true,
        };
        for (const ign of ignored)
            this.add(ign);
    }
    add(ign) {
        // this is a little weird, but it gives us a clean set of optimized
        // minimatch matchers, without getting tripped up if one of them
        // ends in /** inside a brace section, and it's only inefficient at
        // the start of the walk, not along it.
        // It'd be nice if the Pattern class just had a .test() method, but
        // handling globstars is a bit of a pita, and that code already lives
        // in minimatch anyway.
        // Another way would be if maybe Minimatch could take its set/globParts
        // as an option, and then we could at least just use Pattern to test
        // for absolute-ness.
        // Yet another way, Minimatch could take an array of glob strings, and
        // a cwd option, and do the right thing.
        const mm = new minimatch_1.Minimatch(ign, this.mmopts);
        for (let i = 0; i < mm.set.length; i++) {
            const parsed = mm.set[i];
            const globParts = mm.globParts[i];
            /* c8 ignore start */
            if (!parsed || !globParts) {
                throw new Error('invalid pattern object');
            }
            // strip off leading ./ portions
            // https://github.com/isaacs/node-glob/issues/570
            while (parsed[0] === '.' && globParts[0] === '.') {
                parsed.shift();
                globParts.shift();
            }
            /* c8 ignore stop */
            const p = new pattern_js_1.Pattern(parsed, globParts, 0, this.platform);
            const m = new minimatch_1.Minimatch(p.globString(), this.mmopts);
            const children = globParts[globParts.length - 1] === '**';
            const absolute = p.isAbsolute();
            if (absolute)
                this.absolute.push(m);
            else
                this.relative.push(m);
            if (children) {
                if (absolute)
                    this.absoluteChildren.push(m);
                else
                    this.relativeChildren.push(m);
            }
        }
    }
    ignored(p) {
        const fullpath = p.fullpath();
        const fullpaths = `${fullpath}/`;
        const relative = p.relative() || '.';
        const relatives = `${relative}/`;
        for (const m of this.relative) {
            if (m.match(relative) || m.match(relatives))
                return true;
        }
        for (const m of this.absolute) {
            if (m.match(fullpath) || m.match(fullpaths))
                return true;
        }
        return false;
    }
    childrenIgnored(p) {
        const fullpath = p.fullpath() + '/';
        const relative = (p.relative() || '.') + '/';
        for (const m of this.relativeChildren) {
            if (m.match(relative))
                return true;
        }
        for (const m of this.absoluteChildren) {
            if (m.match(fullpath))
                return true;
        }
        return false;
    }
}
exports.Ignore = Ignore;
//# sourceMappingURL=ignore.js.map

/***/ }),

/***/ 363:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.glob = exports.sync = exports.iterate = exports.iterateSync = exports.stream = exports.streamSync = exports.Ignore = exports.hasMagic = exports.Glob = exports.unescape = exports.escape = void 0;
exports.globStreamSync = globStreamSync;
exports.globStream = globStream;
exports.globSync = globSync;
exports.globIterateSync = globIterateSync;
exports.globIterate = globIterate;
const minimatch_1 = __nccwpck_require__(507);
const glob_js_1 = __nccwpck_require__(981);
const has_magic_js_1 = __nccwpck_require__(197);
var minimatch_2 = __nccwpck_require__(507);
Object.defineProperty(exports, "escape", ({ enumerable: true, get: function () { return minimatch_2.escape; } }));
Object.defineProperty(exports, "unescape", ({ enumerable: true, get: function () { return minimatch_2.unescape; } }));
var glob_js_2 = __nccwpck_require__(981);
Object.defineProperty(exports, "Glob", ({ enumerable: true, get: function () { return glob_js_2.Glob; } }));
var has_magic_js_2 = __nccwpck_require__(197);
Object.defineProperty(exports, "hasMagic", ({ enumerable: true, get: function () { return has_magic_js_2.hasMagic; } }));
var ignore_js_1 = __nccwpck_require__(637);
Object.defineProperty(exports, "Ignore", ({ enumerable: true, get: function () { return ignore_js_1.Ignore; } }));
function globStreamSync(pattern, options = {}) {
    return new glob_js_1.Glob(pattern, options).streamSync();
}
function globStream(pattern, options = {}) {
    return new glob_js_1.Glob(pattern, options).stream();
}
function globSync(pattern, options = {}) {
    return new glob_js_1.Glob(pattern, options).walkSync();
}
async function glob_(pattern, options = {}) {
    return new glob_js_1.Glob(pattern, options).walk();
}
function globIterateSync(pattern, options = {}) {
    return new glob_js_1.Glob(pattern, options).iterateSync();
}
function globIterate(pattern, options = {}) {
    return new glob_js_1.Glob(pattern, options).iterate();
}
// aliases: glob.sync.stream() glob.stream.sync() glob.sync() etc
exports.streamSync = globStreamSync;
exports.stream = Object.assign(globStream, { sync: globStreamSync });
exports.iterateSync = globIterateSync;
exports.iterate = Object.assign(globIterate, {
    sync: globIterateSync,
});
exports.sync = Object.assign(globSync, {
    stream: globStreamSync,
    iterate: globIterateSync,
});
exports.glob = Object.assign(glob_, {
    glob: glob_,
    globSync,
    sync: exports.sync,
    globStream,
    stream: exports.stream,
    globStreamSync,
    streamSync: exports.streamSync,
    globIterate,
    iterate: exports.iterate,
    globIterateSync,
    iterateSync: exports.iterateSync,
    Glob: glob_js_1.Glob,
    hasMagic: has_magic_js_1.hasMagic,
    escape: minimatch_1.escape,
    unescape: minimatch_1.unescape,
});
exports.glob.glob = exports.glob;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 813:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// this is just a very light wrapper around 2 arrays with an offset index
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Pattern = void 0;
const minimatch_1 = __nccwpck_require__(507);
const isPatternList = (pl) => pl.length >= 1;
const isGlobList = (gl) => gl.length >= 1;
/**
 * An immutable-ish view on an array of glob parts and their parsed
 * results
 */
class Pattern {
    #patternList;
    #globList;
    #index;
    length;
    #platform;
    #rest;
    #globString;
    #isDrive;
    #isUNC;
    #isAbsolute;
    #followGlobstar = true;
    constructor(patternList, globList, index, platform) {
        if (!isPatternList(patternList)) {
            throw new TypeError('empty pattern list');
        }
        if (!isGlobList(globList)) {
            throw new TypeError('empty glob list');
        }
        if (globList.length !== patternList.length) {
            throw new TypeError('mismatched pattern list and glob list lengths');
        }
        this.length = patternList.length;
        if (index < 0 || index >= this.length) {
            throw new TypeError('index out of range');
        }
        this.#patternList = patternList;
        this.#globList = globList;
        this.#index = index;
        this.#platform = platform;
        // normalize root entries of absolute patterns on initial creation.
        if (this.#index === 0) {
            // c: => ['c:/']
            // C:/ => ['C:/']
            // C:/x => ['C:/', 'x']
            // //host/share => ['//host/share/']
            // //host/share/ => ['//host/share/']
            // //host/share/x => ['//host/share/', 'x']
            // /etc => ['/', 'etc']
            // / => ['/']
            if (this.isUNC()) {
                // '' / '' / 'host' / 'share'
                const [p0, p1, p2, p3, ...prest] = this.#patternList;
                const [g0, g1, g2, g3, ...grest] = this.#globList;
                if (prest[0] === '') {
                    // ends in /
                    prest.shift();
                    grest.shift();
                }
                const p = [p0, p1, p2, p3, ''].join('/');
                const g = [g0, g1, g2, g3, ''].join('/');
                this.#patternList = [p, ...prest];
                this.#globList = [g, ...grest];
                this.length = this.#patternList.length;
            }
            else if (this.isDrive() || this.isAbsolute()) {
                const [p1, ...prest] = this.#patternList;
                const [g1, ...grest] = this.#globList;
                if (prest[0] === '') {
                    // ends in /
                    prest.shift();
                    grest.shift();
                }
                const p = p1 + '/';
                const g = g1 + '/';
                this.#patternList = [p, ...prest];
                this.#globList = [g, ...grest];
                this.length = this.#patternList.length;
            }
        }
    }
    /**
     * The first entry in the parsed list of patterns
     */
    pattern() {
        return this.#patternList[this.#index];
    }
    /**
     * true of if pattern() returns a string
     */
    isString() {
        return typeof this.#patternList[this.#index] === 'string';
    }
    /**
     * true of if pattern() returns GLOBSTAR
     */
    isGlobstar() {
        return this.#patternList[this.#index] === minimatch_1.GLOBSTAR;
    }
    /**
     * true if pattern() returns a regexp
     */
    isRegExp() {
        return this.#patternList[this.#index] instanceof RegExp;
    }
    /**
     * The /-joined set of glob parts that make up this pattern
     */
    globString() {
        return (this.#globString =
            this.#globString ||
                (this.#index === 0 ?
                    this.isAbsolute() ?
                        this.#globList[0] + this.#globList.slice(1).join('/')
                        : this.#globList.join('/')
                    : this.#globList.slice(this.#index).join('/')));
    }
    /**
     * true if there are more pattern parts after this one
     */
    hasMore() {
        return this.length > this.#index + 1;
    }
    /**
     * The rest of the pattern after this part, or null if this is the end
     */
    rest() {
        if (this.#rest !== undefined)
            return this.#rest;
        if (!this.hasMore())
            return (this.#rest = null);
        this.#rest = new Pattern(this.#patternList, this.#globList, this.#index + 1, this.#platform);
        this.#rest.#isAbsolute = this.#isAbsolute;
        this.#rest.#isUNC = this.#isUNC;
        this.#rest.#isDrive = this.#isDrive;
        return this.#rest;
    }
    /**
     * true if the pattern represents a //unc/path/ on windows
     */
    isUNC() {
        const pl = this.#patternList;
        return this.#isUNC !== undefined ?
            this.#isUNC
            : (this.#isUNC =
                this.#platform === 'win32' &&
                    this.#index === 0 &&
                    pl[0] === '' &&
                    pl[1] === '' &&
                    typeof pl[2] === 'string' &&
                    !!pl[2] &&
                    typeof pl[3] === 'string' &&
                    !!pl[3]);
    }
    // pattern like C:/...
    // split = ['C:', ...]
    // XXX: would be nice to handle patterns like `c:*` to test the cwd
    // in c: for *, but I don't know of a way to even figure out what that
    // cwd is without actually chdir'ing into it?
    /**
     * True if the pattern starts with a drive letter on Windows
     */
    isDrive() {
        const pl = this.#patternList;
        return this.#isDrive !== undefined ?
            this.#isDrive
            : (this.#isDrive =
                this.#platform === 'win32' &&
                    this.#index === 0 &&
                    this.length > 1 &&
                    typeof pl[0] === 'string' &&
                    /^[a-z]:$/i.test(pl[0]));
    }
    // pattern = '/' or '/...' or '/x/...'
    // split = ['', ''] or ['', ...] or ['', 'x', ...]
    // Drive and UNC both considered absolute on windows
    /**
     * True if the pattern is rooted on an absolute path
     */
    isAbsolute() {
        const pl = this.#patternList;
        return this.#isAbsolute !== undefined ?
            this.#isAbsolute
            : (this.#isAbsolute =
                (pl[0] === '' && pl.length > 1) ||
                    this.isDrive() ||
                    this.isUNC());
    }
    /**
     * consume the root of the pattern, and return it
     */
    root() {
        const p = this.#patternList[0];
        return (typeof p === 'string' && this.isAbsolute() && this.#index === 0) ?
            p
            : '';
    }
    /**
     * Check to see if the current globstar pattern is allowed to follow
     * a symbolic link.
     */
    checkFollowGlobstar() {
        return !(this.#index === 0 ||
            !this.isGlobstar() ||
            !this.#followGlobstar);
    }
    /**
     * Mark that the current globstar pattern is following a symbolic link
     */
    markFollowGlobstar() {
        if (this.#index === 0 || !this.isGlobstar() || !this.#followGlobstar)
            return false;
        this.#followGlobstar = false;
        return true;
    }
}
exports.Pattern = Pattern;
//# sourceMappingURL=pattern.js.map

/***/ }),

/***/ 843:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// synchronous utility for filtering entries and calculating subwalks
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Processor = exports.SubWalks = exports.MatchRecord = exports.HasWalkedCache = void 0;
const minimatch_1 = __nccwpck_require__(507);
/**
 * A cache of which patterns have been processed for a given Path
 */
class HasWalkedCache {
    store;
    constructor(store = new Map()) {
        this.store = store;
    }
    copy() {
        return new HasWalkedCache(new Map(this.store));
    }
    hasWalked(target, pattern) {
        return this.store.get(target.fullpath())?.has(pattern.globString());
    }
    storeWalked(target, pattern) {
        const fullpath = target.fullpath();
        const cached = this.store.get(fullpath);
        if (cached)
            cached.add(pattern.globString());
        else
            this.store.set(fullpath, new Set([pattern.globString()]));
    }
}
exports.HasWalkedCache = HasWalkedCache;
/**
 * A record of which paths have been matched in a given walk step,
 * and whether they only are considered a match if they are a directory,
 * and whether their absolute or relative path should be returned.
 */
class MatchRecord {
    store = new Map();
    add(target, absolute, ifDir) {
        const n = (absolute ? 2 : 0) | (ifDir ? 1 : 0);
        const current = this.store.get(target);
        this.store.set(target, current === undefined ? n : n & current);
    }
    // match, absolute, ifdir
    entries() {
        return [...this.store.entries()].map(([path, n]) => [
            path,
            !!(n & 2),
            !!(n & 1),
        ]);
    }
}
exports.MatchRecord = MatchRecord;
/**
 * A collection of patterns that must be processed in a subsequent step
 * for a given path.
 */
class SubWalks {
    store = new Map();
    add(target, pattern) {
        if (!target.canReaddir()) {
            return;
        }
        const subs = this.store.get(target);
        if (subs) {
            if (!subs.find(p => p.globString() === pattern.globString())) {
                subs.push(pattern);
            }
        }
        else
            this.store.set(target, [pattern]);
    }
    get(target) {
        const subs = this.store.get(target);
        /* c8 ignore start */
        if (!subs) {
            throw new Error('attempting to walk unknown path');
        }
        /* c8 ignore stop */
        return subs;
    }
    entries() {
        return this.keys().map(k => [k, this.store.get(k)]);
    }
    keys() {
        return [...this.store.keys()].filter(t => t.canReaddir());
    }
}
exports.SubWalks = SubWalks;
/**
 * The class that processes patterns for a given path.
 *
 * Handles child entry filtering, and determining whether a path's
 * directory contents must be read.
 */
class Processor {
    hasWalkedCache;
    matches = new MatchRecord();
    subwalks = new SubWalks();
    patterns;
    follow;
    dot;
    opts;
    constructor(opts, hasWalkedCache) {
        this.opts = opts;
        this.follow = !!opts.follow;
        this.dot = !!opts.dot;
        this.hasWalkedCache =
            hasWalkedCache ? hasWalkedCache.copy() : new HasWalkedCache();
    }
    processPatterns(target, patterns) {
        this.patterns = patterns;
        const processingSet = patterns.map(p => [target, p]);
        // map of paths to the magic-starting subwalks they need to walk
        // first item in patterns is the filter
        for (let [t, pattern] of processingSet) {
            this.hasWalkedCache.storeWalked(t, pattern);
            const root = pattern.root();
            const absolute = pattern.isAbsolute() && this.opts.absolute !== false;
            // start absolute patterns at root
            if (root) {
                t = t.resolve(root === '/' && this.opts.root !== undefined ?
                    this.opts.root
                    : root);
                const rest = pattern.rest();
                if (!rest) {
                    this.matches.add(t, true, false);
                    continue;
                }
                else {
                    pattern = rest;
                }
            }
            if (t.isENOENT())
                continue;
            let p;
            let rest;
            let changed = false;
            while (typeof (p = pattern.pattern()) === 'string' &&
                (rest = pattern.rest())) {
                const c = t.resolve(p);
                t = c;
                pattern = rest;
                changed = true;
            }
            p = pattern.pattern();
            rest = pattern.rest();
            if (changed) {
                if (this.hasWalkedCache.hasWalked(t, pattern))
                    continue;
                this.hasWalkedCache.storeWalked(t, pattern);
            }
            // now we have either a final string for a known entry,
            // more strings for an unknown entry,
            // or a pattern starting with magic, mounted on t.
            if (typeof p === 'string') {
                // must not be final entry, otherwise we would have
                // concatenated it earlier.
                const ifDir = p === '..' || p === '' || p === '.';
                this.matches.add(t.resolve(p), absolute, ifDir);
                continue;
            }
            else if (p === minimatch_1.GLOBSTAR) {
                // if no rest, match and subwalk pattern
                // if rest, process rest and subwalk pattern
                // if it's a symlink, but we didn't get here by way of a
                // globstar match (meaning it's the first time THIS globstar
                // has traversed a symlink), then we follow it. Otherwise, stop.
                if (!t.isSymbolicLink() ||
                    this.follow ||
                    pattern.checkFollowGlobstar()) {
                    this.subwalks.add(t, pattern);
                }
                const rp = rest?.pattern();
                const rrest = rest?.rest();
                if (!rest || ((rp === '' || rp === '.') && !rrest)) {
                    // only HAS to be a dir if it ends in **/ or **/.
                    // but ending in ** will match files as well.
                    this.matches.add(t, absolute, rp === '' || rp === '.');
                }
                else {
                    if (rp === '..') {
                        // this would mean you're matching **/.. at the fs root,
                        // and no thanks, I'm not gonna test that specific case.
                        /* c8 ignore start */
                        const tp = t.parent || t;
                        /* c8 ignore stop */
                        if (!rrest)
                            this.matches.add(tp, absolute, true);
                        else if (!this.hasWalkedCache.hasWalked(tp, rrest)) {
                            this.subwalks.add(tp, rrest);
                        }
                    }
                }
            }
            else if (p instanceof RegExp) {
                this.subwalks.add(t, pattern);
            }
        }
        return this;
    }
    subwalkTargets() {
        return this.subwalks.keys();
    }
    child() {
        return new Processor(this.opts, this.hasWalkedCache);
    }
    // return a new Processor containing the subwalks for each
    // child entry, and a set of matches, and
    // a hasWalkedCache that's a copy of this one
    // then we're going to call
    filterEntries(parent, entries) {
        const patterns = this.subwalks.get(parent);
        // put matches and entry walks into the results processor
        const results = this.child();
        for (const e of entries) {
            for (const pattern of patterns) {
                const absolute = pattern.isAbsolute();
                const p = pattern.pattern();
                const rest = pattern.rest();
                if (p === minimatch_1.GLOBSTAR) {
                    results.testGlobstar(e, pattern, rest, absolute);
                }
                else if (p instanceof RegExp) {
                    results.testRegExp(e, p, rest, absolute);
                }
                else {
                    results.testString(e, p, rest, absolute);
                }
            }
        }
        return results;
    }
    testGlobstar(e, pattern, rest, absolute) {
        if (this.dot || !e.name.startsWith('.')) {
            if (!pattern.hasMore()) {
                this.matches.add(e, absolute, false);
            }
            if (e.canReaddir()) {
                // if we're in follow mode or it's not a symlink, just keep
                // testing the same pattern. If there's more after the globstar,
                // then this symlink consumes the globstar. If not, then we can
                // follow at most ONE symlink along the way, so we mark it, which
                // also checks to ensure that it wasn't already marked.
                if (this.follow || !e.isSymbolicLink()) {
                    this.subwalks.add(e, pattern);
                }
                else if (e.isSymbolicLink()) {
                    if (rest && pattern.checkFollowGlobstar()) {
                        this.subwalks.add(e, rest);
                    }
                    else if (pattern.markFollowGlobstar()) {
                        this.subwalks.add(e, pattern);
                    }
                }
            }
        }
        // if the NEXT thing matches this entry, then also add
        // the rest.
        if (rest) {
            const rp = rest.pattern();
            if (typeof rp === 'string' &&
                // dots and empty were handled already
                rp !== '..' &&
                rp !== '' &&
                rp !== '.') {
                this.testString(e, rp, rest.rest(), absolute);
            }
            else if (rp === '..') {
                /* c8 ignore start */
                const ep = e.parent || e;
                /* c8 ignore stop */
                this.subwalks.add(ep, rest);
            }
            else if (rp instanceof RegExp) {
                this.testRegExp(e, rp, rest.rest(), absolute);
            }
        }
    }
    testRegExp(e, p, rest, absolute) {
        if (!p.test(e.name))
            return;
        if (!rest) {
            this.matches.add(e, absolute, false);
        }
        else {
            this.subwalks.add(e, rest);
        }
    }
    testString(e, p, rest, absolute) {
        // should never happen?
        if (!e.isNamed(p))
            return;
        if (!rest) {
            this.matches.add(e, absolute, false);
        }
        else {
            this.subwalks.add(e, rest);
        }
    }
}
exports.Processor = Processor;
//# sourceMappingURL=processor.js.map

/***/ }),

/***/ 157:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GlobStream = exports.GlobWalker = exports.GlobUtil = void 0;
/**
 * Single-use utility classes to provide functionality to the {@link Glob}
 * methods.
 *
 * @module
 */
const minipass_1 = __nccwpck_require__(275);
const ignore_js_1 = __nccwpck_require__(637);
const processor_js_1 = __nccwpck_require__(843);
const makeIgnore = (ignore, opts) => typeof ignore === 'string' ? new ignore_js_1.Ignore([ignore], opts)
    : Array.isArray(ignore) ? new ignore_js_1.Ignore(ignore, opts)
        : ignore;
/**
 * basic walking utilities that all the glob walker types use
 */
class GlobUtil {
    path;
    patterns;
    opts;
    seen = new Set();
    paused = false;
    aborted = false;
    #onResume = [];
    #ignore;
    #sep;
    signal;
    maxDepth;
    includeChildMatches;
    constructor(patterns, path, opts) {
        this.patterns = patterns;
        this.path = path;
        this.opts = opts;
        this.#sep = !opts.posix && opts.platform === 'win32' ? '\\' : '/';
        this.includeChildMatches = opts.includeChildMatches !== false;
        if (opts.ignore || !this.includeChildMatches) {
            this.#ignore = makeIgnore(opts.ignore ?? [], opts);
            if (!this.includeChildMatches &&
                typeof this.#ignore.add !== 'function') {
                const m = 'cannot ignore child matches, ignore lacks add() method.';
                throw new Error(m);
            }
        }
        // ignore, always set with maxDepth, but it's optional on the
        // GlobOptions type
        /* c8 ignore start */
        this.maxDepth = opts.maxDepth || Infinity;
        /* c8 ignore stop */
        if (opts.signal) {
            this.signal = opts.signal;
            this.signal.addEventListener('abort', () => {
                this.#onResume.length = 0;
            });
        }
    }
    #ignored(path) {
        return this.seen.has(path) || !!this.#ignore?.ignored?.(path);
    }
    #childrenIgnored(path) {
        return !!this.#ignore?.childrenIgnored?.(path);
    }
    // backpressure mechanism
    pause() {
        this.paused = true;
    }
    resume() {
        /* c8 ignore start */
        if (this.signal?.aborted)
            return;
        /* c8 ignore stop */
        this.paused = false;
        let fn = undefined;
        while (!this.paused && (fn = this.#onResume.shift())) {
            fn();
        }
    }
    onResume(fn) {
        if (this.signal?.aborted)
            return;
        /* c8 ignore start */
        if (!this.paused) {
            fn();
        }
        else {
            /* c8 ignore stop */
            this.#onResume.push(fn);
        }
    }
    // do the requisite realpath/stat checking, and return the path
    // to add or undefined to filter it out.
    async matchCheck(e, ifDir) {
        if (ifDir && this.opts.nodir)
            return undefined;
        let rpc;
        if (this.opts.realpath) {
            rpc = e.realpathCached() || (await e.realpath());
            if (!rpc)
                return undefined;
            e = rpc;
        }
        const needStat = e.isUnknown() || this.opts.stat;
        const s = needStat ? await e.lstat() : e;
        if (this.opts.follow && this.opts.nodir && s?.isSymbolicLink()) {
            const target = await s.realpath();
            /* c8 ignore start */
            if (target && (target.isUnknown() || this.opts.stat)) {
                await target.lstat();
            }
            /* c8 ignore stop */
        }
        return this.matchCheckTest(s, ifDir);
    }
    matchCheckTest(e, ifDir) {
        return (e &&
            (this.maxDepth === Infinity || e.depth() <= this.maxDepth) &&
            (!ifDir || e.canReaddir()) &&
            (!this.opts.nodir || !e.isDirectory()) &&
            (!this.opts.nodir ||
                !this.opts.follow ||
                !e.isSymbolicLink() ||
                !e.realpathCached()?.isDirectory()) &&
            !this.#ignored(e)) ?
            e
            : undefined;
    }
    matchCheckSync(e, ifDir) {
        if (ifDir && this.opts.nodir)
            return undefined;
        let rpc;
        if (this.opts.realpath) {
            rpc = e.realpathCached() || e.realpathSync();
            if (!rpc)
                return undefined;
            e = rpc;
        }
        const needStat = e.isUnknown() || this.opts.stat;
        const s = needStat ? e.lstatSync() : e;
        if (this.opts.follow && this.opts.nodir && s?.isSymbolicLink()) {
            const target = s.realpathSync();
            if (target && (target?.isUnknown() || this.opts.stat)) {
                target.lstatSync();
            }
        }
        return this.matchCheckTest(s, ifDir);
    }
    matchFinish(e, absolute) {
        if (this.#ignored(e))
            return;
        // we know we have an ignore if this is false, but TS doesn't
        if (!this.includeChildMatches && this.#ignore?.add) {
            const ign = `${e.relativePosix()}/**`;
            this.#ignore.add(ign);
        }
        const abs = this.opts.absolute === undefined ? absolute : this.opts.absolute;
        this.seen.add(e);
        const mark = this.opts.mark && e.isDirectory() ? this.#sep : '';
        // ok, we have what we need!
        if (this.opts.withFileTypes) {
            this.matchEmit(e);
        }
        else if (abs) {
            const abs = this.opts.posix ? e.fullpathPosix() : e.fullpath();
            this.matchEmit(abs + mark);
        }
        else {
            const rel = this.opts.posix ? e.relativePosix() : e.relative();
            const pre = this.opts.dotRelative && !rel.startsWith('..' + this.#sep) ?
                '.' + this.#sep
                : '';
            this.matchEmit(!rel ? '.' + mark : pre + rel + mark);
        }
    }
    async match(e, absolute, ifDir) {
        const p = await this.matchCheck(e, ifDir);
        if (p)
            this.matchFinish(p, absolute);
    }
    matchSync(e, absolute, ifDir) {
        const p = this.matchCheckSync(e, ifDir);
        if (p)
            this.matchFinish(p, absolute);
    }
    walkCB(target, patterns, cb) {
        /* c8 ignore start */
        if (this.signal?.aborted)
            cb();
        /* c8 ignore stop */
        this.walkCB2(target, patterns, new processor_js_1.Processor(this.opts), cb);
    }
    walkCB2(target, patterns, processor, cb) {
        if (this.#childrenIgnored(target))
            return cb();
        if (this.signal?.aborted)
            cb();
        if (this.paused) {
            this.onResume(() => this.walkCB2(target, patterns, processor, cb));
            return;
        }
        processor.processPatterns(target, patterns);
        // done processing.  all of the above is sync, can be abstracted out.
        // subwalks is a map of paths to the entry filters they need
        // matches is a map of paths to [absolute, ifDir] tuples.
        let tasks = 1;
        const next = () => {
            if (--tasks === 0)
                cb();
        };
        for (const [m, absolute, ifDir] of processor.matches.entries()) {
            if (this.#ignored(m))
                continue;
            tasks++;
            this.match(m, absolute, ifDir).then(() => next());
        }
        for (const t of processor.subwalkTargets()) {
            if (this.maxDepth !== Infinity && t.depth() >= this.maxDepth) {
                continue;
            }
            tasks++;
            const childrenCached = t.readdirCached();
            if (t.calledReaddir())
                this.walkCB3(t, childrenCached, processor, next);
            else {
                t.readdirCB((_, entries) => this.walkCB3(t, entries, processor, next), true);
            }
        }
        next();
    }
    walkCB3(target, entries, processor, cb) {
        processor = processor.filterEntries(target, entries);
        let tasks = 1;
        const next = () => {
            if (--tasks === 0)
                cb();
        };
        for (const [m, absolute, ifDir] of processor.matches.entries()) {
            if (this.#ignored(m))
                continue;
            tasks++;
            this.match(m, absolute, ifDir).then(() => next());
        }
        for (const [target, patterns] of processor.subwalks.entries()) {
            tasks++;
            this.walkCB2(target, patterns, processor.child(), next);
        }
        next();
    }
    walkCBSync(target, patterns, cb) {
        /* c8 ignore start */
        if (this.signal?.aborted)
            cb();
        /* c8 ignore stop */
        this.walkCB2Sync(target, patterns, new processor_js_1.Processor(this.opts), cb);
    }
    walkCB2Sync(target, patterns, processor, cb) {
        if (this.#childrenIgnored(target))
            return cb();
        if (this.signal?.aborted)
            cb();
        if (this.paused) {
            this.onResume(() => this.walkCB2Sync(target, patterns, processor, cb));
            return;
        }
        processor.processPatterns(target, patterns);
        // done processing.  all of the above is sync, can be abstracted out.
        // subwalks is a map of paths to the entry filters they need
        // matches is a map of paths to [absolute, ifDir] tuples.
        let tasks = 1;
        const next = () => {
            if (--tasks === 0)
                cb();
        };
        for (const [m, absolute, ifDir] of processor.matches.entries()) {
            if (this.#ignored(m))
                continue;
            this.matchSync(m, absolute, ifDir);
        }
        for (const t of processor.subwalkTargets()) {
            if (this.maxDepth !== Infinity && t.depth() >= this.maxDepth) {
                continue;
            }
            tasks++;
            const children = t.readdirSync();
            this.walkCB3Sync(t, children, processor, next);
        }
        next();
    }
    walkCB3Sync(target, entries, processor, cb) {
        processor = processor.filterEntries(target, entries);
        let tasks = 1;
        const next = () => {
            if (--tasks === 0)
                cb();
        };
        for (const [m, absolute, ifDir] of processor.matches.entries()) {
            if (this.#ignored(m))
                continue;
            this.matchSync(m, absolute, ifDir);
        }
        for (const [target, patterns] of processor.subwalks.entries()) {
            tasks++;
            this.walkCB2Sync(target, patterns, processor.child(), next);
        }
        next();
    }
}
exports.GlobUtil = GlobUtil;
class GlobWalker extends GlobUtil {
    matches = new Set();
    constructor(patterns, path, opts) {
        super(patterns, path, opts);
    }
    matchEmit(e) {
        this.matches.add(e);
    }
    async walk() {
        if (this.signal?.aborted)
            throw this.signal.reason;
        if (this.path.isUnknown()) {
            await this.path.lstat();
        }
        await new Promise((res, rej) => {
            this.walkCB(this.path, this.patterns, () => {
                if (this.signal?.aborted) {
                    rej(this.signal.reason);
                }
                else {
                    res(this.matches);
                }
            });
        });
        return this.matches;
    }
    walkSync() {
        if (this.signal?.aborted)
            throw this.signal.reason;
        if (this.path.isUnknown()) {
            this.path.lstatSync();
        }
        // nothing for the callback to do, because this never pauses
        this.walkCBSync(this.path, this.patterns, () => {
            if (this.signal?.aborted)
                throw this.signal.reason;
        });
        return this.matches;
    }
}
exports.GlobWalker = GlobWalker;
class GlobStream extends GlobUtil {
    results;
    constructor(patterns, path, opts) {
        super(patterns, path, opts);
        this.results = new minipass_1.Minipass({
            signal: this.signal,
            objectMode: true,
        });
        this.results.on('drain', () => this.resume());
        this.results.on('resume', () => this.resume());
    }
    matchEmit(e) {
        this.results.write(e);
        if (!this.results.flowing)
            this.pause();
    }
    stream() {
        const target = this.path;
        if (target.isUnknown()) {
            target.lstat().then(() => {
                this.walkCB(target, this.patterns, () => this.results.end());
            });
        }
        else {
            this.walkCB(target, this.patterns, () => this.results.end());
        }
        return this.results;
    }
    streamSync() {
        if (this.path.isUnknown()) {
            this.path.lstatSync();
        }
        this.walkCBSync(this.path, this.patterns, () => this.results.end());
        return this.results;
    }
}
exports.GlobStream = GlobStream;
//# sourceMappingURL=walker.js.map

/***/ }),

/***/ 416:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
var j=(u,t)=>()=>(t||u((t={exports:{}}).exports,t),t.exports);var I=j(O=>{"use strict";Object.defineProperty(O,"__esModule",{value:!0});O.tracing=O.metrics=void 0;var U=__nccwpck_require__(53);O.metrics=(0,U.channel)("lru-cache:metrics");O.tracing=(0,U.tracingChannel)("lru-cache")});var P=j(R=>{"use strict";Object.defineProperty(R,"__esModule",{value:!0});R.defaultPerf=void 0;R.defaultPerf=typeof performance=="object"&&performance&&typeof performance.now=="function"?performance:Date});Object.defineProperty(exports, "__esModule", ({value:!0}));exports.LRUCache=void 0;var g=I(),N=P(),C=()=>g.metrics.hasSubscribers||g.tracing.hasSubscribers,k=new Set,G=typeof process=="object"&&process?process:{},V=(u,t,e,i)=>{typeof G.emitWarning=="function"?G.emitWarning(u,t,e,i):console.error(`[${e}] ${t}: ${u}`)},q=u=>!k.has(u);var T=u=>!!u&&u===Math.floor(u)&&u>0&&isFinite(u),H=u=>T(u)?u<=Math.pow(2,8)?Uint8Array:u<=Math.pow(2,16)?Uint16Array:u<=Math.pow(2,32)?Uint32Array:u<=Number.MAX_SAFE_INTEGER?W:null:null,W=class extends Array{constructor(t){super(t),this.fill(0)}},L=class u{heap;length;static#o=!1;static create(t){let e=H(t);if(!e)return[];u.#o=!0;let i=new u(t,e);return u.#o=!1,i}constructor(t,e){if(!u.#o)throw new TypeError("instantiate Stack using Stack.create(n)");this.heap=new e(t),this.length=0}push(t){this.heap[this.length++]=t}pop(){return this.heap[--this.length]}},M=class u{#o;#c;#m;#W;#S;#x;#j;#w;get perf(){return this.#w}ttl;ttlResolution;ttlAutopurge;updateAgeOnGet;updateAgeOnHas;allowStale;noDisposeOnSet;noUpdateTTL;maxEntrySize;sizeCalculation;noDeleteOnFetchRejection;noDeleteOnStaleGet;allowStaleOnFetchAbort;allowStaleOnFetchRejection;ignoreFetchAbort;backgroundFetchSize;#n;#b;#s;#i;#t;#l;#u;#a;#h;#_;#r;#y;#F;#d;#g;#T;#U;#f;#R;static unsafeExposeInternals(t){return{starts:t.#F,ttls:t.#d,autopurgeTimers:t.#g,sizes:t.#y,keyMap:t.#s,keyList:t.#i,valList:t.#t,next:t.#l,prev:t.#u,get head(){return t.#a},get tail(){return t.#h},free:t.#_,isBackgroundFetch:e=>t.#e(e),backgroundFetch:(e,i,s,n)=>t.#G(e,i,s,n),moveToTail:e=>t.#M(e),indexes:e=>t.#A(e),rindexes:e=>t.#z(e),isStale:e=>t.#p(e)}}get max(){return this.#o}get maxSize(){return this.#c}get calculatedSize(){return this.#b}get size(){return this.#n}get fetchMethod(){return this.#x}get memoMethod(){return this.#j}get dispose(){return this.#m}get onInsert(){return this.#W}get disposeAfter(){return this.#S}constructor(t){let{max:e=0,ttl:i,ttlResolution:s=1,ttlAutopurge:n,updateAgeOnGet:o,updateAgeOnHas:l,allowStale:h,dispose:r,onInsert:c,disposeAfter:w,noDisposeOnSet:y,noUpdateTTL:d,maxSize:p=0,maxEntrySize:f=0,sizeCalculation:_,fetchMethod:a,memoMethod:S,noDeleteOnFetchRejection:F,noDeleteOnStaleGet:b,allowStaleOnFetchRejection:m,allowStaleOnFetchAbort:A,ignoreFetchAbort:z,backgroundFetchSize:x=1,perf:v}=t;if(this.backgroundFetchSize=x,v!==void 0&&typeof v?.now!="function")throw new TypeError("perf option must have a now() method if specified");if(this.#w=v??N.defaultPerf,e!==0&&!T(e))throw new TypeError("max option must be a nonnegative integer");let E=e?H(e):Array;if(!E)throw new Error("invalid max value: "+e);if(this.#o=e,this.#c=p,this.maxEntrySize=f||this.#c,this.sizeCalculation=_,this.sizeCalculation){if(!this.#c&&!this.maxEntrySize)throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");if(typeof this.sizeCalculation!="function")throw new TypeError("sizeCalculation set to non-function")}if(S!==void 0&&typeof S!="function")throw new TypeError("memoMethod must be a function if defined");if(this.#j=S,a!==void 0&&typeof a!="function")throw new TypeError("fetchMethod must be a function if specified");if(this.#x=a,this.#U=!!a,this.#s=new Map,this.#i=Array.from({length:e}).fill(void 0),this.#t=Array.from({length:e}).fill(void 0),this.#l=new E(e),this.#u=new E(e),this.#a=0,this.#h=0,this.#_=L.create(e),this.#n=0,this.#b=0,typeof r=="function"&&(this.#m=r),typeof c=="function"&&(this.#W=c),typeof w=="function"?(this.#S=w,this.#r=[]):(this.#S=void 0,this.#r=void 0),this.#T=!!this.#m,this.#R=!!this.#W,this.#f=!!this.#S,this.noDisposeOnSet=!!y,this.noUpdateTTL=!!d,this.noDeleteOnFetchRejection=!!F,this.allowStaleOnFetchRejection=!!m,this.allowStaleOnFetchAbort=!!A,this.ignoreFetchAbort=!!z,this.maxEntrySize!==0){if(this.#c!==0&&!T(this.#c))throw new TypeError("maxSize must be a positive integer if specified");if(!T(this.maxEntrySize))throw new TypeError("maxEntrySize must be a positive integer if specified");this.#X()}if(this.allowStale=!!h,this.noDeleteOnStaleGet=!!b,this.updateAgeOnGet=!!o,this.updateAgeOnHas=!!l,this.ttlResolution=T(s)||s===0?s:1,this.ttlAutopurge=!!n,this.ttl=i||0,this.ttl){if(!T(this.ttl))throw new TypeError("ttl must be a positive integer if specified");this.#k()}if(this.#o===0&&this.ttl===0&&this.#c===0)throw new TypeError("At least one of max, maxSize, or ttl is required");if(!this.ttlAutopurge&&!this.#o&&!this.#c){let D="LRU_CACHE_UNBOUNDED";q(D)&&(k.add(D),V("TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.","UnboundedCacheWarning",D,u))}}getRemainingTTL(t){return this.#s.has(t)?1/0:0}#k(){let t=new W(this.#o),e=new W(this.#o);this.#d=t,this.#F=e;let i=this.ttlAutopurge?Array.from({length:this.#o}):void 0;this.#g=i,this.#H=(h,r,c=this.#w.now())=>{e[h]=r!==0?c:0,t[h]=r,s(h,r)},this.#D=h=>{e[h]=t[h]!==0?this.#w.now():0,s(h,t[h])};let s=this.ttlAutopurge?(h,r)=>{if(i?.[h]&&(clearTimeout(i[h]),i[h]=void 0),r&&r!==0&&i){let c=setTimeout(()=>{this.#p(h)?(this.#v(this.#i[h],"expire"),i[h]=void 0):s(h,l(h))},r+1);c.unref&&c.unref(),i[h]=c}}:()=>{};this.#E=(h,r)=>{if(t[r]){let c=t[r],w=e[r];if(!c||!w)return;h.ttl=c,h.start=w,h.now=n||o();let y=h.now-w;h.remainingTTL=c-y}};let n=0,o=()=>{let h=this.#w.now();if(this.ttlResolution>0){n=h;let r=setTimeout(()=>n=0,this.ttlResolution);r.unref&&r.unref()}return h};this.getRemainingTTL=h=>{let r=this.#s.get(h);return r===void 0?0:l(r)};let l=h=>{let r=t[h],c=e[h];if(!r||!c)return 1/0;let w=(n||o())-c;return r-w};this.#p=h=>{let r=e[h],c=t[h];return!!c&&!!r&&(n||o())-r>c}}#D=()=>{};#E=()=>{};#H=()=>{};#p=()=>!1;#X(){let t=new W(this.#o);this.#b=0,this.#y=t,this.#C=e=>{this.#b-=t[e],t[e]=0},this.#N=(e,i,s,n)=>{if(!T(s)){if(this.#e(i))return this.backgroundFetchSize;if(n){if(typeof n!="function")throw new TypeError("sizeCalculation must be a function");if(s=n(i,e),!T(s))throw new TypeError("sizeCalculation return invalid (expect positive integer)")}else throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.")}return s},this.#I=(e,i,s)=>{if(t[e]=i,this.#c){let n=this.#c-t[e];for(;this.#b>n;)this.#P(!0)}this.#b+=t[e],s&&(s.entrySize=i,s.totalCalculatedSize=this.#b)}}#C=t=>{};#I=(t,e,i)=>{};#N=(t,e,i,s)=>{if(i||s)throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");return 0};*#A({allowStale:t=this.allowStale}={}){if(this.#n)for(let e=this.#h;this.#V(e)&&((t||!this.#p(e))&&(yield e),e!==this.#a);)e=this.#u[e]}*#z({allowStale:t=this.allowStale}={}){if(this.#n)for(let e=this.#a;this.#V(e)&&((t||!this.#p(e))&&(yield e),e!==this.#h);)e=this.#l[e]}#V(t){return t!==void 0&&this.#s.get(this.#i[t])===t}*entries(){for(let t of this.#A())this.#t[t]!==void 0&&this.#i[t]!==void 0&&!this.#e(this.#t[t])&&(yield[this.#i[t],this.#t[t]])}*rentries(){for(let t of this.#z())this.#t[t]!==void 0&&this.#i[t]!==void 0&&!this.#e(this.#t[t])&&(yield[this.#i[t],this.#t[t]])}*keys(){for(let t of this.#A()){let e=this.#i[t];e!==void 0&&!this.#e(this.#t[t])&&(yield e)}}*rkeys(){for(let t of this.#z()){let e=this.#i[t];e!==void 0&&!this.#e(this.#t[t])&&(yield e)}}*values(){for(let t of this.#A())this.#t[t]!==void 0&&!this.#e(this.#t[t])&&(yield this.#t[t])}*rvalues(){for(let t of this.#z())this.#t[t]!==void 0&&!this.#e(this.#t[t])&&(yield this.#t[t])}[Symbol.iterator](){return this.entries()}[Symbol.toStringTag]="LRUCache";find(t,e={}){for(let i of this.#A()){let s=this.#t[i],n=this.#e(s)?s.__staleWhileFetching:s;if(n!==void 0&&t(n,this.#i[i],this))return this.#L(this.#i[i],e)}}forEach(t,e=this){for(let i of this.#A()){let s=this.#t[i],n=this.#e(s)?s.__staleWhileFetching:s;n!==void 0&&t.call(e,n,this.#i[i],this)}}rforEach(t,e=this){for(let i of this.#z()){let s=this.#t[i],n=this.#e(s)?s.__staleWhileFetching:s;n!==void 0&&t.call(e,n,this.#i[i],this)}}purgeStale(){let t=!1;for(let e of this.#z({allowStale:!0}))this.#p(e)&&(this.#v(this.#i[e],"expire"),t=!0);return t}info(t){let e=this.#s.get(t);if(e===void 0)return;let i=this.#t[e],s=this.#e(i)?i.__staleWhileFetching:i;if(s===void 0)return;let n={value:s};if(this.#d&&this.#F){let o=this.#d[e],l=this.#F[e];if(o&&l){let h=o-(this.#w.now()-l);n.ttl=h,n.start=Date.now()}}return this.#y&&(n.size=this.#y[e]),n}dump(){let t=[];for(let e of this.#A({allowStale:!0})){let i=this.#i[e],s=this.#t[e],n=this.#e(s)?s.__staleWhileFetching:s;if(n===void 0||i===void 0)continue;let o={value:n};if(this.#d&&this.#F){o.ttl=this.#d[e];let l=this.#w.now()-this.#F[e];o.start=Math.floor(Date.now()-l)}this.#y&&(o.size=this.#y[e]),t.unshift([i,o])}return t}load(t){this.clear();for(let[e,i]of t){if(i.start){let s=Date.now()-i.start;i.start=this.#w.now()-s}this.#O(e,i.value,i)}}set(t,e,i={}){let{status:s=g.metrics.hasSubscribers?{}:void 0}=i;i.status=s,s&&(s.op="set",s.key=t,e!==void 0&&(s.value=e),s.cache=this);let n=this.#O(t,e,i);return s&&g.metrics.hasSubscribers&&g.metrics.publish(s),n}#O(t,e,i,s){let{ttl:n=this.ttl,start:o,noDisposeOnSet:l=this.noDisposeOnSet,sizeCalculation:h=this.sizeCalculation,status:r}=i,c=this.#e(e);if(e===void 0)return r&&(r.set="deleted"),this.delete(t),this;let{noUpdateTTL:w=this.noUpdateTTL}=i;r&&!c&&(r.value=e);let y=this.#N(t,e,i.size||0,h,r);if(this.maxEntrySize&&y>this.maxEntrySize)return this.#v(t,"set"),r&&(r.set="miss",r.maxEntrySizeExceeded=!0),this;let d=this.#n===0?void 0:this.#s.get(t);if(d===void 0)d=this.#n===0?this.#h:this.#_.length!==0?this.#_.pop():this.#n===this.#o?this.#P(!1):this.#n,this.#i[d]=t,this.#t[d]=e,this.#s.set(t,d),this.#l[this.#h]=d,this.#u[d]=this.#h,this.#h=d,this.#n++,this.#I(d,y,r),r&&(r.set="add"),w=!1,this.#R&&!c&&this.#W?.(e,t,"add");else{this.#M(d);let p=this.#t[d];if(e!==p){if(!l)if(this.#e(p)){p!==s&&p.__abortController.abort(new Error("replaced"));let{__staleWhileFetching:f}=p;f!==void 0&&f!==e&&(this.#T&&this.#m?.(f,t,"set"),this.#f&&this.#r?.push([f,t,"set"]))}else this.#T&&this.#m?.(p,t,"set"),this.#f&&this.#r?.push([p,t,"set"]);if(this.#C(d),this.#I(d,y,r),this.#t[d]=e,!c){let f=p&&this.#e(p)?p.__staleWhileFetching:p,_=f===void 0?"add":e!==f?"replace":"update";r&&(r.set=_,f!==void 0&&(r.oldValue=f)),this.#R&&this.onInsert?.(e,t,_)}}else c||(r&&(r.set="update"),this.#R&&this.onInsert?.(e,t,"update"))}if(n!==0&&!this.#d&&this.#k(),this.#d&&(w||this.#H(d,n,o),r&&this.#E(r,d)),!l&&this.#f&&this.#r){let p=this.#r,f;for(;f=p?.shift();)this.#S?.(...f)}return this}pop(){try{for(;this.#n;){let t=this.#t[this.#a];if(this.#P(!0),this.#e(t)){if(t.__staleWhileFetching)return t.__staleWhileFetching}else if(t!==void 0)return t}}finally{if(this.#f&&this.#r){let t=this.#r,e;for(;e=t?.shift();)this.#S?.(...e)}}}#P(t){let e=this.#a,i=this.#i[e],s=this.#t[e],n=this.#e(s);n&&s.__abortController.abort(new Error("evicted"));let o=n?s.__staleWhileFetching:s;return(this.#T||this.#f)&&o!==void 0&&(this.#T&&this.#m?.(o,i,"evict"),this.#f&&this.#r?.push([o,i,"evict"])),this.#C(e),this.#g?.[e]&&(clearTimeout(this.#g[e]),this.#g[e]=void 0),t&&(this.#i[e]=void 0,this.#t[e]=void 0,this.#_.push(e)),this.#n===1?(this.#a=this.#h=0,this.#_.length=0):this.#a=this.#l[e],this.#s.delete(i),this.#n--,e}has(t,e={}){let{status:i=g.metrics.hasSubscribers?{}:void 0}=e;e.status=i,i&&(i.op="has",i.key=t,i.cache=this);let s=this.#Y(t,e);return g.metrics.hasSubscribers&&g.metrics.publish(i),s}#Y(t,e={}){let{updateAgeOnHas:i=this.updateAgeOnHas,status:s}=e,n=this.#s.get(t);if(n!==void 0){let o=this.#t[n];if(this.#e(o)&&o.__staleWhileFetching===void 0)return!1;if(this.#p(n))s&&(s.has="stale",this.#E(s,n));else return i&&this.#D(n),s&&(s.has="hit",this.#E(s,n)),!0}else s&&(s.has="miss");return!1}peek(t,e={}){let{status:i=C()?{}:void 0}=e;i&&(i.op="peek",i.key=t,i.cache=this),e.status=i;let s=this.#J(t,e);return g.metrics.hasSubscribers&&g.metrics.publish(i),s}#J(t,e){let{status:i,allowStale:s=this.allowStale}=e,n=this.#s.get(t);if(n===void 0||!s&&this.#p(n)){i&&(i.peek=n===void 0?"miss":"stale");return}let o=this.#t[n],l=this.#e(o)?o.__staleWhileFetching:o;return i&&(l!==void 0?(i.peek="hit",i.value=l):i.peek="miss"),l}#G(t,e,i,s){let n=e===void 0?void 0:this.#t[e];if(this.#e(n))return n;let o=new AbortController,{signal:l}=i;l?.addEventListener("abort",()=>o.abort(l.reason),{signal:o.signal});let h={signal:o.signal,options:i,context:s},r=(f,_=!1)=>{let{aborted:a}=o.signal,S=i.ignoreFetchAbort&&f!==void 0,F=i.ignoreFetchAbort||!!(i.allowStaleOnFetchAbort&&f!==void 0);if(i.status&&(a&&!_?(i.status.fetchAborted=!0,i.status.fetchError=o.signal.reason,S&&(i.status.fetchAbortIgnored=!0)):i.status.fetchResolved=!0),a&&!S&&!_)return w(o.signal.reason,F);let b=d,m=this.#t[e];return(m===d||m===void 0&&S&&_)&&(f===void 0?b.__staleWhileFetching!==void 0?this.#t[e]=b.__staleWhileFetching:this.#v(t,"fetch"):(i.status&&(i.status.fetchUpdated=!0),this.#O(t,f,h.options,b))),f},c=f=>(i.status&&(i.status.fetchRejected=!0,i.status.fetchError=f),w(f,!1)),w=(f,_)=>{let{aborted:a}=o.signal,S=a&&i.allowStaleOnFetchAbort,F=S||i.allowStaleOnFetchRejection,b=F||i.noDeleteOnFetchRejection,m=d;if(this.#t[e]===d&&(!b||!_&&m.__staleWhileFetching===void 0?this.#v(t,"fetch"):S||(this.#t[e]=m.__staleWhileFetching)),F)return i.status&&m.__staleWhileFetching!==void 0&&(i.status.returnedStale=!0),m.__staleWhileFetching;if(m.__returned===m)throw f},y=(f,_)=>{let a=this.#x?.(t,n,h);o.signal.addEventListener("abort",()=>{(!i.ignoreFetchAbort||i.allowStaleOnFetchAbort)&&(f(void 0),i.allowStaleOnFetchAbort&&(f=S=>r(S,!0)))}),a&&a instanceof Promise?a.then(S=>f(S===void 0?void 0:S),_):a!==void 0&&f(a)};i.status&&(i.status.fetchDispatched=!0);let d=new Promise(y).then(r,c),p=Object.assign(d,{__abortController:o,__staleWhileFetching:n,__returned:void 0});return e===void 0?(this.#O(t,p,{...h.options,status:void 0}),e=this.#s.get(t)):this.#t[e]=p,p}#e(t){if(!this.#U)return!1;let e=t;return!!e&&e instanceof Promise&&e.hasOwnProperty("__staleWhileFetching")&&e.__abortController instanceof AbortController}fetch(t,e={}){let i=g.tracing.hasSubscribers,{status:s=C()?{}:void 0}=e;e.status=s,s&&e.context&&(s.context=e.context);let n=this.#q(t,e);return s&&i&&(s.trace=!0,g.tracing.tracePromise(()=>n,s).catch(()=>{})),n}async#q(t,e={}){let{allowStale:i=this.allowStale,updateAgeOnGet:s=this.updateAgeOnGet,noDeleteOnStaleGet:n=this.noDeleteOnStaleGet,ttl:o=this.ttl,noDisposeOnSet:l=this.noDisposeOnSet,size:h=0,sizeCalculation:r=this.sizeCalculation,noUpdateTTL:c=this.noUpdateTTL,noDeleteOnFetchRejection:w=this.noDeleteOnFetchRejection,allowStaleOnFetchRejection:y=this.allowStaleOnFetchRejection,ignoreFetchAbort:d=this.ignoreFetchAbort,allowStaleOnFetchAbort:p=this.allowStaleOnFetchAbort,context:f,forceRefresh:_=!1,status:a,signal:S}=e;if(a&&(a.op="fetch",a.key=t,_&&(a.forceRefresh=!0),a.cache=this),!this.#U)return a&&(a.fetch="get"),this.#L(t,{allowStale:i,updateAgeOnGet:s,noDeleteOnStaleGet:n,status:a});let F={allowStale:i,updateAgeOnGet:s,noDeleteOnStaleGet:n,ttl:o,noDisposeOnSet:l,size:h,sizeCalculation:r,noUpdateTTL:c,noDeleteOnFetchRejection:w,allowStaleOnFetchRejection:y,allowStaleOnFetchAbort:p,ignoreFetchAbort:d,status:a,signal:S},b=this.#s.get(t);if(b===void 0){a&&(a.fetch="miss");let m=this.#G(t,b,F,f);return m.__returned=m}else{let m=this.#t[b];if(this.#e(m)){let E=i&&m.__staleWhileFetching!==void 0;return a&&(a.fetch="inflight",E&&(a.returnedStale=!0)),E?m.__staleWhileFetching:m.__returned=m}let A=this.#p(b);if(!_&&!A)return a&&(a.fetch="hit"),this.#M(b),s&&this.#D(b),a&&this.#E(a,b),m;let z=this.#G(t,b,F,f),v=z.__staleWhileFetching!==void 0&&i;return a&&(a.fetch=A?"stale":"refresh",v&&A&&(a.returnedStale=!0)),v?z.__staleWhileFetching:z.__returned=z}}forceFetch(t,e={}){let i=g.tracing.hasSubscribers,{status:s=C()?{}:void 0}=e;e.status=s,s&&e.context&&(s.context=e.context);let n=this.#K(t,e);return s&&i&&(s.trace=!0,g.tracing.tracePromise(()=>n,s).catch(()=>{})),n}async#K(t,e={}){let i=await this.#q(t,e);if(i===void 0)throw new Error("fetch() returned undefined");return i}memo(t,e={}){let{status:i=g.metrics.hasSubscribers?{}:void 0}=e;e.status=i,i&&(i.op="memo",i.key=t,e.context&&(i.context=e.context),i.cache=this);let s=this.#Q(t,e);return i&&(i.value=s),g.metrics.hasSubscribers&&g.metrics.publish(i),s}#Q(t,e={}){let i=this.#j;if(!i)throw new Error("no memoMethod provided to constructor");let{context:s,status:n,forceRefresh:o,...l}=e;n&&o&&(n.forceRefresh=!0);let h=this.#L(t,l),r=o||h===void 0;if(n&&(n.memo=r?"miss":"hit",r||(n.value=h)),!r)return h;let c=i(t,h,{options:l,context:s});return n&&(n.value=c),this.#O(t,c,l),c}get(t,e={}){let{status:i=g.metrics.hasSubscribers?{}:void 0}=e;e.status=i,i&&(i.op="get",i.key=t,i.cache=this);let s=this.#L(t,e);return i&&(s!==void 0&&(i.value=s),g.metrics.hasSubscribers&&g.metrics.publish(i)),s}#L(t,e={}){let{allowStale:i=this.allowStale,updateAgeOnGet:s=this.updateAgeOnGet,noDeleteOnStaleGet:n=this.noDeleteOnStaleGet,status:o}=e,l=this.#s.get(t);if(l===void 0){o&&(o.get="miss");return}let h=this.#t[l],r=this.#e(h);return o&&this.#E(o,l),this.#p(l)?r?(o&&(o.get="stale-fetching"),i&&h.__staleWhileFetching!==void 0?(o&&(o.returnedStale=!0),h.__staleWhileFetching):void 0):(n||this.#v(t,"expire"),o&&(o.get="stale"),i?(o&&(o.returnedStale=!0),h):void 0):(o&&(o.get=r?"fetching":"hit"),this.#M(l),s&&this.#D(l),r?h.__staleWhileFetching:h)}#B(t,e){this.#u[e]=t,this.#l[t]=e}#M(t){t!==this.#h&&(t===this.#a?this.#a=this.#l[t]:this.#B(this.#u[t],this.#l[t]),this.#B(this.#h,t),this.#h=t)}delete(t){return this.#v(t,"delete")}#v(t,e){g.metrics.hasSubscribers&&g.metrics.publish({op:"delete",delete:e,key:t,cache:this});let i=!1;if(this.#n!==0){let s=this.#s.get(t);if(s!==void 0)if(this.#g?.[s]&&(clearTimeout(this.#g[s]),this.#g[s]=void 0),i=!0,this.#n===1)this.#$(e);else{this.#C(s);let n=this.#t[s];if(this.#e(n)?n.__abortController.abort(new Error("deleted")):(this.#T||this.#f)&&(this.#T&&this.#m?.(n,t,e),this.#f&&this.#r?.push([n,t,e])),this.#s.delete(t),this.#i[s]=void 0,this.#t[s]=void 0,s===this.#h)this.#h=this.#u[s];else if(s===this.#a)this.#a=this.#l[s];else{let o=this.#u[s];this.#l[o]=this.#l[s];let l=this.#l[s];this.#u[l]=this.#u[s]}this.#n--,this.#_.push(s)}}if(this.#f&&this.#r?.length){let s=this.#r,n;for(;n=s?.shift();)this.#S?.(...n)}return i}clear(){return this.#$("delete")}#$(t){for(let e of this.#z({allowStale:!0})){let i=this.#t[e];if(this.#e(i))i.__abortController.abort(new Error("deleted"));else{let s=this.#i[e];this.#T&&this.#m?.(i,s,t),this.#f&&this.#r?.push([i,s,t])}}if(this.#s.clear(),this.#t.fill(void 0),this.#i.fill(void 0),this.#d&&this.#F){this.#d.fill(0),this.#F.fill(0);for(let e of this.#g??[])e!==void 0&&clearTimeout(e);this.#g?.fill(void 0)}if(this.#y&&this.#y.fill(0),this.#a=0,this.#h=0,this.#_.length=0,this.#b=0,this.#n=0,this.#f&&this.#r){let e=this.#r,i;for(;i=e?.shift();)this.#S?.(...i)}}};exports.LRUCache=M;
//# sourceMappingURL=index.min.js.map


/***/ }),

/***/ 305:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.assertValidPattern = void 0;
const MAX_PATTERN_LENGTH = 1024 * 64;
const assertValidPattern = (pattern) => {
    if (typeof pattern !== 'string') {
        throw new TypeError('invalid pattern');
    }
    if (pattern.length > MAX_PATTERN_LENGTH) {
        throw new TypeError('pattern is too long');
    }
};
exports.assertValidPattern = assertValidPattern;
//# sourceMappingURL=assert-valid-pattern.js.map

/***/ }),

/***/ 803:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// parse a single path portion
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AST = void 0;
const brace_expressions_js_1 = __nccwpck_require__(90);
const unescape_js_1 = __nccwpck_require__(851);
const types = new Set(['!', '?', '+', '*', '@']);
const isExtglobType = (c) => types.has(c);
const isExtglobAST = (c) => isExtglobType(c.type);
// Map of which extglob types can adopt the children of a nested extglob
//
// anything but ! can adopt a matching type:
// +(a|+(b|c)|d) => +(a|b|c|d)
// *(a|*(b|c)|d) => *(a|b|c|d)
// @(a|@(b|c)|d) => @(a|b|c|d)
// ?(a|?(b|c)|d) => ?(a|b|c|d)
//
// * can adopt anything, because 0 or repetition is allowed
// *(a|?(b|c)|d) => *(a|b|c|d)
// *(a|+(b|c)|d) => *(a|b|c|d)
// *(a|@(b|c)|d) => *(a|b|c|d)
//
// + can adopt @, because 1 or repetition is allowed
// +(a|@(b|c)|d) => +(a|b|c|d)
//
// + and @ CANNOT adopt *, because 0 would be allowed
// +(a|*(b|c)|d) => would match "", on *(b|c)
// @(a|*(b|c)|d) => would match "", on *(b|c)
//
// + and @ CANNOT adopt ?, because 0 would be allowed
// +(a|?(b|c)|d) => would match "", on ?(b|c)
// @(a|?(b|c)|d) => would match "", on ?(b|c)
//
// ? can adopt @, because 0 or 1 is allowed
// ?(a|@(b|c)|d) => ?(a|b|c|d)
//
// ? and @ CANNOT adopt * or +, because >1 would be allowed
// ?(a|*(b|c)|d) => would match bbb on *(b|c)
// @(a|*(b|c)|d) => would match bbb on *(b|c)
// ?(a|+(b|c)|d) => would match bbb on +(b|c)
// @(a|+(b|c)|d) => would match bbb on +(b|c)
//
// ! CANNOT adopt ! (nothing else can either)
// !(a|!(b|c)|d) => !(a|b|c|d) would fail to match on b (not not b|c)
//
// ! can adopt @
// !(a|@(b|c)|d) => !(a|b|c|d)
//
// ! CANNOT adopt *
// !(a|*(b|c)|d) => !(a|b|c|d) would match on bbb, not allowed
//
// ! CANNOT adopt +
// !(a|+(b|c)|d) => !(a|b|c|d) would match on bbb, not allowed
//
// ! CANNOT adopt ?
// x!(a|?(b|c)|d) => x!(a|b|c|d) would fail to match "x"
const adoptionMap = new Map([
    ['!', ['@']],
    ['?', ['?', '@']],
    ['@', ['@']],
    ['*', ['*', '+', '?', '@']],
    ['+', ['+', '@']],
]);
// nested extglobs that can be adopted in, but with the addition of
// a blank '' element.
const adoptionWithSpaceMap = new Map([
    ['!', ['?']],
    ['@', ['?']],
    ['+', ['?', '*']],
]);
// union of the previous two maps
const adoptionAnyMap = new Map([
    ['!', ['?', '@']],
    ['?', ['?', '@']],
    ['@', ['?', '@']],
    ['*', ['*', '+', '?', '@']],
    ['+', ['+', '@', '?', '*']],
]);
// Extglobs that can take over their parent if they are the only child
// the key is parent, value maps child to resulting extglob parent type
// '@' is omitted because it's a special case. An `@` extglob with a single
// member can always be usurped by that subpattern.
const usurpMap = new Map([
    ['!', new Map([['!', '@']])],
    [
        '?',
        new Map([
            ['*', '*'],
            ['+', '*'],
        ]),
    ],
    [
        '@',
        new Map([
            ['!', '!'],
            ['?', '?'],
            ['@', '@'],
            ['*', '*'],
            ['+', '+'],
        ]),
    ],
    [
        '+',
        new Map([
            ['?', '*'],
            ['*', '*'],
        ]),
    ],
]);
// Patterns that get prepended to bind to the start of either the
// entire string, or just a single path portion, to prevent dots
// and/or traversal patterns, when needed.
// Exts don't need the ^ or / bit, because the root binds that already.
const startNoTraversal = '(?!(?:^|/)\\.\\.?(?:$|/))';
const startNoDot = '(?!\\.)';
// characters that indicate a start of pattern needs the "no dots" bit,
// because a dot *might* be matched. ( is not in the list, because in
// the case of a child extglob, it will handle the prevention itself.
const addPatternStart = new Set(['[', '.']);
// cases where traversal is A-OK, no dot prevention needed
const justDots = new Set(['..', '.']);
const reSpecials = new Set('().*{}+?[]^$\\!');
const regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
// any single thing other than /
const qmark = '[^/]';
// * => any number of characters
const star = qmark + '*?';
// use + when we need to ensure that *something* matches, because the * is
// the only thing in the path portion.
const starNoEmpty = qmark + '+?';
// remove the \ chars that we added if we end up doing a nonmagic compare
// const deslash = (s: string) => s.replace(/\\(.)/g, '$1')
let ID = 0;
class AST {
    type;
    #root;
    #hasMagic;
    #uflag = false;
    #parts = [];
    #parent;
    #parentIndex;
    #negs;
    #filledNegs = false;
    #options;
    #toString;
    // set to true if it's an extglob with no children
    // (which really means one child of '')
    #emptyExt = false;
    id = ++ID;
    get depth() {
        return (this.#parent?.depth ?? -1) + 1;
    }
    [Symbol.for('nodejs.util.inspect.custom')]() {
        return {
            '@@type': 'AST',
            id: this.id,
            type: this.type,
            root: this.#root.id,
            parent: this.#parent?.id,
            depth: this.depth,
            partsLength: this.#parts.length,
            parts: this.#parts,
        };
    }
    constructor(type, parent, options = {}) {
        this.type = type;
        // extglobs are inherently magical
        if (type)
            this.#hasMagic = true;
        this.#parent = parent;
        this.#root = this.#parent ? this.#parent.#root : this;
        this.#options = this.#root === this ? options : this.#root.#options;
        this.#negs = this.#root === this ? [] : this.#root.#negs;
        if (type === '!' && !this.#root.#filledNegs)
            this.#negs.push(this);
        this.#parentIndex = this.#parent ? this.#parent.#parts.length : 0;
    }
    get hasMagic() {
        /* c8 ignore start */
        if (this.#hasMagic !== undefined)
            return this.#hasMagic;
        /* c8 ignore stop */
        for (const p of this.#parts) {
            if (typeof p === 'string')
                continue;
            if (p.type || p.hasMagic)
                return (this.#hasMagic = true);
        }
        // note: will be undefined until we generate the regexp src and find out
        return this.#hasMagic;
    }
    // reconstructs the pattern
    toString() {
        return (this.#toString !== undefined ? this.#toString
            : !this.type ?
                (this.#toString = this.#parts.map(p => String(p)).join(''))
                : (this.#toString =
                    this.type +
                        '(' +
                        this.#parts.map(p => String(p)).join('|') +
                        ')'));
    }
    #fillNegs() {
        /* c8 ignore start */
        if (this !== this.#root)
            throw new Error('should only call on root');
        if (this.#filledNegs)
            return this;
        /* c8 ignore stop */
        // call toString() once to fill this out
        this.toString();
        this.#filledNegs = true;
        let n;
        while ((n = this.#negs.pop())) {
            if (n.type !== '!')
                continue;
            // walk up the tree, appending everthing that comes AFTER parentIndex
            let p = n;
            let pp = p.#parent;
            while (pp) {
                for (let i = p.#parentIndex + 1; !pp.type && i < pp.#parts.length; i++) {
                    for (const part of n.#parts) {
                        /* c8 ignore start */
                        if (typeof part === 'string') {
                            throw new Error('string part in extglob AST??');
                        }
                        /* c8 ignore stop */
                        part.copyIn(pp.#parts[i]);
                    }
                }
                p = pp;
                pp = p.#parent;
            }
        }
        return this;
    }
    push(...parts) {
        for (const p of parts) {
            if (p === '')
                continue;
            /* c8 ignore start */
            if (typeof p !== 'string' &&
                !(p instanceof _a && p.#parent === this)) {
                throw new Error('invalid part: ' + p);
            }
            /* c8 ignore stop */
            this.#parts.push(p);
        }
    }
    toJSON() {
        const ret = this.type === null ?
            this.#parts
                .slice()
                .map(p => (typeof p === 'string' ? p : p.toJSON()))
            : [this.type, ...this.#parts.map(p => p.toJSON())];
        if (this.isStart() && !this.type)
            ret.unshift([]);
        if (this.isEnd() &&
            (this === this.#root ||
                (this.#root.#filledNegs && this.#parent?.type === '!'))) {
            ret.push({});
        }
        return ret;
    }
    isStart() {
        if (this.#root === this)
            return true;
        // if (this.type) return !!this.#parent?.isStart()
        if (!this.#parent?.isStart())
            return false;
        if (this.#parentIndex === 0)
            return true;
        // if everything AHEAD of this is a negation, then it's still the "start"
        const p = this.#parent;
        for (let i = 0; i < this.#parentIndex; i++) {
            const pp = p.#parts[i];
            if (!(pp instanceof _a && pp.type === '!')) {
                return false;
            }
        }
        return true;
    }
    isEnd() {
        if (this.#root === this)
            return true;
        if (this.#parent?.type === '!')
            return true;
        if (!this.#parent?.isEnd())
            return false;
        if (!this.type)
            return this.#parent?.isEnd();
        // if not root, it'll always have a parent
        /* c8 ignore start */
        const pl = this.#parent ? this.#parent.#parts.length : 0;
        /* c8 ignore stop */
        return this.#parentIndex === pl - 1;
    }
    copyIn(part) {
        if (typeof part === 'string')
            this.push(part);
        else
            this.push(part.clone(this));
    }
    clone(parent) {
        const c = new _a(this.type, parent);
        for (const p of this.#parts) {
            c.copyIn(p);
        }
        return c;
    }
    static #parseAST(str, ast, pos, opt, extDepth) {
        const maxDepth = opt.maxExtglobRecursion ?? 2;
        let escaping = false;
        let inBrace = false;
        let braceStart = -1;
        let braceNeg = false;
        if (ast.type === null) {
            // outside of a extglob, append until we find a start
            let i = pos;
            let acc = '';
            while (i < str.length) {
                const c = str.charAt(i++);
                // still accumulate escapes at this point, but we do ignore
                // starts that are escaped
                if (escaping || c === '\\') {
                    escaping = !escaping;
                    acc += c;
                    continue;
                }
                if (inBrace) {
                    if (i === braceStart + 1) {
                        if (c === '^' || c === '!') {
                            braceNeg = true;
                        }
                    }
                    else if (c === ']' && !(i === braceStart + 2 && braceNeg)) {
                        inBrace = false;
                    }
                    acc += c;
                    continue;
                }
                else if (c === '[') {
                    inBrace = true;
                    braceStart = i;
                    braceNeg = false;
                    acc += c;
                    continue;
                }
                // we don't have to check for adoption here, because that's
                // done at the other recursion point.
                const doRecurse = !opt.noext &&
                    isExtglobType(c) &&
                    str.charAt(i) === '(' &&
                    extDepth <= maxDepth;
                if (doRecurse) {
                    ast.push(acc);
                    acc = '';
                    const ext = new _a(c, ast);
                    i = _a.#parseAST(str, ext, i, opt, extDepth + 1);
                    ast.push(ext);
                    continue;
                }
                acc += c;
            }
            ast.push(acc);
            return i;
        }
        // some kind of extglob, pos is at the (
        // find the next | or )
        let i = pos + 1;
        let part = new _a(null, ast);
        const parts = [];
        let acc = '';
        while (i < str.length) {
            const c = str.charAt(i++);
            // still accumulate escapes at this point, but we do ignore
            // starts that are escaped
            if (escaping || c === '\\') {
                escaping = !escaping;
                acc += c;
                continue;
            }
            if (inBrace) {
                if (i === braceStart + 1) {
                    if (c === '^' || c === '!') {
                        braceNeg = true;
                    }
                }
                else if (c === ']' && !(i === braceStart + 2 && braceNeg)) {
                    inBrace = false;
                }
                acc += c;
                continue;
            }
            else if (c === '[') {
                inBrace = true;
                braceStart = i;
                braceNeg = false;
                acc += c;
                continue;
            }
            const doRecurse = !opt.noext &&
                isExtglobType(c) &&
                str.charAt(i) === '(' &&
                /* c8 ignore start - the maxDepth is sufficient here */
                (extDepth <= maxDepth || (ast && ast.#canAdoptType(c)));
            /* c8 ignore stop */
            if (doRecurse) {
                const depthAdd = ast && ast.#canAdoptType(c) ? 0 : 1;
                part.push(acc);
                acc = '';
                const ext = new _a(c, part);
                part.push(ext);
                i = _a.#parseAST(str, ext, i, opt, extDepth + depthAdd);
                continue;
            }
            if (c === '|') {
                part.push(acc);
                acc = '';
                parts.push(part);
                part = new _a(null, ast);
                continue;
            }
            if (c === ')') {
                if (acc === '' && ast.#parts.length === 0) {
                    ast.#emptyExt = true;
                }
                part.push(acc);
                acc = '';
                ast.push(...parts, part);
                return i;
            }
            acc += c;
        }
        // unfinished extglob
        // if we got here, it was a malformed extglob! not an extglob, but
        // maybe something else in there.
        ast.type = null;
        ast.#hasMagic = undefined;
        ast.#parts = [str.substring(pos - 1)];
        return i;
    }
    #canAdoptWithSpace(child) {
        return this.#canAdopt(child, adoptionWithSpaceMap);
    }
    #canAdopt(child, map = adoptionMap) {
        if (!child ||
            typeof child !== 'object' ||
            child.type !== null ||
            child.#parts.length !== 1 ||
            this.type === null) {
            return false;
        }
        const gc = child.#parts[0];
        if (!gc || typeof gc !== 'object' || gc.type === null) {
            return false;
        }
        return this.#canAdoptType(gc.type, map);
    }
    #canAdoptType(c, map = adoptionAnyMap) {
        return !!map.get(this.type)?.includes(c);
    }
    #adoptWithSpace(child, index) {
        const gc = child.#parts[0];
        const blank = new _a(null, gc, this.options);
        blank.#parts.push('');
        gc.push(blank);
        this.#adopt(child, index);
    }
    #adopt(child, index) {
        const gc = child.#parts[0];
        this.#parts.splice(index, 1, ...gc.#parts);
        for (const p of gc.#parts) {
            if (typeof p === 'object')
                p.#parent = this;
        }
        this.#toString = undefined;
    }
    #canUsurpType(c) {
        const m = usurpMap.get(this.type);
        return !!m?.has(c);
    }
    #canUsurp(child) {
        if (!child ||
            typeof child !== 'object' ||
            child.type !== null ||
            child.#parts.length !== 1 ||
            this.type === null ||
            this.#parts.length !== 1) {
            return false;
        }
        const gc = child.#parts[0];
        if (!gc || typeof gc !== 'object' || gc.type === null) {
            return false;
        }
        return this.#canUsurpType(gc.type);
    }
    #usurp(child) {
        const m = usurpMap.get(this.type);
        const gc = child.#parts[0];
        const nt = m?.get(gc.type);
        /* c8 ignore start - impossible */
        if (!nt)
            return false;
        /* c8 ignore stop */
        this.#parts = gc.#parts;
        for (const p of this.#parts) {
            if (typeof p === 'object') {
                p.#parent = this;
            }
        }
        this.type = nt;
        this.#toString = undefined;
        this.#emptyExt = false;
    }
    static fromGlob(pattern, options = {}) {
        const ast = new _a(null, undefined, options);
        _a.#parseAST(pattern, ast, 0, options, 0);
        return ast;
    }
    // returns the regular expression if there's magic, or the unescaped
    // string if not.
    toMMPattern() {
        // should only be called on root
        /* c8 ignore start */
        if (this !== this.#root)
            return this.#root.toMMPattern();
        /* c8 ignore stop */
        const glob = this.toString();
        const [re, body, hasMagic, uflag] = this.toRegExpSource();
        // if we're in nocase mode, and not nocaseMagicOnly, then we do
        // still need a regular expression if we have to case-insensitively
        // match capital/lowercase characters.
        const anyMagic = hasMagic ||
            this.#hasMagic ||
            (this.#options.nocase &&
                !this.#options.nocaseMagicOnly &&
                glob.toUpperCase() !== glob.toLowerCase());
        if (!anyMagic) {
            return body;
        }
        const flags = (this.#options.nocase ? 'i' : '') + (uflag ? 'u' : '');
        return Object.assign(new RegExp(`^${re}$`, flags), {
            _src: re,
            _glob: glob,
        });
    }
    get options() {
        return this.#options;
    }
    // returns the string match, the regexp source, whether there's magic
    // in the regexp (so a regular expression is required) and whether or
    // not the uflag is needed for the regular expression (for posix classes)
    // TODO: instead of injecting the start/end at this point, just return
    // the BODY of the regexp, along with the start/end portions suitable
    // for binding the start/end in either a joined full-path makeRe context
    // (where we bind to (^|/), or a standalone matchPart context (where
    // we bind to ^, and not /).  Otherwise slashes get duped!
    //
    // In part-matching mode, the start is:
    // - if not isStart: nothing
    // - if traversal possible, but not allowed: ^(?!\.\.?$)
    // - if dots allowed or not possible: ^
    // - if dots possible and not allowed: ^(?!\.)
    // end is:
    // - if not isEnd(): nothing
    // - else: $
    //
    // In full-path matching mode, we put the slash at the START of the
    // pattern, so start is:
    // - if first pattern: same as part-matching mode
    // - if not isStart(): nothing
    // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
    // - if dots allowed or not possible: /
    // - if dots possible and not allowed: /(?!\.)
    // end is:
    // - if last pattern, same as part-matching mode
    // - else nothing
    //
    // Always put the (?:$|/) on negated tails, though, because that has to be
    // there to bind the end of the negated pattern portion, and it's easier to
    // just stick it in now rather than try to inject it later in the middle of
    // the pattern.
    //
    // We can just always return the same end, and leave it up to the caller
    // to know whether it's going to be used joined or in parts.
    // And, if the start is adjusted slightly, can do the same there:
    // - if not isStart: nothing
    // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
    // - if dots allowed or not possible: (?:/|^)
    // - if dots possible and not allowed: (?:/|^)(?!\.)
    //
    // But it's better to have a simpler binding without a conditional, for
    // performance, so probably better to return both start options.
    //
    // Then the caller just ignores the end if it's not the first pattern,
    // and the start always gets applied.
    //
    // But that's always going to be $ if it's the ending pattern, or nothing,
    // so the caller can just attach $ at the end of the pattern when building.
    //
    // So the todo is:
    // - better detect what kind of start is needed
    // - return both flavors of starting pattern
    // - attach $ at the end of the pattern when creating the actual RegExp
    //
    // Ah, but wait, no, that all only applies to the root when the first pattern
    // is not an extglob. If the first pattern IS an extglob, then we need all
    // that dot prevention biz to live in the extglob portions, because eg
    // +(*|.x*) can match .xy but not .yx.
    //
    // So, return the two flavors if it's #root and the first child is not an
    // AST, otherwise leave it to the child AST to handle it, and there,
    // use the (?:^|/) style of start binding.
    //
    // Even simplified further:
    // - Since the start for a join is eg /(?!\.) and the start for a part
    // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
    // or start or whatever) and prepend ^ or / at the Regexp construction.
    toRegExpSource(allowDot) {
        const dot = allowDot ?? !!this.#options.dot;
        if (this.#root === this) {
            this.#flatten();
            this.#fillNegs();
        }
        if (!isExtglobAST(this)) {
            const noEmpty = this.isStart() &&
                this.isEnd() &&
                !this.#parts.some(s => typeof s !== 'string');
            const src = this.#parts
                .map(p => {
                const [re, _, hasMagic, uflag] = typeof p === 'string' ?
                    _a.#parseGlob(p, this.#hasMagic, noEmpty)
                    : p.toRegExpSource(allowDot);
                this.#hasMagic = this.#hasMagic || hasMagic;
                this.#uflag = this.#uflag || uflag;
                return re;
            })
                .join('');
            let start = '';
            if (this.isStart()) {
                if (typeof this.#parts[0] === 'string') {
                    // this is the string that will match the start of the pattern,
                    // so we need to protect against dots and such.
                    // '.' and '..' cannot match unless the pattern is that exactly,
                    // even if it starts with . or dot:true is set.
                    const dotTravAllowed = this.#parts.length === 1 && justDots.has(this.#parts[0]);
                    if (!dotTravAllowed) {
                        const aps = addPatternStart;
                        // check if we have a possibility of matching . or ..,
                        // and prevent that.
                        const needNoTrav = 
                        // dots are allowed, and the pattern starts with [ or .
                        (dot && aps.has(src.charAt(0))) ||
                            // the pattern starts with \., and then [ or .
                            (src.startsWith('\\.') && aps.has(src.charAt(2))) ||
                            // the pattern starts with \.\., and then [ or .
                            (src.startsWith('\\.\\.') && aps.has(src.charAt(4)));
                        // no need to prevent dots if it can't match a dot, or if a
                        // sub-pattern will be preventing it anyway.
                        const needNoDot = !dot && !allowDot && aps.has(src.charAt(0));
                        start =
                            needNoTrav ? startNoTraversal
                                : needNoDot ? startNoDot
                                    : '';
                    }
                }
            }
            // append the "end of path portion" pattern to negation tails
            let end = '';
            if (this.isEnd() &&
                this.#root.#filledNegs &&
                this.#parent?.type === '!') {
                end = '(?:$|\\/)';
            }
            const final = start + src + end;
            return [
                final,
                (0, unescape_js_1.unescape)(src),
                (this.#hasMagic = !!this.#hasMagic),
                this.#uflag,
            ];
        }
        // We need to calculate the body *twice* if it's a repeat pattern
        // at the start, once in nodot mode, then again in dot mode, so a
        // pattern like *(?) can match 'x.y'
        const repeated = this.type === '*' || this.type === '+';
        // some kind of extglob
        const start = this.type === '!' ? '(?:(?!(?:' : '(?:';
        let body = this.#partsToRegExp(dot);
        if (this.isStart() && this.isEnd() && !body && this.type !== '!') {
            // invalid extglob, has to at least be *something* present, if it's
            // the entire path portion.
            const s = this.toString();
            const me = this;
            me.#parts = [s];
            me.type = null;
            me.#hasMagic = undefined;
            return [s, (0, unescape_js_1.unescape)(this.toString()), false, false];
        }
        let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot ?
            ''
            : this.#partsToRegExp(true);
        if (bodyDotAllowed === body) {
            bodyDotAllowed = '';
        }
        if (bodyDotAllowed) {
            body = `(?:${body})(?:${bodyDotAllowed})*?`;
        }
        // an empty !() is exactly equivalent to a starNoEmpty
        let final = '';
        if (this.type === '!' && this.#emptyExt) {
            final = (this.isStart() && !dot ? startNoDot : '') + starNoEmpty;
        }
        else {
            const close = this.type === '!' ?
                // !() must match something,but !(x) can match ''
                '))' +
                    (this.isStart() && !dot && !allowDot ? startNoDot : '') +
                    star +
                    ')'
                : this.type === '@' ? ')'
                    : this.type === '?' ? ')?'
                        : this.type === '+' && bodyDotAllowed ? ')'
                            : this.type === '*' && bodyDotAllowed ? `)?`
                                : `)${this.type}`;
            final = start + body + close;
        }
        return [
            final,
            (0, unescape_js_1.unescape)(body),
            (this.#hasMagic = !!this.#hasMagic),
            this.#uflag,
        ];
    }
    #flatten() {
        if (!isExtglobAST(this)) {
            for (const p of this.#parts) {
                if (typeof p === 'object') {
                    p.#flatten();
                }
            }
        }
        else {
            // do up to 10 passes to flatten as much as possible
            let iterations = 0;
            let done = false;
            do {
                done = true;
                for (let i = 0; i < this.#parts.length; i++) {
                    const c = this.#parts[i];
                    if (typeof c === 'object') {
                        c.#flatten();
                        if (this.#canAdopt(c)) {
                            done = false;
                            this.#adopt(c, i);
                        }
                        else if (this.#canAdoptWithSpace(c)) {
                            done = false;
                            this.#adoptWithSpace(c, i);
                        }
                        else if (this.#canUsurp(c)) {
                            done = false;
                            this.#usurp(c);
                        }
                    }
                }
            } while (!done && ++iterations < 10);
        }
        this.#toString = undefined;
    }
    #partsToRegExp(dot) {
        return this.#parts
            .map(p => {
            // extglob ASTs should only contain parent ASTs
            /* c8 ignore start */
            if (typeof p === 'string') {
                throw new Error('string type in extglob ast??');
            }
            /* c8 ignore stop */
            // can ignore hasMagic, because extglobs are already always magic
            const [re, _, _hasMagic, uflag] = p.toRegExpSource(dot);
            this.#uflag = this.#uflag || uflag;
            return re;
        })
            .filter(p => !(this.isStart() && this.isEnd()) || !!p)
            .join('|');
    }
    static #parseGlob(glob, hasMagic, noEmpty = false) {
        let escaping = false;
        let re = '';
        let uflag = false;
        // multiple stars that aren't globstars coalesce into one *
        let inStar = false;
        for (let i = 0; i < glob.length; i++) {
            const c = glob.charAt(i);
            if (escaping) {
                escaping = false;
                re += (reSpecials.has(c) ? '\\' : '') + c;
                continue;
            }
            if (c === '*') {
                if (inStar)
                    continue;
                inStar = true;
                re += noEmpty && /^[*]+$/.test(glob) ? starNoEmpty : star;
                hasMagic = true;
                continue;
            }
            else {
                inStar = false;
            }
            if (c === '\\') {
                if (i === glob.length - 1) {
                    re += '\\\\';
                }
                else {
                    escaping = true;
                }
                continue;
            }
            if (c === '[') {
                const [src, needUflag, consumed, magic] = (0, brace_expressions_js_1.parseClass)(glob, i);
                if (consumed) {
                    re += src;
                    uflag = uflag || needUflag;
                    i += consumed - 1;
                    hasMagic = hasMagic || magic;
                    continue;
                }
            }
            if (c === '?') {
                re += qmark;
                hasMagic = true;
                continue;
            }
            re += regExpEscape(c);
        }
        return [re, (0, unescape_js_1.unescape)(glob), !!hasMagic, uflag];
    }
}
exports.AST = AST;
_a = AST;
//# sourceMappingURL=ast.js.map

/***/ }),

/***/ 90:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

// translate the various posix character classes into unicode properties
// this works across all unicode locales
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseClass = void 0;
// { <posix class>: [<translation>, /u flag required, negated]
const posixClasses = {
    '[:alnum:]': ['\\p{L}\\p{Nl}\\p{Nd}', true],
    '[:alpha:]': ['\\p{L}\\p{Nl}', true],
    '[:ascii:]': ['\\x' + '00-\\x' + '7f', false],
    '[:blank:]': ['\\p{Zs}\\t', true],
    '[:cntrl:]': ['\\p{Cc}', true],
    '[:digit:]': ['\\p{Nd}', true],
    '[:graph:]': ['\\p{Z}\\p{C}', true, true],
    '[:lower:]': ['\\p{Ll}', true],
    '[:print:]': ['\\p{C}', true],
    '[:punct:]': ['\\p{P}', true],
    '[:space:]': ['\\p{Z}\\t\\r\\n\\v\\f', true],
    '[:upper:]': ['\\p{Lu}', true],
    '[:word:]': ['\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}', true],
    '[:xdigit:]': ['A-Fa-f0-9', false],
};
// only need to escape a few things inside of brace expressions
// escapes: [ \ ] -
const braceEscape = (s) => s.replace(/[[\]\\-]/g, '\\$&');
// escape all regexp magic characters
const regexpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
// everything has already been escaped, we just have to join
const rangesToString = (ranges) => ranges.join('');
// takes a glob string at a posix brace expression, and returns
// an equivalent regular expression source, and boolean indicating
// whether the /u flag needs to be applied, and the number of chars
// consumed to parse the character class.
// This also removes out of order ranges, and returns ($.) if the
// entire class just no good.
const parseClass = (glob, position) => {
    const pos = position;
    /* c8 ignore start */
    if (glob.charAt(pos) !== '[') {
        throw new Error('not in a brace expression');
    }
    /* c8 ignore stop */
    const ranges = [];
    const negs = [];
    let i = pos + 1;
    let sawStart = false;
    let uflag = false;
    let escaping = false;
    let negate = false;
    let endPos = pos;
    let rangeStart = '';
    WHILE: while (i < glob.length) {
        const c = glob.charAt(i);
        if ((c === '!' || c === '^') && i === pos + 1) {
            negate = true;
            i++;
            continue;
        }
        if (c === ']' && sawStart && !escaping) {
            endPos = i + 1;
            break;
        }
        sawStart = true;
        if (c === '\\') {
            if (!escaping) {
                escaping = true;
                i++;
                continue;
            }
            // escaped \ char, fall through and treat like normal char
        }
        if (c === '[' && !escaping) {
            // either a posix class, a collation equivalent, or just a [
            for (const [cls, [unip, u, neg]] of Object.entries(posixClasses)) {
                if (glob.startsWith(cls, i)) {
                    // invalid, [a-[] is fine, but not [a-[:alpha]]
                    if (rangeStart) {
                        return ['$.', false, glob.length - pos, true];
                    }
                    i += cls.length;
                    if (neg)
                        negs.push(unip);
                    else
                        ranges.push(unip);
                    uflag = uflag || u;
                    continue WHILE;
                }
            }
        }
        // now it's just a normal character, effectively
        escaping = false;
        if (rangeStart) {
            // throw this range away if it's not valid, but others
            // can still match.
            if (c > rangeStart) {
                ranges.push(braceEscape(rangeStart) + '-' + braceEscape(c));
            }
            else if (c === rangeStart) {
                ranges.push(braceEscape(c));
            }
            rangeStart = '';
            i++;
            continue;
        }
        // now might be the start of a range.
        // can be either c-d or c-] or c<more...>] or c] at this point
        if (glob.startsWith('-]', i + 1)) {
            ranges.push(braceEscape(c + '-'));
            i += 2;
            continue;
        }
        if (glob.startsWith('-', i + 1)) {
            rangeStart = c;
            i += 2;
            continue;
        }
        // not the start of a range, just a single character
        ranges.push(braceEscape(c));
        i++;
    }
    if (endPos < i) {
        // didn't see the end of the class, not a valid class,
        // but might still be valid as a literal match.
        return ['', false, 0, false];
    }
    // if we got no ranges and no negates, then we have a range that
    // cannot possibly match anything, and that poisons the whole glob
    if (!ranges.length && !negs.length) {
        return ['$.', false, glob.length - pos, true];
    }
    // if we got one positive range, and it's a single character, then that's
    // not actually a magic pattern, it's just that one literal character.
    // we should not treat that as "magic", we should just return the literal
    // character. [_] is a perfectly valid way to escape glob magic chars.
    if (negs.length === 0 &&
        ranges.length === 1 &&
        /^\\?.$/.test(ranges[0]) &&
        !negate) {
        const r = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
        return [regexpEscape(r), false, endPos - pos, false];
    }
    const sranges = '[' + (negate ? '^' : '') + rangesToString(ranges) + ']';
    const snegs = '[' + (negate ? '' : '^') + rangesToString(negs) + ']';
    const comb = ranges.length && negs.length ? '(' + sranges + '|' + snegs + ')'
        : ranges.length ? sranges
            : snegs;
    return [comb, uflag, endPos - pos, true];
};
exports.parseClass = parseClass;
//# sourceMappingURL=brace-expressions.js.map

/***/ }),

/***/ 800:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.escape = void 0;
/**
 * Escape all magic characters in a glob pattern.
 *
 * If the {@link MinimatchOptions.windowsPathsNoEscape}
 * option is used, then characters are escaped by wrapping in `[]`, because
 * a magic character wrapped in a character class can only be satisfied by
 * that exact character.  In this mode, `\` is _not_ escaped, because it is
 * not interpreted as a magic character, but instead as a path separator.
 *
 * If the {@link MinimatchOptions.magicalBraces} option is used,
 * then braces (`{` and `}`) will be escaped.
 */
const escape = (s, { windowsPathsNoEscape = false, magicalBraces = false, } = {}) => {
    // don't need to escape +@! because we escape the parens
    // that make those magic, and escaping ! as [!] isn't valid,
    // because [!]] is a valid glob class meaning not ']'.
    if (magicalBraces) {
        return windowsPathsNoEscape ?
            s.replace(/[?*()[\]{}]/g, '[$&]')
            : s.replace(/[?*()[\]\\{}]/g, '\\$&');
    }
    return windowsPathsNoEscape ?
        s.replace(/[?*()[\]]/g, '[$&]')
        : s.replace(/[?*()[\]\\]/g, '\\$&');
};
exports.escape = escape;
//# sourceMappingURL=escape.js.map

/***/ }),

/***/ 507:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.unescape = exports.escape = exports.AST = exports.Minimatch = exports.match = exports.makeRe = exports.braceExpand = exports.defaults = exports.filter = exports.GLOBSTAR = exports.sep = exports.minimatch = void 0;
const brace_expansion_1 = __nccwpck_require__(968);
const assert_valid_pattern_js_1 = __nccwpck_require__(305);
const ast_js_1 = __nccwpck_require__(803);
const escape_js_1 = __nccwpck_require__(800);
const unescape_js_1 = __nccwpck_require__(851);
const minimatch = (p, pattern, options = {}) => {
    (0, assert_valid_pattern_js_1.assertValidPattern)(pattern);
    // shortcut: comments match nothing.
    if (!options.nocomment && pattern.charAt(0) === '#') {
        return false;
    }
    return new Minimatch(pattern, options).match(p);
};
exports.minimatch = minimatch;
// Optimized checking for the most common glob patterns.
const starDotExtRE = /^\*+([^+@!?*[(]*)$/;
const starDotExtTest = (ext) => (f) => !f.startsWith('.') && f.endsWith(ext);
const starDotExtTestDot = (ext) => (f) => f.endsWith(ext);
const starDotExtTestNocase = (ext) => {
    ext = ext.toLowerCase();
    return (f) => !f.startsWith('.') && f.toLowerCase().endsWith(ext);
};
const starDotExtTestNocaseDot = (ext) => {
    ext = ext.toLowerCase();
    return (f) => f.toLowerCase().endsWith(ext);
};
const starDotStarRE = /^\*+\.\*+$/;
const starDotStarTest = (f) => !f.startsWith('.') && f.includes('.');
const starDotStarTestDot = (f) => f !== '.' && f !== '..' && f.includes('.');
const dotStarRE = /^\.\*+$/;
const dotStarTest = (f) => f !== '.' && f !== '..' && f.startsWith('.');
const starRE = /^\*+$/;
const starTest = (f) => f.length !== 0 && !f.startsWith('.');
const starTestDot = (f) => f.length !== 0 && f !== '.' && f !== '..';
const qmarksRE = /^\?+([^+@!?*[(]*)?$/;
const qmarksTestNocase = ([$0, ext = '']) => {
    const noext = qmarksTestNoExt([$0]);
    if (!ext)
        return noext;
    ext = ext.toLowerCase();
    return (f) => noext(f) && f.toLowerCase().endsWith(ext);
};
const qmarksTestNocaseDot = ([$0, ext = '']) => {
    const noext = qmarksTestNoExtDot([$0]);
    if (!ext)
        return noext;
    ext = ext.toLowerCase();
    return (f) => noext(f) && f.toLowerCase().endsWith(ext);
};
const qmarksTestDot = ([$0, ext = '']) => {
    const noext = qmarksTestNoExtDot([$0]);
    return !ext ? noext : (f) => noext(f) && f.endsWith(ext);
};
const qmarksTest = ([$0, ext = '']) => {
    const noext = qmarksTestNoExt([$0]);
    return !ext ? noext : (f) => noext(f) && f.endsWith(ext);
};
const qmarksTestNoExt = ([$0]) => {
    const len = $0.length;
    return (f) => f.length === len && !f.startsWith('.');
};
const qmarksTestNoExtDot = ([$0]) => {
    const len = $0.length;
    return (f) => f.length === len && f !== '.' && f !== '..';
};
/* c8 ignore start */
const defaultPlatform = (typeof process === 'object' && process ?
    (typeof process.env === 'object' &&
        process.env &&
        process.env.__MINIMATCH_TESTING_PLATFORM__) ||
        process.platform
    : 'posix');
const path = {
    win32: { sep: '\\' },
    posix: { sep: '/' },
};
/* c8 ignore stop */
exports.sep = defaultPlatform === 'win32' ? path.win32.sep : path.posix.sep;
exports.minimatch.sep = exports.sep;
exports.GLOBSTAR = Symbol('globstar **');
exports.minimatch.GLOBSTAR = exports.GLOBSTAR;
// any single thing other than /
// don't need to escape / when using new RegExp()
const qmark = '[^/]';
// * => any number of characters
const star = qmark + '*?';
// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
const twoStarDot = '(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?';
// not a ^ or / followed by a dot,
// followed by anything, any number of times.
const twoStarNoDot = '(?:(?!(?:\\/|^)\\.).)*?';
const filter = (pattern, options = {}) => (p) => (0, exports.minimatch)(p, pattern, options);
exports.filter = filter;
exports.minimatch.filter = exports.filter;
const ext = (a, b = {}) => Object.assign({}, a, b);
const defaults = (def) => {
    if (!def || typeof def !== 'object' || !Object.keys(def).length) {
        return exports.minimatch;
    }
    const orig = exports.minimatch;
    const m = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
    return Object.assign(m, {
        Minimatch: class Minimatch extends orig.Minimatch {
            constructor(pattern, options = {}) {
                super(pattern, ext(def, options));
            }
            static defaults(options) {
                return orig.defaults(ext(def, options)).Minimatch;
            }
        },
        AST: class AST extends orig.AST {
            /* c8 ignore start */
            constructor(type, parent, options = {}) {
                super(type, parent, ext(def, options));
            }
            /* c8 ignore stop */
            static fromGlob(pattern, options = {}) {
                return orig.AST.fromGlob(pattern, ext(def, options));
            }
        },
        unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
        escape: (s, options = {}) => orig.escape(s, ext(def, options)),
        filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
        defaults: (options) => orig.defaults(ext(def, options)),
        makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
        braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
        match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
        sep: orig.sep,
        GLOBSTAR: exports.GLOBSTAR,
    });
};
exports.defaults = defaults;
exports.minimatch.defaults = exports.defaults;
// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
const braceExpand = (pattern, options = {}) => {
    (0, assert_valid_pattern_js_1.assertValidPattern)(pattern);
    // Thanks to Yeting Li <https://github.com/yetingli> for
    // improving this regexp to avoid a ReDOS vulnerability.
    if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
        // shortcut. no need to expand.
        return [pattern];
    }
    return (0, brace_expansion_1.expand)(pattern, { max: options.braceExpandMax });
};
exports.braceExpand = braceExpand;
exports.minimatch.braceExpand = exports.braceExpand;
// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
const makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
exports.makeRe = makeRe;
exports.minimatch.makeRe = exports.makeRe;
const match = (list, pattern, options = {}) => {
    const mm = new Minimatch(pattern, options);
    list = list.filter(f => mm.match(f));
    if (mm.options.nonull && !list.length) {
        list.push(pattern);
    }
    return list;
};
exports.match = match;
exports.minimatch.match = exports.match;
// replace stuff like \* with *
const globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
const regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
class Minimatch {
    options;
    set;
    pattern;
    windowsPathsNoEscape;
    nonegate;
    negate;
    comment;
    empty;
    preserveMultipleSlashes;
    partial;
    globSet;
    globParts;
    nocase;
    isWindows;
    platform;
    windowsNoMagicRoot;
    maxGlobstarRecursion;
    regexp;
    constructor(pattern, options = {}) {
        (0, assert_valid_pattern_js_1.assertValidPattern)(pattern);
        options = options || {};
        this.options = options;
        this.maxGlobstarRecursion = options.maxGlobstarRecursion ?? 200;
        this.pattern = pattern;
        this.platform = options.platform || defaultPlatform;
        this.isWindows = this.platform === 'win32';
        // avoid the annoying deprecation flag lol
        const awe = ('allowWindow' + 'sEscape');
        this.windowsPathsNoEscape =
            !!options.windowsPathsNoEscape || options[awe] === false;
        if (this.windowsPathsNoEscape) {
            this.pattern = this.pattern.replace(/\\/g, '/');
        }
        this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
        this.regexp = null;
        this.negate = false;
        this.nonegate = !!options.nonegate;
        this.comment = false;
        this.empty = false;
        this.partial = !!options.partial;
        this.nocase = !!this.options.nocase;
        this.windowsNoMagicRoot =
            options.windowsNoMagicRoot !== undefined ?
                options.windowsNoMagicRoot
                : !!(this.isWindows && this.nocase);
        this.globSet = [];
        this.globParts = [];
        this.set = [];
        // make the set of regexps etc.
        this.make();
    }
    hasMagic() {
        if (this.options.magicalBraces && this.set.length > 1) {
            return true;
        }
        for (const pattern of this.set) {
            for (const part of pattern) {
                if (typeof part !== 'string')
                    return true;
            }
        }
        return false;
    }
    debug(..._) { }
    make() {
        const pattern = this.pattern;
        const options = this.options;
        // empty patterns and comments match nothing.
        if (!options.nocomment && pattern.charAt(0) === '#') {
            this.comment = true;
            return;
        }
        if (!pattern) {
            this.empty = true;
            return;
        }
        // step 1: figure out negation, etc.
        this.parseNegate();
        // step 2: expand braces
        this.globSet = [...new Set(this.braceExpand())];
        if (options.debug) {
            //oxlint-disable-next-line no-console
            this.debug = (...args) => console.error(...args);
        }
        this.debug(this.pattern, this.globSet);
        // step 3: now we have a set, so turn each one into a series of
        // path-portion matching patterns.
        // These will be regexps, except in the case of "**", which is
        // set to the GLOBSTAR object for globstar behavior,
        // and will not contain any / characters
        //
        // First, we preprocess to make the glob pattern sets a bit simpler
        // and deduped.  There are some perf-killing patterns that can cause
        // problems with a glob walk, but we can simplify them down a bit.
        const rawGlobParts = this.globSet.map(s => this.slashSplit(s));
        this.globParts = this.preprocess(rawGlobParts);
        this.debug(this.pattern, this.globParts);
        // glob --> regexps
        let set = this.globParts.map((s, _, __) => {
            if (this.isWindows && this.windowsNoMagicRoot) {
                // check if it's a drive or unc path.
                const isUNC = s[0] === '' &&
                    s[1] === '' &&
                    (s[2] === '?' || !globMagic.test(s[2])) &&
                    !globMagic.test(s[3]);
                const isDrive = /^[a-z]:/i.test(s[0]);
                if (isUNC) {
                    return [
                        ...s.slice(0, 4),
                        ...s.slice(4).map(ss => this.parse(ss)),
                    ];
                }
                else if (isDrive) {
                    return [s[0], ...s.slice(1).map(ss => this.parse(ss))];
                }
            }
            return s.map(ss => this.parse(ss));
        });
        this.debug(this.pattern, set);
        // filter out everything that didn't compile properly.
        this.set = set.filter(s => s.indexOf(false) === -1);
        // do not treat the ? in UNC paths as magic
        if (this.isWindows) {
            for (let i = 0; i < this.set.length; i++) {
                const p = this.set[i];
                if (p[0] === '' &&
                    p[1] === '' &&
                    this.globParts[i][2] === '?' &&
                    typeof p[3] === 'string' &&
                    /^[a-z]:$/i.test(p[3])) {
                    p[2] = '?';
                }
            }
        }
        this.debug(this.pattern, this.set);
    }
    // various transforms to equivalent pattern sets that are
    // faster to process in a filesystem walk.  The goal is to
    // eliminate what we can, and push all ** patterns as far
    // to the right as possible, even if it increases the number
    // of patterns that we have to process.
    preprocess(globParts) {
        // if we're not in globstar mode, then turn ** into *
        if (this.options.noglobstar) {
            for (const partset of globParts) {
                for (let j = 0; j < partset.length; j++) {
                    if (partset[j] === '**') {
                        partset[j] = '*';
                    }
                }
            }
        }
        const { optimizationLevel = 1 } = this.options;
        if (optimizationLevel >= 2) {
            // aggressive optimization for the purpose of fs walking
            globParts = this.firstPhasePreProcess(globParts);
            globParts = this.secondPhasePreProcess(globParts);
        }
        else if (optimizationLevel >= 1) {
            // just basic optimizations to remove some .. parts
            globParts = this.levelOneOptimize(globParts);
        }
        else {
            // just collapse multiple ** portions into one
            globParts = this.adjascentGlobstarOptimize(globParts);
        }
        return globParts;
    }
    // just get rid of adjascent ** portions
    adjascentGlobstarOptimize(globParts) {
        return globParts.map(parts => {
            let gs = -1;
            while (-1 !== (gs = parts.indexOf('**', gs + 1))) {
                let i = gs;
                while (parts[i + 1] === '**') {
                    i++;
                }
                if (i !== gs) {
                    parts.splice(gs, i - gs);
                }
            }
            return parts;
        });
    }
    // get rid of adjascent ** and resolve .. portions
    levelOneOptimize(globParts) {
        return globParts.map(parts => {
            parts = parts.reduce((set, part) => {
                const prev = set[set.length - 1];
                if (part === '**' && prev === '**') {
                    return set;
                }
                if (part === '..') {
                    if (prev && prev !== '..' && prev !== '.' && prev !== '**') {
                        set.pop();
                        return set;
                    }
                }
                set.push(part);
                return set;
            }, []);
            return parts.length === 0 ? [''] : parts;
        });
    }
    levelTwoFileOptimize(parts) {
        if (!Array.isArray(parts)) {
            parts = this.slashSplit(parts);
        }
        let didSomething = false;
        do {
            didSomething = false;
            // <pre>/<e>/<rest> -> <pre>/<rest>
            if (!this.preserveMultipleSlashes) {
                for (let i = 1; i < parts.length - 1; i++) {
                    const p = parts[i];
                    // don't squeeze out UNC patterns
                    if (i === 1 && p === '' && parts[0] === '')
                        continue;
                    if (p === '.' || p === '') {
                        didSomething = true;
                        parts.splice(i, 1);
                        i--;
                    }
                }
                if (parts[0] === '.' &&
                    parts.length === 2 &&
                    (parts[1] === '.' || parts[1] === '')) {
                    didSomething = true;
                    parts.pop();
                }
            }
            // <pre>/<p>/../<rest> -> <pre>/<rest>
            let dd = 0;
            while (-1 !== (dd = parts.indexOf('..', dd + 1))) {
                const p = parts[dd - 1];
                if (p &&
                    p !== '.' &&
                    p !== '..' &&
                    p !== '**' &&
                    !(this.isWindows && /^[a-z]:$/i.test(p))) {
                    didSomething = true;
                    parts.splice(dd - 1, 2);
                    dd -= 2;
                }
            }
        } while (didSomething);
        return parts.length === 0 ? [''] : parts;
    }
    // First phase: single-pattern processing
    // <pre> is 1 or more portions
    // <rest> is 1 or more portions
    // <p> is any portion other than ., .., '', or **
    // <e> is . or ''
    //
    // **/.. is *brutal* for filesystem walking performance, because
    // it effectively resets the recursive walk each time it occurs,
    // and ** cannot be reduced out by a .. pattern part like a regexp
    // or most strings (other than .., ., and '') can be.
    //
    // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
    // <pre>/<e>/<rest> -> <pre>/<rest>
    // <pre>/<p>/../<rest> -> <pre>/<rest>
    // **/**/<rest> -> **/<rest>
    //
    // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
    // this WOULD be allowed if ** did follow symlinks, or * didn't
    firstPhasePreProcess(globParts) {
        let didSomething = false;
        do {
            didSomething = false;
            // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
            for (let parts of globParts) {
                let gs = -1;
                while (-1 !== (gs = parts.indexOf('**', gs + 1))) {
                    let gss = gs;
                    while (parts[gss + 1] === '**') {
                        // <pre>/**/**/<rest> -> <pre>/**/<rest>
                        gss++;
                    }
                    // eg, if gs is 2 and gss is 4, that means we have 3 **
                    // parts, and can remove 2 of them.
                    if (gss > gs) {
                        parts.splice(gs + 1, gss - gs);
                    }
                    let next = parts[gs + 1];
                    const p = parts[gs + 2];
                    const p2 = parts[gs + 3];
                    if (next !== '..')
                        continue;
                    if (!p ||
                        p === '.' ||
                        p === '..' ||
                        !p2 ||
                        p2 === '.' ||
                        p2 === '..') {
                        continue;
                    }
                    didSomething = true;
                    // edit parts in place, and push the new one
                    parts.splice(gs, 1);
                    const other = parts.slice(0);
                    other[gs] = '**';
                    globParts.push(other);
                    gs--;
                }
                // <pre>/<e>/<rest> -> <pre>/<rest>
                if (!this.preserveMultipleSlashes) {
                    for (let i = 1; i < parts.length - 1; i++) {
                        const p = parts[i];
                        // don't squeeze out UNC patterns
                        if (i === 1 && p === '' && parts[0] === '')
                            continue;
                        if (p === '.' || p === '') {
                            didSomething = true;
                            parts.splice(i, 1);
                            i--;
                        }
                    }
                    if (parts[0] === '.' &&
                        parts.length === 2 &&
                        (parts[1] === '.' || parts[1] === '')) {
                        didSomething = true;
                        parts.pop();
                    }
                }
                // <pre>/<p>/../<rest> -> <pre>/<rest>
                let dd = 0;
                while (-1 !== (dd = parts.indexOf('..', dd + 1))) {
                    const p = parts[dd - 1];
                    if (p && p !== '.' && p !== '..' && p !== '**') {
                        didSomething = true;
                        const needDot = dd === 1 && parts[dd + 1] === '**';
                        const splin = needDot ? ['.'] : [];
                        parts.splice(dd - 1, 2, ...splin);
                        if (parts.length === 0)
                            parts.push('');
                        dd -= 2;
                    }
                }
            }
        } while (didSomething);
        return globParts;
    }
    // second phase: multi-pattern dedupes
    // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
    // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
    // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
    //
    // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
    // ^-- not valid because ** doens't follow symlinks
    secondPhasePreProcess(globParts) {
        for (let i = 0; i < globParts.length - 1; i++) {
            for (let j = i + 1; j < globParts.length; j++) {
                const matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
                if (matched) {
                    globParts[i] = [];
                    globParts[j] = matched;
                    break;
                }
            }
        }
        return globParts.filter(gs => gs.length);
    }
    partsMatch(a, b, emptyGSMatch = false) {
        let ai = 0;
        let bi = 0;
        let result = [];
        let which = '';
        while (ai < a.length && bi < b.length) {
            if (a[ai] === b[bi]) {
                result.push(which === 'b' ? b[bi] : a[ai]);
                ai++;
                bi++;
            }
            else if (emptyGSMatch && a[ai] === '**' && b[bi] === a[ai + 1]) {
                result.push(a[ai]);
                ai++;
            }
            else if (emptyGSMatch && b[bi] === '**' && a[ai] === b[bi + 1]) {
                result.push(b[bi]);
                bi++;
            }
            else if (a[ai] === '*' &&
                b[bi] &&
                (this.options.dot || !b[bi].startsWith('.')) &&
                b[bi] !== '**') {
                if (which === 'b')
                    return false;
                which = 'a';
                result.push(a[ai]);
                ai++;
                bi++;
            }
            else if (b[bi] === '*' &&
                a[ai] &&
                (this.options.dot || !a[ai].startsWith('.')) &&
                a[ai] !== '**') {
                if (which === 'a')
                    return false;
                which = 'b';
                result.push(b[bi]);
                ai++;
                bi++;
            }
            else {
                return false;
            }
        }
        // if we fall out of the loop, it means they two are identical
        // as long as their lengths match
        return a.length === b.length && result;
    }
    parseNegate() {
        if (this.nonegate)
            return;
        const pattern = this.pattern;
        let negate = false;
        let negateOffset = 0;
        for (let i = 0; i < pattern.length && pattern.charAt(i) === '!'; i++) {
            negate = !negate;
            negateOffset++;
        }
        if (negateOffset)
            this.pattern = pattern.slice(negateOffset);
        this.negate = negate;
    }
    // set partial to true to test if, for example,
    // "/a/b" matches the start of "/*/b/*/d"
    // Partial means, if you run out of file before you run
    // out of pattern, then that's fine, as long as all
    // the parts match.
    matchOne(file, pattern, partial = false) {
        let fileStartIndex = 0;
        let patternStartIndex = 0;
        // UNC paths like //?/X:/... can match X:/... and vice versa
        // Drive letters in absolute drive or unc paths are always compared
        // case-insensitively.
        if (this.isWindows) {
            const fileDrive = typeof file[0] === 'string' && /^[a-z]:$/i.test(file[0]);
            const fileUNC = !fileDrive &&
                file[0] === '' &&
                file[1] === '' &&
                file[2] === '?' &&
                /^[a-z]:$/i.test(file[3]);
            const patternDrive = typeof pattern[0] === 'string' && /^[a-z]:$/i.test(pattern[0]);
            const patternUNC = !patternDrive &&
                pattern[0] === '' &&
                pattern[1] === '' &&
                pattern[2] === '?' &&
                typeof pattern[3] === 'string' &&
                /^[a-z]:$/i.test(pattern[3]);
            const fdi = fileUNC ? 3
                : fileDrive ? 0
                    : undefined;
            const pdi = patternUNC ? 3
                : patternDrive ? 0
                    : undefined;
            if (typeof fdi === 'number' && typeof pdi === 'number') {
                const [fd, pd] = [
                    file[fdi],
                    pattern[pdi],
                ];
                // start matching at the drive letter index of each
                if (fd.toLowerCase() === pd.toLowerCase()) {
                    pattern[pdi] = fd;
                    patternStartIndex = pdi;
                    fileStartIndex = fdi;
                }
            }
        }
        // resolve and reduce . and .. portions in the file as well.
        // don't need to do the second phase, because it's only one string[]
        const { optimizationLevel = 1 } = this.options;
        if (optimizationLevel >= 2) {
            file = this.levelTwoFileOptimize(file);
        }
        if (pattern.includes(exports.GLOBSTAR)) {
            return this.#matchGlobstar(file, pattern, partial, fileStartIndex, patternStartIndex);
        }
        return this.#matchOne(file, pattern, partial, fileStartIndex, patternStartIndex);
    }
    #matchGlobstar(file, pattern, partial, fileIndex, patternIndex) {
        // split the pattern into head, tail, and middle of ** delimited parts
        const firstgs = pattern.indexOf(exports.GLOBSTAR, patternIndex);
        const lastgs = pattern.lastIndexOf(exports.GLOBSTAR);
        // split the pattern up into globstar-delimited sections
        // the tail has to be at the end, and the others just have
        // to be found in order from the head.
        const [head, body, tail] = partial ?
            [
                pattern.slice(patternIndex, firstgs),
                pattern.slice(firstgs + 1),
                [],
            ]
            : [
                pattern.slice(patternIndex, firstgs),
                pattern.slice(firstgs + 1, lastgs),
                pattern.slice(lastgs + 1),
            ];
        // check the head, from the current file/pattern index.
        if (head.length) {
            const fileHead = file.slice(fileIndex, fileIndex + head.length);
            if (!this.#matchOne(fileHead, head, partial, 0, 0)) {
                return false;
            }
            fileIndex += head.length;
            patternIndex += head.length;
        }
        // now we know the head matches!
        // if the last portion is not empty, it MUST match the end
        // check the tail
        let fileTailMatch = 0;
        if (tail.length) {
            // if head + tail > file, then we cannot possibly match
            if (tail.length + fileIndex > file.length)
                return false;
            // try to match the tail
            let tailStart = file.length - tail.length;
            if (this.#matchOne(file, tail, partial, tailStart, 0)) {
                fileTailMatch = tail.length;
            }
            else {
                // affordance for stuff like a/**/* matching a/b/
                // if the last file portion is '', and there's more to the pattern
                // then try without the '' bit.
                if (file[file.length - 1] !== '' ||
                    fileIndex + tail.length === file.length) {
                    return false;
                }
                tailStart--;
                if (!this.#matchOne(file, tail, partial, tailStart, 0)) {
                    return false;
                }
                fileTailMatch = tail.length + 1;
            }
        }
        // now we know the tail matches!
        // the middle is zero or more portions wrapped in **, possibly
        // containing more ** sections.
        // so a/**/b/**/c/**/d has become **/b/**/c/**
        // if it's empty, it means a/**/b, just verify we have no bad dots
        // if there's no tail, so it ends on /**, then we must have *something*
        // after the head, or it's not a matc
        if (!body.length) {
            let sawSome = !!fileTailMatch;
            for (let i = fileIndex; i < file.length - fileTailMatch; i++) {
                const f = String(file[i]);
                sawSome = true;
                if (f === '.' ||
                    f === '..' ||
                    (!this.options.dot && f.startsWith('.'))) {
                    return false;
                }
            }
            // in partial mode, we just need to get past all file parts
            return partial || sawSome;
        }
        // now we know that there's one or more body sections, which can
        // be matched anywhere from the 0 index (because the head was pruned)
        // through to the length-fileTailMatch index.
        // split the body up into sections, and note the minimum index it can
        // be found at (start with the length of all previous segments)
        // [section, before, after]
        const bodySegments = [[[], 0]];
        let currentBody = bodySegments[0];
        let nonGsParts = 0;
        const nonGsPartsSums = [0];
        for (const b of body) {
            if (b === exports.GLOBSTAR) {
                nonGsPartsSums.push(nonGsParts);
                currentBody = [[], 0];
                bodySegments.push(currentBody);
            }
            else {
                currentBody[0].push(b);
                nonGsParts++;
            }
        }
        let i = bodySegments.length - 1;
        const fileLength = file.length - fileTailMatch;
        for (const b of bodySegments) {
            b[1] = fileLength - (nonGsPartsSums[i--] + b[0].length);
        }
        return !!this.#matchGlobStarBodySections(file, bodySegments, fileIndex, 0, partial, 0, !!fileTailMatch);
    }
    // return false for "nope, not matching"
    // return null for "not matching, cannot keep trying"
    #matchGlobStarBodySections(file, 
    // pattern section, last possible position for it
    bodySegments, fileIndex, bodyIndex, partial, globStarDepth, sawTail) {
        // take the first body segment, and walk from fileIndex to its "after"
        // value at the end
        // If it doesn't match at that position, we increment, until we hit
        // that final possible position, and give up.
        // If it does match, then advance and try to rest.
        // If any of them fail we keep walking forward.
        // this is still a bit recursively painful, but it's more constrained
        // than previous implementations, because we never test something that
        // can't possibly be a valid matching condition.
        const bs = bodySegments[bodyIndex];
        if (!bs) {
            // just make sure that there's no bad dots
            for (let i = fileIndex; i < file.length; i++) {
                sawTail = true;
                const f = file[i];
                if (f === '.' ||
                    f === '..' ||
                    (!this.options.dot && f.startsWith('.'))) {
                    return false;
                }
            }
            return sawTail;
        }
        // have a non-globstar body section to test
        const [body, after] = bs;
        while (fileIndex <= after) {
            const m = this.#matchOne(file.slice(0, fileIndex + body.length), body, partial, fileIndex, 0);
            // if limit exceeded, no match. intentional false negative,
            // acceptable break in correctness for security.
            if (m && globStarDepth < this.maxGlobstarRecursion) {
                // match! see if the rest match. if so, we're done!
                const sub = this.#matchGlobStarBodySections(file, bodySegments, fileIndex + body.length, bodyIndex + 1, partial, globStarDepth + 1, sawTail);
                if (sub !== false) {
                    return sub;
                }
            }
            const f = file[fileIndex];
            if (f === '.' ||
                f === '..' ||
                (!this.options.dot && f.startsWith('.'))) {
                return false;
            }
            fileIndex++;
        }
        // walked off. no point continuing
        return partial || null;
    }
    #matchOne(file, pattern, partial, fileIndex, patternIndex) {
        let fi;
        let pi;
        let pl;
        let fl;
        for (fi = fileIndex,
            pi = patternIndex,
            fl = file.length,
            pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
            this.debug('matchOne loop');
            let p = pattern[pi];
            let f = file[fi];
            this.debug(pattern, p, f);
            // should be impossible.
            // some invalid regexp stuff in the set.
            /* c8 ignore start */
            if (p === false || p === exports.GLOBSTAR) {
                return false;
            }
            /* c8 ignore stop */
            // something other than **
            // non-magic patterns just have to match exactly
            // patterns with magic have been turned into regexps.
            let hit;
            if (typeof p === 'string') {
                hit = f === p;
                this.debug('string match', p, f, hit);
            }
            else {
                hit = p.test(f);
                this.debug('pattern match', p, f, hit);
            }
            if (!hit)
                return false;
        }
        // Note: ending in / means that we'll get a final ""
        // at the end of the pattern.  This can only match a
        // corresponding "" at the end of the file.
        // If the file ends in /, then it can only match a
        // a pattern that ends in /, unless the pattern just
        // doesn't have any more for it. But, a/b/ should *not*
        // match "a/b/*", even though "" matches against the
        // [^/]*? pattern, except in partial mode, where it might
        // simply not be reached yet.
        // However, a/b/ should still satisfy a/*
        // now either we fell off the end of the pattern, or we're done.
        if (fi === fl && pi === pl) {
            // ran out of pattern and filename at the same time.
            // an exact hit!
            return true;
        }
        else if (fi === fl) {
            // ran out of file, but still had pattern left.
            // this is ok if we're doing the match as part of
            // a glob fs traversal.
            return partial;
        }
        else if (pi === pl) {
            // ran out of pattern, still have file left.
            // this is only acceptable if we're on the very last
            // empty segment of a file with a trailing slash.
            // a/* should match a/b/
            return fi === fl - 1 && file[fi] === '';
            /* c8 ignore start */
        }
        else {
            // should be unreachable.
            throw new Error('wtf?');
        }
        /* c8 ignore stop */
    }
    braceExpand() {
        return (0, exports.braceExpand)(this.pattern, this.options);
    }
    parse(pattern) {
        (0, assert_valid_pattern_js_1.assertValidPattern)(pattern);
        const options = this.options;
        // shortcuts
        if (pattern === '**')
            return exports.GLOBSTAR;
        if (pattern === '')
            return '';
        // far and away, the most common glob pattern parts are
        // *, *.*, and *.<ext>  Add a fast check method for those.
        let m;
        let fastTest = null;
        if ((m = pattern.match(starRE))) {
            fastTest = options.dot ? starTestDot : starTest;
        }
        else if ((m = pattern.match(starDotExtRE))) {
            fastTest = (options.nocase ?
                options.dot ?
                    starDotExtTestNocaseDot
                    : starDotExtTestNocase
                : options.dot ? starDotExtTestDot
                    : starDotExtTest)(m[1]);
        }
        else if ((m = pattern.match(qmarksRE))) {
            fastTest = (options.nocase ?
                options.dot ?
                    qmarksTestNocaseDot
                    : qmarksTestNocase
                : options.dot ? qmarksTestDot
                    : qmarksTest)(m);
        }
        else if ((m = pattern.match(starDotStarRE))) {
            fastTest = options.dot ? starDotStarTestDot : starDotStarTest;
        }
        else if ((m = pattern.match(dotStarRE))) {
            fastTest = dotStarTest;
        }
        const re = ast_js_1.AST.fromGlob(pattern, this.options).toMMPattern();
        if (fastTest && typeof re === 'object') {
            // Avoids overriding in frozen environments
            Reflect.defineProperty(re, 'test', { value: fastTest });
        }
        return re;
    }
    makeRe() {
        if (this.regexp || this.regexp === false)
            return this.regexp;
        // at this point, this.set is a 2d array of partial
        // pattern strings, or "**".
        //
        // It's better to use .match().  This function shouldn't
        // be used, really, but it's pretty convenient sometimes,
        // when you just want to work with a regex.
        const set = this.set;
        if (!set.length) {
            this.regexp = false;
            return this.regexp;
        }
        const options = this.options;
        const twoStar = options.noglobstar ? star
            : options.dot ? twoStarDot
                : twoStarNoDot;
        const flags = new Set(options.nocase ? ['i'] : []);
        // regexpify non-globstar patterns
        // if ** is only item, then we just do one twoStar
        // if ** is first, and there are more, prepend (\/|twoStar\/)? to next
        // if ** is last, append (\/twoStar|) to previous
        // if ** is in the middle, append (\/|\/twoStar\/) to previous
        // then filter out GLOBSTAR symbols
        let re = set
            .map(pattern => {
            const pp = pattern.map(p => {
                if (p instanceof RegExp) {
                    for (const f of p.flags.split(''))
                        flags.add(f);
                }
                return (typeof p === 'string' ? regExpEscape(p)
                    : p === exports.GLOBSTAR ? exports.GLOBSTAR
                        : p._src);
            });
            pp.forEach((p, i) => {
                const next = pp[i + 1];
                const prev = pp[i - 1];
                if (p !== exports.GLOBSTAR || prev === exports.GLOBSTAR) {
                    return;
                }
                if (prev === undefined) {
                    if (next !== undefined && next !== exports.GLOBSTAR) {
                        pp[i + 1] = '(?:\\/|' + twoStar + '\\/)?' + next;
                    }
                    else {
                        pp[i] = twoStar;
                    }
                }
                else if (next === undefined) {
                    pp[i - 1] = prev + '(?:\\/|\\/' + twoStar + ')?';
                }
                else if (next !== exports.GLOBSTAR) {
                    pp[i - 1] = prev + '(?:\\/|\\/' + twoStar + '\\/)' + next;
                    pp[i + 1] = exports.GLOBSTAR;
                }
            });
            const filtered = pp.filter(p => p !== exports.GLOBSTAR);
            // For partial matches, we need to make the pattern match
            // any prefix of the full path. We do this by generating
            // alternative patterns that match progressively longer prefixes.
            if (this.partial && filtered.length >= 1) {
                const prefixes = [];
                for (let i = 1; i <= filtered.length; i++) {
                    prefixes.push(filtered.slice(0, i).join('/'));
                }
                return '(?:' + prefixes.join('|') + ')';
            }
            return filtered.join('/');
        })
            .join('|');
        // need to wrap in parens if we had more than one thing with |,
        // otherwise only the first will be anchored to ^ and the last to $
        const [open, close] = set.length > 1 ? ['(?:', ')'] : ['', ''];
        // must match entire pattern
        // ending in a * or ** will make it less strict.
        re = '^' + open + re + close + '$';
        // In partial mode, '/' should always match as it's a valid prefix for any pattern
        if (this.partial) {
            re = '^(?:\\/|' + open + re.slice(1, -1) + close + ')$';
        }
        // can match anything, as long as it's not this.
        if (this.negate)
            re = '^(?!' + re + ').+$';
        try {
            this.regexp = new RegExp(re, [...flags].join(''));
            /* c8 ignore start */
        }
        catch {
            // should be impossible
            this.regexp = false;
        }
        /* c8 ignore stop */
        return this.regexp;
    }
    slashSplit(p) {
        // if p starts with // on windows, we preserve that
        // so that UNC paths aren't broken.  Otherwise, any number of
        // / characters are coalesced into one, unless
        // preserveMultipleSlashes is set to true.
        if (this.preserveMultipleSlashes) {
            return p.split('/');
        }
        else if (this.isWindows && /^\/\/[^/]+/.test(p)) {
            // add an extra '' for the one we lose
            return ['', ...p.split(/\/+/)];
        }
        else {
            return p.split(/\/+/);
        }
    }
    match(f, partial = this.partial) {
        this.debug('match', f, this.pattern);
        // short-circuit in the case of busted things.
        // comments, etc.
        if (this.comment) {
            return false;
        }
        if (this.empty) {
            return f === '';
        }
        if (f === '/' && partial) {
            return true;
        }
        const options = this.options;
        // windows: need to use /, not \
        if (this.isWindows) {
            f = f.split('\\').join('/');
        }
        // treat the test path as a set of pathparts.
        const ff = this.slashSplit(f);
        this.debug(this.pattern, 'split', ff);
        // just ONE of the pattern sets in this.set needs to match
        // in order for it to be valid.  If negating, then just one
        // match means that we have failed.
        // Either way, return on the first hit.
        const set = this.set;
        this.debug(this.pattern, 'set', set);
        // Find the basename of the path by looking for the last non-empty segment
        let filename = ff[ff.length - 1];
        if (!filename) {
            for (let i = ff.length - 2; !filename && i >= 0; i--) {
                filename = ff[i];
            }
        }
        for (const pattern of set) {
            let file = ff;
            if (options.matchBase && pattern.length === 1) {
                file = [filename];
            }
            const hit = this.matchOne(file, pattern, partial);
            if (hit) {
                if (options.flipNegate) {
                    return true;
                }
                return !this.negate;
            }
        }
        // didn't get any hits.  this is success if it's a negative
        // pattern, failure otherwise.
        if (options.flipNegate) {
            return false;
        }
        return this.negate;
    }
    static defaults(def) {
        return exports.minimatch.defaults(def).Minimatch;
    }
}
exports.Minimatch = Minimatch;
/* c8 ignore start */
var ast_js_2 = __nccwpck_require__(803);
Object.defineProperty(exports, "AST", ({ enumerable: true, get: function () { return ast_js_2.AST; } }));
var escape_js_2 = __nccwpck_require__(800);
Object.defineProperty(exports, "escape", ({ enumerable: true, get: function () { return escape_js_2.escape; } }));
var unescape_js_2 = __nccwpck_require__(851);
Object.defineProperty(exports, "unescape", ({ enumerable: true, get: function () { return unescape_js_2.unescape; } }));
/* c8 ignore stop */
exports.minimatch.AST = ast_js_1.AST;
exports.minimatch.Minimatch = Minimatch;
exports.minimatch.escape = escape_js_1.escape;
exports.minimatch.unescape = unescape_js_1.unescape;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 851:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.unescape = void 0;
/**
 * Un-escape a string that has been escaped with {@link escape}.
 *
 * If the {@link MinimatchOptions.windowsPathsNoEscape} option is used, then
 * square-bracket escapes are removed, but not backslash escapes.
 *
 * For example, it will turn the string `'[*]'` into `*`, but it will not
 * turn `'\\*'` into `'*'`, because `\` is a path separator in
 * `windowsPathsNoEscape` mode.
 *
 * When `windowsPathsNoEscape` is not set, then both square-bracket escapes and
 * backslash escapes are removed.
 *
 * Slashes (and backslashes in `windowsPathsNoEscape` mode) cannot be escaped
 * or unescaped.
 *
 * When `magicalBraces` is not set, escapes of braces (`{` and `}`) will not be
 * unescaped.
 */
const unescape = (s, { windowsPathsNoEscape = false, magicalBraces = true, } = {}) => {
    if (magicalBraces) {
        return windowsPathsNoEscape ?
            s.replace(/\[([^/\\])\]/g, '$1')
            : s
                .replace(/((?!\\).|^)\[([^/\\])\]/g, '$1$2')
                .replace(/\\([^/])/g, '$1');
    }
    return windowsPathsNoEscape ?
        s.replace(/\[([^/\\{}])\]/g, '$1')
        : s
            .replace(/((?!\\).|^)\[([^/\\{}])\]/g, '$1$2')
            .replace(/\\([^/{}])/g, '$1');
};
exports.unescape = unescape;
//# sourceMappingURL=unescape.js.map

/***/ }),

/***/ 275:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Minipass = exports.isWritable = exports.isReadable = exports.isStream = void 0;
const proc = typeof process === 'object' && process
    ? process
    : {
        stdout: null,
        stderr: null,
    };
const node_events_1 = __nccwpck_require__(474);
const node_stream_1 = __importDefault(__nccwpck_require__(75));
const node_string_decoder_1 = __nccwpck_require__(193);
/**
 * Return true if the argument is a Minipass stream, Node stream, or something
 * else that Minipass can interact with.
 */
const isStream = (s) => !!s &&
    typeof s === 'object' &&
    (s instanceof Minipass ||
        s instanceof node_stream_1.default ||
        (0, exports.isReadable)(s) ||
        (0, exports.isWritable)(s))
/**
 * Return true if the argument is a valid {@link Minipass.Readable}
 */
;
exports.isStream = isStream;
/**
 * Return true if the argument is a valid {@link Minipass.Readable}
 */
const isReadable = (s) => !!s &&
    typeof s === 'object' &&
    s instanceof node_events_1.EventEmitter &&
    typeof s.pipe === 'function' &&
    // node core Writable streams have a pipe() method, but it throws
    s.pipe !== node_stream_1.default.Writable.prototype.pipe
/**
 * Return true if the argument is a valid {@link Minipass.Writable}
 */
;
exports.isReadable = isReadable;
/**
 * Return true if the argument is a valid {@link Minipass.Writable}
 */
const isWritable = (s) => !!s &&
    typeof s === 'object' &&
    s instanceof node_events_1.EventEmitter &&
    typeof s.write === 'function' &&
    typeof s.end === 'function';
exports.isWritable = isWritable;
const EOF = Symbol('EOF');
const MAYBE_EMIT_END = Symbol('maybeEmitEnd');
const EMITTED_END = Symbol('emittedEnd');
const EMITTING_END = Symbol('emittingEnd');
const EMITTED_ERROR = Symbol('emittedError');
const CLOSED = Symbol('closed');
const READ = Symbol('read');
const FLUSH = Symbol('flush');
const FLUSHCHUNK = Symbol('flushChunk');
const ENCODING = Symbol('encoding');
const DECODER = Symbol('decoder');
const FLOWING = Symbol('flowing');
const PAUSED = Symbol('paused');
const RESUME = Symbol('resume');
const BUFFER = Symbol('buffer');
const PIPES = Symbol('pipes');
const BUFFERLENGTH = Symbol('bufferLength');
const BUFFERPUSH = Symbol('bufferPush');
const BUFFERSHIFT = Symbol('bufferShift');
const OBJECTMODE = Symbol('objectMode');
// internal event when stream is destroyed
const DESTROYED = Symbol('destroyed');
// internal event when stream has an error
const ERROR = Symbol('error');
const EMITDATA = Symbol('emitData');
const EMITEND = Symbol('emitEnd');
const EMITEND2 = Symbol('emitEnd2');
const ASYNC = Symbol('async');
const ABORT = Symbol('abort');
const ABORTED = Symbol('aborted');
const SIGNAL = Symbol('signal');
const DATALISTENERS = Symbol('dataListeners');
const DISCARDED = Symbol('discarded');
const defer = (fn) => Promise.resolve().then(fn);
const nodefer = (fn) => fn();
const isEndish = (ev) => ev === 'end' || ev === 'finish' || ev === 'prefinish';
const isArrayBufferLike = (b) => b instanceof ArrayBuffer ||
    (!!b &&
        typeof b === 'object' &&
        b.constructor &&
        b.constructor.name === 'ArrayBuffer' &&
        b.byteLength >= 0);
const isArrayBufferView = (b) => !Buffer.isBuffer(b) && ArrayBuffer.isView(b);
/**
 * Internal class representing a pipe to a destination stream.
 *
 * @internal
 */
class Pipe {
    src;
    dest;
    opts;
    ondrain;
    constructor(src, dest, opts) {
        this.src = src;
        this.dest = dest;
        this.opts = opts;
        this.ondrain = () => src[RESUME]();
        this.dest.on('drain', this.ondrain);
    }
    unpipe() {
        this.dest.removeListener('drain', this.ondrain);
    }
    // only here for the prototype
    /* c8 ignore start */
    proxyErrors(_er) { }
    /* c8 ignore stop */
    end() {
        this.unpipe();
        if (this.opts.end)
            this.dest.end();
    }
}
/**
 * Internal class representing a pipe to a destination stream where
 * errors are proxied.
 *
 * @internal
 */
class PipeProxyErrors extends Pipe {
    unpipe() {
        this.src.removeListener('error', this.proxyErrors);
        super.unpipe();
    }
    constructor(src, dest, opts) {
        super(src, dest, opts);
        this.proxyErrors = (er) => this.dest.emit('error', er);
        src.on('error', this.proxyErrors);
    }
}
const isObjectModeOptions = (o) => !!o.objectMode;
const isEncodingOptions = (o) => !o.objectMode && !!o.encoding && o.encoding !== 'buffer';
/**
 * Main export, the Minipass class
 *
 * `RType` is the type of data emitted, defaults to Buffer
 *
 * `WType` is the type of data to be written, if RType is buffer or string,
 * then any {@link Minipass.ContiguousData} is allowed.
 *
 * `Events` is the set of event handler signatures that this object
 * will emit, see {@link Minipass.Events}
 */
class Minipass extends node_events_1.EventEmitter {
    [FLOWING] = false;
    [PAUSED] = false;
    [PIPES] = [];
    [BUFFER] = [];
    [OBJECTMODE];
    [ENCODING];
    [ASYNC];
    [DECODER];
    [EOF] = false;
    [EMITTED_END] = false;
    [EMITTING_END] = false;
    [CLOSED] = false;
    [EMITTED_ERROR] = null;
    [BUFFERLENGTH] = 0;
    [DESTROYED] = false;
    [SIGNAL];
    [ABORTED] = false;
    [DATALISTENERS] = 0;
    [DISCARDED] = false;
    /**
     * true if the stream can be written
     */
    writable = true;
    /**
     * true if the stream can be read
     */
    readable = true;
    /**
     * If `RType` is Buffer, then options do not need to be provided.
     * Otherwise, an options object must be provided to specify either
     * {@link Minipass.SharedOptions.objectMode} or
     * {@link Minipass.SharedOptions.encoding}, as appropriate.
     */
    constructor(...args) {
        const options = (args[0] ||
            {});
        super();
        if (options.objectMode && typeof options.encoding === 'string') {
            throw new TypeError('Encoding and objectMode may not be used together');
        }
        if (isObjectModeOptions(options)) {
            this[OBJECTMODE] = true;
            this[ENCODING] = null;
        }
        else if (isEncodingOptions(options)) {
            this[ENCODING] = options.encoding;
            this[OBJECTMODE] = false;
        }
        else {
            this[OBJECTMODE] = false;
            this[ENCODING] = null;
        }
        this[ASYNC] = !!options.async;
        this[DECODER] = this[ENCODING]
            ? new node_string_decoder_1.StringDecoder(this[ENCODING])
            : null;
        //@ts-ignore - private option for debugging and testing
        if (options && options.debugExposeBuffer === true) {
            Object.defineProperty(this, 'buffer', { get: () => this[BUFFER] });
        }
        //@ts-ignore - private option for debugging and testing
        if (options && options.debugExposePipes === true) {
            Object.defineProperty(this, 'pipes', { get: () => this[PIPES] });
        }
        const { signal } = options;
        if (signal) {
            this[SIGNAL] = signal;
            if (signal.aborted) {
                this[ABORT]();
            }
            else {
                signal.addEventListener('abort', () => this[ABORT]());
            }
        }
    }
    /**
     * The amount of data stored in the buffer waiting to be read.
     *
     * For Buffer strings, this will be the total byte length.
     * For string encoding streams, this will be the string character length,
     * according to JavaScript's `string.length` logic.
     * For objectMode streams, this is a count of the items waiting to be
     * emitted.
     */
    get bufferLength() {
        return this[BUFFERLENGTH];
    }
    /**
     * The `BufferEncoding` currently in use, or `null`
     */
    get encoding() {
        return this[ENCODING];
    }
    /**
     * @deprecated - This is a read only property
     */
    set encoding(_enc) {
        throw new Error('Encoding must be set at instantiation time');
    }
    /**
     * @deprecated - Encoding may only be set at instantiation time
     */
    setEncoding(_enc) {
        throw new Error('Encoding must be set at instantiation time');
    }
    /**
     * True if this is an objectMode stream
     */
    get objectMode() {
        return this[OBJECTMODE];
    }
    /**
     * @deprecated - This is a read-only property
     */
    set objectMode(_om) {
        throw new Error('objectMode must be set at instantiation time');
    }
    /**
     * true if this is an async stream
     */
    get ['async']() {
        return this[ASYNC];
    }
    /**
     * Set to true to make this stream async.
     *
     * Once set, it cannot be unset, as this would potentially cause incorrect
     * behavior.  Ie, a sync stream can be made async, but an async stream
     * cannot be safely made sync.
     */
    set ['async'](a) {
        this[ASYNC] = this[ASYNC] || !!a;
    }
    // drop everything and get out of the flow completely
    [ABORT]() {
        this[ABORTED] = true;
        this.emit('abort', this[SIGNAL]?.reason);
        this.destroy(this[SIGNAL]?.reason);
    }
    /**
     * True if the stream has been aborted.
     */
    get aborted() {
        return this[ABORTED];
    }
    /**
     * No-op setter. Stream aborted status is set via the AbortSignal provided
     * in the constructor options.
     */
    set aborted(_) { }
    write(chunk, encoding, cb) {
        if (this[ABORTED])
            return false;
        if (this[EOF])
            throw new Error('write after end');
        if (this[DESTROYED]) {
            this.emit('error', Object.assign(new Error('Cannot call write after a stream was destroyed'), { code: 'ERR_STREAM_DESTROYED' }));
            return true;
        }
        if (typeof encoding === 'function') {
            cb = encoding;
            encoding = 'utf8';
        }
        if (!encoding)
            encoding = 'utf8';
        const fn = this[ASYNC] ? defer : nodefer;
        // convert array buffers and typed array views into buffers
        // at some point in the future, we may want to do the opposite!
        // leave strings and buffers as-is
        // anything is only allowed if in object mode, so throw
        if (!this[OBJECTMODE] && !Buffer.isBuffer(chunk)) {
            if (isArrayBufferView(chunk)) {
                //@ts-ignore - sinful unsafe type changing
                chunk = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
            }
            else if (isArrayBufferLike(chunk)) {
                //@ts-ignore - sinful unsafe type changing
                chunk = Buffer.from(chunk);
            }
            else if (typeof chunk !== 'string') {
                throw new Error('Non-contiguous data written to non-objectMode stream');
            }
        }
        // handle object mode up front, since it's simpler
        // this yields better performance, fewer checks later.
        if (this[OBJECTMODE]) {
            // maybe impossible?
            /* c8 ignore start */
            if (this[FLOWING] && this[BUFFERLENGTH] !== 0)
                this[FLUSH](true);
            /* c8 ignore stop */
            if (this[FLOWING])
                this.emit('data', chunk);
            else
                this[BUFFERPUSH](chunk);
            if (this[BUFFERLENGTH] !== 0)
                this.emit('readable');
            if (cb)
                fn(cb);
            return this[FLOWING];
        }
        // at this point the chunk is a buffer or string
        // don't buffer it up or send it to the decoder
        if (!chunk.length) {
            if (this[BUFFERLENGTH] !== 0)
                this.emit('readable');
            if (cb)
                fn(cb);
            return this[FLOWING];
        }
        // fast-path writing strings of same encoding to a stream with
        // an empty buffer, skipping the buffer/decoder dance
        if (typeof chunk === 'string' &&
            // unless it is a string already ready for us to use
            !(encoding === this[ENCODING] && !this[DECODER]?.lastNeed)) {
            //@ts-ignore - sinful unsafe type change
            chunk = Buffer.from(chunk, encoding);
        }
        if (Buffer.isBuffer(chunk) && this[ENCODING]) {
            //@ts-ignore - sinful unsafe type change
            chunk = this[DECODER].write(chunk);
        }
        // Note: flushing CAN potentially switch us into not-flowing mode
        if (this[FLOWING] && this[BUFFERLENGTH] !== 0)
            this[FLUSH](true);
        if (this[FLOWING])
            this.emit('data', chunk);
        else
            this[BUFFERPUSH](chunk);
        if (this[BUFFERLENGTH] !== 0)
            this.emit('readable');
        if (cb)
            fn(cb);
        return this[FLOWING];
    }
    /**
     * Low-level explicit read method.
     *
     * In objectMode, the argument is ignored, and one item is returned if
     * available.
     *
     * `n` is the number of bytes (or in the case of encoding streams,
     * characters) to consume. If `n` is not provided, then the entire buffer
     * is returned, or `null` is returned if no data is available.
     *
     * If `n` is greater that the amount of data in the internal buffer,
     * then `null` is returned.
     */
    read(n) {
        if (this[DESTROYED])
            return null;
        this[DISCARDED] = false;
        if (this[BUFFERLENGTH] === 0 ||
            n === 0 ||
            (n && n > this[BUFFERLENGTH])) {
            this[MAYBE_EMIT_END]();
            return null;
        }
        if (this[OBJECTMODE])
            n = null;
        if (this[BUFFER].length > 1 && !this[OBJECTMODE]) {
            // not object mode, so if we have an encoding, then RType is string
            // otherwise, must be Buffer
            this[BUFFER] = [
                (this[ENCODING]
                    ? this[BUFFER].join('')
                    : Buffer.concat(this[BUFFER], this[BUFFERLENGTH])),
            ];
        }
        const ret = this[READ](n || null, this[BUFFER][0]);
        this[MAYBE_EMIT_END]();
        return ret;
    }
    [READ](n, chunk) {
        if (this[OBJECTMODE])
            this[BUFFERSHIFT]();
        else {
            const c = chunk;
            if (n === c.length || n === null)
                this[BUFFERSHIFT]();
            else if (typeof c === 'string') {
                this[BUFFER][0] = c.slice(n);
                chunk = c.slice(0, n);
                this[BUFFERLENGTH] -= n;
            }
            else {
                this[BUFFER][0] = c.subarray(n);
                chunk = c.subarray(0, n);
                this[BUFFERLENGTH] -= n;
            }
        }
        this.emit('data', chunk);
        if (!this[BUFFER].length && !this[EOF])
            this.emit('drain');
        return chunk;
    }
    end(chunk, encoding, cb) {
        if (typeof chunk === 'function') {
            cb = chunk;
            chunk = undefined;
        }
        if (typeof encoding === 'function') {
            cb = encoding;
            encoding = 'utf8';
        }
        if (chunk !== undefined)
            this.write(chunk, encoding);
        if (cb)
            this.once('end', cb);
        this[EOF] = true;
        this.writable = false;
        // if we haven't written anything, then go ahead and emit,
        // even if we're not reading.
        // we'll re-emit if a new 'end' listener is added anyway.
        // This makes MP more suitable to write-only use cases.
        if (this[FLOWING] || !this[PAUSED])
            this[MAYBE_EMIT_END]();
        return this;
    }
    // don't let the internal resume be overwritten
    [RESUME]() {
        if (this[DESTROYED])
            return;
        if (!this[DATALISTENERS] && !this[PIPES].length) {
            this[DISCARDED] = true;
        }
        this[PAUSED] = false;
        this[FLOWING] = true;
        this.emit('resume');
        if (this[BUFFER].length)
            this[FLUSH]();
        else if (this[EOF])
            this[MAYBE_EMIT_END]();
        else
            this.emit('drain');
    }
    /**
     * Resume the stream if it is currently in a paused state
     *
     * If called when there are no pipe destinations or `data` event listeners,
     * this will place the stream in a "discarded" state, where all data will
     * be thrown away. The discarded state is removed if a pipe destination or
     * data handler is added, if pause() is called, or if any synchronous or
     * asynchronous iteration is started.
     */
    resume() {
        return this[RESUME]();
    }
    /**
     * Pause the stream
     */
    pause() {
        this[FLOWING] = false;
        this[PAUSED] = true;
        this[DISCARDED] = false;
    }
    /**
     * true if the stream has been forcibly destroyed
     */
    get destroyed() {
        return this[DESTROYED];
    }
    /**
     * true if the stream is currently in a flowing state, meaning that
     * any writes will be immediately emitted.
     */
    get flowing() {
        return this[FLOWING];
    }
    /**
     * true if the stream is currently in a paused state
     */
    get paused() {
        return this[PAUSED];
    }
    [BUFFERPUSH](chunk) {
        if (this[OBJECTMODE])
            this[BUFFERLENGTH] += 1;
        else
            this[BUFFERLENGTH] += chunk.length;
        this[BUFFER].push(chunk);
    }
    [BUFFERSHIFT]() {
        if (this[OBJECTMODE])
            this[BUFFERLENGTH] -= 1;
        else
            this[BUFFERLENGTH] -= this[BUFFER][0].length;
        return this[BUFFER].shift();
    }
    [FLUSH](noDrain = false) {
        do { } while (this[FLUSHCHUNK](this[BUFFERSHIFT]()) &&
            this[BUFFER].length);
        if (!noDrain && !this[BUFFER].length && !this[EOF])
            this.emit('drain');
    }
    [FLUSHCHUNK](chunk) {
        this.emit('data', chunk);
        return this[FLOWING];
    }
    /**
     * Pipe all data emitted by this stream into the destination provided.
     *
     * Triggers the flow of data.
     */
    pipe(dest, opts) {
        if (this[DESTROYED])
            return dest;
        this[DISCARDED] = false;
        const ended = this[EMITTED_END];
        opts = opts || {};
        if (dest === proc.stdout || dest === proc.stderr)
            opts.end = false;
        else
            opts.end = opts.end !== false;
        opts.proxyErrors = !!opts.proxyErrors;
        // piping an ended stream ends immediately
        if (ended) {
            if (opts.end)
                dest.end();
        }
        else {
            // "as" here just ignores the WType, which pipes don't care about,
            // since they're only consuming from us, and writing to the dest
            this[PIPES].push(!opts.proxyErrors
                ? new Pipe(this, dest, opts)
                : new PipeProxyErrors(this, dest, opts));
            if (this[ASYNC])
                defer(() => this[RESUME]());
            else
                this[RESUME]();
        }
        return dest;
    }
    /**
     * Fully unhook a piped destination stream.
     *
     * If the destination stream was the only consumer of this stream (ie,
     * there are no other piped destinations or `'data'` event listeners)
     * then the flow of data will stop until there is another consumer or
     * {@link Minipass#resume} is explicitly called.
     */
    unpipe(dest) {
        const p = this[PIPES].find(p => p.dest === dest);
        if (p) {
            if (this[PIPES].length === 1) {
                if (this[FLOWING] && this[DATALISTENERS] === 0) {
                    this[FLOWING] = false;
                }
                this[PIPES] = [];
            }
            else
                this[PIPES].splice(this[PIPES].indexOf(p), 1);
            p.unpipe();
        }
    }
    /**
     * Alias for {@link Minipass#on}
     */
    addListener(ev, handler) {
        return this.on(ev, handler);
    }
    /**
     * Mostly identical to `EventEmitter.on`, with the following
     * behavior differences to prevent data loss and unnecessary hangs:
     *
     * - Adding a 'data' event handler will trigger the flow of data
     *
     * - Adding a 'readable' event handler when there is data waiting to be read
     *   will cause 'readable' to be emitted immediately.
     *
     * - Adding an 'endish' event handler ('end', 'finish', etc.) which has
     *   already passed will cause the event to be emitted immediately and all
     *   handlers removed.
     *
     * - Adding an 'error' event handler after an error has been emitted will
     *   cause the event to be re-emitted immediately with the error previously
     *   raised.
     */
    on(ev, handler) {
        const ret = super.on(ev, handler);
        if (ev === 'data') {
            this[DISCARDED] = false;
            this[DATALISTENERS]++;
            if (!this[PIPES].length && !this[FLOWING]) {
                this[RESUME]();
            }
        }
        else if (ev === 'readable' && this[BUFFERLENGTH] !== 0) {
            super.emit('readable');
        }
        else if (isEndish(ev) && this[EMITTED_END]) {
            super.emit(ev);
            this.removeAllListeners(ev);
        }
        else if (ev === 'error' && this[EMITTED_ERROR]) {
            const h = handler;
            if (this[ASYNC])
                defer(() => h.call(this, this[EMITTED_ERROR]));
            else
                h.call(this, this[EMITTED_ERROR]);
        }
        return ret;
    }
    /**
     * Alias for {@link Minipass#off}
     */
    removeListener(ev, handler) {
        return this.off(ev, handler);
    }
    /**
     * Mostly identical to `EventEmitter.off`
     *
     * If a 'data' event handler is removed, and it was the last consumer
     * (ie, there are no pipe destinations or other 'data' event listeners),
     * then the flow of data will stop until there is another consumer or
     * {@link Minipass#resume} is explicitly called.
     */
    off(ev, handler) {
        const ret = super.off(ev, handler);
        // if we previously had listeners, and now we don't, and we don't
        // have any pipes, then stop the flow, unless it's been explicitly
        // put in a discarded flowing state via stream.resume().
        if (ev === 'data') {
            this[DATALISTENERS] = this.listeners('data').length;
            if (this[DATALISTENERS] === 0 &&
                !this[DISCARDED] &&
                !this[PIPES].length) {
                this[FLOWING] = false;
            }
        }
        return ret;
    }
    /**
     * Mostly identical to `EventEmitter.removeAllListeners`
     *
     * If all 'data' event handlers are removed, and they were the last consumer
     * (ie, there are no pipe destinations), then the flow of data will stop
     * until there is another consumer or {@link Minipass#resume} is explicitly
     * called.
     */
    removeAllListeners(ev) {
        const ret = super.removeAllListeners(ev);
        if (ev === 'data' || ev === undefined) {
            this[DATALISTENERS] = 0;
            if (!this[DISCARDED] && !this[PIPES].length) {
                this[FLOWING] = false;
            }
        }
        return ret;
    }
    /**
     * true if the 'end' event has been emitted
     */
    get emittedEnd() {
        return this[EMITTED_END];
    }
    [MAYBE_EMIT_END]() {
        if (!this[EMITTING_END] &&
            !this[EMITTED_END] &&
            !this[DESTROYED] &&
            this[BUFFER].length === 0 &&
            this[EOF]) {
            this[EMITTING_END] = true;
            this.emit('end');
            this.emit('prefinish');
            this.emit('finish');
            if (this[CLOSED])
                this.emit('close');
            this[EMITTING_END] = false;
        }
    }
    /**
     * Mostly identical to `EventEmitter.emit`, with the following
     * behavior differences to prevent data loss and unnecessary hangs:
     *
     * If the stream has been destroyed, and the event is something other
     * than 'close' or 'error', then `false` is returned and no handlers
     * are called.
     *
     * If the event is 'end', and has already been emitted, then the event
     * is ignored. If the stream is in a paused or non-flowing state, then
     * the event will be deferred until data flow resumes. If the stream is
     * async, then handlers will be called on the next tick rather than
     * immediately.
     *
     * If the event is 'close', and 'end' has not yet been emitted, then
     * the event will be deferred until after 'end' is emitted.
     *
     * If the event is 'error', and an AbortSignal was provided for the stream,
     * and there are no listeners, then the event is ignored, matching the
     * behavior of node core streams in the presense of an AbortSignal.
     *
     * If the event is 'finish' or 'prefinish', then all listeners will be
     * removed after emitting the event, to prevent double-firing.
     */
    emit(ev, ...args) {
        const data = args[0];
        // error and close are only events allowed after calling destroy()
        if (ev !== 'error' &&
            ev !== 'close' &&
            ev !== DESTROYED &&
            this[DESTROYED]) {
            return false;
        }
        else if (ev === 'data') {
            return !this[OBJECTMODE] && !data
                ? false
                : this[ASYNC]
                    ? (defer(() => this[EMITDATA](data)), true)
                    : this[EMITDATA](data);
        }
        else if (ev === 'end') {
            return this[EMITEND]();
        }
        else if (ev === 'close') {
            this[CLOSED] = true;
            // don't emit close before 'end' and 'finish'
            if (!this[EMITTED_END] && !this[DESTROYED])
                return false;
            const ret = super.emit('close');
            this.removeAllListeners('close');
            return ret;
        }
        else if (ev === 'error') {
            this[EMITTED_ERROR] = data;
            super.emit(ERROR, data);
            const ret = !this[SIGNAL] || this.listeners('error').length
                ? super.emit('error', data)
                : false;
            this[MAYBE_EMIT_END]();
            return ret;
        }
        else if (ev === 'resume') {
            const ret = super.emit('resume');
            this[MAYBE_EMIT_END]();
            return ret;
        }
        else if (ev === 'finish' || ev === 'prefinish') {
            const ret = super.emit(ev);
            this.removeAllListeners(ev);
            return ret;
        }
        // Some other unknown event
        const ret = super.emit(ev, ...args);
        this[MAYBE_EMIT_END]();
        return ret;
    }
    [EMITDATA](data) {
        for (const p of this[PIPES]) {
            if (p.dest.write(data) === false)
                this.pause();
        }
        const ret = this[DISCARDED] ? false : super.emit('data', data);
        this[MAYBE_EMIT_END]();
        return ret;
    }
    [EMITEND]() {
        if (this[EMITTED_END])
            return false;
        this[EMITTED_END] = true;
        this.readable = false;
        return this[ASYNC]
            ? (defer(() => this[EMITEND2]()), true)
            : this[EMITEND2]();
    }
    [EMITEND2]() {
        if (this[DECODER]) {
            const data = this[DECODER].end();
            if (data) {
                for (const p of this[PIPES]) {
                    p.dest.write(data);
                }
                if (!this[DISCARDED])
                    super.emit('data', data);
            }
        }
        for (const p of this[PIPES]) {
            p.end();
        }
        const ret = super.emit('end');
        this.removeAllListeners('end');
        return ret;
    }
    /**
     * Return a Promise that resolves to an array of all emitted data once
     * the stream ends.
     */
    async collect() {
        const buf = Object.assign([], {
            dataLength: 0,
        });
        if (!this[OBJECTMODE])
            buf.dataLength = 0;
        // set the promise first, in case an error is raised
        // by triggering the flow here.
        const p = this.promise();
        this.on('data', c => {
            buf.push(c);
            if (!this[OBJECTMODE])
                buf.dataLength += c.length;
        });
        await p;
        return buf;
    }
    /**
     * Return a Promise that resolves to the concatenation of all emitted data
     * once the stream ends.
     *
     * Not allowed on objectMode streams.
     */
    async concat() {
        if (this[OBJECTMODE]) {
            throw new Error('cannot concat in objectMode');
        }
        const buf = await this.collect();
        return (this[ENCODING]
            ? buf.join('')
            : Buffer.concat(buf, buf.dataLength));
    }
    /**
     * Return a void Promise that resolves once the stream ends.
     */
    async promise() {
        return new Promise((resolve, reject) => {
            this.on(DESTROYED, () => reject(new Error('stream destroyed')));
            this.on('error', er => reject(er));
            this.on('end', () => resolve());
        });
    }
    /**
     * Asynchronous `for await of` iteration.
     *
     * This will continue emitting all chunks until the stream terminates.
     */
    [Symbol.asyncIterator]() {
        // set this up front, in case the consumer doesn't call next()
        // right away.
        this[DISCARDED] = false;
        let stopped = false;
        const stop = async () => {
            this.pause();
            stopped = true;
            return { value: undefined, done: true };
        };
        const next = () => {
            if (stopped)
                return stop();
            const res = this.read();
            if (res !== null)
                return Promise.resolve({ done: false, value: res });
            if (this[EOF])
                return stop();
            let resolve;
            let reject;
            const onerr = (er) => {
                this.off('data', ondata);
                this.off('end', onend);
                this.off(DESTROYED, ondestroy);
                stop();
                reject(er);
            };
            const ondata = (value) => {
                this.off('error', onerr);
                this.off('end', onend);
                this.off(DESTROYED, ondestroy);
                this.pause();
                resolve({ value, done: !!this[EOF] });
            };
            const onend = () => {
                this.off('error', onerr);
                this.off('data', ondata);
                this.off(DESTROYED, ondestroy);
                stop();
                resolve({ done: true, value: undefined });
            };
            const ondestroy = () => onerr(new Error('stream destroyed'));
            return new Promise((res, rej) => {
                reject = rej;
                resolve = res;
                this.once(DESTROYED, ondestroy);
                this.once('error', onerr);
                this.once('end', onend);
                this.once('data', ondata);
            });
        };
        return {
            next,
            throw: stop,
            return: stop,
            [Symbol.asyncIterator]() {
                return this;
            },
            [Symbol.asyncDispose]: async () => { },
        };
    }
    /**
     * Synchronous `for of` iteration.
     *
     * The iteration will terminate when the internal buffer runs out, even
     * if the stream has not yet terminated.
     */
    [Symbol.iterator]() {
        // set this up front, in case the consumer doesn't call next()
        // right away.
        this[DISCARDED] = false;
        let stopped = false;
        const stop = () => {
            this.pause();
            this.off(ERROR, stop);
            this.off(DESTROYED, stop);
            this.off('end', stop);
            stopped = true;
            return { done: true, value: undefined };
        };
        const next = () => {
            if (stopped)
                return stop();
            const value = this.read();
            return value === null ? stop() : { done: false, value };
        };
        this.once('end', stop);
        this.once(ERROR, stop);
        this.once(DESTROYED, stop);
        return {
            next,
            throw: stop,
            return: stop,
            [Symbol.iterator]() {
                return this;
            },
            [Symbol.dispose]: () => { },
        };
    }
    /**
     * Destroy a stream, preventing it from being used for any further purpose.
     *
     * If the stream has a `close()` method, then it will be called on
     * destruction.
     *
     * After destruction, any attempt to write data, read data, or emit most
     * events will be ignored.
     *
     * If an error argument is provided, then it will be emitted in an
     * 'error' event.
     */
    destroy(er) {
        if (this[DESTROYED]) {
            if (er)
                this.emit('error', er);
            else
                this.emit(DESTROYED);
            return this;
        }
        this[DESTROYED] = true;
        this[DISCARDED] = true;
        // throw away all buffered data, it's never coming out
        this[BUFFER].length = 0;
        this[BUFFERLENGTH] = 0;
        const wc = this;
        if (typeof wc.close === 'function' && !this[CLOSED])
            wc.close();
        if (er)
            this.emit('error', er);
        // if no error to emit, still reject pending promises
        else
            this.emit(DESTROYED);
        return this;
    }
    /**
     * Alias for {@link isStream}
     *
     * Former export location, maintained for backwards compatibility.
     *
     * @deprecated
     */
    static get isStream() {
        return exports.isStream;
    }
}
exports.Minipass = Minipass;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 577:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PathScurry = exports.Path = exports.PathScurryDarwin = exports.PathScurryPosix = exports.PathScurryWin32 = exports.PathScurryBase = exports.PathPosix = exports.PathWin32 = exports.PathBase = exports.ChildrenCache = exports.ResolveCache = void 0;
const lru_cache_1 = __nccwpck_require__(416);
const node_path_1 = __nccwpck_require__(760);
const node_url_1 = __nccwpck_require__(136);
const fs_1 = __nccwpck_require__(896);
const actualFS = __importStar(__nccwpck_require__(24));
const realpathSync = fs_1.realpathSync.native;
// TODO: test perf of fs/promises realpath vs realpathCB,
// since the promises one uses realpath.native
const promises_1 = __nccwpck_require__(455);
const minipass_1 = __nccwpck_require__(275);
const defaultFS = {
    lstatSync: fs_1.lstatSync,
    readdir: fs_1.readdir,
    readdirSync: fs_1.readdirSync,
    readlinkSync: fs_1.readlinkSync,
    realpathSync,
    promises: {
        lstat: promises_1.lstat,
        readdir: promises_1.readdir,
        readlink: promises_1.readlink,
        realpath: promises_1.realpath,
    },
};
// if they just gave us require('fs') then use our default
const fsFromOption = (fsOption) => !fsOption || fsOption === defaultFS || fsOption === actualFS ?
    defaultFS
    : {
        ...defaultFS,
        ...fsOption,
        promises: {
            ...defaultFS.promises,
            ...(fsOption.promises || {}),
        },
    };
// turn something like //?/c:/ into c:\
const uncDriveRegexp = /^\\\\\?\\([a-z]:)\\?$/i;
const uncToDrive = (rootPath) => rootPath.replace(/\//g, '\\').replace(uncDriveRegexp, '$1\\');
// windows paths are separated by either / or \
const eitherSep = /[\\\/]/;
const UNKNOWN = 0; // may not even exist, for all we know
const IFIFO = 0b0001;
const IFCHR = 0b0010;
const IFDIR = 0b0100;
const IFBLK = 0b0110;
const IFREG = 0b1000;
const IFLNK = 0b1010;
const IFSOCK = 0b1100;
const IFMT = 0b1111;
// mask to unset low 4 bits
const IFMT_UNKNOWN = ~IFMT;
// set after successfully calling readdir() and getting entries.
const READDIR_CALLED = 0b0000_0001_0000;
// set after a successful lstat()
const LSTAT_CALLED = 0b0000_0010_0000;
// set if an entry (or one of its parents) is definitely not a dir
const ENOTDIR = 0b0000_0100_0000;
// set if an entry (or one of its parents) does not exist
// (can also be set on lstat errors like EACCES or ENAMETOOLONG)
const ENOENT = 0b0000_1000_0000;
// cannot have child entries -- also verify &IFMT is either IFDIR or IFLNK
// set if we fail to readlink
const ENOREADLINK = 0b0001_0000_0000;
// set if we know realpath() will fail
const ENOREALPATH = 0b0010_0000_0000;
const ENOCHILD = ENOTDIR | ENOENT | ENOREALPATH;
const TYPEMASK = 0b0011_1111_1111;
const entToType = (s) => s.isFile() ? IFREG
    : s.isDirectory() ? IFDIR
        : s.isSymbolicLink() ? IFLNK
            : s.isCharacterDevice() ? IFCHR
                : s.isBlockDevice() ? IFBLK
                    : s.isSocket() ? IFSOCK
                        : s.isFIFO() ? IFIFO
                            : UNKNOWN;
// normalize unicode path names
const normalizeCache = new lru_cache_1.LRUCache({ max: 2 ** 12 });
const normalize = (s) => {
    const c = normalizeCache.get(s);
    if (c)
        return c;
    const n = s.normalize('NFKD');
    normalizeCache.set(s, n);
    return n;
};
const normalizeNocaseCache = new lru_cache_1.LRUCache({ max: 2 ** 12 });
const normalizeNocase = (s) => {
    const c = normalizeNocaseCache.get(s);
    if (c)
        return c;
    const n = normalize(s.toLowerCase());
    normalizeNocaseCache.set(s, n);
    return n;
};
/**
 * An LRUCache for storing resolved path strings or Path objects.
 * @internal
 */
class ResolveCache extends lru_cache_1.LRUCache {
    constructor() {
        super({ max: 256 });
    }
}
exports.ResolveCache = ResolveCache;
// In order to prevent blowing out the js heap by allocating hundreds of
// thousands of Path entries when walking extremely large trees, the "children"
// in this tree are represented by storing an array of Path entries in an
// LRUCache, indexed by the parent.  At any time, Path.children() may return an
// empty array, indicating that it doesn't know about any of its children, and
// thus has to rebuild that cache.  This is fine, it just means that we don't
// benefit as much from having the cached entries, but huge directory walks
// don't blow out the stack, and smaller ones are still as fast as possible.
//
//It does impose some complexity when building up the readdir data, because we
//need to pass a reference to the children array that we started with.
/**
 * an LRUCache for storing child entries.
 * @internal
 */
class ChildrenCache extends lru_cache_1.LRUCache {
    constructor(maxSize = 16 * 1024) {
        super({
            maxSize,
            // parent + children
            sizeCalculation: a => a.length + 1,
        });
    }
}
exports.ChildrenCache = ChildrenCache;
const setAsCwd = Symbol('PathScurry setAsCwd');
/**
 * Path objects are sort of like a super-powered
 * {@link https://nodejs.org/docs/latest/api/fs.html#class-fsdirent fs.Dirent}
 *
 * Each one represents a single filesystem entry on disk, which may or may not
 * exist. It includes methods for reading various types of information via
 * lstat, readlink, and readdir, and caches all information to the greatest
 * degree possible.
 *
 * Note that fs operations that would normally throw will instead return an
 * "empty" value. This is in order to prevent excessive overhead from error
 * stack traces.
 */
class PathBase {
    /**
     * the basename of this path
     *
     * **Important**: *always* test the path name against any test string
     * usingthe {@link isNamed} method, and not by directly comparing this
     * string. Otherwise, unicode path strings that the system sees as identical
     * will not be properly treated as the same path, leading to incorrect
     * behavior and possible security issues.
     */
    name;
    /**
     * the Path entry corresponding to the path root.
     *
     * @internal
     */
    root;
    /**
     * All roots found within the current PathScurry family
     *
     * @internal
     */
    roots;
    /**
     * a reference to the parent path, or undefined in the case of root entries
     *
     * @internal
     */
    parent;
    /**
     * boolean indicating whether paths are compared case-insensitively
     * @internal
     */
    nocase;
    /**
     * boolean indicating that this path is the current working directory
     * of the PathScurry collection that contains it.
     */
    isCWD = false;
    // potential default fs override
    #fs;
    // Stats fields
    #dev;
    get dev() {
        return this.#dev;
    }
    #mode;
    get mode() {
        return this.#mode;
    }
    #nlink;
    get nlink() {
        return this.#nlink;
    }
    #uid;
    get uid() {
        return this.#uid;
    }
    #gid;
    get gid() {
        return this.#gid;
    }
    #rdev;
    get rdev() {
        return this.#rdev;
    }
    #blksize;
    get blksize() {
        return this.#blksize;
    }
    #ino;
    get ino() {
        return this.#ino;
    }
    #size;
    get size() {
        return this.#size;
    }
    #blocks;
    get blocks() {
        return this.#blocks;
    }
    #atimeMs;
    get atimeMs() {
        return this.#atimeMs;
    }
    #mtimeMs;
    get mtimeMs() {
        return this.#mtimeMs;
    }
    #ctimeMs;
    get ctimeMs() {
        return this.#ctimeMs;
    }
    #birthtimeMs;
    get birthtimeMs() {
        return this.#birthtimeMs;
    }
    #atime;
    get atime() {
        return this.#atime;
    }
    #mtime;
    get mtime() {
        return this.#mtime;
    }
    #ctime;
    get ctime() {
        return this.#ctime;
    }
    #birthtime;
    get birthtime() {
        return this.#birthtime;
    }
    #matchName;
    #depth;
    #fullpath;
    #fullpathPosix;
    #relative;
    #relativePosix;
    #type;
    #children;
    #linkTarget;
    #realpath;
    /**
     * This property is for compatibility with the Dirent class as of
     * Node v20, where Dirent['parentPath'] refers to the path of the
     * directory that was passed to readdir. For root entries, it's the path
     * to the entry itself.
     */
    get parentPath() {
        return (this.parent || this).fullpath();
    }
    /* c8 ignore start */
    /**
     * Deprecated alias for Dirent['parentPath'] Somewhat counterintuitively,
     * this property refers to the *parent* path, not the path object itself.
     *
     * @deprecated
     */
    get path() {
        return this.parentPath;
    }
    /* c8 ignore stop */
    /**
     * Do not create new Path objects directly.  They should always be accessed
     * via the PathScurry class or other methods on the Path class.
     *
     * @internal
     */
    constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
        this.name = name;
        this.#matchName = nocase ? normalizeNocase(name) : normalize(name);
        this.#type = type & TYPEMASK;
        this.nocase = nocase;
        this.roots = roots;
        this.root = root || this;
        this.#children = children;
        this.#fullpath = opts.fullpath;
        this.#relative = opts.relative;
        this.#relativePosix = opts.relativePosix;
        this.parent = opts.parent;
        if (this.parent) {
            this.#fs = this.parent.#fs;
        }
        else {
            this.#fs = fsFromOption(opts.fs);
        }
    }
    /**
     * Returns the depth of the Path object from its root.
     *
     * For example, a path at `/foo/bar` would have a depth of 2.
     */
    depth() {
        if (this.#depth !== undefined)
            return this.#depth;
        if (!this.parent)
            return (this.#depth = 0);
        return (this.#depth = this.parent.depth() + 1);
    }
    /**
     * @internal
     */
    childrenCache() {
        return this.#children;
    }
    /**
     * Get the Path object referenced by the string path, resolved from this Path
     */
    resolve(path) {
        if (!path) {
            return this;
        }
        const rootPath = this.getRootString(path);
        const dir = path.substring(rootPath.length);
        const dirParts = dir.split(this.splitSep);
        const result = rootPath ?
            this.getRoot(rootPath).#resolveParts(dirParts)
            : this.#resolveParts(dirParts);
        return result;
    }
    #resolveParts(dirParts) {
        let p = this;
        for (const part of dirParts) {
            p = p.child(part);
        }
        return p;
    }
    /**
     * Returns the cached children Path objects, if still available.  If they
     * have fallen out of the cache, then returns an empty array, and resets the
     * READDIR_CALLED bit, so that future calls to readdir() will require an fs
     * lookup.
     *
     * @internal
     */
    children() {
        const cached = this.#children.get(this);
        if (cached) {
            return cached;
        }
        const children = Object.assign([], { provisional: 0 });
        this.#children.set(this, children);
        this.#type &= ~READDIR_CALLED;
        return children;
    }
    /**
     * Resolves a path portion and returns or creates the child Path.
     *
     * Returns `this` if pathPart is `''` or `'.'`, or `parent` if pathPart is
     * `'..'`.
     *
     * This should not be called directly.  If `pathPart` contains any path
     * separators, it will lead to unsafe undefined behavior.
     *
     * Use `Path.resolve()` instead.
     *
     * @internal
     */
    child(pathPart, opts) {
        if (pathPart === '' || pathPart === '.') {
            return this;
        }
        if (pathPart === '..') {
            return this.parent || this;
        }
        // find the child
        const children = this.children();
        const name = this.nocase ? normalizeNocase(pathPart) : normalize(pathPart);
        for (const p of children) {
            if (p.#matchName === name) {
                return p;
            }
        }
        // didn't find it, create provisional child, since it might not
        // actually exist.  If we know the parent isn't a dir, then
        // in fact it CAN'T exist.
        const s = this.parent ? this.sep : '';
        const fullpath = this.#fullpath ? this.#fullpath + s + pathPart : undefined;
        const pchild = this.newChild(pathPart, UNKNOWN, {
            ...opts,
            parent: this,
            fullpath,
        });
        if (!this.canReaddir()) {
            pchild.#type |= ENOENT;
        }
        // don't have to update provisional, because if we have real children,
        // then provisional is set to children.length, otherwise a lower number
        children.push(pchild);
        return pchild;
    }
    /**
     * The relative path from the cwd. If it does not share an ancestor with
     * the cwd, then this ends up being equivalent to the fullpath()
     */
    relative() {
        if (this.isCWD)
            return '';
        if (this.#relative !== undefined) {
            return this.#relative;
        }
        const name = this.name;
        const p = this.parent;
        if (!p) {
            return (this.#relative = this.name);
        }
        const pv = p.relative();
        return pv + (!pv || !p.parent ? '' : this.sep) + name;
    }
    /**
     * The relative path from the cwd, using / as the path separator.
     * If it does not share an ancestor with
     * the cwd, then this ends up being equivalent to the fullpathPosix()
     * On posix systems, this is identical to relative().
     */
    relativePosix() {
        if (this.sep === '/')
            return this.relative();
        if (this.isCWD)
            return '';
        if (this.#relativePosix !== undefined)
            return this.#relativePosix;
        const name = this.name;
        const p = this.parent;
        if (!p) {
            return (this.#relativePosix = this.fullpathPosix());
        }
        const pv = p.relativePosix();
        return pv + (!pv || !p.parent ? '' : '/') + name;
    }
    /**
     * The fully resolved path string for this Path entry
     */
    fullpath() {
        if (this.#fullpath !== undefined) {
            return this.#fullpath;
        }
        const name = this.name;
        const p = this.parent;
        if (!p) {
            return (this.#fullpath = this.name);
        }
        const pv = p.fullpath();
        const fp = pv + (!p.parent ? '' : this.sep) + name;
        return (this.#fullpath = fp);
    }
    /**
     * On platforms other than windows, this is identical to fullpath.
     *
     * On windows, this is overridden to return the forward-slash form of the
     * full UNC path.
     */
    fullpathPosix() {
        if (this.#fullpathPosix !== undefined)
            return this.#fullpathPosix;
        if (this.sep === '/')
            return (this.#fullpathPosix = this.fullpath());
        if (!this.parent) {
            const p = this.fullpath().replace(/\\/g, '/');
            if (/^[a-z]:\//i.test(p)) {
                return (this.#fullpathPosix = `//?/${p}`);
            }
            else {
                return (this.#fullpathPosix = p);
            }
        }
        const p = this.parent;
        const pfpp = p.fullpathPosix();
        const fpp = pfpp + (!pfpp || !p.parent ? '' : '/') + this.name;
        return (this.#fullpathPosix = fpp);
    }
    /**
     * Is the Path of an unknown type?
     *
     * Note that we might know *something* about it if there has been a previous
     * filesystem operation, for example that it does not exist, or is not a
     * link, or whether it has child entries.
     */
    isUnknown() {
        return (this.#type & IFMT) === UNKNOWN;
    }
    isType(type) {
        return this[`is${type}`]();
    }
    getType() {
        return (this.isUnknown() ? 'Unknown'
            : this.isDirectory() ? 'Directory'
                : this.isFile() ? 'File'
                    : this.isSymbolicLink() ? 'SymbolicLink'
                        : this.isFIFO() ? 'FIFO'
                            : this.isCharacterDevice() ? 'CharacterDevice'
                                : this.isBlockDevice() ? 'BlockDevice'
                                    : /* c8 ignore start */ this.isSocket() ? 'Socket'
                                        : 'Unknown');
        /* c8 ignore stop */
    }
    /**
     * Is the Path a regular file?
     */
    isFile() {
        return (this.#type & IFMT) === IFREG;
    }
    /**
     * Is the Path a directory?
     */
    isDirectory() {
        return (this.#type & IFMT) === IFDIR;
    }
    /**
     * Is the path a character device?
     */
    isCharacterDevice() {
        return (this.#type & IFMT) === IFCHR;
    }
    /**
     * Is the path a block device?
     */
    isBlockDevice() {
        return (this.#type & IFMT) === IFBLK;
    }
    /**
     * Is the path a FIFO pipe?
     */
    isFIFO() {
        return (this.#type & IFMT) === IFIFO;
    }
    /**
     * Is the path a socket?
     */
    isSocket() {
        return (this.#type & IFMT) === IFSOCK;
    }
    /**
     * Is the path a symbolic link?
     */
    isSymbolicLink() {
        return (this.#type & IFLNK) === IFLNK;
    }
    /**
     * Return the entry if it has been subject of a successful lstat, or
     * undefined otherwise.
     *
     * Does not read the filesystem, so an undefined result *could* simply
     * mean that we haven't called lstat on it.
     */
    lstatCached() {
        return this.#type & LSTAT_CALLED ? this : undefined;
    }
    /**
     * Return the cached link target if the entry has been the subject of a
     * successful readlink, or undefined otherwise.
     *
     * Does not read the filesystem, so an undefined result *could* just mean we
     * don't have any cached data. Only use it if you are very sure that a
     * readlink() has been called at some point.
     */
    readlinkCached() {
        return this.#linkTarget;
    }
    /**
     * Returns the cached realpath target if the entry has been the subject
     * of a successful realpath, or undefined otherwise.
     *
     * Does not read the filesystem, so an undefined result *could* just mean we
     * don't have any cached data. Only use it if you are very sure that a
     * realpath() has been called at some point.
     */
    realpathCached() {
        return this.#realpath;
    }
    /**
     * Returns the cached child Path entries array if the entry has been the
     * subject of a successful readdir(), or [] otherwise.
     *
     * Does not read the filesystem, so an empty array *could* just mean we
     * don't have any cached data. Only use it if you are very sure that a
     * readdir() has been called recently enough to still be valid.
     */
    readdirCached() {
        const children = this.children();
        return children.slice(0, children.provisional);
    }
    /**
     * Return true if it's worth trying to readlink.  Ie, we don't (yet) have
     * any indication that readlink will definitely fail.
     *
     * Returns false if the path is known to not be a symlink, if a previous
     * readlink failed, or if the entry does not exist.
     */
    canReadlink() {
        if (this.#linkTarget)
            return true;
        if (!this.parent)
            return false;
        // cases where it cannot possibly succeed
        const ifmt = this.#type & IFMT;
        return !((ifmt !== UNKNOWN && ifmt !== IFLNK) ||
            this.#type & ENOREADLINK ||
            this.#type & ENOENT);
    }
    /**
     * Return true if readdir has previously been successfully called on this
     * path, indicating that cachedReaddir() is likely valid.
     */
    calledReaddir() {
        return !!(this.#type & READDIR_CALLED);
    }
    /**
     * Returns true if the path is known to not exist. That is, a previous lstat
     * or readdir failed to verify its existence when that would have been
     * expected, or a parent entry was marked either enoent or enotdir.
     */
    isENOENT() {
        return !!(this.#type & ENOENT);
    }
    /**
     * Return true if the path is a match for the given path name.  This handles
     * case sensitivity and unicode normalization.
     *
     * Note: even on case-sensitive systems, it is **not** safe to test the
     * equality of the `.name` property to determine whether a given pathname
     * matches, due to unicode normalization mismatches.
     *
     * Always use this method instead of testing the `path.name` property
     * directly.
     */
    isNamed(n) {
        return !this.nocase ?
            this.#matchName === normalize(n)
            : this.#matchName === normalizeNocase(n);
    }
    /**
     * Return the Path object corresponding to the target of a symbolic link.
     *
     * If the Path is not a symbolic link, or if the readlink call fails for any
     * reason, `undefined` is returned.
     *
     * Result is cached, and thus may be outdated if the filesystem is mutated.
     */
    async readlink() {
        const target = this.#linkTarget;
        if (target) {
            return target;
        }
        if (!this.canReadlink()) {
            return undefined;
        }
        /* c8 ignore start */
        // already covered by the canReadlink test, here for ts grumples
        if (!this.parent) {
            return undefined;
        }
        /* c8 ignore stop */
        try {
            const read = await this.#fs.promises.readlink(this.fullpath());
            const linkTarget = (await this.parent.realpath())?.resolve(read);
            if (linkTarget) {
                return (this.#linkTarget = linkTarget);
            }
        }
        catch (er) {
            this.#readlinkFail(er.code);
            return undefined;
        }
    }
    /**
     * Synchronous {@link PathBase.readlink}
     */
    readlinkSync() {
        const target = this.#linkTarget;
        if (target) {
            return target;
        }
        if (!this.canReadlink()) {
            return undefined;
        }
        /* c8 ignore start */
        // already covered by the canReadlink test, here for ts grumples
        if (!this.parent) {
            return undefined;
        }
        /* c8 ignore stop */
        try {
            const read = this.#fs.readlinkSync(this.fullpath());
            const linkTarget = this.parent.realpathSync()?.resolve(read);
            if (linkTarget) {
                return (this.#linkTarget = linkTarget);
            }
        }
        catch (er) {
            this.#readlinkFail(er.code);
            return undefined;
        }
    }
    #readdirSuccess(children) {
        // succeeded, mark readdir called bit
        this.#type |= READDIR_CALLED;
        // mark all remaining provisional children as ENOENT
        for (let p = children.provisional; p < children.length; p++) {
            const c = children[p];
            if (c)
                c.#markENOENT();
        }
    }
    #markENOENT() {
        // mark as UNKNOWN and ENOENT
        if (this.#type & ENOENT)
            return;
        this.#type = (this.#type | ENOENT) & IFMT_UNKNOWN;
        this.#markChildrenENOENT();
    }
    #markChildrenENOENT() {
        // all children are provisional and do not exist
        const children = this.children();
        children.provisional = 0;
        for (const p of children) {
            p.#markENOENT();
        }
    }
    #markENOREALPATH() {
        this.#type |= ENOREALPATH;
        this.#markENOTDIR();
    }
    // save the information when we know the entry is not a dir
    #markENOTDIR() {
        // entry is not a directory, so any children can't exist.
        // this *should* be impossible, since any children created
        // after it's been marked ENOTDIR should be marked ENOENT,
        // so it won't even get to this point.
        /* c8 ignore start */
        if (this.#type & ENOTDIR)
            return;
        /* c8 ignore stop */
        let t = this.#type;
        // this could happen if we stat a dir, then delete it,
        // then try to read it or one of its children.
        if ((t & IFMT) === IFDIR)
            t &= IFMT_UNKNOWN;
        this.#type = t | ENOTDIR;
        this.#markChildrenENOENT();
    }
    #readdirFail(code = '') {
        // markENOTDIR and markENOENT also set provisional=0
        if (code === 'ENOTDIR' || code === 'EPERM') {
            this.#markENOTDIR();
        }
        else if (code === 'ENOENT') {
            this.#markENOENT();
        }
        else {
            this.children().provisional = 0;
        }
    }
    #lstatFail(code = '') {
        // Windows just raises ENOENT in this case, disable for win CI
        /* c8 ignore start */
        if (code === 'ENOTDIR') {
            // already know it has a parent by this point
            const p = this.parent;
            p.#markENOTDIR();
        }
        else if (code === 'ENOENT') {
            /* c8 ignore stop */
            this.#markENOENT();
        }
    }
    #readlinkFail(code = '') {
        let ter = this.#type;
        ter |= ENOREADLINK;
        if (code === 'ENOENT')
            ter |= ENOENT;
        // windows gets a weird error when you try to readlink a file
        if (code === 'EINVAL' || code === 'UNKNOWN') {
            // exists, but not a symlink, we don't know WHAT it is, so remove
            // all IFMT bits.
            ter &= IFMT_UNKNOWN;
        }
        this.#type = ter;
        // windows just gets ENOENT in this case.  We do cover the case,
        // just disabled because it's impossible on Windows CI
        /* c8 ignore start */
        if (code === 'ENOTDIR' && this.parent) {
            this.parent.#markENOTDIR();
        }
        /* c8 ignore stop */
    }
    #readdirAddChild(e, c) {
        return (this.#readdirMaybePromoteChild(e, c) ||
            this.#readdirAddNewChild(e, c));
    }
    #readdirAddNewChild(e, c) {
        // alloc new entry at head, so it's never provisional
        const type = entToType(e);
        const child = this.newChild(e.name, type, { parent: this });
        const ifmt = child.#type & IFMT;
        if (ifmt !== IFDIR && ifmt !== IFLNK && ifmt !== UNKNOWN) {
            child.#type |= ENOTDIR;
        }
        c.unshift(child);
        c.provisional++;
        return child;
    }
    #readdirMaybePromoteChild(e, c) {
        for (let p = c.provisional; p < c.length; p++) {
            const pchild = c[p];
            const name = this.nocase ? normalizeNocase(e.name) : normalize(e.name);
            if (name !== pchild.#matchName) {
                continue;
            }
            return this.#readdirPromoteChild(e, pchild, p, c);
        }
    }
    #readdirPromoteChild(e, p, index, c) {
        const v = p.name;
        // retain any other flags, but set ifmt from dirent
        p.#type = (p.#type & IFMT_UNKNOWN) | entToType(e);
        // case sensitivity fixing when we learn the true name.
        if (v !== e.name)
            p.name = e.name;
        // just advance provisional index (potentially off the list),
        // otherwise we have to splice/pop it out and re-insert at head
        if (index !== c.provisional) {
            if (index === c.length - 1)
                c.pop();
            else
                c.splice(index, 1);
            c.unshift(p);
        }
        c.provisional++;
        return p;
    }
    /**
     * Call lstat() on this Path, and update all known information that can be
     * determined.
     *
     * Note that unlike `fs.lstat()`, the returned value does not contain some
     * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
     * information is required, you will need to call `fs.lstat` yourself.
     *
     * If the Path refers to a nonexistent file, or if the lstat call fails for
     * any reason, `undefined` is returned.  Otherwise the updated Path object is
     * returned.
     *
     * Results are cached, and thus may be out of date if the filesystem is
     * mutated.
     */
    async lstat() {
        if ((this.#type & ENOENT) === 0) {
            try {
                this.#applyStat(await this.#fs.promises.lstat(this.fullpath()));
                return this;
            }
            catch (er) {
                this.#lstatFail(er.code);
            }
        }
    }
    /**
     * synchronous {@link PathBase.lstat}
     */
    lstatSync() {
        if ((this.#type & ENOENT) === 0) {
            try {
                this.#applyStat(this.#fs.lstatSync(this.fullpath()));
                return this;
            }
            catch (er) {
                this.#lstatFail(er.code);
            }
        }
    }
    #applyStat(st) {
        const { atime, atimeMs, birthtime, birthtimeMs, blksize, blocks, ctime, ctimeMs, dev, gid, ino, mode, mtime, mtimeMs, nlink, rdev, size, uid, } = st;
        this.#atime = atime;
        this.#atimeMs = atimeMs;
        this.#birthtime = birthtime;
        this.#birthtimeMs = birthtimeMs;
        this.#blksize = blksize;
        this.#blocks = blocks;
        this.#ctime = ctime;
        this.#ctimeMs = ctimeMs;
        this.#dev = dev;
        this.#gid = gid;
        this.#ino = ino;
        this.#mode = mode;
        this.#mtime = mtime;
        this.#mtimeMs = mtimeMs;
        this.#nlink = nlink;
        this.#rdev = rdev;
        this.#size = size;
        this.#uid = uid;
        const ifmt = entToType(st);
        // retain any other flags, but set the ifmt
        this.#type = (this.#type & IFMT_UNKNOWN) | ifmt | LSTAT_CALLED;
        if (ifmt !== UNKNOWN && ifmt !== IFDIR && ifmt !== IFLNK) {
            this.#type |= ENOTDIR;
        }
    }
    #onReaddirCB = [];
    #readdirCBInFlight = false;
    #callOnReaddirCB(children) {
        this.#readdirCBInFlight = false;
        const cbs = this.#onReaddirCB.slice();
        this.#onReaddirCB.length = 0;
        cbs.forEach(cb => cb(null, children));
    }
    /**
     * Standard node-style callback interface to get list of directory entries.
     *
     * If the Path cannot or does not contain any children, then an empty array
     * is returned.
     *
     * Results are cached, and thus may be out of date if the filesystem is
     * mutated.
     *
     * @param cb The callback called with (er, entries).  Note that the `er`
     * param is somewhat extraneous, as all readdir() errors are handled and
     * simply result in an empty set of entries being returned.
     * @param allowZalgo Boolean indicating that immediately known results should
     * *not* be deferred with `queueMicrotask`. Defaults to `false`. Release
     * zalgo at your peril, the dark pony lord is devious and unforgiving.
     */
    readdirCB(cb, allowZalgo = false) {
        if (!this.canReaddir()) {
            if (allowZalgo)
                cb(null, []);
            else
                queueMicrotask(() => cb(null, []));
            return;
        }
        const children = this.children();
        if (this.calledReaddir()) {
            const c = children.slice(0, children.provisional);
            if (allowZalgo)
                cb(null, c);
            else
                queueMicrotask(() => cb(null, c));
            return;
        }
        // don't have to worry about zalgo at this point.
        this.#onReaddirCB.push(cb);
        if (this.#readdirCBInFlight) {
            return;
        }
        this.#readdirCBInFlight = true;
        // else read the directory, fill up children
        // de-provisionalize any provisional children.
        const fullpath = this.fullpath();
        this.#fs.readdir(fullpath, { withFileTypes: true }, (er, entries) => {
            if (er) {
                this.#readdirFail(er.code);
                children.provisional = 0;
            }
            else {
                // if we didn't get an error, we always get entries.
                //@ts-ignore
                for (const e of entries) {
                    this.#readdirAddChild(e, children);
                }
                this.#readdirSuccess(children);
            }
            this.#callOnReaddirCB(children.slice(0, children.provisional));
            return;
        });
    }
    #asyncReaddirInFlight;
    /**
     * Return an array of known child entries.
     *
     * If the Path cannot or does not contain any children, then an empty array
     * is returned.
     *
     * Results are cached, and thus may be out of date if the filesystem is
     * mutated.
     */
    async readdir() {
        if (!this.canReaddir()) {
            return [];
        }
        const children = this.children();
        if (this.calledReaddir()) {
            return children.slice(0, children.provisional);
        }
        // else read the directory, fill up children
        // de-provisionalize any provisional children.
        const fullpath = this.fullpath();
        if (this.#asyncReaddirInFlight) {
            await this.#asyncReaddirInFlight;
        }
        else {
            /* c8 ignore start */
            let resolve = () => { };
            /* c8 ignore stop */
            this.#asyncReaddirInFlight = new Promise(res => (resolve = res));
            try {
                for (const e of await this.#fs.promises.readdir(fullpath, {
                    withFileTypes: true,
                })) {
                    this.#readdirAddChild(e, children);
                }
                this.#readdirSuccess(children);
            }
            catch (er) {
                this.#readdirFail(er.code);
                children.provisional = 0;
            }
            this.#asyncReaddirInFlight = undefined;
            resolve();
        }
        return children.slice(0, children.provisional);
    }
    /**
     * synchronous {@link PathBase.readdir}
     */
    readdirSync() {
        if (!this.canReaddir()) {
            return [];
        }
        const children = this.children();
        if (this.calledReaddir()) {
            return children.slice(0, children.provisional);
        }
        // else read the directory, fill up children
        // de-provisionalize any provisional children.
        const fullpath = this.fullpath();
        try {
            for (const e of this.#fs.readdirSync(fullpath, {
                withFileTypes: true,
            })) {
                this.#readdirAddChild(e, children);
            }
            this.#readdirSuccess(children);
        }
        catch (er) {
            this.#readdirFail(er.code);
            children.provisional = 0;
        }
        return children.slice(0, children.provisional);
    }
    canReaddir() {
        if (this.#type & ENOCHILD)
            return false;
        const ifmt = IFMT & this.#type;
        // we always set ENOTDIR when setting IFMT, so should be impossible
        /* c8 ignore start */
        if (!(ifmt === UNKNOWN || ifmt === IFDIR || ifmt === IFLNK)) {
            return false;
        }
        /* c8 ignore stop */
        return true;
    }
    shouldWalk(dirs, walkFilter) {
        return ((this.#type & IFDIR) === IFDIR &&
            !(this.#type & ENOCHILD) &&
            !dirs.has(this) &&
            (!walkFilter || walkFilter(this)));
    }
    /**
     * Return the Path object corresponding to path as resolved
     * by realpath(3).
     *
     * If the realpath call fails for any reason, `undefined` is returned.
     *
     * Result is cached, and thus may be outdated if the filesystem is mutated.
     * On success, returns a Path object.
     */
    async realpath() {
        if (this.#realpath)
            return this.#realpath;
        if ((ENOREALPATH | ENOREADLINK | ENOENT) & this.#type)
            return undefined;
        try {
            const rp = await this.#fs.promises.realpath(this.fullpath());
            return (this.#realpath = this.resolve(rp));
        }
        catch (_) {
            this.#markENOREALPATH();
        }
    }
    /**
     * Synchronous {@link realpath}
     */
    realpathSync() {
        if (this.#realpath)
            return this.#realpath;
        if ((ENOREALPATH | ENOREADLINK | ENOENT) & this.#type)
            return undefined;
        try {
            const rp = this.#fs.realpathSync(this.fullpath());
            return (this.#realpath = this.resolve(rp));
        }
        catch (_) {
            this.#markENOREALPATH();
        }
    }
    /**
     * Internal method to mark this Path object as the scurry cwd,
     * called by {@link PathScurry#chdir}
     *
     * @internal
     */
    [setAsCwd](oldCwd) {
        if (oldCwd === this)
            return;
        oldCwd.isCWD = false;
        this.isCWD = true;
        const changed = new Set([]);
        let rp = [];
        let p = this;
        while (p && p.parent) {
            changed.add(p);
            p.#relative = rp.join(this.sep);
            p.#relativePosix = rp.join('/');
            p = p.parent;
            rp.push('..');
        }
        // now un-memoize parents of old cwd
        p = oldCwd;
        while (p && p.parent && !changed.has(p)) {
            p.#relative = undefined;
            p.#relativePosix = undefined;
            p = p.parent;
        }
    }
}
exports.PathBase = PathBase;
/**
 * Path class used on win32 systems
 *
 * Uses `'\\'` as the path separator for returned paths, either `'\\'` or `'/'`
 * as the path separator for parsing paths.
 */
class PathWin32 extends PathBase {
    /**
     * Separator for generating path strings.
     */
    sep = '\\';
    /**
     * Separator for parsing path strings.
     */
    splitSep = eitherSep;
    /**
     * Do not create new Path objects directly.  They should always be accessed
     * via the PathScurry class or other methods on the Path class.
     *
     * @internal
     */
    constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
        super(name, type, root, roots, nocase, children, opts);
    }
    /**
     * @internal
     */
    newChild(name, type = UNKNOWN, opts = {}) {
        return new PathWin32(name, type, this.root, this.roots, this.nocase, this.childrenCache(), opts);
    }
    /**
     * @internal
     */
    getRootString(path) {
        return node_path_1.win32.parse(path).root;
    }
    /**
     * @internal
     */
    getRoot(rootPath) {
        rootPath = uncToDrive(rootPath.toUpperCase());
        if (rootPath === this.root.name) {
            return this.root;
        }
        // ok, not that one, check if it matches another we know about
        for (const [compare, root] of Object.entries(this.roots)) {
            if (this.sameRoot(rootPath, compare)) {
                return (this.roots[rootPath] = root);
            }
        }
        // otherwise, have to create a new one.
        return (this.roots[rootPath] = new PathScurryWin32(rootPath, this).root);
    }
    /**
     * @internal
     */
    sameRoot(rootPath, compare = this.root.name) {
        // windows can (rarely) have case-sensitive filesystem, but
        // UNC and drive letters are always case-insensitive, and canonically
        // represented uppercase.
        rootPath = rootPath
            .toUpperCase()
            .replace(/\//g, '\\')
            .replace(uncDriveRegexp, '$1\\');
        return rootPath === compare;
    }
}
exports.PathWin32 = PathWin32;
/**
 * Path class used on all posix systems.
 *
 * Uses `'/'` as the path separator.
 */
class PathPosix extends PathBase {
    /**
     * separator for parsing path strings
     */
    splitSep = '/';
    /**
     * separator for generating path strings
     */
    sep = '/';
    /**
     * Do not create new Path objects directly.  They should always be accessed
     * via the PathScurry class or other methods on the Path class.
     *
     * @internal
     */
    constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
        super(name, type, root, roots, nocase, children, opts);
    }
    /**
     * @internal
     */
    getRootString(path) {
        return path.startsWith('/') ? '/' : '';
    }
    /**
     * @internal
     */
    getRoot(_rootPath) {
        return this.root;
    }
    /**
     * @internal
     */
    newChild(name, type = UNKNOWN, opts = {}) {
        return new PathPosix(name, type, this.root, this.roots, this.nocase, this.childrenCache(), opts);
    }
}
exports.PathPosix = PathPosix;
/**
 * The base class for all PathScurry classes, providing the interface for path
 * resolution and filesystem operations.
 *
 * Typically, you should *not* instantiate this class directly, but rather one
 * of the platform-specific classes, or the exported {@link PathScurry} which
 * defaults to the current platform.
 */
class PathScurryBase {
    /**
     * The root Path entry for the current working directory of this Scurry
     */
    root;
    /**
     * The string path for the root of this Scurry's current working directory
     */
    rootPath;
    /**
     * A collection of all roots encountered, referenced by rootPath
     */
    roots;
    /**
     * The Path entry corresponding to this PathScurry's current working directory.
     */
    cwd;
    #resolveCache;
    #resolvePosixCache;
    #children;
    /**
     * Perform path comparisons case-insensitively.
     *
     * Defaults true on Darwin and Windows systems, false elsewhere.
     */
    nocase;
    #fs;
    /**
     * This class should not be instantiated directly.
     *
     * Use PathScurryWin32, PathScurryDarwin, PathScurryPosix, or PathScurry
     *
     * @internal
     */
    constructor(cwd = process.cwd(), pathImpl, sep, { nocase, childrenCacheSize = 16 * 1024, fs = defaultFS, } = {}) {
        this.#fs = fsFromOption(fs);
        if (cwd instanceof URL || cwd.startsWith('file://')) {
            cwd = (0, node_url_1.fileURLToPath)(cwd);
        }
        // resolve and split root, and then add to the store.
        // this is the only time we call path.resolve()
        const cwdPath = pathImpl.resolve(cwd);
        this.roots = Object.create(null);
        this.rootPath = this.parseRootPath(cwdPath);
        this.#resolveCache = new ResolveCache();
        this.#resolvePosixCache = new ResolveCache();
        this.#children = new ChildrenCache(childrenCacheSize);
        const split = cwdPath.substring(this.rootPath.length).split(sep);
        // resolve('/') leaves '', splits to [''], we don't want that.
        if (split.length === 1 && !split[0]) {
            split.pop();
        }
        /* c8 ignore start */
        if (nocase === undefined) {
            throw new TypeError('must provide nocase setting to PathScurryBase ctor');
        }
        /* c8 ignore stop */
        this.nocase = nocase;
        this.root = this.newRoot(this.#fs);
        this.roots[this.rootPath] = this.root;
        let prev = this.root;
        let len = split.length - 1;
        const joinSep = pathImpl.sep;
        let abs = this.rootPath;
        let sawFirst = false;
        for (const part of split) {
            const l = len--;
            prev = prev.child(part, {
                relative: new Array(l).fill('..').join(joinSep),
                relativePosix: new Array(l).fill('..').join('/'),
                fullpath: (abs += (sawFirst ? '' : joinSep) + part),
            });
            sawFirst = true;
        }
        this.cwd = prev;
    }
    /**
     * Get the depth of a provided path, string, or the cwd
     */
    depth(path = this.cwd) {
        if (typeof path === 'string') {
            path = this.cwd.resolve(path);
        }
        return path.depth();
    }
    /**
     * Return the cache of child entries.  Exposed so subclasses can create
     * child Path objects in a platform-specific way.
     *
     * @internal
     */
    childrenCache() {
        return this.#children;
    }
    /**
     * Resolve one or more path strings to a resolved string
     *
     * Same interface as require('path').resolve.
     *
     * Much faster than path.resolve() when called multiple times for the same
     * path, because the resolved Path objects are cached.  Much slower
     * otherwise.
     */
    resolve(...paths) {
        // first figure out the minimum number of paths we have to test
        // we always start at cwd, but any absolutes will bump the start
        let r = '';
        for (let i = paths.length - 1; i >= 0; i--) {
            const p = paths[i];
            if (!p || p === '.')
                continue;
            r = r ? `${p}/${r}` : p;
            if (this.isAbsolute(p)) {
                break;
            }
        }
        const cached = this.#resolveCache.get(r);
        if (cached !== undefined) {
            return cached;
        }
        const result = this.cwd.resolve(r).fullpath();
        this.#resolveCache.set(r, result);
        return result;
    }
    /**
     * Resolve one or more path strings to a resolved string, returning
     * the posix path.  Identical to .resolve() on posix systems, but on
     * windows will return a forward-slash separated UNC path.
     *
     * Same interface as require('path').resolve.
     *
     * Much faster than path.resolve() when called multiple times for the same
     * path, because the resolved Path objects are cached.  Much slower
     * otherwise.
     */
    resolvePosix(...paths) {
        // first figure out the minimum number of paths we have to test
        // we always start at cwd, but any absolutes will bump the start
        let r = '';
        for (let i = paths.length - 1; i >= 0; i--) {
            const p = paths[i];
            if (!p || p === '.')
                continue;
            r = r ? `${p}/${r}` : p;
            if (this.isAbsolute(p)) {
                break;
            }
        }
        const cached = this.#resolvePosixCache.get(r);
        if (cached !== undefined) {
            return cached;
        }
        const result = this.cwd.resolve(r).fullpathPosix();
        this.#resolvePosixCache.set(r, result);
        return result;
    }
    /**
     * find the relative path from the cwd to the supplied path string or entry
     */
    relative(entry = this.cwd) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        return entry.relative();
    }
    /**
     * find the relative path from the cwd to the supplied path string or
     * entry, using / as the path delimiter, even on Windows.
     */
    relativePosix(entry = this.cwd) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        return entry.relativePosix();
    }
    /**
     * Return the basename for the provided string or Path object
     */
    basename(entry = this.cwd) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        return entry.name;
    }
    /**
     * Return the dirname for the provided string or Path object
     */
    dirname(entry = this.cwd) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        return (entry.parent || entry).fullpath();
    }
    async readdir(entry = this.cwd, opts = {
        withFileTypes: true,
    }) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
        }
        const { withFileTypes } = opts;
        if (!entry.canReaddir()) {
            return [];
        }
        else {
            const p = await entry.readdir();
            return withFileTypes ? p : p.map(e => e.name);
        }
    }
    readdirSync(entry = this.cwd, opts = {
        withFileTypes: true,
    }) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
        }
        const { withFileTypes = true } = opts;
        if (!entry.canReaddir()) {
            return [];
        }
        else if (withFileTypes) {
            return entry.readdirSync();
        }
        else {
            return entry.readdirSync().map(e => e.name);
        }
    }
    /**
     * Call lstat() on the string or Path object, and update all known
     * information that can be determined.
     *
     * Note that unlike `fs.lstat()`, the returned value does not contain some
     * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
     * information is required, you will need to call `fs.lstat` yourself.
     *
     * If the Path refers to a nonexistent file, or if the lstat call fails for
     * any reason, `undefined` is returned.  Otherwise the updated Path object is
     * returned.
     *
     * Results are cached, and thus may be out of date if the filesystem is
     * mutated.
     */
    async lstat(entry = this.cwd) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        return entry.lstat();
    }
    /**
     * synchronous {@link PathScurryBase.lstat}
     */
    lstatSync(entry = this.cwd) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        return entry.lstatSync();
    }
    async readlink(entry = this.cwd, { withFileTypes } = {
        withFileTypes: false,
    }) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            withFileTypes = entry.withFileTypes;
            entry = this.cwd;
        }
        const e = await entry.readlink();
        return withFileTypes ? e : e?.fullpath();
    }
    readlinkSync(entry = this.cwd, { withFileTypes } = {
        withFileTypes: false,
    }) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            withFileTypes = entry.withFileTypes;
            entry = this.cwd;
        }
        const e = entry.readlinkSync();
        return withFileTypes ? e : e?.fullpath();
    }
    async realpath(entry = this.cwd, { withFileTypes } = {
        withFileTypes: false,
    }) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            withFileTypes = entry.withFileTypes;
            entry = this.cwd;
        }
        const e = await entry.realpath();
        return withFileTypes ? e : e?.fullpath();
    }
    realpathSync(entry = this.cwd, { withFileTypes } = {
        withFileTypes: false,
    }) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            withFileTypes = entry.withFileTypes;
            entry = this.cwd;
        }
        const e = entry.realpathSync();
        return withFileTypes ? e : e?.fullpath();
    }
    async walk(entry = this.cwd, opts = {}) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
        }
        const { withFileTypes = true, follow = false, filter, walkFilter, } = opts;
        const results = [];
        if (!filter || filter(entry)) {
            results.push(withFileTypes ? entry : entry.fullpath());
        }
        const dirs = new Set();
        const walk = (dir, cb) => {
            dirs.add(dir);
            dir.readdirCB((er, entries) => {
                /* c8 ignore start */
                if (er) {
                    return cb(er);
                }
                /* c8 ignore stop */
                let len = entries.length;
                if (!len)
                    return cb();
                const next = () => {
                    if (--len === 0) {
                        cb();
                    }
                };
                for (const e of entries) {
                    if (!filter || filter(e)) {
                        results.push(withFileTypes ? e : e.fullpath());
                    }
                    if (follow && e.isSymbolicLink()) {
                        e.realpath()
                            .then(r => (r?.isUnknown() ? r.lstat() : r))
                            .then(r => r?.shouldWalk(dirs, walkFilter) ? walk(r, next) : next());
                    }
                    else {
                        if (e.shouldWalk(dirs, walkFilter)) {
                            walk(e, next);
                        }
                        else {
                            next();
                        }
                    }
                }
            }, true); // zalgooooooo
        };
        const start = entry;
        return new Promise((res, rej) => {
            walk(start, er => {
                /* c8 ignore start */
                if (er)
                    return rej(er);
                /* c8 ignore stop */
                res(results);
            });
        });
    }
    walkSync(entry = this.cwd, opts = {}) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
        }
        const { withFileTypes = true, follow = false, filter, walkFilter, } = opts;
        const results = [];
        if (!filter || filter(entry)) {
            results.push(withFileTypes ? entry : entry.fullpath());
        }
        const dirs = new Set([entry]);
        for (const dir of dirs) {
            const entries = dir.readdirSync();
            for (const e of entries) {
                if (!filter || filter(e)) {
                    results.push(withFileTypes ? e : e.fullpath());
                }
                let r = e;
                if (e.isSymbolicLink()) {
                    if (!(follow && (r = e.realpathSync())))
                        continue;
                    if (r.isUnknown())
                        r.lstatSync();
                }
                if (r.shouldWalk(dirs, walkFilter)) {
                    dirs.add(r);
                }
            }
        }
        return results;
    }
    /**
     * Support for `for await`
     *
     * Alias for {@link PathScurryBase.iterate}
     *
     * Note: As of Node 19, this is very slow, compared to other methods of
     * walking.  Consider using {@link PathScurryBase.stream} if memory overhead
     * and backpressure are concerns, or {@link PathScurryBase.walk} if not.
     */
    [Symbol.asyncIterator]() {
        return this.iterate();
    }
    iterate(entry = this.cwd, options = {}) {
        // iterating async over the stream is significantly more performant,
        // especially in the warm-cache scenario, because it buffers up directory
        // entries in the background instead of waiting for a yield for each one.
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            options = entry;
            entry = this.cwd;
        }
        return this.stream(entry, options)[Symbol.asyncIterator]();
    }
    /**
     * Iterating over a PathScurry performs a synchronous walk.
     *
     * Alias for {@link PathScurryBase.iterateSync}
     */
    [Symbol.iterator]() {
        return this.iterateSync();
    }
    *iterateSync(entry = this.cwd, opts = {}) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
        }
        const { withFileTypes = true, follow = false, filter, walkFilter, } = opts;
        if (!filter || filter(entry)) {
            yield withFileTypes ? entry : entry.fullpath();
        }
        const dirs = new Set([entry]);
        for (const dir of dirs) {
            const entries = dir.readdirSync();
            for (const e of entries) {
                if (!filter || filter(e)) {
                    yield withFileTypes ? e : e.fullpath();
                }
                let r = e;
                if (e.isSymbolicLink()) {
                    if (!(follow && (r = e.realpathSync())))
                        continue;
                    if (r.isUnknown())
                        r.lstatSync();
                }
                if (r.shouldWalk(dirs, walkFilter)) {
                    dirs.add(r);
                }
            }
        }
    }
    stream(entry = this.cwd, opts = {}) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
        }
        const { withFileTypes = true, follow = false, filter, walkFilter, } = opts;
        const results = new minipass_1.Minipass({ objectMode: true });
        if (!filter || filter(entry)) {
            results.write(withFileTypes ? entry : entry.fullpath());
        }
        const dirs = new Set();
        const queue = [entry];
        let processing = 0;
        const process = () => {
            let paused = false;
            while (!paused) {
                const dir = queue.shift();
                if (!dir) {
                    if (processing === 0)
                        results.end();
                    return;
                }
                processing++;
                dirs.add(dir);
                const onReaddir = (er, entries, didRealpaths = false) => {
                    /* c8 ignore start */
                    if (er)
                        return results.emit('error', er);
                    /* c8 ignore stop */
                    if (follow && !didRealpaths) {
                        const promises = [];
                        for (const e of entries) {
                            if (e.isSymbolicLink()) {
                                promises.push(e
                                    .realpath()
                                    .then((r) => r?.isUnknown() ? r.lstat() : r));
                            }
                        }
                        if (promises.length) {
                            Promise.all(promises).then(() => onReaddir(null, entries, true));
                            return;
                        }
                    }
                    for (const e of entries) {
                        if (e && (!filter || filter(e))) {
                            if (!results.write(withFileTypes ? e : e.fullpath())) {
                                paused = true;
                            }
                        }
                    }
                    processing--;
                    for (const e of entries) {
                        const r = e.realpathCached() || e;
                        if (r.shouldWalk(dirs, walkFilter)) {
                            queue.push(r);
                        }
                    }
                    if (paused && !results.flowing) {
                        results.once('drain', process);
                    }
                    else if (!sync) {
                        process();
                    }
                };
                // zalgo containment
                let sync = true;
                dir.readdirCB(onReaddir, true);
                sync = false;
            }
        };
        process();
        return results;
    }
    streamSync(entry = this.cwd, opts = {}) {
        if (typeof entry === 'string') {
            entry = this.cwd.resolve(entry);
        }
        else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
        }
        const { withFileTypes = true, follow = false, filter, walkFilter, } = opts;
        const results = new minipass_1.Minipass({ objectMode: true });
        const dirs = new Set();
        if (!filter || filter(entry)) {
            results.write(withFileTypes ? entry : entry.fullpath());
        }
        const queue = [entry];
        let processing = 0;
        const process = () => {
            let paused = false;
            while (!paused) {
                const dir = queue.shift();
                if (!dir) {
                    if (processing === 0)
                        results.end();
                    return;
                }
                processing++;
                dirs.add(dir);
                const entries = dir.readdirSync();
                for (const e of entries) {
                    if (!filter || filter(e)) {
                        if (!results.write(withFileTypes ? e : e.fullpath())) {
                            paused = true;
                        }
                    }
                }
                processing--;
                for (const e of entries) {
                    let r = e;
                    if (e.isSymbolicLink()) {
                        if (!(follow && (r = e.realpathSync())))
                            continue;
                        if (r.isUnknown())
                            r.lstatSync();
                    }
                    if (r.shouldWalk(dirs, walkFilter)) {
                        queue.push(r);
                    }
                }
            }
            if (paused && !results.flowing)
                results.once('drain', process);
        };
        process();
        return results;
    }
    chdir(path = this.cwd) {
        const oldCwd = this.cwd;
        this.cwd = typeof path === 'string' ? this.cwd.resolve(path) : path;
        this.cwd[setAsCwd](oldCwd);
    }
}
exports.PathScurryBase = PathScurryBase;
/**
 * Windows implementation of {@link PathScurryBase}
 *
 * Defaults to case insensitve, uses `'\\'` to generate path strings.  Uses
 * {@link PathWin32} for Path objects.
 */
class PathScurryWin32 extends PathScurryBase {
    /**
     * separator for generating path strings
     */
    sep = '\\';
    constructor(cwd = process.cwd(), opts = {}) {
        const { nocase = true } = opts;
        super(cwd, node_path_1.win32, '\\', { ...opts, nocase });
        this.nocase = nocase;
        for (let p = this.cwd; p; p = p.parent) {
            p.nocase = this.nocase;
        }
    }
    /**
     * @internal
     */
    parseRootPath(dir) {
        // if the path starts with a single separator, it's not a UNC, and we'll
        // just get separator as the root, and driveFromUNC will return \
        // In that case, mount \ on the root from the cwd.
        return node_path_1.win32.parse(dir).root.toUpperCase();
    }
    /**
     * @internal
     */
    newRoot(fs) {
        return new PathWin32(this.rootPath, IFDIR, undefined, this.roots, this.nocase, this.childrenCache(), { fs });
    }
    /**
     * Return true if the provided path string is an absolute path
     */
    isAbsolute(p) {
        return (p.startsWith('/') || p.startsWith('\\') || /^[a-z]:(\/|\\)/i.test(p));
    }
}
exports.PathScurryWin32 = PathScurryWin32;
/**
 * {@link PathScurryBase} implementation for all posix systems other than Darwin.
 *
 * Defaults to case-sensitive matching, uses `'/'` to generate path strings.
 *
 * Uses {@link PathPosix} for Path objects.
 */
class PathScurryPosix extends PathScurryBase {
    /**
     * separator for generating path strings
     */
    sep = '/';
    constructor(cwd = process.cwd(), opts = {}) {
        const { nocase = false } = opts;
        super(cwd, node_path_1.posix, '/', { ...opts, nocase });
        this.nocase = nocase;
    }
    /**
     * @internal
     */
    parseRootPath(_dir) {
        return '/';
    }
    /**
     * @internal
     */
    newRoot(fs) {
        return new PathPosix(this.rootPath, IFDIR, undefined, this.roots, this.nocase, this.childrenCache(), { fs });
    }
    /**
     * Return true if the provided path string is an absolute path
     */
    isAbsolute(p) {
        return p.startsWith('/');
    }
}
exports.PathScurryPosix = PathScurryPosix;
/**
 * {@link PathScurryBase} implementation for Darwin (macOS) systems.
 *
 * Defaults to case-insensitive matching, uses `'/'` for generating path
 * strings.
 *
 * Uses {@link PathPosix} for Path objects.
 */
class PathScurryDarwin extends PathScurryPosix {
    constructor(cwd = process.cwd(), opts = {}) {
        const { nocase = true } = opts;
        super(cwd, { ...opts, nocase });
    }
}
exports.PathScurryDarwin = PathScurryDarwin;
/**
 * Default {@link PathBase} implementation for the current platform.
 *
 * {@link PathWin32} on Windows systems, {@link PathPosix} on all others.
 */
exports.Path = process.platform === 'win32' ? PathWin32 : PathPosix;
/**
 * Default {@link PathScurryBase} implementation for the current platform.
 *
 * {@link PathScurryWin32} on Windows systems, {@link PathScurryDarwin} on
 * Darwin (macOS) systems, {@link PathScurryPosix} on all others.
 */
exports.PathScurry = process.platform === 'win32' ? PathScurryWin32
    : process.platform === 'darwin' ? PathScurryDarwin
        : PathScurryPosix;
//# sourceMappingURL=index.js.map

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";


const {getKoalaServicesEnvironmentConfig} = __nccwpck_require__(716);

async function main() {
  const options = JSON.parse(process.argv[2]);
  if (typeof options !== 'object' || options === null || typeof options.actionTag !== 'string') {
    throw new Error('Invalid matrix helper arguments');
  }
  const result = await getKoalaServicesEnvironmentConfig({
    rootDir: '.',
    outputFormat: 'github-matrix',
    branch: options.branch || undefined,
    envFilter: options.envFilter,
    actionTag: options.actionTag,
    token: process.env.LOCKED_WORKFLOW_TOKEN || 'public',
    logEnabled: false,
    logs: [],
  });
  process.stdout.write(JSON.stringify(result));
}

main().catch(() => {
  // The upstream diagnostic buffer includes credentials and must stay private.
  process.stderr.write('Matrix configuration could not be read. Check the configuration and repository access.\n');
  process.exitCode = 1;
});

})();

module.exports = __webpack_exports__;
/******/ })()
;