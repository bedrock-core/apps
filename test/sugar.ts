// Rewrites JSX conditionals into carried visibility before a screen module runs.
// Keep this in sync with regolith-filters/ui-compiler/lib/sugar.ts: the build and
// tests must walk the same fixed screen shape.
import ts from 'typescript';

interface Edit {
  start: number;
  end: number;
  text: string;
}

const unparen = (expr: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expr) ? unparen(expr.expression) : expr;

const isJsxTag = (node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement =>
  ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);

const isNullish = (expr: ts.Expression): boolean =>
  expr.kind === ts.SyntaxKind.NullKeyword
  || (ts.isIdentifier(expr) && expr.text === 'undefined')
  || expr.kind === ts.SyntaxKind.FalseKeyword;

/** Rewrites supported JSX conditional children, or returns source unchanged. */
export const desugarJsxConditionals = (source: string, fileName = 'screen.tsx'): string => {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: Edit[] = [];

  const attributesOf = (element: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxAttributes =>
    ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;

  const carryVisible = (element: ts.JsxElement | ts.JsxSelfClosingElement, cond: string): void => {
    const attributes = attributesOf(element);
    const existing = attributes.properties.find(
      (attr): attr is ts.JsxAttribute => ts.isJsxAttribute(attr) && attr.name.getText(file) === 'visible',
    );

    if (existing === undefined) {
      const tag = ts.isJsxElement(element) ? element.openingElement.tagName : element.tagName;

      edits.push({ start: tag.end, end: tag.end, text: ` visible={${cond}} liveVisible={true}` });
      return;
    }

    const value = existing.initializer !== undefined && ts.isJsxExpression(existing.initializer)
      ? existing.initializer.expression?.getText(file)
      : existing.initializer?.getText(file);
    const merged = value === undefined ? cond : `(${value}) && (${cond})`;

    edits.push({ start: existing.getStart(file), end: existing.end, text: `visible={${merged}} liveVisible={true}` });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxExpression(node) && node.parent !== undefined
      && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      rewrite(node);

      if (edits.some(edit => edit.start >= node.getStart(file) && edit.end <= node.end)) { return; }
    }

    node.forEachChild(visit);
  };

  const rewrite = (container: ts.JsxExpression): void => {
    if (container.expression === undefined) { return; }

    const expr = unparen(container.expression);

    if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      const element = unparen(expr.right);

      if (!isJsxTag(element)) { return; }

      edits.push(
        { start: container.getStart(file), end: element.getStart(file), text: '' },
        { start: element.end, end: container.end, text: '' },
      );
      carryVisible(element, expr.left.getText(file));
      visit(element);
      return;
    }

    if (!ts.isConditionalExpression(expr)) { return; }

    const cond = expr.condition.getText(file);
    const whenTrue = unparen(expr.whenTrue);
    const whenFalse = unparen(expr.whenFalse);
    const kept = [
      ...isJsxTag(whenTrue) ? [{ element: whenTrue, cond }] : [],
      ...isJsxTag(whenFalse) ? [{ element: whenFalse, cond: `!(${cond})` }] : [],
    ];
    const accounted = kept.length
      + [whenTrue, whenFalse].filter(branch => !isJsxTag(branch) && isNullish(branch)).length;

    if (kept.length === 0 || accounted !== 2) { return; }

    let cursor = container.getStart(file);

    for (const { element, cond: branchCond } of kept) {
      edits.push({ start: cursor, end: element.getStart(file), text: '' });
      carryVisible(element, branchCond);
      visit(element);
      cursor = element.end;
    }

    edits.push({ start: cursor, end: container.end, text: '' });
  };

  visit(file);

  if (edits.length === 0) { return source; }

  edits.sort((a, b) => a.start - b.start);

  let out = '';
  let cursor = 0;

  for (const edit of edits) {
    out += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }

  return out + source.slice(cursor);
};
