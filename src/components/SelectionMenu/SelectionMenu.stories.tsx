import type { Meta, StoryObj } from '@storybook/react';
import { SelectionMenu } from './SelectionMenu';

const meta: Meta<typeof SelectionMenu> = {
  title: 'Components/SelectionMenu',
  component: SelectionMenu,
  args: {
    x: 200,
    y: 200,
    visible: true,
    onClick: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SelectionMenu>;

export const Default: Story = {};
