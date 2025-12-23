import { defineSettings } from '@frontify/guideline-blocks-settings';

export const settings = defineSettings({
    main: [
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
    style: [],
});