import * as ts from 'typescript';

interface Parameter {
  name: string;
  type: string;
}

interface LineRange {
  start: number;
  end: number;
}

interface FunctionData {
  name: string;
  parameters: Parameter[];
  returnType: string;
  lines: LineRange;
  code: string;
  innerFunctions: FunctionData[];
  calledFunctions: string[];
}

export function parseTypeScriptCode(code: string): FunctionData[] {
  const sourceFile = ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true);
  const functions: FunctionData[] = [];

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const functionData = parseFunctionNode(node);
      functions.push(functionData);
    }

    ts.forEachChild(node, visit);
  }

  function parseFunctionNode(node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression): FunctionData {
    const name = ts.isFunctionDeclaration(node) && node.name ? node.name.getText() : 'anonymous';
    const parameters = node.parameters.map(param => ({
      name: param.name.getText(),
      type: param.type ? param.type.getText() : 'any'
    }));
    const returnType = node.type ? node.type.getText() : 'void';
    const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const code = node.getText();

    const calledFunctions = findCalledFunctions(node);

    return {
      name,
      parameters,
      returnType,
      lines: { start: startLine + 1, end: endLine + 1 },
      code,
      innerFunctions: [],
      calledFunctions
    };
  }

  function findCalledFunctions(node: ts.Node): string[] {
    const calledFunctions: string[] = [];

    function visitNode(n: ts.Node) {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        calledFunctions.push(n.expression.text);
      }
      ts.forEachChild(n, visitNode);
    }

    visitNode(node);
    return [...new Set(calledFunctions)];
  }

  visit(sourceFile);

  // 최상위 함수만 반환
  return functions.filter(func => !functions.some(f => f.innerFunctions.includes(func)));
}

function resolveCalledFunctions(func: FunctionData, functionMap: Map<string, FunctionData>) {
  func.calledFunctions = func.calledFunctions.filter(name => functionMap.has(name));
  for (const innerFunc of func.innerFunctions) {
    resolveCalledFunctions(innerFunc, functionMap);
  }
}

export function parseFiles(files: { path: string; content: string }[]): { path: string; functions: FunctionData[] }[] {
  return files.map(file => ({
    path: file.path,
    functions: parseTypeScriptCode(file.content)
  }));
}