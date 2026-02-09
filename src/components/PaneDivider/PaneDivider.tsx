import { Scissors } from 'lucide-react';
import styles from './PaneDivider.module.css';

interface PaneDividerProps {
  visible: boolean;
  mobileMode?: boolean;
  onClick: () => void;
}

export function PaneDivider({ visible, mobileMode, onClick }: PaneDividerProps) {
  // モバイル時は非表示（別の閉じるボタンを使用）
  if (!visible || mobileMode) return null;
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
