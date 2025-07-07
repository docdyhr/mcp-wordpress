# NPM Authentication Setup

## Quick Setup for This Project

The project includes a pre-configured `.npmrc` file that uses environment variables:

1. **Set your NPM token as environment variable:**

   ```bash
   export NPM_TOKEN="npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
   ```

2. **Or add to your shell profile:**

   ```bash
   # Add to ~/.bashrc, ~/.zshrc, or ~/.profile
   echo 'export NPM_TOKEN="npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. **Verify authentication:**

   ```bash
   npm whoami
   ```

4. **Publish:**

   ```bash
   npm publish
   ```

## Local NPM Authentication Methods

### Method 1: Using NPM Token (Recommended for Automation)

1. **Create an NPM automation token**:
   - Log in to npmjs.com
   - Go to Account Settings → Access Tokens
   - Click "Generate New Token" → Choose "Automation" type
   - Copy the generated token

2. **Store the token locally**:

   Create or edit `~/.npmrc`:

   ```bash
   echo "//registry.npmjs.org/:_authToken=YOUR_NPM_TOKEN" >> ~/.npmrc
   ```

   Or set it for this project only in `.npmrc` (in project root):

   ```bash
   # Copy the example file
   cp .npmrc.example .npmrc

   # Edit .npmrc with your token (if not using environment variable)
   echo "//registry.npmjs.org/:_authToken=YOUR_NPM_TOKEN" > .npmrc
   ```

3. **Using environment variable** (more secure):

   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export NPM_TOKEN="npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

   # Then in .npmrc:
   //registry.npmjs.org/:_authToken=${NPM_TOKEN}
   ```

### Method 2: Interactive Login

```bash
npm login
# Follow the prompts for username, password, email, and 2FA code
```

This creates an entry in `~/.npmrc` automatically.

### Method 3: Using npm CLI with Token

```bash
npm config set //registry.npmjs.org/:_authToken YOUR_NPM_TOKEN
```

## Security Best Practices

1. **Never commit `.npmrc` with tokens** to version control
   - Add `.npmrc` to `.gitignore` if storing tokens there
   - Use environment variables for tokens

2. **Use different tokens for different purposes**:
   - Personal development: Read-only or Publish token
   - CI/CD: Automation token (like your NPM_TOKEN in GitHub secrets)
   - Team projects: Shared organization tokens

3. **Token permissions**:
   - **Read-only**: Can only install packages
   - **Publish**: Can publish new versions
   - **Automation**: Best for CI/CD, can publish but has restrictions

## Publishing with Token

Once authenticated, publish with:

```bash
npm publish
```

Or with explicit registry:

```bash
npm publish --registry https://registry.npmjs.org/
```

## Verifying Authentication

Check if you're logged in:

```bash
npm whoami
```

## GitHub Actions Setup (Already Done)

Your `NPM_TOKEN` is already stored in GitHub secrets. For automated publishing via GitHub Actions, use:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: "18"
    registry-url: "https://registry.npmjs.org"

- name: Publish to NPM
  run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Troubleshooting

1. **401 Unauthorized**: Token is invalid or expired
2. **403 Forbidden**: Token lacks publish permissions
3. **E402**: Package requires payment (for private packages)

## Revoking Tokens

If a token is compromised:

1. Go to npmjs.com → Account Settings → Access Tokens
2. Find the token and click "Revoke"
3. Generate a new token and update your configurations
