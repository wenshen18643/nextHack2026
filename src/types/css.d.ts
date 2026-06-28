/**
 * Ambient declaration for CSS side-effect imports (e.g. `import "./globals.css"`).
 * Next.js handles the actual bundling; this only tells TypeScript such imports
 * are valid so the editor does not flag them.
 */
declare module "*.css";
