module.exports = {
  plugins: [
    [
      '@semantic-release/github',
      {
        assets: 'dist/custom-cards.js',
      },
    ],
    ['@semantic-release/commit-analyzer'],
    {
      preset: 'angular',
    },
  ],
  branches: ['+([0-9])?(.{+([0-9]),x}).x', 'main'],
};
