'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const CONFIG_FILES = {
  OPENCODE: 'opencode.json',
  OMO: 'oh-my-opencode.json',
} as const;

type ConfigFile = (typeof CONFIG_FILES)[keyof typeof CONFIG_FILES];

interface ConfigState {
  content: string;
  originalContent: string;
}

export function ConfigEditor() {
  const [activeFile, setActiveFile] = useState<ConfigFile>(CONFIG_FILES.OPENCODE);
  const [configStates, setConfigStates] = useState<Record<ConfigFile, ConfigState>>({
    [CONFIG_FILES.OPENCODE]: { content: '', originalContent: '' },
    [CONFIG_FILES.OMO]: { content: '', originalContent: '' },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentState = configStates[activeFile];
  const hasUnsavedChanges = currentState.content !== currentState.originalContent;

  useEffect(() => {
    async function loadAllFiles() {
      setLoading(true);
      setError(null);
      try {
        const [opencodeResponse, omoResponse] = await Promise.all([
          fetch(`/api/config?file=${CONFIG_FILES.OPENCODE}`),
          fetch(`/api/config?file=${CONFIG_FILES.OMO}`),
        ]);

        const [opencodeData, omoData] = await Promise.all([
          opencodeResponse.json(),
          omoResponse.json(),
        ]);

        setConfigStates({
          [CONFIG_FILES.OPENCODE]: {
            content: opencodeData.content,
            originalContent: opencodeData.content,
          },
          [CONFIG_FILES.OMO]: {
            content: omoData.content,
            originalContent: omoData.content,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration files');
      } finally {
        setLoading(false);
      }
    }

    loadAllFiles();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: activeFile, content: currentState.content }),
      });
      const data = await response.json();
      if (data.success) {
        setConfigStates((prev) => ({
          ...prev,
          [activeFile]: {
            ...prev[activeFile],
            originalContent: prev[activeFile].content,
          },
        }));
        setSuccessMessage(`${activeFile} saved successfully!`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Save failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setConfigStates((prev) => ({
      ...prev,
      [activeFile]: {
        ...prev[activeFile],
        content: prev[activeFile].originalContent,
      },
    }));
  }

  function handleTabSwitch(filename: ConfigFile) {
    if (hasUnsavedChanges) {
      if (!confirm(`You have unsaved changes in ${activeFile}. Discard them?`)) {
        return;
      }
      handleDiscard();
    }
    setActiveFile(filename);
  }

  function handleEditorChange(value: string | undefined) {
    setConfigStates((prev) => ({
      ...prev,
      [activeFile]: {
        ...prev[activeFile],
        content: value || '',
      },
    }));
  }

  function handleEditorDidMount(_editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'https://opencode.ai/config.json',
          fileMatch: [CONFIG_FILES.OPENCODE],
        },
        {
          uri: 'https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json',
          fileMatch: [CONFIG_FILES.OMO],
        },
      ],
    });
  }

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          type="button"
          onClick={() => handleTabSwitch(CONFIG_FILES.OPENCODE)}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2',
            activeFile === CONFIG_FILES.OPENCODE
              ? 'border-blue-500 text-blue-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
          )}
        >
          opencode.json
          {configStates[CONFIG_FILES.OPENCODE].content !==
            configStates[CONFIG_FILES.OPENCODE].originalContent && (
            <span className="ml-1 text-orange-400">*</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => handleTabSwitch(CONFIG_FILES.OMO)}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2',
            activeFile === CONFIG_FILES.OMO
              ? 'border-blue-500 text-blue-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
          )}
        >
          oh-my-opencode.json
          {configStates[CONFIG_FILES.OMO].content !==
            configStates[CONFIG_FILES.OMO].originalContent && (
            <span className="ml-1 text-orange-400">*</span>
          )}
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-[500px] bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <Editor
            height="500px"
            language="json"
            theme="vs-dark"
            value={currentState.content}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              fontSize: 14,
              lineNumbers: 'on',
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={!hasUnsavedChanges || saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
        {hasUnsavedChanges && (
          <Button variant="outline" onClick={handleDiscard}>
            Discard
          </Button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="px-4 py-3 rounded-lg bg-green-900/20 border border-green-800 text-green-400 text-sm">
          {successMessage}
        </div>
      )}
    </div>
  );
}
