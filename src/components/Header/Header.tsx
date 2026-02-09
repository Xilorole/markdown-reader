import { FolderOpen, PanelRight, PanelRightClose, Settings } from 'lucide-react';
import { useRef } from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onCloseSidebar: () => void;
  onFileOpen: (text: string) => void;
  onOpenSettings: () => void;
}

export function Header({
  sidebarVisible,
  onToggleSidebar,
  onCloseSidebar,
  onFileOpen,
  onOpenSettings,
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') onFileOpen(ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Markdown Reader</h1>
      <div className={styles.controls}>
        <button
          className={styles.iconBtn}
          onClick={sidebarVisible ? onCloseSidebar : onToggleSidebar}
          aria-label={sidebarVisible ? '注釈を閉じる' : '注釈を表示'}
          data-tooltip={sidebarVisible ? '閉じる' : '注釈'}
        >
          {sidebarVisible ? <PanelRightClose size={18} /> : <PanelRight size={18} />}
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => inputRef.current?.click()}
          aria-label="ファイルを開く"
          data-tooltip="開く"
        >
          <FolderOpen size={18} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={onOpenSettings}
          aria-label="設定"
          data-tooltip="設定"
        >
          <Settings size={18} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.markdown,.txt"
          className={styles.fileInput}
          onChange={handleFile}
        />
      </div>
    </header>
  );
}
