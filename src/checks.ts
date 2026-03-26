import * as vscode from 'vscode';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const which = require('which') as (cmd: string) => Promise<string>;

// Returns true if binary is found in PATH, false + shows toast error if not.
export async function requireInPath(binary: string, message: string): Promise<boolean> {
  const found = await which(binary).catch(() => null);
  if (!found) {
    vscode.window.showErrorMessage(message);
    return false;
  }
  return true;
}

// Returns true if docker or podman is available in PATH.
export async function requireContainerRuntime(): Promise<boolean> {
  const hasDocker = await which('docker').catch(() => null);
  const hasPodman = await which('podman').catch(() => null);
  if (!hasDocker && !hasPodman) {
    vscode.window.showErrorMessage(
      'Docker or Podman is required to build. Install one manually.'
    );
    return false;
  }
  return true;
}
