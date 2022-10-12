require('esbuild')
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: true,
    outfile: 'build/out.js',
  })
  .catch(() => process.exit(1));
