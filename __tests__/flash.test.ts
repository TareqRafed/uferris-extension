import * as vscode from 'vscode';
import { flash } from '../src/commands/flash';

jest.mock('which', () => jest.fn());
jest.mock('vscode');
jest.mock('../src/commands/selectBoard', () => ({ selectBoard: jest.fn() }));
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  open: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockWhich = require('which') as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockReaddir = require('fs/promises').readdir as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockOpen = require('fs/promises').open as jest.Mock;
const mockShowError = vscode.window.showErrorMessage as jest.Mock;
const mockShowQuickPick = vscode.window.showQuickPick as jest.Mock;
const mockGetConfig = vscode.workspace.getConfiguration as jest.Mock;
const mockExecuteTask = vscode.tasks.executeTask as jest.Mock;
const mockCreateTerminal = vscode.window.createTerminal as jest.Mock;

const WORKSPACE_ROOT = '/workspace';
const TARGET_TRIPLE = 'thumbv6m-none-eabi';
const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);

const mockTerminal = { show: jest.fn(), sendText: jest.fn() };

/** Returns a mock file handle whose read() fills the buffer with ELF magic bytes. */
function elfFileHandle() {
  return {
    read: jest.fn().mockImplementation(
      (buf: Buffer) => { ELF_MAGIC.copy(buf); return Promise.resolve({ bytesRead: 4 }); }
    ),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

/** Returns a mock file handle whose read() fills the buffer with non-ELF bytes. */
function nonElfFileHandle() {
  return {
    read: jest.fn().mockImplementation(
      (buf: Buffer) => { buf.fill(0); return Promise.resolve({ bytesRead: 4 }); }
    ),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockExecuteTask.mockResolvedValue(undefined);
  mockWhich.mockResolvedValue('/usr/bin/probe-rs');
  mockCreateTerminal.mockReturnValue(mockTerminal);
  mockShowError.mockResolvedValue(undefined);
  mockShowQuickPick.mockResolvedValue(undefined);
  (vscode.workspace as { workspaceFolders: unknown }).workspaceFolders = [
    { uri: { fsPath: WORKSPACE_ROOT } },
  ];
  mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue('rp2040'), update: jest.fn() });

  // Default: release dir has one ELF binary named 'hello-world'
  mockReaddir.mockResolvedValue(['hello-world']);
  mockOpen.mockResolvedValue(elfFileHandle());
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

  it('shows error when no compiled binary is found', async () => {
    mockReaddir.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    await flash();
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('No compiled binary found'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('skips non-ELF files and shows error when none qualify', async () => {
    mockReaddir.mockResolvedValue(['hello-world.d', 'hello-world.rlib', 'hello-world.rmeta']);
    await flash();
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('No compiled binary found'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('skips files whose magic bytes are not ELF', async () => {
    mockReaddir.mockResolvedValue(['not-an-elf']);
    mockOpen.mockResolvedValue(nonElfFileHandle());
    await flash();
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('No compiled binary found'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('falls back to debug profile when release dir is missing', async () => {
    mockReaddir
      .mockRejectedValueOnce(new Error('ENOENT')) // release dir missing
      .mockResolvedValueOnce(['hello-world']);     // debug dir has one ELF
    mockOpen.mockResolvedValue(elfFileHandle());

    await flash();

    expect(vscode.ShellExecution).toHaveBeenCalledWith(
      expect.stringContaining('hello-world'),
      expect.objectContaining({ cwd: WORKSPACE_ROOT })
    );
    expect(mockExecuteTask).toHaveBeenCalledTimes(1);
  });

  it('flashes the discovered ELF with correct chip', async () => {
    await flash();

    expect(vscode.ShellExecution).toHaveBeenCalledWith(
      expect.stringMatching(/^probe-rs flash --chip RP2040 .*hello-world$/),
      expect.objectContaining({ cwd: WORKSPACE_ROOT })
    );
    expect(mockExecuteTask).toHaveBeenCalledTimes(1);
  });

  it('shows quick-pick when multiple ELF binaries are found', async () => {
    mockReaddir.mockResolvedValue(['bin-a', 'bin-b']);
    mockOpen.mockResolvedValue(elfFileHandle());
    mockShowQuickPick.mockResolvedValue(`target/${TARGET_TRIPLE}/release/bin-a`);

    await flash();

    expect(mockShowQuickPick).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining('bin-a'),
        expect.stringContaining('bin-b'),
      ]),
      expect.objectContaining({ placeHolder: expect.stringContaining('Multiple') })
    );
    expect(mockExecuteTask).toHaveBeenCalledTimes(1);
  });

  it('returns without flashing when multiple-binary picker is cancelled', async () => {
    mockReaddir.mockResolvedValue(['bin-a', 'bin-b']);
    mockOpen.mockResolvedValue(elfFileHandle());
    mockShowQuickPick.mockResolvedValue(undefined);

    await flash();

    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('prompts board selection when no MCU is saved', async () => {
    mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue(undefined), update: jest.fn() });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mockSelectBoard = require('../src/commands/selectBoard').selectBoard as jest.Mock;
    mockSelectBoard.mockResolvedValue('rp2040');

    await flash();

    expect(mockSelectBoard).toHaveBeenCalled();
    expect(mockExecuteTask).toHaveBeenCalledTimes(1);
  });

  it('returns without flashing when board picker is cancelled', async () => {
    mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue(undefined), update: jest.fn() });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mockSelectBoard = require('../src/commands/selectBoard').selectBoard as jest.Mock;
    mockSelectBoard.mockResolvedValue(undefined);

    await flash();

    expect(mockExecuteTask).not.toHaveBeenCalled();
  });
});
