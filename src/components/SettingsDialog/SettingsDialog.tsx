import { useState } from 'react';
import type { AiProviderConfig, AiProviderType } from '@/types';
import styles from './SettingsDialog.module.css';

interface SettingsDialogProps {
  open: boolean;
  config: AiProviderConfig;
  onSave: (config: AiProviderConfig) => void;
  onClose: () => void;
}

export function SettingsDialog({ open, config, onSave, onClose }: SettingsDialogProps) {
  const [type, setType] = useState<AiProviderType>(config.type);
  const [endpoint, setEndpoint] = useState(config.endpoint ?? '');
  const [apiKey, setApiKey] = useState(config.apiKey ?? '');
  const [deployment, setDeployment] = useState(config.deploymentName ?? '');

  if (!open) return null;

  const handleSave = () => {
    onSave({
      type,
      endpoint: endpoint || undefined,
      apiKey: apiKey || undefined,
      deploymentName: deployment || undefined,
    });
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>AI設定</h2>

        <label className={styles.label}>
          プロバイダー
          <select
            className={styles.select}
            value={type}
            onChange={(e) => setType(e.target.value as AiProviderType)}
          >
            <option value="none">無効</option>
            <option value="anthropic">Anthropic</option>
            <option value="aoai">Azure OpenAI</option>
          </select>
        </label>

        {type === 'aoai' && (
          <>
            <label className={styles.label}>
              Endpoint
              <input
                className={styles.input}
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://xxx.openai.azure.com"
              />
            </label>
            <label className={styles.label}>
              API Key
              <input
                className={styles.input}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              Deployment Name
              <input
                className={styles.input}
                type="text"
                value={deployment}
                onChange={(e) => setDeployment(e.target.value)}
              />
            </label>
          </>
        )}

        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onClose}>
            キャンセル
          </button>
          <button className={styles.btnPrimary} onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
