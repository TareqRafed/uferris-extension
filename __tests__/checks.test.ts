import * as vscode from 'vscode';
import { requireInPath, requireContainerRuntime } from '../src/checks';

jest.mock('which', () => jest.fn());
jest.mock('vscode');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockWhich = require('which') as jest.Mock;
const mockShowError = vscode.window.showErrorMessage as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('requireInPath', () => {
  it('returns true when binary is found', async () => {
    mockWhich.mockResolvedValue('/usr/bin/fork');
    expect(await requireInPath('fork', 'fork not found')).toBe(true);
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('returns false and shows error when binary is missing', async () => {
    mockWhich.mockRejectedValue(new Error('not found'));
    expect(await requireInPath('fork', 'fork not found')).toBe(false);
    expect(mockShowError).toHaveBeenCalledWith('fork not found');
  });
});

describe('requireContainerRuntime', () => {
  it('returns true when docker is found', async () => {
    mockWhich.mockImplementation((cmd: string) =>
      cmd === 'docker' ? Promise.resolve('/usr/bin/docker') : Promise.reject(new Error())
    );
    expect(await requireContainerRuntime()).toBe(true);
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('returns true when only podman is found', async () => {
    mockWhich.mockImplementation((cmd: string) =>
      cmd === 'podman' ? Promise.resolve('/usr/bin/podman') : Promise.reject(new Error())
    );
    expect(await requireContainerRuntime()).toBe(true);
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('returns false and shows error when neither docker nor podman is found', async () => {
    mockWhich.mockRejectedValue(new Error('not found'));
    expect(await requireContainerRuntime()).toBe(false);
    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringContaining('Docker or Podman')
    );
  });
});
