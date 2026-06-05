type OAuthAuthorizationUrlOptions = {
  authorizeEndpoint: string;
  clientId: string;
  redirectUri: string;
  extraParams?: Record<string, string | undefined>;
};

export function buildOAuthAuthorizationUrl(options: OAuthAuthorizationUrlOptions): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: 'code',
  });

  for (const [key, value] of Object.entries(options.extraParams || {})) {
    if (value) {
      params.set(key, value);
    }
  }

  return `${options.authorizeEndpoint}?${params.toString()}`;
}
