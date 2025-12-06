import type { TaskResult } from 'tinybench';

export type BenchmarkResult = {
    errorMsg?: string;
    challenger?: string;
    notes?: string;
    benchName: string | undefined;
    them: Readonly<TaskResult> | undefined;
    us: Readonly<TaskResult> | undefined;
};

export type TestResult = {
    type: 'correct' | 'incorrect';
    description: string;
    indentation: number;
    suiteName: string;
    errorMsg?: string;
    duration?: number;
};

export type SuiteResults<T> = {
    [key: string]: {
        results: T[];
    };
};

export type Stats = {
    start: Date;
    end: Date;
    duration: number;
    suites: number;
    tests: number;
    passes: number;
    pending: number;
    failures: number;
};
