import { listExamplesForBoard, downloadExample } from '../src/github';

jest.mock('../src/fetcher');
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFetcher = require('../src/fetcher') as { getJson: jest.Mock; getText: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFs = require('fs/promises') as { mkdir: jest.Mock; writeFile: jest.Mock };

beforeEach(() => jest.clearAllMocks());

describe('listExamplesForBoard', () => {
  it('returns example directory names for a board', async () => {
    mockFetcher.getJson.mockResolvedValue([
      { name: 'hello-world', type: 'dir',  path: 'examples/rp2040/hello-world', download_url: null },
      { name: 'blink',       type: 'dir',  path: 'examples/rp2040/blink',       download_url: null },
    ]);
    expect(await listExamplesForBoard('rp2040')).toEqual(['hello-world', 'blink']);
  });

  it('filters out files and only returns directories', async () => {
    mockFetcher.getJson.mockResolvedValue([
      { name: 'hello-world', type: 'dir',  path: 'examples/rp2040/hello-world', download_url: null },
      { name: 'README.md',   type: 'file', path: 'examples/rp2040/README.md',   download_url: 'https://raw.github...' },
    ]);
    expect(await listExamplesForBoard('rp2040')).toEqual(['hello-world']);
  });

  it('throws when the GitHub API call fails', async () => {
    mockFetcher.getJson.mockRejectedValue(new Error('HTTP 404'));
    await expect(listExamplesForBoard('rp2040')).rejects.toThrow('HTTP 404');
  });
});

describe('downloadExample', () => {
  it('downloads files and recurses into subdirectories', async () => {
    mockFetcher.getJson
      .mockResolvedValueOnce([
        { name: 'Cargo.toml', type: 'file', path: 'examples/rp2040/hello-world/Cargo.toml', download_url: 'https://raw.../Cargo.toml' },
        { name: 'src',        type: 'dir',  path: 'examples/rp2040/hello-world/src',        download_url: null },
      ])
      .mockResolvedValueOnce([
        { name: 'main.rs', type: 'file', path: 'examples/rp2040/hello-world/src/main.rs', download_url: 'https://raw.../main.rs' },
      ]);
    mockFetcher.getText.mockResolvedValue('file content');

    await downloadExample('rp2040', 'hello-world', '/dest');

    expect(mockFs.mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('Cargo.toml'), 'file content', 'utf8'
    );
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('main.rs'), 'file content', 'utf8'
    );
  });

  it('throws when a file download fails', async () => {
    mockFetcher.getJson.mockResolvedValue([
      { name: 'Cargo.toml', type: 'file', path: 'examples/rp2040/hello-world/Cargo.toml', download_url: 'https://...' },
    ]);
    mockFetcher.getText.mockRejectedValue(new Error('network error'));

    await expect(downloadExample('rp2040', 'hello-world', '/dest')).rejects.toThrow('network error');
  });

  it('throws when the directory listing fails', async () => {
    mockFetcher.getJson.mockRejectedValue(new Error('HTTP 403'));
    await expect(downloadExample('rp2040', 'hello-world', '/dest')).rejects.toThrow('HTTP 403');
  });
});
