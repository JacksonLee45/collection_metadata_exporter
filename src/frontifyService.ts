import type { FrontifyCollection, FrontifyAsset, AssetForExport } from './types';

//Get a list of all collections with their asset counts
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

//Get just the asset IDs for a specific collection
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

//Get complete metadata for specific assets
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

    constructor() {
        this.domain = import.meta.env.VITE_FRONTIFY_DOMAIN || '';
        this.token = import.meta.env.VITE_FRONTIFY_BEARER_TOKEN || '';
        this.libraryId = import.meta.env.VITE_LIBRARY_ID || '';

        if (!this.domain) {
            throw new Error('VITE_FRONTIFY_DOMAIN is required in .env file');
        }
        if (!this.token) {
            throw new Error('VITE_FRONTIFY_BEARER_TOKEN is required in .env file');
        }
        if (!this.libraryId) {
            throw new Error('VITE_LIBRARY_ID is required in .env file');
        }
    }

    private getGraphQLEndpoint(): string {
        return `https://${this.domain}/graphql`;
    }

    async fetchCollections(): Promise<FrontifyCollection[]> {
        try {
            const response = await fetch(this.getGraphQLEndpoint(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.token}`,
                },
                body: JSON.stringify({
                    query: LIBRARY_COLLECTIONS_QUERY,
                    variables: {
                        libraryId: this.libraryId,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.errors) {
                const errorMessage = result.errors.map((e: any) => e.message).join(', ');
                throw new Error(`GraphQL error: ${errorMessage}`);
            }

            if (!result.data?.library?.collections?.items) {
                throw new Error('Invalid response structure from Frontify API. Check your library ID.');
            }

            // Transform the data to include assetCount
            const collections = result.data.library.collections.items.map((col: any) => ({
                id: col.id,
                name: col.name,
                assetCount: col.assets?.total || 0,
            }));

            return collections;
        } catch (error) {
            console.error('Error fetching collections from Frontify:', error);
            throw error;
        }
    }

    async fetchAllCollections(): Promise<FrontifyCollection[]> {
        // Since collections are nested under library, we just fetch once
        return this.fetchCollections();
    }

    async fetchCollectionAssets(collectionId: string): Promise<FrontifyAsset[]> {
        try {
            console.log('Fetching assets for collection:', collectionId);
            console.log('Using library ID:', this.libraryId);
            
            // Step 1: Get the collection to find which asset IDs belong to it
            const collectionResponse = await fetch(this.getGraphQLEndpoint(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.token}`,
                },
                body: JSON.stringify({
                    query: COLLECTION_ASSETS_QUERY,
                    variables: {
                        libraryId: this.libraryId,
                    },
                }),
            });

            if (!collectionResponse.ok) {
                const errorText = await collectionResponse.text();
                console.error('Collection response error:', errorText);
                throw new Error(`HTTP error! status: ${collectionResponse.status}`);
            }

            const collectionResult = await collectionResponse.json();
            
            if (collectionResult.errors) {
                console.error('GraphQL errors:', collectionResult.errors);
                throw new Error(`GraphQL error: ${collectionResult.errors.map((e: any) => e.message).join(', ')}`);
            }

            // Find the specific collection and get its asset IDs
            const collection = collectionResult.data?.library?.collections?.items?.find(
                (col: any) => col.id === collectionId
            );

            if (!collection) {
                throw new Error('Collection not found');
            }

            const assetIds = collection.assets.items.map((asset: any) => asset.id);
            console.log(`Collection has ${assetIds.length} assets`);

            if (assetIds.length === 0) {
                return [];
            }

            // Step 2: Fetch full metadata for these specific asset IDs using assets() API
            const assetsResponse = await fetch(this.getGraphQLEndpoint(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.token}`,
                },
                body: JSON.stringify({
                    query: ASSETS_BY_IDS_QUERY,
                    variables: {
                        ids: assetIds,
                    },
                }),
            });

            console.log('Assets response status:', assetsResponse.status);

            if (!assetsResponse.ok) {
                const errorText = await assetsResponse.text();
                console.error('Assets response error:', errorText);
                throw new Error(`HTTP error! status: ${assetsResponse.status}, details: ${errorText}`);
            }

            const assetsResult = await assetsResponse.json();
            console.log('Assets GraphQL response received');

            if (assetsResult.errors) {
                const errorMessage = assetsResult.errors.map((e: any) => e.message).join(', ');
                console.error('GraphQL errors:', assetsResult.errors);
                throw new Error(`GraphQL error: ${errorMessage}`);
            }

            if (!assetsResult.data?.assets) {
                console.error('Invalid response structure:', assetsResult.data);
                throw new Error('Invalid response structure from Frontify API');
            }

            const assets = assetsResult.data.assets;
            console.log(`Successfully fetched metadata for ${assets.length} assets`);
            
            return assets;
        } catch (error) {
            console.error('Error fetching collection assets:', error);
            throw error;
        }
    }

    async fetchAllCollectionAssets(collectionId: string): Promise<FrontifyAsset[]> {
        // Frontify returns all assets in one query (no pagination needed for MVP)
        return this.fetchCollectionAssets(collectionId);
    }

    /**
     * Extract the display value from a custom metadata value.
     * Handles three cases:
     * 1. Plain string value (e.g., "Smith Studio")
     * 2. Object with text property (e.g., { optionId: "...", text: "Original Red" })
     * 3. Array of values (for CustomMetadataValues type)
     */
    private extractMetadataValue(rawValue: any): string {
        if (rawValue === null || rawValue === undefined) {
            return '';
        }
        
        // Plain string
        if (typeof rawValue === 'string') {
            return rawValue;
        }
        
        // Object with text property (select/dropdown options)
        if (typeof rawValue === 'object' && rawValue.text) {
            return rawValue.text;
        }
        
        // Fallback: stringify it
        return String(rawValue);
    }

    prepareAssetsForExport(assets: FrontifyAsset[]): AssetForExport[] {
        return assets.map(asset => {
            // Add tags as comma-separated string
            const tags = asset.tags && Array.isArray(asset.tags)
                ? asset.tags.map(tag => tag.value).join(', ')
                : '';

            // Add licenses as comma-separated string
            const licenses = asset.licenses && Array.isArray(asset.licenses)
                ? asset.licenses.map(license => license.title).join(', ')
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
                asset.customMetadata.forEach((metadata: any) => {
                    const fieldName = metadata.property?.name;
                    if (!fieldName) return;

                    let metadataValue = '';

                    // Handle CustomMetadataValue (singular) - has "value" field
                    if ('value' in metadata && metadata.value !== undefined && metadata.value !== null) {
                        metadataValue = this.extractMetadataValue(metadata.value);
                    }
                    // Handle CustomMetadataValues (plural) - has "values" array
                    else if ('values' in metadata && Array.isArray(metadata.values) && metadata.values.length > 0) {
                        metadataValue = metadata.values
                            .map((v: any) => this.extractMetadataValue(v))
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
        exportData.forEach(asset => {
            Object.keys(asset).forEach(key => allKeys.add(key));
        });

        const headers = Array.from(allKeys);

        // Create CSV content
        const csvRows: string[] = [];
        
        // Add header row
        csvRows.push(headers.map(h => this.escapeCSVValue(h)).join(','));

        // Add data rows
        exportData.forEach(asset => {
            const row = headers.map(header => {
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
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
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