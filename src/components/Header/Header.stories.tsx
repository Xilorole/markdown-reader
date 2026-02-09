import type { Meta, StoryObj } from '@storybook/react';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'Components/Header',
  component: Header,
  args: {
    sidebarVisible: false,
    onToggleSidebar: () => {},
    onFileOpen: () => {},
    onOpenSettings: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {};

export const SidebarOpen: Story = {
  args: { sidebarVisible: true },
};
