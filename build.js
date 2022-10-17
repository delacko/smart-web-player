require('esbuild')
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    // minify: true,
    outfile: 'dist/index.js',
  })
  .catch(() => process.exit(1));
