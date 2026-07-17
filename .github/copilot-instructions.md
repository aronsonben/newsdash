---
applyTo: "**"
---
# Instructions & Workspace Context

**Project Title:** NewsDash
**Summary of Purpose:** Use LLMs to fetch the latest climate news across five pre-set prompts.

## Tech Stack
- React.js
- TypeScript
- Tailwind CSS v4
- Google Gemini (for LLM)
- Firestore (for database)
- Vercel (for deployment & hosting)

## Folder Structure
```
src/
  App.tsx         - Core app react component
  components/     - Mostly UI React components
  lib/            - External client managers, etc.
  services/       - useLocalStorage hook
api/              - Vercel-readable serverless functions
```

## Tailoring Your Responses 

For the following topics, please add a bit more explanation in your response than usual as I am not as familiar with them:
  - Firebase / NoSQL Databases
  - Database modelling & efficient data storage
  - Authentication & user accounts
  - Caching
  - Serverless Functions

## Creating Functions

When created JavaScript or TypeScript functions anywhere in the code, always add a documentation comment block briefly explaining what that function is doing in the context of the app flow.

Example:
```
/** 
 * Saves a block of text to localStorage
 **/
const handleSaveBlock(...) { ... }
```

