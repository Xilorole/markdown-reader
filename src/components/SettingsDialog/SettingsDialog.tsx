import { createAiProvider } from '@/services/ai-provider';
import type { AiProviderConfig, AiProviderType } from '@/types';
import { useState } from 'react';
import styles from './SettingsDialog.module.css';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

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
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');

  if (!open) return null;

  const buildConfig = (): AiProviderConfig => ({
    type,
    endpoint: endpoint || undefined,
    apiKey: apiKey || undefined,
    deploymentName: deployment || undefined,
  });

  const handleTest = async () => {
    const cfg = buildConfig();
    if (cfg.type === 'none') return;

    setTestStatus('testing');
    setTestMessage('');

    // 5秒のタイムアウトを設定
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);

    try {
      const provider = createAiProvider(cfg);
      await provider.testConnection(abortController.signal);
      setTestStatus('success');
      setTestMessage('接続に成功しました');
    } catch (e) {
      setTestStatus('error');
      if (e instanceof Error && e.name === 'AbortError') {
        setTestMessage('接続がタイムアウトしました（5秒）');
      } else {
        setTestMessage(e instanceof Error ? e.message : '接続に失敗しました');
      }
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleSave = () => {
    onSave(buildConfig());
    onClose();
  };

  const statusColor =
    testStatus === 'success' ? '#5a8a5a' :
      testStatus === 'error' ? '#a05050' :
        'var(--color-text-muted)';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>AI設定</h2>

        <label className={styles.label}>
          プロバイダー
          <select
            className={styles.select}
            value={type}
            onChange={(e) => { setType(e.target.value as AiProviderType); setTestStatus('idle'); }}
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
                onChange={(e) => { setEndpoint(e.target.value); setTestStatus('idle'); }}
                placeholder="https://xxx.openai.azure.com"
              />
            </label>
            <label className={styles.label}>
              API Key
              <input
                className={styles.input}
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle'); }}
              />
            </label>
            <label className={styles.label}>
              Deployment Name
              <input
                className={styles.input}
                type="text"
                value={deployment}
                onChange={(e) => { setDeployment(e.target.value); setTestStatus('idle'); }}
              />
            </label>
          </>
        )}

        {type !== 'none' && (
          <div className={styles.testRow}>
            <button
              className={styles.btnSecondary}
              onClick={handleTest}
              disabled={testStatus === 'testing'}
            >
              {testStatus === 'testing' ? '接続中...' : '接続を確認'}
            </button>
            {testStatus !== 'idle' && testStatus !== 'testing' && (
              <span className={styles.testMessage} style={{ color: statusColor }}>
                {testMessage}
              </span>
            )}
          </div>
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
