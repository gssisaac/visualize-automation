import { FunctionData, TestResult } from './types';
import React, { useEffect, useState } from 'react';

import { demoData } from './demoData';

interface FunctionCardProps {
  func: FunctionData;
  level: number;
  onExecute: (funcName: string) => Promise<TestResult>;
  parentExecuting?: boolean;
}


const FunctionCard: React.FC<FunctionCardProps> = ({ func, level, onExecute, parentExecuting }) => {
  const [showCode, setShowCode] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (parentExecuting) {
      handleExecute();
    }
  }, [parentExecuting]);

  const handleViewCode = () => setShowCode(!showCode);

  const handleExecute = async () => {
    setIsExecuting(true);
    setTestResult(null);
    try {
      const result = await onExecute(func.name);
      setTestResult(result);
    } catch (error) {
      console.error(`Error executing ${func.name}:`, error);
      setTestResult({
        executionTime: 0,
        result: { error: 'Execution failed' },
        success: false
      });
    }
    setIsExecuting(false);
  };

  return (
    <div className={`border text-sm p-4 my-2 rounded ${level > 0 ? 'ml-8' : ''}`}>
      <h3 className="text-lg font-bold">{func.name}</h3>
      <p>Parameters: {func.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}</p>
      <p>Return type: {func.returnType}</p>
      <p>Lines: {func.lines.start} - {func.lines.end}</p>
      <div className="mt-2">
        <button onClick={handleViewCode} className="bg-gray-200 px-2 py-1 mr-2 rounded">
          {showCode ? 'Hide code' : 'View code'}
        </button>
        <button 
          onClick={handleExecute} 
          className={`${isExecuting ? 'bg-yellow-500' : 'bg-green-500'} text-white px-2 py-1 rounded`}
          disabled={isExecuting}
        >
          {isExecuting ? 'Executing...' : 'Execute'}
        </button>
      </div>
      {showCode && (
        <pre className="bg-gray-100 p-2 mt-2 overflow-x-auto">
          <code>{func.code}</code>
        </pre>
      )}
      {testResult && (
        <div className="mt-2 p-2 bg-gray-100">
          <p>Execution time: {testResult.executionTime.toFixed(2)}ms</p>
          <p>Result: {JSON.stringify(testResult.result)}</p>
          <p>Status: {testResult.success ? 'Success' : 'Failure'}</p>
        </div>
      )}
      {func.innerFunctions && func.innerFunctions.map((innerFunc, index) => (
        <FunctionCard 
          key={index} 
          func={innerFunc} 
          level={level + 1} 
          onExecute={onExecute}
          parentExecuting={isExecuting}
        />
      ))}
    </div>
  );
};

export const FlowViewer: React.FC<{ parseFiles: FunctionData[] }> = ({ parseFiles }) => {
  const executeFunctionMock = async (funcName: string): Promise<TestResult> => {
    // Simulate function execution
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    return {
      executionTime: Math.random() * 100,
      result: { message: `${funcName} executed successfully` },
      success: Math.random() > 0.6  // 90% success rate
    };
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Function Execution Viewer</h1>
      {demoData.map((func, index) => (
        <FunctionCard key={index} func={func} level={0} onExecute={executeFunctionMock} />
      ))}
    </div>
  );
};
