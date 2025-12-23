import 'tailwindcss/tailwind.css';

import { defineBlock } from '@frontify/guideline-blocks-settings';

import { CollectionExportBlock } from './Block';
import { settings } from './settings';

export default defineBlock({
    block: CollectionExportBlock,
    settings,
});