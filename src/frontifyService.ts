import type { FrontifyCollection, FrontifyAsset, AssetForExport } from './types';

// GraphQL Queries
const LIBRARY_COLLECTIONS_QUERY = `
  query GetLibraryCollections($libraryId: ID!) {
    library(id: $libraryId) {
      collections {
        total
        items {
          id
          name
          assets {
            total
          }
        }
      }
    }
  }
`;

const COLLECTION_ASSETS_QUERY = `
  query GetCollectionAssetIds($libraryId: ID!) {
    library(id: $libraryId) {
      collections {
        items {
          id
          name
          assets {
            items {
              id
            }
          }
        }
      }
    }
  }
`;

const ASSETS_BY_IDS_QUERY = `
  query GetAssetsByIds($ids: [ID!]!) {
    assets(ids: $ids) {
      id
      title
      description
      createdAt
      modifiedAt
      copyright {
        status
        notice
      }
      expiresAt
      customMetadata {
        property {
          id
          name
        }
        ... on CustomMetadataValue {
          __typename
          value
        }
        ... on CustomMetadataValues {
          __typename
          values
        }
      }
      tags {
        value
        source
      }
      ... on Image {
        alternativeText
        previewUrl
        downloadUrl
      }
      ... on Video {
        alternativeText
        previewUrl
        downloadUrl
        duration
      }
      ... on Document {
        previewUrl
        downloadUrl
      }
      ... on Audio {
        previewUrl
        downloadUrl
      }
      status
    }
  }
`;

export class FrontifyService {
    private domain: string;
    private token: string;
    private libraryId: string;

    constructor(domain: string, token: string, libraryId: string) {
        this.domain = domain;
        this.token = token;
        this.libraryId = libraryId;

        if (!domain) {
            throw new Error('Frontify domain is required.');
        }
        if (!token) {
            throw new Error('API Bearer Token is required. Please configure it in the block settings.');
        }
        if (!libraryId) {
            throw new Error('Library ID is required. Please configure it in the block settings.');
        }
    }

