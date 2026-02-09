import styles from './FootnoteTooltip.module.css';

interface FootnoteTooltipProps {
  x: number;
  y: number;
  visible: boolean;
  id: string;
  text: string;
}

export function FootnoteTooltip({ x, y, visible, id, text }: FootnoteTooltipProps) {
  if (!visible) return null;
  return (
    <div className={styles.tooltip} style={{ left: x, top: y }}>
      <div className={styles.num}>[{id}]</div>
      <div>{text}</div>
    </div>
  );
}
