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
- **Customizable Styling**: Three color controls let you match your brand guidelines
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

## Development

Run locally:
```bash
npm run serve
```

Deploy to Frontify:
```bash
npm run deploy
```

## Configuration

All configuration is done through the Frontify block settings panel:

### Main Tab

**Library ID**
- The ID of your Frontify library containing collections
- Find this in your library URL or via the GraphQL API
- Format example: `eyJpZGVudGlmaWVyIjo5ODc2NTQzMjEsInR5cGUiOiJsaWJyYXJ5In0=`

**API Bearer Token**
- Your Personal Developer Token for API authentication
- **How to generate:**
  1. Navigate to `https://<your-domain>.frontify.com/api/developer/token` in your browser
  2. Click "Create new token"
  3. Give it a meaningful name (e.g., "Collection Metadata Exporter")
  4. Select required scopes: `basic:read` and `basic:write`
  5. Click "Create" and copy the generated token
  6. Paste the token into this field in the block settings
- **Important**: Tokens never expire but can be manually revoked at any time
- **Production use**: For production deployments, contact Frontify support to request a Service User Token

**Show Asset Count**
- Toggle to show/hide asset counts in the collection dropdown
- Default: `true`

**Sort Collections By**
- Choose how collections are sorted in the dropdown
- Options:
  - `Name (A-Z)`: Alphabetical by collection name
  - `Asset Count (High to Low)`: Collections with most assets first

### Style Tab

**Primary Color (Buttons)**
- Controls the export button background color
- Picker integrates with your Frontify brand colors
- Hover state is automatically generated (slightly darker)

**Text Color**
- Controls all text throughout the block
- Applied to headings, labels, descriptions, and body text

**Border Color**
- Controls borders on dropdowns, cards, and dividers
- Creates visual separation between UI sections

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
        if (fieldName) {
            // Handles both single values and arrays
            exportData[fieldName] = metadata.values 
                ? metadata.values.join('; ')
                : metadata.value;
        }
    });
}
```

This means any custom fields configured in Frontify will automatically appear as columns in the exported CSV.

## Use Case

Built for enabling external vendors (like Chantelle's partners) to access comprehensive asset metadata from Frontify collections without requiring full platform access. Partners can:

1. View available collections with asset counts
2. Select a collection to export
3. Download CSV with all metadata, including preview URLs and custom fields
4. Use the data in their own systems or workflows

## Tech Stack

- React 18 + TypeScript
- Frontify App Bridge (v3.12.1) for platform integration
- Tailwind CSS v3 (with `tw-` prefix)
- GraphQL for Frontify API queries
- Vite for build tooling

## Key Learnings

- Collections in Frontify are accessed through libraries, not directly
- Asset metadata requires querying `assets(ids: [...])` with specific IDs
- Custom metadata fields can have two types:
  - `CustomMetadataValue` (singular) - has a `value` property
  - `CustomMetadataValues` (plural) - has a `values` array
- Colors cannot be automatically inherited from Frontify guidelines via API - must be configured through block settings
- Block configuration should use Frontify's settings interface rather than environment variables for production use

## Known Limitations (POC)

- No pagination support for large collections (fetches all assets at once)
- Limited error recovery and user feedback
- Basic styling implementation
- No asset preview before export
- No automated tests
- Minimal input validation
- No rate limiting or API optimization
- Personal Developer Tokens never expire (must be manually revoked if compromised)

## Security Considerations

- **Token Storage**: API tokens are stored in the block settings and used directly for GraphQL queries
- **Token Scope**: Ensure tokens only have the minimum required scopes (`basic:read` and `basic:write`)
- **Token Naming**: Use descriptive names when creating tokens to track usage
- **Token Revocation**: Manually revoke tokens when no longer needed or if compromised
- **Production Use**: For production deployments, use a Service User Token (contact Frontify support)

## License & Disclaimer

**This code is provided "AS-IS" for proof-of-concept and demonstration purposes only.**

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**This is not production-ready code.** It is a proof-of-concept to demonstrate technical feasibility. No ongoing support, maintenance, or improvements are included or implied. Use at your own risk.

For production implementation, a proper development contract with defined scope, deliverables, and support terms would be required.