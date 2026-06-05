'use client';

import { OAuthConnectButton } from '@/components/oauth-connect-button';

interface GitHubConnectButtonProps {
  onSuccess?: () => void;
}

export function GitHubConnectButton({ onSuccess }: GitHubConnectButtonProps) {
  return (
    <OAuthConnectButton
      label="Connect GitHub"
      providerName="GitHub"
      initiateEndpoint="/api/oauth/github/initiate"
      onSuccess={onSuccess}
    />
  );
}
