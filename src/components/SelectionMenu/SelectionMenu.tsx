import { IconPencilPlus } from '@/components/icons';
import styles from './SelectionMenu.module.css';

interface SelectionMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClick: () => void;
}

export function SelectionMenu({ x, y, visible, onClick }: SelectionMenuProps) {
  if (!visible) return null;
  return (
    <div
      className={styles.menu}
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      role="button"
      aria-label="注釈を追加"
    >
      <IconPencilPlus size={12} />
      <span className={styles.label}>注釈を追加</span>
    </div>
  );
}