    private getGraphQLEndpoint(): string {
        // Handle domain with or without protocol
        const cleanDomain = this.domain.replace(/^https?:\/\//, '');
        return `https://${cleanDomain}/graphql`;
    }

    /**
     * Execute a GraphQL query using direct fetch with bearer token
     */
    private async executeQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
        try {
            const response = await fetch(this.getGraphQLEndpoint(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.token}`,
                },
                body: JSON.stringify({ query, variables }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.errors) {
                const errorMessage = result.errors.map((e: { message: string }) => e.message).join(', ');
                throw new Error(`GraphQL error: ${errorMessage}`);
            }

            return result.data as T;
        } catch (error) {
            console.error('GraphQL query error:', error);
            throw error;
        }
    }

    async fetchCollections(): Promise<FrontifyCollection[]> {
        try {
            const result = await this.executeQuery<{
                library: {
                    collections: {
                        total: number;
                        items: Array<{
                            id: string;
                            name: string;
                            assets: { total: number };
                        }>;
                    };
                };
            }>(LIBRARY_COLLECTIONS_QUERY, { libraryId: this.libraryId });

            if (!result?.library?.collections?.items) {
                throw new Error('Invalid response structure from Frontify API. Check your library ID.');
            }

            return result.library.collections.items.map((col) => ({
                id: col.id,
                name: col.name,
                assetCount: col.assets?.total || 0,
            }));
        } catch (error) {
            console.error('Error fetching collections from Frontify:', error);
            throw error;
        }
    }

    async fetchAllCollections(): Promise<FrontifyCollection[]> {
        return this.fetchCollections();
    }

    async fetchCollectionAssets(collectionId: string): Promise<FrontifyAsset[]> {
        try {
            console.log('Fetching assets for collection:', collectionId);
            console.log('Using library ID:', this.libraryId);

            // Step 1: Get asset IDs from the collection
            const collectionResult = await this.executeQuery<{
                library: {
                    collections: {
                        items: Array<{
                            id: string;
                            assets: {
                                items: Array<{ id: string }>;
                            };
                        }>;
                    };
                };
            }>(COLLECTION_ASSETS_QUERY, { libraryId: this.libraryId });

            const collection = collectionResult?.library?.collections?.items?.find(
                (col) => col.id === collectionId
            );

            if (!collection) {
                throw new Error('Collection not found');
            }

            const assetIds = collection.assets.items.map((asset) => asset.id);
            console.log(`Collection has ${assetIds.length} assets`);

            if (assetIds.length === 0) {
                return [];
            }

            // Step 2: Fetch full metadata for these assets
            const assetsResult = await this.executeQuery<{
                assets: FrontifyAsset[];
            }>(ASSETS_BY_IDS_QUERY, { ids: assetIds });

            if (!assetsResult?.assets) {
                throw new Error('Invalid response structure from Frontify API');
            }

            console.log(`Successfully fetched metadata for ${assetsResult.assets.length} assets`);
            return assetsResult.assets;
        } catch (error) {
            console.error('Error fetching collection assets:', error);
            throw error;
        }
    }

    async fetchAllCollectionAssets(collectionId: string): Promise<FrontifyAsset[]> {
        return this.fetchCollectionAssets(collectionId);
    }

    /**
     * Extract the display value from a custom metadata value.
     * Handles three cases:
     * 1. Plain string value (e.g., "Smith Studio")
     * 2. Object with text property (e.g., { optionId: "...", text: "Original Red" })
     * 3. Array of values (for CustomMetadataValues type)
     */
    private extractMetadataValue(rawValue: unknown): string {
        if (rawValue === null || rawValue === undefined) {
            return '';
        }

        // Plain string
        if (typeof rawValue === 'string') {
            return rawValue;
        }

        // Object with text property (select/dropdown options)
        if (typeof rawValue === 'object' && rawValue !== null && 'text' in rawValue) {
            return (rawValue as { text: string }).text;
        }

        // Fallback: stringify it
        return String(rawValue);
    }

    prepareAssetsForExport(assets: FrontifyAsset[]): AssetForExport[] {
        return assets.map((asset) => {
            // Add tags as comma-separated string
            const tags =
                asset.tags && Array.isArray(asset.tags) ? asset.tags.map((tag) => tag.value).join(', ') : '';

            // Add licenses as comma-separated string
            const licenses =
                asset.licenses && Array.isArray(asset.licenses)
                    ? asset.licenses.map((license) => license.title).join(', ')
                    : '';

            const exportData: AssetForExport = {
                id: asset.id,
                title: asset.title || '',
                description: asset.description || '',
                status: asset.status || '',
                createdAt: asset.createdAt || '',
                modifiedAt: asset.modifiedAt || '',
                expiresAt: asset.expiresAt || '',
                copyrightStatus: asset.copyright?.status || '',
                copyrightNotice: asset.copyright?.notice || '',
                previewUrl: asset.previewUrl || '',
                downloadUrl: asset.downloadUrl || '',
                alternativeText: asset.alternativeText || '',
                duration: asset.duration || '',
                tags: tags,
                licenses: licenses,
            };

            // Add all custom metadata fields dynamically
            if (asset.customMetadata && Array.isArray(asset.customMetadata)) {
                asset.customMetadata.forEach((metadata) => {
                    const fieldName = metadata.property?.name;
                    if (!fieldName) return;

                    let metadataValue = '';

                    // Handle CustomMetadataValue (singular) - has "value" field
                    if (metadata.value !== undefined && metadata.value !== null) {
                        metadataValue = this.extractMetadataValue(metadata.value);
                    }
                    // Handle CustomMetadataValues (plural) - has "values" array
                    else if (metadata.values && Array.isArray(metadata.values) && metadata.values.length > 0) {
                        metadataValue = metadata.values
                            .map((v) => this.extractMetadataValue(v))
                            .join('; ');
                    }

                    // Use the field name as the key (will become CSV header)
                    exportData[fieldName] = metadataValue;
                });
            }

            return exportData;
        });
    }

    exportToCSV(assets: FrontifyAsset[], collectionName: string): void {
        const exportData = this.prepareAssetsForExport(assets);

        if (exportData.length === 0) {
            throw new Error('No assets to export');
        }

        // Get all unique keys across all assets (for headers)
        const allKeys = new Set<string>();
        exportData.forEach((asset) => {
            Object.keys(asset).forEach((key) => allKeys.add(key));
        });

        const headers = Array.from(allKeys);

        // Create CSV content
        const csvRows: string[] = [];

        // Add header row
        csvRows.push(headers.map((h) => this.escapeCSVValue(h)).join(','));

        // Add data rows
        exportData.forEach((asset) => {
            const row = headers.map((header) => {
                const value = asset[header] || '';
                return this.escapeCSVValue(String(value));
            });
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.sanitizeFilename(collectionName)}_assets.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    private escapeCSVValue(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    private sanitizeFilename(name: string): string {
        return name
            .replace(/[^a-z0-9]/gi, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
    }
}