import type { Preview } from '@storybook/react';
import '../src/tokens/tokens.css';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: '#FFFEF8' },
        { name: 'dark', value: '#2A2520' },
      ],
    },
    layout: 'fullscreen',
  },
};

export default preview;
