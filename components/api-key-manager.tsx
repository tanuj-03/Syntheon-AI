'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Copy,
  Key,
  RefreshCw,
  Shield,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function ApiKeyManager() {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkExistingKey();
  }, []);

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const checkExistingKey = async () => {
    try {
      const response = await fetch('/api/check-key');
      const data = await response.json();
      setHasExistingKey(data.hasKey);
    } catch (error) {
      console.error('Failed to check existing key:', error);
    }
  };

  const generateKey = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/generate-key', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate key');
      }

      const data = await response.json();
      setApiKey(data.apiKey);
      setMaskedKey(maskApiKey(data.apiKey));
      setHasExistingKey(true);
      setShowKey(false); // Start with masked view

      toast({
        title: '✅ API Key Generated',
        description: 'Your new API key has been created. Save it securely!',
      });
    } catch (error) {
      console.error('Failed to generate key:', error);
      toast({
        title: '❌ Generation Failed',
        description: 'Could not generate API key',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateKey = async () => {
    if (!confirm('Are you sure? This will invalidate your previous API key.')) {
      return;
    }

    await generateKey();
  };

  const copyToClipboard = async () => {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey); // Always copy the full key
      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);

      toast({
        title: '✅ Copied!',
        description: 'API key copied to clipboard',
      });
    } catch (error) {
      toast({
        title: '❌ Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Key className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Syntheon Extension API</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate API keys for the browser extension
            </p>
          </div>
        </div>
        {hasExistingKey && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[11px] font-medium">
            <Shield className="h-3 w-3" /> Active
          </span>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Content */}
      <div className="p-5 space-y-4">
        {hasExistingKey ? (
          apiKey ? (
            <>
              {/* Generated key display */}
              <div className="rounded-md border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Your API Key
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowKey(!showKey)}
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs"
                    >
                      {showKey ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {showKey ? 'Hide' : 'Show'}
                    </Button>
                    <Button onClick={copyToClipboard} size="sm" className="h-7 gap-1.5 text-xs">
                      {copied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>

                <code
                  className="block w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground break-all"
                  style={{ letterSpacing: showKey ? 'normal' : '0.05em' }}
                >
                  {showKey ? apiKey : maskedKey}
                </code>

                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {showKey
                    ? 'Keep this key secure — never share it publicly.'
                    : 'Click Show to reveal your full API key.'}
                </p>
              </div>

              <Button
                onClick={regenerateKey}
                disabled={loading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {loading ? 'Generating…' : 'Regenerate Key'}
              </Button>
            </>
          ) : (
            <>
              {/* Key exists in DB but not in state */}
              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4">
                <Key className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">API Key Already Exists</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You already have an active key. Regenerate to replace it.
                  </p>
                </div>
              </div>
              <Button onClick={regenerateKey} disabled={loading} size="sm" className="gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {loading ? 'Generating…' : 'Regenerate Key'}
              </Button>
            </>
          )
        ) : (
          <>
            {/* No key */}
            <div className="flex items-start gap-3 rounded-md border border-dashed border-border p-4">
              <Key className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">No API Key Found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generate a key to use the Syntheon browser extension.
                </p>
              </div>
            </div>
            <Button onClick={generateKey} disabled={loading} size="sm" className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              {loading ? 'Generating…' : 'Generate API Key'}
            </Button>
          </>
        )}
      </div>

      {/* Usage info */}
      <div className="px-5 pb-5 pt-1 border-t border-border/60 mt-1 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pt-3">
          Used for
        </p>
        <ul className="space-y-1.5">
          {[
            'Authenticate the Syntheon browser extension',
            'Access your meeting data and tickets',
            'Generate code and create pull requests',
            'Sync with your GitHub repositories',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
