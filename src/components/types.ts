export interface Parameter {
  name: string;
  type: string;
}

export interface FunctionData {
  name: string;
  parameters: Parameter[];
  returnType: string;
  lines: { start: number; end: number };
  code: string;
  innerFunctions?: FunctionData[];
}

export interface TestResult {
  executionTime: number;
  result: any;
  success: boolean;
}
