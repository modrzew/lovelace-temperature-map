module.exports = {
  plugins: [
    [
      '@semantic-release/github',
      {
        assets: 'dist/custom-cards.js',
      },
    ],
  ],
  branches: ['+([0-9])?(.{+([0-9]),x}).x'],
};
