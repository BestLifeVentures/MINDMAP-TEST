# BLV Mind Map

Interactive business ecosystem visualization for Best Life Ventures.

## Features

- **4-Tab View System**: Internal, External, People, Processes
- **Tag-Based Filtering**: Dynamic filtering based on node tags
- **Interactive Graph**: Drag nodes, reshape edges, add/edit/delete
- **AI Copilot**: Chat with Claude, generate new nodes, update selections
- **KV Persistence**: Save and load maps
- **Modern UI**: Dark theme with gradients and smooth animations

## Deployment

Deploy to Cloudflare Pages with:
- KV Namespace binding: `BLV_MINDMAP`
- Environment variable: `claude` (Anthropic API key)

## Usage

Visit the deployed site to:
1. Explore the BLV ecosystem across different views
2. Add and modify nodes and connections
3. Use AI to generate new parts of the map
4. Filter by tags to focus on specific aspects

## Tech Stack

- Vanilla JavaScript (no build step)
- HTML5 Canvas for rendering
- Cloudflare Pages Functions
- Cloudflare KV for storage
- Anthropic Claude API