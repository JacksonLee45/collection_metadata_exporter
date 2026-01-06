import { useBlockSettings, useEditorState, rgbObjectToRgbString } from '@frontify/app-bridge';
import { type BlockProps } from '@frontify/guideline-blocks-settings';
import { useEffect, useState, type FC } from 'react';
import { FrontifyService } from './frontifyService';
import type { Settings, FrontifyCollection } from './types';

export const CollectionExportBlock: FC<BlockProps> = ({ appBridge }) => {
    const [blockSettings] = useBlockSettings<Settings>(appBridge);
    const isEditing = useEditorState(appBridge);
    const [collections, setCollections] = useState<FrontifyCollection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);

    // Get configuration from block settings
    const libraryId = blockSettings.libraryId;
    const bearerToken = blockSettings.bearerToken;
    
    // Get domain from the current window location (block runs within Frontify)
    const domain = typeof window !== 'undefined' ? window.location.hostname : '';

    // Convert Frontify color objects to CSS strings, with fallbacks
    const primaryColor = blockSettings.primaryColor
        ? rgbObjectToRgbString(blockSettings.primaryColor)
        : '#2563eb'; // fallback to blue-600

    const textColor = blockSettings.textColor
        ? rgbObjectToRgbString(blockSettings.textColor)
        : '#4b5563'; // fallback to gray-600

    const borderColor = blockSettings.borderColor
        ? rgbObjectToRgbString(blockSettings.borderColor)
        : '#d1d5db'; // fallback to gray-300

    // Calculate hover color (slightly darker)
    const getPrimaryHoverColor = () => {
        if (!blockSettings.primaryColor) return '#1d4ed8'; // blue-700 fallback
        const { red, green, blue, alpha } = blockSettings.primaryColor;
        return `rgba(${Math.max(0, red - 20)}, ${Math.max(0, green - 20)}, ${Math.max(0, blue - 20)}, ${alpha})`;
    };

    const primaryHoverColor = getPrimaryHoverColor();

    // Check if configuration is complete
    const isConfigured = libraryId && bearerToken;

    useEffect(() => {
        const loadCollections = async () => {
            // Don't load if not configured
            if (!isConfigured) {
                setCollections([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                console.log('=== FRONTIFY COLLECTION EXPORT DEBUG INFO ===');
                console.log('Domain:', domain);
                console.log('Library ID:', libraryId);

                const service = new FrontifyService(domain, bearerToken, libraryId);

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
                        : 'Failed to load collections from Frontify. Please check your configuration.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadCollections();
    }, [domain, libraryId, bearerToken, isConfigured]);

    const handleExport = async () => {
        if (!selectedCollectionId || !isConfigured) return;

        const collection = collections.find((c) => c.id === selectedCollectionId);
        if (!collection) return;

        setIsExporting(true);
        setError(null);

        try {
            console.log(`Exporting collection: ${collection.name} (${collection.id})`);

            const service = new FrontifyService(domain, bearerToken, libraryId);
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
            setIsExporting(false);
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

    // Show configuration message if not configured
    if (!isConfigured) {
        return (
            <div className="tw-p-6">
                <div className="tw-mb-6">
                    <h2 className="tw-text-2xl tw-font-bold tw-mb-2" style={{ color: textColor }}>
                        Collection Metadata Export
                    </h2>
                </div>

                <div
                    className="tw-border tw-rounded-lg tw-p-6"
                    style={{
                        backgroundColor: 'rgba(254, 243, 199, 0.5)',
                        borderColor: 'rgba(251, 191, 36, 0.5)',
                    }}
                >
                    <h3 className="tw-font-semibold tw-mb-2" style={{ color: '#92400e' }}>
                        Configuration Required
                    </h3>
                    <p className="tw-mb-4" style={{ color: '#b45309' }}>
                        Please configure the following in the block settings:
                    </p>
                    <div className="tw-text-sm tw-space-y-4" style={{ color: '#92400e' }}>
                        {!libraryId && (
                            <div>
                                <p className="tw-font-semibold tw-mb-1">Library ID:</p>
                                <ol className="tw-list-decimal tw-list-inside tw-space-y-1 tw-ml-2">
                                    <li>Go to your Frontify Media Library</li>
                                    <li>Look at the URL or use the GraphQL API to list your libraries</li>
                                    <li>
                                        The ID format looks like:{' '}
                                        <code className="tw-bg-amber-100 tw-px-1 tw-rounded tw-text-xs">
                                            eyJpZGVudGlmaWVyIjo5ODc2NTQzMjEsInR5cGUiOiJsaWJyYXJ5In0=
                                        </code>
                                    </li>
                                </ol>
                            </div>
                        )}
                        {!bearerToken && (
                            <div>
                                <p className="tw-font-semibold tw-mb-1">API Bearer Token:</p>
                                <ol className="tw-list-decimal tw-list-inside tw-space-y-1 tw-ml-2">
                                    <li>Go to your Frontify Account Settings</li>
                                    <li>Navigate to Developer &gt; API Tokens</li>
                                    <li>Generate a new token with appropriate permissions</li>
                                    <li>Copy the token and paste it in the block settings</li>
                                </ol>
                            </div>
                        )}
                    </div>
                    {isEditing && (
                        <p className="tw-mt-4 tw-text-sm tw-italic" style={{ color: '#92400e' }}>
                            Open the block settings panel on the right to configure these values.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="tw-p-6">
            <div className="tw-mb-6">
                <h2 className="tw-text-2xl tw-font-bold tw-mb-2" style={{ color: textColor }}>
                    Collection Metadata Export
                </h2>
                <p style={{ color: textColor, opacity: 0.8 }}>
                    Export asset metadata from your Frontify collections as CSV files, including preview URLs and
                    custom metadata fields.
                </p>
            </div>

            {loading && (
                <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-gray-50 tw-rounded-lg tw-py-16">
                    <div
                        className="tw-animate-spin tw-rounded-full tw-h-12 tw-w-12 tw-border-b-2 tw-mb-4"
                        style={{ borderColor: primaryColor }}
                    ></div>
                    <p style={{ color: textColor }}>Loading collections from Frontify...</p>
                </div>
            )}

            {error && (
                <div
                    className="tw-border tw-rounded-lg tw-p-4 tw-mb-6"
                    style={{
                        backgroundColor: 'rgba(254, 226, 226, 0.5)',
                        borderColor: 'rgba(248, 113, 113, 0.5)',
                    }}
                >
                    <h3 className="tw-font-semibold tw-mb-2" style={{ color: '#991b1b' }}>
                        Error
                    </h3>
                    <p style={{ color: '#dc2626' }}>{error}</p>
                </div>
            )}

            {!loading && !error && collections.length > 0 && (
                <div className="tw-space-y-6">
                    {/* Dropdown selector */}
                    <div>
                        <label className="tw-block tw-font-semibold tw-mb-2" style={{ color: textColor }}>
                            Select a Collection
                        </label>
                        <select
                            value={selectedCollectionId}
                            onChange={(e) => setSelectedCollectionId(e.target.value)}
                            className="tw-w-full tw-px-4 tw-py-3 tw-rounded-lg tw-text-base tw-transition-all focus:tw-outline-none focus:tw-ring-2"
                            style={{
                                border: `2px solid ${borderColor}`,
                                color: textColor,
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = primaryColor;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = borderColor;
                            }}
                        >
                            <option value="">-- Choose a collection --</option>
                            {sortedCollections.map((collection) => (
                                <option key={collection.id} value={collection.id}>
                                    {collection.name} ({collection.assetCount}{' '}
                                    {collection.assetCount === 1 ? 'asset' : 'assets'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Collection details */}
                    {selectedCollectionId &&
                        (() => {
                            const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
                            if (!selectedCollection) return null;

                            return (
                                <div
                                    className="tw-border tw-rounded-lg tw-p-6 tw-transition-all"
                                    style={{
                                        borderColor: borderColor,
                                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                    }}
                                >
                                    <h3 className="tw-text-xl tw-font-bold tw-mb-4" style={{ color: textColor }}>
                                        Collection Details
                                    </h3>

                                    <div className="tw-space-y-3 tw-mb-6">
                                        <div>
                                            <span className="tw-font-semibold" style={{ color: textColor }}>
                                                Name:{' '}
                                            </span>
                                            <span style={{ color: textColor, opacity: 0.8 }}>
                                                {selectedCollection.name}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="tw-font-semibold" style={{ color: textColor }}>
                                                Total Assets:{' '}
                                            </span>
                                            <span style={{ color: textColor, opacity: 0.8 }}>
                                                {selectedCollection.assetCount}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="tw-font-semibold" style={{ color: textColor }}>
                                                Export Format:{' '}
                                            </span>
                                            <span style={{ color: textColor, opacity: 0.8 }}>
                                                CSV (includes all metadata fields, preview URLs, and custom fields)
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleExport}
                                        disabled={isExporting}
                                        className="tw-px-8 tw-py-4 tw-rounded-lg tw-font-semibold tw-text-base tw-transition-all tw-shadow-md hover:tw-shadow-lg tw-w-full"
                                        style={{
                                            backgroundColor: isExporting ? '#9ca3af' : primaryColor,
                                            color: 'white',
                                            cursor: isExporting ? 'not-allowed' : 'pointer',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isExporting) {
                                                e.currentTarget.style.backgroundColor = primaryHoverColor;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isExporting) {
                                                e.currentTarget.style.backgroundColor = primaryColor;
                                            }
                                        }}
                                    >
                                        {isExporting ? (
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
                                                Export Collection as CSV
                                            </span>
                                        )}
                                    </button>
                                </div>
                            );
                        })()}
                </div>
            )}

            {!loading && !error && collections.length === 0 && isConfigured && (
                <div
                    className="tw-border tw-rounded-lg tw-p-6"
                    style={{
                        backgroundColor: 'rgba(219, 234, 254, 0.5)',
                        borderColor: 'rgba(147, 197, 253, 0.5)',
                    }}
                >
                    <h3 className="tw-font-semibold tw-mb-2" style={{ color: '#1e40af' }}>
                        No Collections Found
                    </h3>
                    <p className="tw-mb-4" style={{ color: '#2563eb' }}>
                        No collections were found in the configured library.
                    </p>
                    <div className="tw-text-sm" style={{ color: '#1d4ed8' }}>
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