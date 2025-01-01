# Sociogram Viewer

A graph visualization application built with React, Sigma.js, and Supabase.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Copy `.env` to `.env.local`
- Update the Supabase URL and anonymous key in `.env.local`

3. Start the development server:
```bash
npm run dev
```

## Features

- Interactive graph visualization using Sigma.js
- Backend integration with Supabase
- Modern UI with Material-UI components
- TypeScript support

## Project Structure

- `src/components/Graph.tsx`: Graph visualization component
- `src/lib/supabase.ts`: Supabase client configuration
- `src/App.tsx`: Main application component

## Development

To add your own graph data:
1. Create appropriate tables in your Supabase database
2. Update the data fetching logic in `App.tsx`
3. Customize the graph visualization in `Graph.tsx`
