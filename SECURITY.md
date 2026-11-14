# Security Policy

## Scope

MissionGuard is a prototype developed for the NASA Space Apps Challenge 2026. It uses simulated spacecraft telemetry and is not intended for operational spacecraft control or other safety-critical use.

## Reporting a Vulnerability

Please do not disclose API keys, credentials, or other sensitive information in public issues or pull requests.

If GitHub private vulnerability reporting is enabled for this repository, use the **Report a vulnerability** option in the repository's Security tab. Otherwise, contact the repository maintainers privately through their GitHub profiles.

Please include:
- A concise description of the issue and its potential impact.
- Steps to reproduce the issue, where safe to do so.
- Any suggested mitigation.

Please allow the maintainers reasonable time to investigate before making the issue public.

## Secret Handling

- Store Gemini API keys and other credentials in a local `.env` file.
- Never commit `.env` files, API keys, tokens, or private credentials.
- Keep API keys on the server side; do not expose them through frontend code or client-side environment variables.
- If a credential is accidentally exposed, revoke or rotate it immediately.
