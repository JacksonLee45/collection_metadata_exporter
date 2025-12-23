import { useState } from 'react';

interface DebugResult {
    test: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    data?: any;
}

export const FrontifyDebugPanel = () => {
    const [results, setResults] = useState<DebugResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const domain = import.meta.env.VITE_FRONTIFY_DOMAIN;
    const token = import.meta.env.VITE_FRONTIFY_BEARER_TOKEN;
    const endpoint = `https://${domain}/graphql`;

    const addResult = (result: DebugResult) => {
        setResults(prev => [...prev, result]);
    };

    const runTest = async (
        testName: string,
        query: string,
        variables?: any
    ): Promise<any> => {
        addResult({ test: testName, status: 'pending', message: 'Running...' });

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ query, variables }),
            });

            const result = await response.json();

            if (result.errors) {
                addResult({
                    test: testName,
                    status: 'error',
                    message: result.errors.map((e: any) => e.message).join(', '),
                    data: result.errors,
                });
                return null;
            }

            addResult({
                test: testName,
                status: 'success',
                message: 'Success',
                data: result.data,
            });
            return result.data;
        } catch (error) {
            addResult({
                test: testName,
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    };

    const runAllTests = async () => {
        setIsRunning(true);
        setResults([]);

        // Test 1: Connection
        await runTest(
            'Connection Test',
            `query { __schema { queryType { name } } }`
        );

        // Test 2: Available Queries
        const schema = await runTest(
            'Available Queries',
            `query {
                __schema {
                    queryType {
                        fields {
                            name
                            description
                        }
                    }
                }
            }`
        );

        console.log('Available queries:', schema?.__schema?.queryType?.fields);

        // Test 3: Collections with pagination
        await runTest(
            'Collections (with pagination)',
            `query GetCollections($limit: Int!, $page: Int!) {
                collections(limit: $limit, page: $page) {
                    total
                    items {
                        id
                        name
                        assetCount
                    }
                }
            }`,
            { limit: 100, page: 1 }
        );

        // Test 4: Collections without pagination
        await runTest(
            'Collections (simple)',
            `query {
                collections {
                    total
                    items {
                        id
                        name
                    }
                }
            }`
        );

        // Test 5: Libraries
        await runTest(
            'Libraries Query',
            `query {
                libraries {
                    total
                    items {
                        id
                        name
                    }
                }
            }`
        );

        // Test 6: Projects
        await runTest(
            'Projects Query',
            `query {
                projects {
                    total
                    items {
                        id
                        name
                    }
                }
            }`
        );

        // Test 7: Brands
        await runTest(
            'Brands Query',
            `query {
                brands {
                    items {
                        id
                        name
                    }
                }
            }`
        );

        setIsRunning(false);
    };

    return (
        <div className="tw-p-6 tw-bg-gray-50 tw-rounded-lg">
            <h2 className="tw-text-xl tw-font-bold tw-mb-4">Frontify API Debug Panel</h2>
            
            <div className="tw-mb-4 tw-p-4 tw-bg-white tw-rounded tw-border">
                <h3 className="tw-font-semibold tw-mb-2">Configuration</h3>
                <p className="tw-text-sm tw-mb-1">
                    <strong>Domain:</strong> {domain || '❌ Not set'}
                </p>
                <p className="tw-text-sm tw-mb-1">
                    <strong>Token:</strong> {token ? `${token.substring(0, 10)}...` : '❌ Not set'}
                </p>
                <p className="tw-text-sm">
                    <strong>Endpoint:</strong> {endpoint}
                </p>
            </div>

            <button
                onClick={runAllTests}
                disabled={isRunning}
                className={`tw-px-6 tw-py-3 tw-rounded tw-font-semibold tw-mb-6 ${
                    isRunning
                        ? 'tw-bg-gray-300 tw-text-gray-500'
                        : 'tw-bg-blue-600 tw-text-white hover:tw-bg-blue-700'
                }`}
            >
                {isRunning ? 'Running Tests...' : 'Run All API Tests'}
            </button>

            <div className="tw-space-y-3">
                {results.map((result, index) => (
                    <div
                        key={index}
                        className={`tw-p-4 tw-rounded tw-border ${
                            result.status === 'success'
                                ? 'tw-bg-green-50 tw-border-green-200'
                                : result.status === 'error'
                                ? 'tw-bg-red-50 tw-border-red-200'
                                : 'tw-bg-blue-50 tw-border-blue-200'
                        }`}
                    >
                        <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                            <h4 className="tw-font-semibold">{result.test}</h4>
                            <span
                                className={`tw-px-2 tw-py-1 tw-rounded tw-text-xs tw-font-semibold ${
                                    result.status === 'success'
                                        ? 'tw-bg-green-200 tw-text-green-800'
                                        : result.status === 'error'
                                        ? 'tw-bg-red-200 tw-text-red-800'
                                        : 'tw-bg-blue-200 tw-text-blue-800'
                                }`}
                            >
                                {result.status}
                            </span>
                        </div>
                        <p className="tw-text-sm tw-mb-2">{result.message}</p>
                        {result.data && (
                            <details className="tw-mt-2">
                                <summary className="tw-cursor-pointer tw-text-sm tw-font-medium tw-text-gray-700">
                                    View Data
                                </summary>
                                <pre className="tw-mt-2 tw-p-2 tw-bg-gray-100 tw-rounded tw-text-xs tw-overflow-auto tw-max-h-60">
                                    {JSON.stringify(result.data, null, 2)}
                                </pre>
                            </details>
                        )}
                    </div>
                ))}
            </div>

            {results.length === 0 && (
                <div className="tw-text-center tw-text-gray-500 tw-py-8">
                    Click "Run All API Tests" to start debugging
                </div>
            )}
        </div>
    );
};