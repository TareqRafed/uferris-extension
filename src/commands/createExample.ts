import * as vscode from 'vscode';
import * as path from 'path';
import { listExamplesForBoard, downloadExample } from '../github';
import { selectBoard } from './selectBoard';

// Create Example flow:
//   1. require workspace open
//   2. board picker (current board pre-listed, optional — Escape cancels)
//   3. fetch example list from GitHub → QuickPick
//   4. download full project directory into {workspace}/{exampleName}/
export async function createExample(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    vscode.window.showErrorMessage('Open a folder first before creating an example.');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  const currentMcuId = vscode.workspace.getConfiguration('uferris').get<string>('targetMcu');
  const selectedBoardId = await selectBoard(currentMcuId);
  if (!selectedBoardId) return;

  let examples: string[];
  try {
    examples = await listExamplesForBoard(selectedBoardId);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to fetch examples from GitHub: ${err instanceof Error ? err.message : String(err)}`
    );
    return;
  }

  if (examples.length === 0) {
    vscode.window.showErrorMessage(`No examples found for ${selectedBoardId}.`);
    return;
  }

  const selectedExample = await vscode.window.showQuickPick(examples, {
    placeHolder: 'Select an example',
  });
  if (!selectedExample) return;

  const destDir = path.join(workspaceRoot, selectedExample);

  try {
    await downloadExample(selectedBoardId, selectedExample, destDir);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to download example: ${err instanceof Error ? err.message : String(err)}`
    );
    return;
  }

  vscode.window.showInformationMessage(
    `Example "${selectedExample}" created at ${destDir}`
  );
}
