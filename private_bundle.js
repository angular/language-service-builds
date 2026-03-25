var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// packages/language-service/private.ts
var private_exports = {};
__export(private_exports, {
  TargetNodeKind: () => TargetNodeKind,
  getTargetAtPosition: () => getTargetAtPosition,
  getTcbNodesOfTemplateAtPosition: () => getTcbNodesOfTemplateAtPosition
});
module.exports = __toCommonJS(private_exports);

// packages/language-service/src/template_target.js
var import_compiler2 = require("@angular/compiler");
var import_comments = require("@angular/compiler-cli/src/ngtsc/typecheck/src/comments");
var import_typescript5 = __toESM(require("typescript"));

// packages/language-service/src/utils/index.js
var import_compiler = require("@angular/compiler");
var import_file_system = require("@angular/compiler-cli/src/ngtsc/file_system");
var import_metadata = require("@angular/compiler-cli/src/ngtsc/metadata");
var import_typescript4 = __toESM(require("typescript"));

// packages/language-service/src/utils/display_parts.js
var import_reflection = require("@angular/compiler-cli/src/ngtsc/reflection");
var import_api = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
var import_typescript = __toESM(require("typescript"));
var ALIAS_NAME = import_typescript.default.SymbolDisplayPartKind[import_typescript.default.SymbolDisplayPartKind.aliasName];
var SYMBOL_INTERFACE = import_typescript.default.SymbolDisplayPartKind[import_typescript.default.SymbolDisplayPartKind.interfaceName];
var SYMBOL_PUNC = import_typescript.default.SymbolDisplayPartKind[import_typescript.default.SymbolDisplayPartKind.punctuation];
var SYMBOL_SPACE = import_typescript.default.SymbolDisplayPartKind[import_typescript.default.SymbolDisplayPartKind.space];
var SYMBOL_TEXT = import_typescript.default.SymbolDisplayPartKind[import_typescript.default.SymbolDisplayPartKind.text];
var DisplayInfoKind;
(function(DisplayInfoKind2) {
  DisplayInfoKind2["ATTRIBUTE"] = "attribute";
  DisplayInfoKind2["BLOCK"] = "block";
  DisplayInfoKind2["TRIGGER"] = "trigger";
  DisplayInfoKind2["COMPONENT"] = "component";
  DisplayInfoKind2["DIRECTIVE"] = "directive";
  DisplayInfoKind2["EVENT"] = "event";
  DisplayInfoKind2["REFERENCE"] = "reference";
  DisplayInfoKind2["ELEMENT"] = "element";
  DisplayInfoKind2["VARIABLE"] = "variable";
  DisplayInfoKind2["PIPE"] = "pipe";
  DisplayInfoKind2["PROPERTY"] = "property";
  DisplayInfoKind2["METHOD"] = "method";
  DisplayInfoKind2["TEMPLATE"] = "template";
  DisplayInfoKind2["KEYWORD"] = "keyword";
  DisplayInfoKind2["LET"] = "let";
})(DisplayInfoKind || (DisplayInfoKind = {}));

// packages/language-service/src/utils/ts_utils.js
var import_api2 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
var import_typescript3 = __toESM(require("typescript"));

// packages/language-service/src/utils/format.js
var import_typescript2 = __toESM(require("typescript"));

// packages/language-service/src/utils/index.js
function isTemplateNodeWithKeyAndValue(node) {
  return isTemplateNode(node) && node.hasOwnProperty("keySpan");
}
function isWithinKeyValue(position, node) {
  let { keySpan, valueSpan } = node;
  if (valueSpan === void 0 && node instanceof import_compiler.TmplAstBoundEvent) {
    valueSpan = node.handlerSpan;
  }
  const isWithinKeyValue2 = isWithin(position, keySpan) || !!(valueSpan && isWithin(position, valueSpan));
  return isWithinKeyValue2;
}
function isTemplateNode(node) {
  return node.sourceSpan instanceof import_compiler.ParseSourceSpan;
}
function isWithin(position, span) {
  let start, end;
  if (span instanceof import_compiler.ParseSourceSpan) {
    start = span.start.offset;
    end = span.end.offset;
  } else {
    start = span.start;
    end = span.end;
  }
  return start <= position && position <= end;
}
function isBoundEventWithSyntheticHandler(event) {
  let handler = event.handler;
  if (handler instanceof import_compiler.ASTWithSource) {
    handler = handler.ast;
  }
  if (handler instanceof import_compiler.LiteralPrimitive && handler.value === "ERROR") {
    return true;
  }
  return false;
}

