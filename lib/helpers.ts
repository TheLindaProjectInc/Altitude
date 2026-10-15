
import * as https from 'https';
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as path from 'path';
import { exec } from 'child_process';

export async function pathExists(path) {
    return new Promise((resolve, reject) => {
        fs.exists(path, exists => {
            resolve(exists)
        })
    })
}

export async function readFile(file, encoding = 'utf-8' as BufferEncoding) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, { encoding: encoding }, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

export async function writeFile(file, data, encoding = 'utf-8' as BufferEncoding) {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(file, data, { encoding: encoding }, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export async function setFileExecutable(file: string) {
    exec(`chmod +x "${file}"`);
}

export async function renameFile(original: string, rename: string) {
    return new Promise<void>((resolve, reject) => {
        fs.rename(original, rename, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export async function ensureDirectoryExists(dir: string) {
    if (!await pathExists(dir))
        await makeFolder(dir);
}


export async function deleteFile(file: string) {
    return new Promise<void>((resolve, reject) => {
        pathExists(file).then((exits) => {
            if (exits) {
                fs.unlink(file, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        })
    });
}

export function deleteFolderSync(folder: string) {
    if (fs.existsSync(folder)) {
        fs.readdirSync(folder).forEach((file, index) => {
            const curPath = path.join(folder, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folder);
    }
}

export async function getFileHash(path) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        let stream = fs.createReadStream(path);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

export async function getRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, response => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
                let body = ''
                response.on('data', (chunk) => {
                    body += chunk;
                });
                response.on('end', () => {
                    resolve({ response, body });
                });
            } else {
                reject(new Error(response.statusCode + ' ' + response.statusMessage));
            }
        }).on('error', err => {
            reject(err);
        });
    })
}

// HEAD request - used to check a remote file's size/last-modified date without
// downloading it (e.g. checking how fresh a bootstrap file is before offering it)
export async function getHeaders(url): Promise<{ [header: string]: string }> {
    return new Promise((resolve, reject) => {
        https.request(url, { method: 'HEAD' }, response => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
                resolve(response.headers as { [header: string]: string });
            } else if (response.headers.location) {
                resolve(getHeaders(response.headers.location));
            } else {
                reject(new Error(response.statusCode + ' ' + response.statusMessage));
            }
        }).on('error', err => {
            reject(err);
        }).end();
    })
}


export async function makeFolder(path) {
    return new Promise<void>((resolve, reject) => {
        fs.mkdir(path, { recursive: true }, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// bytes free on the volume containing dir, available to the current user (not just
// total free - matters on Linux where some space can be reserved for root)
export async function getFreeSpace(dir: string): Promise<number> {
    const stats = await fs.promises.statfs(dir);
    return stats.bavail * stats.bsize;
}
