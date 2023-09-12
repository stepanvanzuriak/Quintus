/** @returns {Promise<import('jest').Config>} */
module.exports = async () => {
  return {
    setupFiles: ['jest-canvas-mock'],
    testEnvironment: 'jsdom',
    transform: {
      '\\.[jt]sx?$': 'esbuild-jest',
    },
  };
};
