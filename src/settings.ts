import { defineSettings } from '@frontify/guideline-blocks-settings';

export const settings = defineSettings({
    main: [
        {
            id: 'libraryId',
            type: 'input',
            label: 'Library ID',
            placeholder: 'Enter your Frontify Library ID',
            info: 'The ID of the Frontify library containing your collections. Find this in your library URL or via the GraphQL API.',
        },
        {
            id: 'bearerToken',
            type: 'input',
            label: 'API Bearer Token',
            placeholder: 'Enter your Frontify API token',
            info: 'Generate a bearer token from your Frontify account settings under Developer > API Tokens.',
        },
        {
            id: 'showAssetCount',
            type: 'switch',
            label: 'Show Asset Count',
            defaultValue: true,
        },
        {
            id: 'sortBy',
            type: 'dropdown',
            label: 'Sort Collections By',
            defaultValue: 'name',
            choices: [
                { value: 'name', label: 'Name (A-Z)' },
                { value: 'count', label: 'Asset Count (High to Low)' },
            ],
        },
    ],
    style: [
        {
            id: 'primaryColor',
            type: 'colorInput',
            label: 'Primary Color (Buttons)',
            clearable: false,
        },
        {
            id: 'textColor',
            type: 'colorInput',
            label: 'Text Color',
            clearable: false,
        },
        {
            id: 'borderColor',
            type: 'colorInput',
            label: 'Border Color',
            clearable: false,
        },
    ],
});