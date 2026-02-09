import { forwardRef } from 'react';
import styles from './ContentArea.module.css';

interface ContentAreaProps {
  html: string;
}

export const ContentArea = forwardRef<HTMLDivElement, ContentAreaProps>(
  function ContentArea({ html }, ref) {
    return (
      <div
        ref={ref}
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  },
);
