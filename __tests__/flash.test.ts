import * as vscode from 'vscode';
import { flash } from '../src/commands/flash';

jest.mock('which', () => jest.fn());
jest.mock('vscode');
jest.mock('../src/commands/selectBoard', () => ({ selectBoard: jest.fn() }));
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockWhich = require('which') as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockReadFile = require('fs/promises').readFile as jest.Mock;
const mockShowError = vscode.window.showErrorMessage as jest.Mock;
const mockShowInfo = vscode.window.showInformationMessage as jest.Mock;
const mockGetConfig = vscode.workspace.getConfiguration as jest.Mock;
const mockExecuteTask = vscode.tasks.executeTask as jest.Mock;
const mockCreateTerminal = vscode.window.createTerminal as jest.Mock;

const WORKSPACE_ROOT = '/workspace';

const mockTerminal = { show: jest.fn(), sendText: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockExecuteTask.mockResolvedValue(undefined);
  mockWhich.mockResolvedValue('/usr/bin/probe-rs');
  mockCreateTerminal.mockReturnValue(mockTerminal);
  mockShowError.mockResolvedValue(undefined);
  mockShowInfo.mockResolvedValue(undefined);
  (vscode.workspace as { workspaceFolders: unknown }).workspaceFolders = [
    { uri: { fsPath: WORKSPACE_ROOT } },
  ];
  mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue('rp2040'), update: jest.fn() });
  mockReadFile.mockResolvedValue('[package]\nname = "hello-world"\n');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('../src/commands/selectBoard').selectBoard as jest.Mock).mockResolvedValue('rp2040');
});

describe('flash', () => {
  it('shows error when probe-rs is not in PATH and cargo is not available', async () => {
    mockWhich.mockRejectedValue(new Error('not found'));
    await flash();
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('probe-rs'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('offers cargo install when probe-rs missing but cargo is available', async () => {
    mockWhich.mockImplementation((cmd: string) =>
      cmd === 'cargo' ? Promise.resolve('/usr/bin/cargo') : Promise.reject(new Error('not found'))
    );
    mockShowError.mockResolvedValue('Install via cargo');

    await flash();

    expect(mockShowError).toHaveBeenCalledWith('probe-rs not found.', 'Install via cargo', 'Dismiss');
    expect(mockTerminal.sendText).toHaveBeenCalledWith(expect.stringContaining('cargo install probe-rs-tools'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('does nothing when user dismisses the cargo install offer', async () => {
    mockWhich.mockImplementation((cmd: string) =>
      cmd === 'cargo' ? Promise.resolve('/usr/bin/cargo') : Promise.reject(new Error('not found'))
    );
    mockShowError.mockResolvedValue('Dismiss');

    await flash();

    expect(mockTerminal.sendText).not.toHaveBeenCalled();
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('shows error when no workspace is open', async () => {
    (vscode.workspace as { workspaceFolders: unknown }).workspaceFolders = undefined;
    await flash();
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('workspace'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('shows error when Cargo.toml is missing', async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    await flash();
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('Cargo.toml'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('runs probe-rs flash with correct chip and binary path', async () => {
    await flash();

    expect(vscode.ShellExecution).toHaveBeenCalledWith(
      'probe-rs flash --chip RP2040 target/thumbv6m-none-eabi/release/hello-world',
      expect.objectContaining({ cwd: WORKSPACE_ROOT })
    );
    expect(mockExecuteTask).toHaveBeenCalledTimes(1);
  });

  it('prompts board selection when no MCU is set', async () => {
    mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue(undefined), update: jest.fn() });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mockSelectBoard = require('../src/commands/selectBoard').selectBoard as jest.Mock;
    mockSelectBoard.mockResolvedValue('rp2040');

    await flash();

    expect(mockSelectBoard).toHaveBeenCalled();
    expect(mockExecuteTask).toHaveBeenCalledTimes(1);
  });

  it('returns without flashing when MCU picker is cancelled', async () => {
    mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue(undefined), update: jest.fn() });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mockSelectBoard = require('../src/commands/selectBoard').selectBoard as jest.Mock;
    mockSelectBoard.mockResolvedValue(undefined);

    await flash();

    expect(mockExecuteTask).not.toHaveBeenCalled();
  });
});
