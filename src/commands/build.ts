import * as vscode from 'vscode';
import { requireInPath, requireContainerRuntime } from '../checks';
import { selectBoard } from './selectBoard';
import { SUPPORTED_MCUS } from '../boards';

// Build flow:
//   1. check fork in PATH       → error if missing
//   2. check docker or podman   → error if neither found
//   3. use saved board if set; otherwise show board picker
//   4. run: fork build -c {forkTarget}
export async function build(): Promise<void> {
  if (!await requireInPath('fork', 'fork build tool not found. Install it manually.')) return;
  if (!await requireContainerRuntime()) return;

  const config = vscode.workspace.getConfiguration('uferris');
  const currentMcuId = config.get<string>('targetMcu');
  const mcuId = currentMcuId ?? await selectBoard(undefined);
  if (!mcuId) return;

  const mcu = SUPPORTED_MCUS.find((m) => m.id === mcuId);
  if (!mcu) {
    vscode.window.showErrorMessage(`Unknown board "${mcuId}".`);
    return;
  }

  const task = new vscode.Task(
    { type: 'uferris', task: 'build' },
    vscode.TaskScope.Workspace,
    'build',
    'uferris',
    new vscode.ShellExecution(`fork build -c ${mcu.forkTarget}`)
  );

  await vscode.tasks.executeTask(task);
}
