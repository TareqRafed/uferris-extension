import * as vscode from 'vscode';
import { SUPPORTED_MCUS } from '../boards';

// currentId: if provided, that board appears first with "(current)" marker.
export async function selectBoard(currentId?: string): Promise<string | undefined> {
  const items = SUPPORTED_MCUS.map((mcu) => ({
    label: mcu.label,
    description: mcu.id === currentId ? `${mcu.id}  ✓ current` : mcu.id,
    id: mcu.id,
  })).sort((a) => (a.id === currentId ? -1 : 0));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select your uFerris board MCU',
  });

  if (!selected) return undefined;

  await vscode.workspace
    .getConfiguration('uferris')
    .update('targetMcu', selected.id, vscode.ConfigurationTarget.Workspace);

  return selected.id;
}
