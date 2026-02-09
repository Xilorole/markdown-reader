import type { Meta, StoryObj } from '@storybook/react';
import { ShimmerPlaceholder } from './ShimmerPlaceholder';

const meta: Meta<typeof ShimmerPlaceholder> = {
  title: 'Components/ShimmerPlaceholder',
  component: ShimmerPlaceholder,
};

export default meta;
type Story = StoryObj<typeof ShimmerPlaceholder>;

export const Default: Story = {};
