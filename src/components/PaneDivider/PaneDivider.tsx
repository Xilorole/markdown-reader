import { Scissors } from 'lucide-react';
import styles from './PaneDivider.module.css';

interface PaneDividerProps {
  visible: boolean;
  onClick: () => void;
}

export function PaneDivider({ visible, onClick }: PaneDividerProps) {
  if (!visible) return null;
  return (
    <div
      className={styles.divider}
      onClick={onClick}
      role="button"
      aria-label="注釈を閉じる"
    >
      <div className={styles.lineTop} />
      <span className={styles.icon}>
        <Scissors size={14} />
      </span>
      <div className={styles.lineBottom} />
    </div>
  );
}
