import * as vscode from 'vscode';
import { build } from './commands/build';
import { flash } from './commands/flash';
import { selectBoard } from './commands/selectBoard';
import { createExample } from './commands/createExample';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('uferris.build', build),
    vscode.commands.registerCommand('uferris.flash', flash),
    vscode.commands.registerCommand('uferris.selectBoard', selectBoard),
    vscode.commands.registerCommand('uferris.createExample', createExample)
  );
}

export function deactivate(): void {
  // nothing to clean up
}
