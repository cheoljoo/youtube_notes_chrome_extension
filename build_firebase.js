import { build } from 'esbuild';

await build({
  entryPoints: ['src/firebase_bundle_entry.js'],
  bundle: true,
  minify: true,
  sourcemap: false,
  outfile: 'vendor/firebase.bundle.js',
  format: 'iife',
  target: ['chrome113'],
  globalName: 'FirebaseBundle'
});

console.log('Firebase bundle built: vendor/firebase.bundle.js');
