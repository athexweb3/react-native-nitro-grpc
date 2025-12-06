import { useState } from 'react';
import type { TestSuites } from '../types/tests';
import { grpc_tests } from '../tests/grpc_tests';

export const useTestsList = (): [
  TestSuites,
  (name: string) => void,
  () => void,
  () => void,
] => {
  const [suites, setSuites] = useState<TestSuites>({
    'gRPC Core': {
      value: true,
      tests: grpc_tests,
    },
  });

  const toggle = (name: string) => {
    setSuites(prev => {
      const copy = { ...prev };
      if (copy[name]) {
        copy[name] = { ...copy[name], value: !copy[name].value };
      }
      return copy;
    });
  };

  const checkAll = () => {
    setSuites(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(key => {
        if (copy[key]) copy[key]!.value = true;
      });
      return copy;
    });
  };

  const clearAll = () => {
    setSuites(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(key => {
        if (copy[key]) copy[key]!.value = false;
      });
      return copy;
    });
  };

  return [suites, toggle, checkAll, clearAll];
};
