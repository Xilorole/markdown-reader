import styles from './ShimmerPlaceholder.module.css';

export function ShimmerPlaceholder() {
  return (
    <div className={styles.wrap}>
      <div className={styles.line} />
      <div className={styles.line} />
      <div className={`${styles.line} ${styles.short}`} />
    </div>
  );
}
