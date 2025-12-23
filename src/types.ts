export interface Settings {
    showAssetCount: boolean;
    sortBy: string;
}

export interface CustomMetadataProperty {
    id: string;
    name: string;
}

export interface CustomMetadataItem {
    property: CustomMetadataProperty;
    __typename?: string;
    values?: string[];
}

export interface Copyright {
    status: string;
    notice: string;
}

export interface Tag {
    value: string;
    source: string;
}

export interface License {
    id: string;
    title: string;
}

export interface FrontifyAsset {
    id: string;
    title?: string;
    description?: string;
    status?: string;
    createdAt?: string;
    modifiedAt?: string;
    expiresAt?: string;
    copyright?: Copyright;
    customMetadata?: CustomMetadataItem[];
    tags?: Tag[];
    licenses?: License[];
    previewUrl?: string;
    downloadUrl?: string;
    alternativeText?: string;
    duration?: string;
}

export interface FrontifyCollection {
    id: string;
    name: string;
    assetCount: number;
}

export interface AssetForExport {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    modifiedAt: string;
    expiresAt: string;
    copyrightStatus: string;
    copyrightNotice: string;
    previewUrl: string;
    downloadUrl: string;
    alternativeText: string;
    duration: string;
    tags: string;
    licenses: string;
    [key: string]: string | number; // Allow dynamic custom metadata fields
}