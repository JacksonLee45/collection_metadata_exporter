#!/usr/bin/env node

/**
 * Frontify Custom Metadata Debug Script
 * 
 * Run with: node debug-metadata.mjs
 * 
 * Make sure to set these environment variables or edit the values below:
 * - FRONTIFY_DOMAIN
 * - FRONTIFY_TOKEN
 * - LIBRARY_ID
 */

// ============ CONFIGURATION ============
// Manually parse .env file (no dependencies needed)
import { readFileSync } from 'fs';

function loadEnv() {
    try {
        const envFile = readFileSync('.env', 'utf-8');
        envFile.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    } catch (e) {
        console.log('No .env file found, using environment variables');
    }
}

loadEnv();

const DOMAIN = process.env.VITE_FRONTIFY_DOMAIN || 'YOUR_DOMAIN.frontify.com';
const TOKEN = process.env.VITE_FRONTIFY_BEARER_TOKEN || 'YOUR_TOKEN_HERE';
const LIBRARY_ID = process.env.VITE_LIBRARY_ID || 'YOUR_LIBRARY_ID';
// =======================================

const endpoint = `https://${DOMAIN}/graphql`;

async function graphqlRequest(query, variables = {}) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
}

async function getCollections() {
    console.log('\n📁 Fetching collections...\n');
    
    const query = `
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

    const result = await graphqlRequest(query, { libraryId: LIBRARY_ID });
    
    if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        return [];
    }

    const collections = result.data?.library?.collections?.items || [];
    collections.forEach(col => {
        console.log(`  - ${col.name} (${col.assets?.total || 0} assets) [ID: ${col.id}]`);
    });

    return collections;
}

async function getAssetIdsFromCollection(collectionId) {
    const query = `
        query GetCollectionAssetIds($libraryId: ID!) {
            library(id: $libraryId) {
                collections {
                    items {
                        id
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

    const result = await graphqlRequest(query, { libraryId: LIBRARY_ID });
    
    if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        return [];
    }

    const collection = result.data?.library?.collections?.items?.find(c => c.id === collectionId);
    return collection?.assets?.items?.map(a => a.id) || [];
}

async function debugCustomMetadataTypes(assetIds) {
    console.log('\n🔍 DEBUG: Checking customMetadata __typename values...\n');

    const query = `
        query GetAssetMetadataTypes($ids: [ID!]!) {
            assets(ids: $ids) {
                id
                title
                customMetadata {
                    __typename
                    property {
                        id
                        name
                        __typename
                    }
                }
            }
        }
    `;

    const result = await graphqlRequest(query, { ids: assetIds.slice(0, 3) });

    if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        return;
    }

    console.log('Raw response:');
    console.log(JSON.stringify(result.data, null, 2));

    // Collect unique __typename values
    const types = new Set();
    result.data?.assets?.forEach(asset => {
        asset.customMetadata?.forEach(meta => {
            types.add(meta.__typename);
            console.log(`\n  Field: "${meta.property?.name}" → __typename: "${meta.__typename}"`);
        });
    });

    console.log('\n📋 Unique customMetadata types found:', Array.from(types));
    return Array.from(types);
}

async function testExpandedQuery(assetIds) {
    console.log('\n🧪 Testing expanded query with multiple fragment types...\n');

    // Try querying with multiple possible fragment types
    const query = `
        query GetAssetMetadataExpanded($ids: [ID!]!) {
            assets(ids: $ids) {
                id
                title
                customMetadata {
                    __typename
                    property {
                        id
                        name
                    }
                    ... on CustomMetadataValues {
                        values
                    }
                    ... on CustomMetadataValue {
                        value
                    }
                }
            }
        }
    `;

    const result = await graphqlRequest(query, { ids: assetIds.slice(0, 2) });

    if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        console.log('\nTrying without CustomMetadataValue fragment...');
        return testWithoutValueFragment(assetIds);
    }

    console.log('Expanded query result:');
    console.log(JSON.stringify(result.data, null, 2));
    return result.data;
}

async function testWithoutValueFragment(assetIds) {
    const query = `
        query GetAssetMetadataSimple($ids: [ID!]!) {
            assets(ids: $ids) {
                id
                title
                customMetadata {
                    __typename
                    property {
                        id
                        name
                    }
                    ... on CustomMetadataValues {
                        values
                    }
                }
            }
        }
    `;

    const result = await graphqlRequest(query, { ids: assetIds.slice(0, 2) });

    if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
    }

    console.log('Simple query result:');
    console.log(JSON.stringify(result.data, null, 2));
    return result.data;
}

async function introspectCustomMetadataTypes() {
    console.log('\n🔬 Introspecting CustomMetadata schema types...\n');

    const query = `
        query IntrospectCustomMetadata {
            __type(name: "CustomMetadata") {
                name
                kind
                possibleTypes {
                    name
                }
                fields {
                    name
                    type {
                        name
                        kind
                    }
                }
            }
        }
    `;

    const result = await graphqlRequest(query);

    if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        return;
    }

    console.log('CustomMetadata type info:');
    console.log(JSON.stringify(result.data, null, 2));

    // Also check for union/interface types
    const unionQuery = `
        query IntrospectUnion {
            __type(name: "CustomMetadataValue") {
                name
                kind
                possibleTypes {
                    name
                }
            }
        }
    `;

    const unionResult = await graphqlRequest(unionQuery);
    if (unionResult.data?.__type) {
        console.log('\nCustomMetadataValue type info:');
        console.log(JSON.stringify(unionResult.data, null, 2));
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('       Frontify Custom Metadata Debug Tool');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\nDomain: ${DOMAIN}`);
    console.log(`Library ID: ${LIBRARY_ID}`);
    console.log(`Token: ${TOKEN.substring(0, 10)}...`);

    try {
        // Step 1: Introspect schema
        await introspectCustomMetadataTypes();

        // Step 2: Get collections
        const collections = await getCollections();
        
        if (collections.length === 0) {
            console.log('\n❌ No collections found. Check your LIBRARY_ID.');
            return;
        }

        // Step 3: Get asset IDs from first collection with assets
        const collectionWithAssets = collections.find(c => c.assets?.total > 0);
        if (!collectionWithAssets) {
            console.log('\n❌ No collections with assets found.');
            return;
        }

        console.log(`\n📦 Using collection: "${collectionWithAssets.name}"`);
        
        const assetIds = await getAssetIdsFromCollection(collectionWithAssets.id);
        console.log(`Found ${assetIds.length} asset IDs`);

        if (assetIds.length === 0) {
            console.log('\n❌ No assets found in collection.');
            return;
        }

        // Step 4: Debug __typename values
        await debugCustomMetadataTypes(assetIds);

        // Step 5: Test expanded query
        await testExpandedQuery(assetIds);

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('                    Debug Complete');
        console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
}

main();