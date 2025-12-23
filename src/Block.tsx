import { useBlockSettings } from '@frontify/app-bridge';
import { type BlockProps } from '@frontify/guideline-blocks-settings';
import { useEffect, useState, type FC } from 'react';
import { FrontifyService } from './frontifyService';
import type { Settings, FrontifyCollection } from './types';

export const CollectionExportBlock: FC<BlockProps> = ({ appBridge }) => {
    const [blockSettings] = useBlockSettings<Settings>(appBridge);
    const [collections, setCollections] = useState<FrontifyCollection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exportingId, setExportingId] = useState<string | null>(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');

    useEffect(() => {
        const loadCollections = async () => {
            setLoading(true);
            setError(null);

            try {
                console.log('=== FRONTIFY COLLECTION EXPORT DEBUG INFO ===');
                console.log('Environment variables:', {
                    domain: import.meta.env.VITE_FRONTIFY_DOMAIN,
                    hasToken: !!import.meta.env.VITE_FRONTIFY_BEARER_TOKEN,
                    libraryId: import.meta.env.VITE_LIBRARY_ID,
                });

                const service = new FrontifyService();
                
                console.log('Fetching collections from Frontify library...');
                const allCollections = await service.fetchAllCollections();
                console.log(`Fetched ${allCollections.length} collections`);

                if (allCollections.length > 0) {
                    console.log('Sample collection:', allCollections[0]);
                }

                setCollections(allCollections);

                if (allCollections.length === 0) {
                    setError(
                        'No collections found in this library. Please create collections in your Frontify library and add assets to them.'
                    );
                }

                console.log('=== END DEBUG INFO ===');
            } catch (err) {
                console.error('Error loading collections:', err);
                setError(
                    err instanceof Error
                        ? `Failed to load collections: ${err.message}`
                        : 'Failed to load collections from Frontify. Please check your environment configuration.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadCollections();
    }, []);

    const handleExport = async (collection: FrontifyCollection) => {
        setExportingId(collection.id);
        setError(null);

        try {
            console.log(`Exporting collection: ${collection.name} (${collection.id})`);
            
            const service = new FrontifyService();
            const assets = await service.fetchAllCollectionAssets(collection.id);
            
            console.log(`Fetched ${assets.length} assets from collection`);

            if (assets.length === 0) {
                throw new Error('Collection has no assets to export');
            }

            service.exportToCSV(assets, collection.name);
            
            console.log('CSV export completed successfully');
        } catch (err) {
            console.error('Error exporting collection:', err);
            setError(
                err instanceof Error
                    ? `Failed to export: ${err.message}`
                    : 'Failed to export collection. Please try again.'
            );
        } finally {
            setExportingId(null);
        }
    };

    const sortedCollections = [...collections].sort((a, b) => {
        if (blockSettings.sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else if (blockSettings.sortBy === 'count') {
            return b.assetCount - a.assetCount;
        }
        return 0;
    });

    const selectedCollection = collections.find(c => c.id === selectedCollectionId);

    const handleExportSelected = () => {
        if (selectedCollection) {
            handleExport(selectedCollection);
        }
    };

    return (
        <div className="tw-p-6 tw-max-w-2xl">
            <div className="tw-mb-6">
                <h2 className="tw-text-2xl tw-font-bold tw-mb-2">Collection Metadata Export</h2>
                <p className="tw-text-gray-600">
                    Export asset metadata from your Frontify collections as CSV files, including preview URLs and custom metadata fields.
                </p>
            </div>

            {loading && (
                <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-gray-50 tw-rounded-lg tw-py-16">
                    <div className="tw-animate-spin tw-rounded-full tw-h-12 tw-w-12 tw-border-b-2 tw-border-blue-600 tw-mb-4"></div>
                    <p className="tw-text-gray-600">Loading collections from Frontify...</p>
                </div>
            )}

            {error && (
                <div className="tw-bg-red-50 tw-border tw-border-red-200 tw-rounded-lg tw-p-4 tw-mb-6">
                    <h3 className="tw-text-red-800 tw-font-semibold tw-mb-2">Error</h3>
                    <p className="tw-text-red-600">{error}</p>
                </div>
            )}

            {!loading && !error && collections.length > 0 && (
                <div className="tw-space-y-6">
                    {/* Dropdown */}
                    <div>
                        <label htmlFor="collection-select" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                            Select Collection
                        </label>
                        <select
                            id="collection-select"
                            value={selectedCollectionId}
                            onChange={(e) => setSelectedCollectionId(e.target.value)}
                            className="tw-block tw-w-full tw-px-4 tw-py-3 tw-text-base tw-border tw-border-gray-300 tw-rounded-lg tw-shadow-sm focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-blue-500 tw-bg-white"
                        >
                            <option value="">-- Select a collection --</option>
                            {sortedCollections.map((collection) => (
                                <option key={collection.id} value={collection.id}>
                                    {collection.name} ({collection.assetCount} {collection.assetCount === 1 ? 'asset' : 'assets'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Collection Stats Panel */}
                    {selectedCollection && (
                        <div className="tw-bg-white tw-border tw-border-gray-200 tw-rounded-lg tw-p-6 tw-shadow-sm">
                            <div className="tw-mb-4">
                                <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-3">
                                    {selectedCollection.name}
                                </h3>
                                
                                <div className="tw-space-y-2">
                                    <div className="tw-flex tw-items-center tw-gap-2 tw-text-gray-700">
                                        <svg 
                                            className="tw-h-5 tw-w-5 tw-text-gray-400" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth={2} 
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                                            />
                                        </svg>
                                        <span className="tw-text-sm">
                                            <span className="tw-font-medium">Assets:</span> {selectedCollection.assetCount} {selectedCollection.assetCount === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>
                                    
                                    <div className="tw-flex tw-items-center tw-gap-2 tw-text-gray-700">
                                        <svg 
                                            className="tw-h-5 tw-w-5 tw-text-gray-400" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth={2} 
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                                            />
                                        </svg>
                                        <span className="tw-text-sm">
                                            <span className="tw-font-medium">Export includes:</span> All metadata, preview URLs, custom fields
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleExportSelected}
                                disabled={exportingId === selectedCollection.id}
                                className={`
                                    tw-w-full tw-px-6 tw-py-3 tw-rounded-lg tw-font-semibold tw-text-base tw-transition-all
                                    ${
                                        exportingId === selectedCollection.id
                                            ? 'tw-bg-gray-400 tw-text-gray-700 tw-cursor-not-allowed'
                                            : 'tw-bg-blue-600 tw-text-white hover:tw-bg-blue-700 tw-shadow-sm hover:tw-shadow-md'
                                    }
                                `}
                            >
                                {exportingId === selectedCollection.id ? (
                                    <span className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                                        <svg
                                            className="tw-animate-spin tw-h-5 tw-w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="tw-opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="tw-opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Exporting...
                                    </span>
                                ) : (
                                    <span className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                                        <svg 
                                            className="tw-h-5 tw-w-5" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth={2} 
                                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                                            />
                                        </svg>
                                        Export CSV with All Metadata
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Placeholder when no collection selected */}
                    {!selectedCollection && (
                        <div className="tw-bg-gray-50 tw-border tw-border-gray-200 tw-rounded-lg tw-p-8 tw-text-center">
                            <svg 
                                className="tw-mx-auto tw-h-12 tw-w-12 tw-text-gray-400 tw-mb-3" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                                />
                            </svg>
                            <p className="tw-text-gray-600">
                                Select a collection above to view details and export
                            </p>
                        </div>
                    )}
                </div>
            )}

            {!loading && !error && collections.length === 0 && (
                <div className="tw-bg-blue-50 tw-border tw-border-blue-200 tw-rounded-lg tw-p-6">
                    <h3 className="tw-text-blue-800 tw-font-semibold tw-mb-2">No Collections Found</h3>
                    <p className="tw-text-blue-600 tw-mb-4">
                        No collections were found in your Frontify instance.
                    </p>
                    <div className="tw-text-sm tw-text-blue-700">
                        <p className="tw-font-semibold tw-mb-2">To create collections:</p>
                        <ol className="tw-list-decimal tw-list-inside tw-space-y-1">
                            <li>Go to your Frontify Media Library</li>
                            <li>Create a new collection</li>
                            <li>Add assets to the collection</li>
                            <li>Refresh this page</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
};