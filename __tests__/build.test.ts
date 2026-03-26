import * as vscode from 'vscode';
import { build } from '../src/commands/build';

jest.mock('which', () => jest.fn());
jest.mock('vscode');
jest.mock('../src/commands/selectBoard', () => ({ selectBoard: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockWhich = require('which') as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockSelectBoard = require('../src/commands/selectBoard').selectBoard as jest.Mock;
const mockShowError = vscode.window.showErrorMessage as jest.Mock;
const mockGetConfig = vscode.workspace.getConfiguration as jest.Mock;
const mockExecuteTask = vscode.tasks.executeTask as jest.Mock;

function withForkAndDocker(): void {
  mockWhich.mockImplementation((cmd: string) =>
    cmd === 'fork' || cmd === 'docker'
      ? Promise.resolve(`/usr/bin/${cmd}`)
      : Promise.reject(new Error('not found'))
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockExecuteTask.mockResolvedValue(undefined);
  mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue('rp2040'), update: jest.fn() });
});

describe('build', () => {
  it('shows error and returns when fork is not in PATH', async () => {
    mockWhich.mockRejectedValue(new Error('not found'));
    await build();
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('fork'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('shows error and returns when neither docker nor podman is found', async () => {
    mockWhich.mockImplementation((cmd: string) =>
      cmd === 'fork'
        ? Promise.resolve('/usr/bin/fork')
        : Promise.reject(new Error('not found'))
    );
    await build();
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('Docker or Podman'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('prompts board selection when no MCU is set, then builds', async () => {
    withForkAndDocker();
    mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue(undefined), update: jest.fn() });
    mockSelectBoard.mockResolvedValue('rp2040');

    await build();

    expect(mockSelectBoard).toHaveBeenCalled();
    expect(mockExecuteTask).toHaveBeenCalledTimes(1);
  });

  it('returns without building when MCU picker is cancelled', async () => {
    withForkAndDocker();
    mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue(undefined), update: jest.fn() });
    mockSelectBoard.mockResolvedValue(undefined);

    await build();

    expect(mockExecuteTask).not.toHaveBeenCalled();
  });

  it('runs fork build with the correct forkTarget for the selected MCU', async () => {
    withForkAndDocker();
    mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue('rp2040'), update: jest.fn() });
    mockSelectBoard.mockResolvedValue('rp2040');

    await build();

    expect(vscode.ShellExecution).toHaveBeenCalledWith('fork build -c rp2040');
    expect(mockExecuteTask).toHaveBeenCalledTimes(1);
  });

  it('passes the current MCU to the board picker as default', async () => {
    withForkAndDocker();
    mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue('rp2040'), update: jest.fn() });
    mockSelectBoard.mockResolvedValue('rp2040');

    await build();

    expect(mockSelectBoard).toHaveBeenCalledWith('rp2040');
  });

  it('shows error for unrecognised MCU id returned by picker', async () => {
    withForkAndDocker();
    mockGetConfig.mockReturnValue({ get: jest.fn().mockReturnValue(undefined), update: jest.fn() });
    mockSelectBoard.mockResolvedValue('unknown-mcu');

    await build();

    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('Unknown board'));
    expect(mockExecuteTask).not.toHaveBeenCalled();
  });
});
