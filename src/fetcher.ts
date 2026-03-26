import * as https from 'https';

export function getJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'uferris-vscode-extension',
            Accept: 'application/vnd.github.v3+json',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(new Error(`GitHub API returned HTTP ${res.statusCode} for ${url}`));
              return;
            }
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }
      )
      .on('error', reject);
  });
}

export function getText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'uferris-vscode-extension' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to fetch ${url}: HTTP ${res.statusCode}`));
            return;
          }
          resolve(data);
        });
      })
      .on('error', reject);
  });
}
