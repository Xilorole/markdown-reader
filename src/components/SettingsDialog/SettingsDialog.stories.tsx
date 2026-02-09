import type { Meta, StoryObj } from '@storybook/react';
import { SettingsDialog } from './SettingsDialog';

const meta: Meta<typeof SettingsDialog> = {
  title: 'Components/SettingsDialog',
  component: SettingsDialog,
  args: {
    open: true,
    config: { type: 'anthropic' },
    onSave: () => {},
    onClose: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SettingsDialog>;

export const Anthropic: Story = {};

export const AzureOpenAI: Story = {
  args: {
    config: {
      type: 'aoai',
      endpoint: 'https://example.openai.azure.com',
      apiKey: '',
      deploymentName: 'gpt-4o',
    },
  },
};

export const Disabled: Story = {
  args: { config: { type: 'none' } },
};
