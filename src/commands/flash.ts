import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { selectBoard } from './selectBoard';
import { SUPPORTED_MCUS } from '../boards';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const which = require('which') as (cmd: string) => Promise<string>;

// Returns true if probe-rs is ready.
// If missing but cargo is available, offers to install via `cargo install probe-rs-tools`.
async function requireProbeRs(): Promise<boolean> {
  const found = await which('probe-rs').catch(() => null);
  if (found) return true;

  const hasCargo = await which('cargo').catch(() => null);
  if (hasCargo) {
    const choice = await vscode.window.showErrorMessage(
      'probe-rs not found.',
      'Install via cargo',
      'Dismiss'
    );
    if (choice === 'Install via cargo') {
      const terminal = vscode.window.createTerminal('Install probe-rs');
      terminal.show();
      terminal.sendText('cargo install probe-rs-tools && echo "probe-rs installed — re-run Flash"');
    }
  } else {
    vscode.window.showErrorMessage('probe-rs not found. Install it manually before flashing.');
  }
  return false;
}

// Searches target/{targetTriple}/release then /debug for ELF binaries.
// Returns the path if exactly one is found, shows a picker if multiple, null if none.
async function findElfBinary(
  workspaceRoot: string,
  targetTriple: string
): Promise<string | null> {
  const ELF_MAGIC = [0x7f, 0x45, 0x4c, 0x46];
  const profiles = ['release', 'debug'];

  for (const profile of profiles) {
    const dir = path.join(workspaceRoot, 'target', targetTriple, profile);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }

    const elfs: string[] = [];
    for (const name of entries) {
      if (name.endsWith('.d') || name.endsWith('.rlib') || name.endsWith('.rmeta')) continue;
      const filePath = path.join(dir, name);
      try {
        const buf = Buffer.alloc(4);
        const fh = await fs.open(filePath, 'r');
        await fh.read(buf, 0, 4, 0);
        await fh.close();
        if (ELF_MAGIC.every((b, i) => buf[i] === b)) {
          elfs.push(filePath);
        }
      } catch {
        continue;
      }
    }

    if (elfs.length === 1) return elfs[0];
    if (elfs.length > 1) {
      const picked = await vscode.window.showQuickPick(
        elfs.map((p) => path.relative(workspaceRoot, p)),
        { placeHolder: 'Multiple binaries found — pick one to flash' }
      );
      return picked ? path.join(workspaceRoot, picked) : null;
    }
  }

  return null;
}

// Flash flow:
//   1. check probe-rs in PATH   → offer cargo install if missing
//   2. require workspace open   → error if not
//   3. board picker (only if no board saved)
//   4. discover ELF in target/{triple}/release then /debug
//   5. run: probe-rs flash --chip {probeChip} {elfPath}
export async function flash(): Promise<void> {
  if (!await requireProbeRs()) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    vscode.window.showErrorMessage('No workspace folder open.');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const currentMcuId = vscode.workspace.getConfiguration('uferris').get<string>('targetMcu');
  const mcuId = currentMcuId ?? await selectBoard(undefined);
  if (!mcuId) return;

  const mcu = SUPPORTED_MCUS.find((m) => m.id === mcuId);
  if (!mcu) {
    vscode.window.showErrorMessage(
      `Unknown board "${mcuId}". Run "uFerris: Select Board" to choose a valid board.`
    );
    return;
  }

  const elfPath = await findElfBinary(workspaceRoot, mcu.targetTriple);
  if (!elfPath) {
    vscode.window.showErrorMessage('No compiled binary found. Run Build first.');
    return;
  }

  const task = new vscode.Task(
    { type: 'uferris', task: 'flash' },
    vscode.TaskScope.Workspace,
    'flash',
    'uferris',
    new vscode.ShellExecution(
      `probe-rs flash --chip ${mcu.probeChip} ${elfPath}`,
      { cwd: workspaceRoot }
    )
  );

  await vscode.tasks.executeTask(task);
}
