# Frontify Collection Metadata Exporter

> **⚠️ PROOF OF CONCEPT - NOT FOR PRODUCTION USE**
> 
> This is a proof-of-concept implementation built to demonstrate technical feasibility only. It is **NOT production-ready** and comes with **NO WARRANTY OR SUPPORT**. This code is provided "AS-IS" for evaluation purposes. See the License & Disclaimer section below for full terms.

A custom Frontify block that enables external vendors and team members to export comprehensive asset metadata from Frontify collections as CSV files, including preview URLs, download URLs, and all custom metadata fields.

## Overview

This block solves a common challenge: giving external partners access to detailed asset information from Frontify without requiring them to have full platform access. Users can select a collection and export all asset metadata with a single click.

## Features

- **Complete Metadata Export**: Exports all standard fields (title, description, status, dates, copyright) plus all custom metadata fields
- **Asset URLs**: Includes both preview and download URLs for each asset
- **Collection Browser**: Clean dropdown interface showing all collections with asset counts
- **Customizable Styling**: Three color controls let you match your brand
- **Dynamic CSV Headers**: Automatically includes columns for all custom metadata fields found in your assets
- **Sort Options**: Sort collections by name (A-Z) or asset count (high to low)

## How Styling Works

The block provides three color customization options in the Frontify block settings panel:

### Color Controls

1. **Primary Color** (Buttons)
   - Controls the export button background color
   - Automatically generates a darker hover state
   - Default: `#2563eb` (blue-600)

2. **Text Color**
   - Controls all text throughout the block
   - Applied to headings, labels, and body text
   - Default: `#4b5563` (gray-600)

3. **Border Color**
   - Controls borders on dropdowns and cards
   - Creates visual separation between sections
   - Default: `#d1d5db` (gray-300)

### How It's Implemented

The block uses Frontify's `rgbObjectToRgbString()` utility to convert color picker values to CSS:

```typescript
const primaryColor = blockSettings.primaryColor 
    ? rgbObjectToRgbString(blockSettings.primaryColor) 
    : '#2563eb'; // fallback
```

Colors are then applied via inline styles to maintain specificity:

```typescript
<button
    style={{
        backgroundColor: primaryColor,
        color: 'white',
    }}
    onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = primaryHoverColor;
    }}
>
    Export Collection as CSV
</button>
```

**Note**: Colors are applied using inline styles rather than Tailwind classes because the color values are dynamic and user-configurable. This ensures the styling always reflects the user's custom color choices.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your Frontify credentials in `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your values:
   ```
   VITE_FRONTIFY_DOMAIN=your-domain.frontify.com
   VITE_FRONTIFY_BEARER_TOKEN=your_bearer_token_here
   VITE_LIBRARY_ID=your_library_id_here
   ```

## Development

Run locally:
```bash
npm run serve
```

Deploy to Frontify:
```bash
npm run deploy
```

## Technical Architecture

### API Integration

The block uses Frontify's GraphQL API with a two-step process:

1. **Fetch Collections**: Query `library(id).collections.items` to get all collections in the configured library
2. **Fetch Asset Metadata**: 
   - First, get asset IDs from the selected collection
   - Then use `assets(ids: [...])` to retrieve full metadata for all assets

### CSV Export

The export process:
1. Fetches all assets from the selected collection
2. Extracts standard fields and all custom metadata
3. Creates dynamic CSV headers based on available fields
4. Properly escapes values (quotes, commas, newlines)
5. Downloads as `{collection_name}_assets.csv`

### Custom Metadata Handling

The exporter dynamically includes all custom metadata fields found in your assets:

```typescript
if (asset.customMetadata && Array.isArray(asset.customMetadata)) {
    asset.customMetadata.forEach(metadata => {
        const fieldName = metadata.property?.name;
        if (fieldName && metadata.values) {
            exportData[fieldName] = metadata.values.join('; ');
        }
    });
}
```

This means any custom fields configured in Frontify will automatically appear as columns in the exported CSV.

## Configuration

### Block Settings

Configure in the Frontify block settings panel:

**Main Tab:**
- Show Asset Count: Toggle asset count visibility in dropdown
- Sort Collections By: Choose name (A-Z) or count (high to low)

**Style Tab:**
- Primary Color: Button background color
- Text Color: All text color
- Border Color: Border and divider color

### Environment Variables

Required in `.env`:
- `VITE_FRONTIFY_DOMAIN`: Your Frontify domain
- `VITE_FRONTIFY_BEARER_TOKEN`: API authentication token
- `VITE_LIBRARY_ID`: The library ID containing your collections

## Use Case

Built for enabling external vendors (like Chantelle's partners) to access comprehensive asset metadata from Frontify collections without requiring full platform access. Partners can:

1. View available collections with asset counts
2. Select a collection to export
3. Download CSV with all metadata, including preview URLs and custom fields
4. Use the data in their own systems or workflows

## Tech Stack

- React + TypeScript
- Frontify app-bridge for platform integration
- Tailwind CSS (with `tw-` prefix)
- GraphQL for Frontify API queries

## Key Learnings

- Collections in Frontify are accessed through libraries, not directly
- Asset metadata requires querying `assets(ids: [...])` with specific IDs
- Custom metadata fields use the `CustomMetadataValues` type with a `values` array
- Proper error logging is essential for debugging GraphQL API structures

## Known Limitations (POC)

- No pagination support for large collections
- Limited error recovery and user feedback
- Basic styling implementation
- No asset preview before export
- Environment variables required (not configured through Frontify UI)
- No automated tests
- Minimal input validation
- No rate limiting or API optimization

## License & Disclaimer

**This code is provided "AS-IS" for proof-of-concept and demonstration purposes only.**

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**This is not production-ready code.** It is a proof-of-concept to demonstrate technical feasibility. No ongoing support, maintenance, or improvements are included or implied. Use at your own risk.

For production implementation, a proper development contract with defined scope, deliverables, and support terms would be required.