// packages/language-service/src/template_target.js
var TargetNodeKind;
(function(TargetNodeKind2) {
  TargetNodeKind2[TargetNodeKind2["RawExpression"] = 0] = "RawExpression";
  TargetNodeKind2[TargetNodeKind2["CallExpressionInArgContext"] = 1] = "CallExpressionInArgContext";
  TargetNodeKind2[TargetNodeKind2["RawTemplateNode"] = 2] = "RawTemplateNode";
  TargetNodeKind2[TargetNodeKind2["ElementInTagContext"] = 3] = "ElementInTagContext";
  TargetNodeKind2[TargetNodeKind2["ElementInBodyContext"] = 4] = "ElementInBodyContext";
  TargetNodeKind2[TargetNodeKind2["AttributeInKeyContext"] = 5] = "AttributeInKeyContext";
  TargetNodeKind2[TargetNodeKind2["AttributeInValueContext"] = 6] = "AttributeInValueContext";
  TargetNodeKind2[TargetNodeKind2["TwoWayBindingContext"] = 7] = "TwoWayBindingContext";
  TargetNodeKind2[TargetNodeKind2["ComponentInTagContext"] = 8] = "ComponentInTagContext";
  TargetNodeKind2[TargetNodeKind2["ComponentInBodyContext"] = 9] = "ComponentInBodyContext";
  TargetNodeKind2[TargetNodeKind2["DirectiveInNameContext"] = 10] = "DirectiveInNameContext";
  TargetNodeKind2[TargetNodeKind2["DirectiveInBodyContext"] = 11] = "DirectiveInBodyContext";
})(TargetNodeKind || (TargetNodeKind = {}));
var OutsideKeyValueMarkerAst = class extends import_compiler2.AST {
  visit() {
    return null;
  }
};
var OUTSIDE_K_V_MARKER = new OutsideKeyValueMarkerAst(new import_compiler2.ParseSpan(-1, -1), new import_compiler2.AbsoluteSourceSpan(-1, -1));
function getTargetAtPosition(template, position) {
  const path = TemplateTargetVisitor.visitTemplate(template, position);
  if (path.length === 0) {
    return null;
  }
  const candidate = path[path.length - 1];
  let context = null;
  for (let i = path.length - 2; i >= 0; i--) {
    const node = path[i];
    if (node instanceof import_compiler2.TmplAstTemplate) {
      context = node;
      break;
    }
  }
  let nodeInContext;
  if ((candidate instanceof import_compiler2.Call || candidate instanceof import_compiler2.SafeCall) && isWithin(position, candidate.argumentSpan)) {
    nodeInContext = {
      kind: TargetNodeKind.CallExpressionInArgContext,
      node: candidate
    };
  } else if (candidate instanceof import_compiler2.AST) {
    const parents = path.filter((value) => value instanceof import_compiler2.AST);
    parents.pop();
    nodeInContext = {
      kind: TargetNodeKind.RawExpression,
      node: candidate,
      parents
    };
  } else if (candidate instanceof import_compiler2.TmplAstElement) {
    nodeInContext = {
      kind: isWithinTagBody(position, candidate) ? TargetNodeKind.ElementInBodyContext : TargetNodeKind.ElementInTagContext,
      node: candidate
    };
  } else if (candidate instanceof import_compiler2.TmplAstComponent) {
    nodeInContext = {
      kind: isWithinTagBody(position, candidate) ? TargetNodeKind.ComponentInBodyContext : TargetNodeKind.ComponentInTagContext,
      node: candidate
    };
  } else if (candidate instanceof import_compiler2.TmplAstDirective) {
    const startSpan = candidate.startSourceSpan;
    const endOffset = startSpan.end.offset - (startSpan.toString().endsWith("(") ? 1 : 0);
    nodeInContext = {
      kind: position >= startSpan.start.offset && position <= endOffset ? TargetNodeKind.DirectiveInNameContext : TargetNodeKind.DirectiveInBodyContext,
      node: candidate
    };
  } else if ((candidate instanceof import_compiler2.TmplAstBoundAttribute || candidate instanceof import_compiler2.TmplAstBoundEvent || candidate instanceof import_compiler2.TmplAstTextAttribute) && candidate.keySpan !== void 0) {
    const previousCandidate = path[path.length - 2];
    if (candidate instanceof import_compiler2.TmplAstBoundEvent && previousCandidate instanceof import_compiler2.TmplAstBoundAttribute && candidate.name === previousCandidate.name + "Change") {
      const boundAttribute = previousCandidate;
      const boundEvent = candidate;
      nodeInContext = {
        kind: TargetNodeKind.TwoWayBindingContext,
        nodes: [boundAttribute, boundEvent]
      };
    } else if (isWithin(position, candidate.keySpan)) {
      nodeInContext = {
        kind: TargetNodeKind.AttributeInKeyContext,
        node: candidate
      };
    } else {
      nodeInContext = {
        kind: TargetNodeKind.AttributeInValueContext,
        node: candidate
      };
    }
  } else {
    nodeInContext = {
      kind: TargetNodeKind.RawTemplateNode,
      node: candidate
    };
  }
  let parent = null;
  if (nodeInContext.kind === TargetNodeKind.TwoWayBindingContext && path.length >= 3) {
    parent = path[path.length - 3];
  } else if (path.length >= 2) {
    parent = path[path.length - 2];
  }
  return { position, context: nodeInContext, template: context, parent };
}
function findFirstMatchingNodeForSourceSpan(tcb, sourceSpan) {
  return (0, import_comments.findFirstMatchingNode)(tcb, {
    withSpan: sourceSpan,
    filter: (node) => true
  });
}
function getTcbNodesOfTemplateAtPosition(typeCheckInfo, position, compiler) {
  var _a;
  const target = getTargetAtPosition(typeCheckInfo.nodes, position);
  if (target === null) {
    return null;
  }
  const tcb = compiler.getTemplateTypeChecker().getTypeCheckBlock(typeCheckInfo.declaration);
  if (tcb === null) {
    return null;
  }
  const tcbNodes = [];
  if (target.context.kind === TargetNodeKind.RawExpression) {
    const targetNode = target.context.node;
    if (targetNode instanceof import_compiler2.PropertyRead) {
      const tsNode = (0, import_comments.findFirstMatchingNode)(tcb, {
        withSpan: targetNode.nameSpan,
        filter: (node) => import_typescript5.default.isPropertyAccessExpression(node)
      });
      tcbNodes.push((_a = tsNode == null ? void 0 : tsNode.name) != null ? _a : null);
    } else {
      tcbNodes.push(findFirstMatchingNodeForSourceSpan(tcb, target.context.node.sourceSpan));
    }
  } else if (target.context.kind === TargetNodeKind.TwoWayBindingContext) {
    const targetNodes = target.context.nodes.map((n) => n.sourceSpan).map((node) => {
      return findFirstMatchingNodeForSourceSpan(tcb, node);
    });
    tcbNodes.push(...targetNodes);
  } else {
    tcbNodes.push(findFirstMatchingNodeForSourceSpan(tcb, target.context.node.sourceSpan));
  }
  return {
    nodes: tcbNodes.filter((n) => n !== null),
    componentTcbNode: tcb
  };
}
var TemplateTargetVisitor = class _TemplateTargetVisitor {
  // Position must be absolute in the source file.
  constructor(position) {
    __publicField(this, "position");
    // We need to keep a path instead of the last node because we might need more
    // context for the last node, for example what is the parent node?
    __publicField(this, "path", []);
    this.position = position;
  }
  static visitTemplate(template, position) {
    const visitor = new _TemplateTargetVisitor(position);
    visitor.visitAll(template);
    const { path } = visitor;
    const strictPath = path.filter((v) => v !== OUTSIDE_K_V_MARKER);
    const candidate = strictPath[strictPath.length - 1];
    const matchedASourceSpanButNotAKvSpan = path.some((v) => v === OUTSIDE_K_V_MARKER);
    if (matchedASourceSpanButNotAKvSpan && (candidate instanceof import_compiler2.TmplAstTemplate || candidate instanceof import_compiler2.TmplAstElement)) {
      return [];
    }
    return strictPath;
  }
  visit(node) {
    if (!isWithinNode(this.position, node)) {
      return;
    }
    const last = this.path[this.path.length - 1];
    const withinKeySpanOfLastNode = last && isTemplateNodeWithKeyAndValue(last) && isWithin(this.position, last.keySpan);
    const withinKeySpanOfCurrentNode = isTemplateNodeWithKeyAndValue(node) && isWithin(this.position, node.keySpan);
    if (withinKeySpanOfLastNode && !withinKeySpanOfCurrentNode) {
      return;
    }
    if (last instanceof import_compiler2.TmplAstUnknownBlock && isWithin(this.position, last.nameSpan)) {
      return;
    }
    if (isTemplateNodeWithKeyAndValue(node) && !isWithinKeyValue(this.position, node)) {
      this.path.push(OUTSIDE_K_V_MARKER);
    } else if (node instanceof import_compiler2.TmplAstHostElement) {
      this.path.push(node);
      this.visitAll(node.bindings);
      this.visitAll(node.listeners);
    } else {
      this.path.push(node);
      node.visit(this);
    }
  }
  visitElement(element) {
    this.visitDirectiveHost(element);
  }
  visitTemplate(template) {
    this.visitDirectiveHost(template);
  }
  visitComponent(component) {
    this.visitDirectiveHost(component);
  }
  visitDirective(directive) {
    this.visitDirectiveHost(directive);
  }
  visitDirectiveHost(node) {
    const isTemplate = node instanceof import_compiler2.TmplAstTemplate;
    const isDirective = node instanceof import_compiler2.TmplAstDirective;
    this.visitAll(node.attributes);
    if (!isDirective) {
      this.visitAll(node.directives);
    }
    this.visitAll(node.inputs);
    if (this.path[this.path.length - 1] !== node && !(this.path[this.path.length - 1] instanceof import_compiler2.TmplAstBoundAttribute)) {
      return;
    }
    this.visitAll(node.outputs);
    if (isTemplate) {
      this.visitAll(node.templateAttrs);
    }
    this.visitAll(node.references);
    if (isTemplate) {
      this.visitAll(node.variables);
    }
    if (this.path[this.path.length - 1] !== node) {
      return;
    }
    if (!isDirective) {
      this.visitAll(node.children);
    }
  }
  visitContent(content) {
    (0, import_compiler2.tmplAstVisitAll)(this, content.attributes);
    this.visitAll(content.children);
  }
  visitVariable(variable) {
  }
  visitReference(reference) {
  }
  visitTextAttribute(attribute) {
  }
  visitBoundAttribute(attribute) {
    if (attribute.valueSpan !== void 0) {
      this.visitBinding(attribute.value);
    }
  }
  visitBoundEvent(event) {
    if (!isBoundEventWithSyntheticHandler(event)) {
      this.visitBinding(event.handler);
    }
  }
  visitText(text) {
  }
  visitBoundText(text) {
    this.visitBinding(text.value);
  }
  visitIcu(icu) {
    for (const boundText of Object.values(icu.vars)) {
      this.visit(boundText);
    }
    for (const boundTextOrText of Object.values(icu.placeholders)) {
      this.visit(boundTextOrText);
    }
  }
  visitDeferredBlock(deferred) {
    deferred.visitAll(this);
  }
  visitDeferredBlockPlaceholder(block) {
    this.visitAll(block.children);
  }
  visitDeferredBlockError(block) {
    this.visitAll(block.children);
  }
  visitDeferredBlockLoading(block) {
    this.visitAll(block.children);
  }
  visitDeferredTrigger(trigger) {
    if (trigger instanceof import_compiler2.TmplAstBoundDeferredTrigger) {
      this.visitBinding(trigger.value);
    } else if (trigger instanceof import_compiler2.TmplAstViewportDeferredTrigger && trigger.options !== null) {
      this.visitBinding(trigger.options);
    }
  }
  visitSwitchBlock(block) {
    this.visitBinding(block.expression);
    this.visitAll(block.groups);
    this.visitAll(block.unknownBlocks);
    if (block.exhaustiveCheck) {
      this.visit(block.exhaustiveCheck);
    }
  }
  visitSwitchBlockCase(block) {
    block.expression && this.visitBinding(block.expression);
  }
  visitSwitchBlockCaseGroup(block) {
    this.visitAll(block.cases);
    this.visitAll(block.children);
  }
  visitSwitchExhaustiveCheck(block) {
  }
  visitForLoopBlock(block) {
    this.visit(block.item);
    this.visitAll(block.contextVariables);
    this.visitBinding(block.expression);
    this.visitBinding(block.trackBy);
    this.visitAll(block.children);
    block.empty && this.visit(block.empty);
  }
  visitForLoopBlockEmpty(block) {
    this.visitAll(block.children);
  }
  visitIfBlock(block) {
    this.visitAll(block.branches);
  }
  visitIfBlockBranch(block) {
    block.expression && this.visitBinding(block.expression);
    block.expressionAlias && this.visit(block.expressionAlias);
    this.visitAll(block.children);
  }
  visitUnknownBlock(block) {
  }
  visitLetDeclaration(decl) {
    this.visitBinding(decl.value);
  }
  visitAll(nodes) {
    for (const node of nodes) {
      this.visit(node);
    }
  }
  visitBinding(expression) {
    const visitor = new ExpressionVisitor(this.position);
    visitor.visit(expression, this.path);
  }
};
var ExpressionVisitor = class extends import_compiler2.RecursiveAstVisitor {
  // Position must be absolute in the source file.
  constructor(position) {
    super();
    __publicField(this, "position");
    this.position = position;
  }
  visit(node, path) {
    if (node instanceof import_compiler2.ASTWithSource) {
      node = node.ast;
    }
    if (isWithin(this.position, node.sourceSpan) && !(node instanceof import_compiler2.ImplicitReceiver) && !(node instanceof import_compiler2.ThisReceiver)) {
      path.push(node);
      node.visit(this, path);
    }
  }
};
function getSpanIncludingEndTag(ast) {
  const result = {
    start: ast.sourceSpan.start.offset,
    end: ast.sourceSpan.end.offset
  };
  if (ast instanceof import_compiler2.TmplAstElement || ast instanceof import_compiler2.TmplAstTemplate) {
    if (ast.endSourceSpan) {
      result.end = ast.endSourceSpan.end.offset;
    } else if (ast.children.length > 0) {
      result.end = getSpanIncludingEndTag(ast.children[ast.children.length - 1]).end;
    } else {
    }
  }
  return result;
}
function isWithinNode(position, node) {
  if (!(node instanceof import_compiler2.TmplAstHostElement)) {
    return isWithin(position, getSpanIncludingEndTag(node));
  }
  return node.bindings.length > 0 && node.bindings.some((binding) => isWithin(position, binding.sourceSpan)) || node.listeners.length > 0 && node.listeners.some((listener) => isWithin(position, listener.sourceSpan));
}
function isWithinTagBody(position, node) {
  const name = node instanceof import_compiler2.TmplAstComponent ? node.fullName : node.name;
  const tagEndPos = node.sourceSpan.start.offset + 1 + name.length;
  return position > tagEndPos;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TargetNodeKind,
  getTargetAtPosition,
  getTcbNodesOfTemplateAtPosition
});
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
//# sourceMappingURL=private_bundle.js.map
