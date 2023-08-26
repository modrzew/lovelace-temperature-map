module.exports = {
  plugins: [
    [
      '@semantic-release/github',
      {
        assets: 'dist/custom-cards.js',
      },
    ],
  ],
};
