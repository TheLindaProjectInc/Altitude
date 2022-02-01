
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

export async function readFile(file, encoding = 'utf-8') {
    return new Promise((resolve, reject) => {
        fs.readFile(file, { encoding: encoding }, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

export async function writeFile(file, data, encoding = 'utf-8') {
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

export async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, response => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
                var fileStream = fs.createWriteStream(dest);
                fileStream.on('error', err => reject(err));
                fileStream.on('close', () => resolve(getFileHash(dest)));
                response.pipe(fileStream);
            } else if (response.headers.location) {
                const location = response.headers.location
                resolve(downloadFile(location, dest));
            } else {
                reject(new Error(response.statusCode + ' ' + response.statusMessage));
            }
        }).on('error', err => {
            reject(err);
        });
    })
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


export async function makeFolder(path) {
    return new Promise<void>((resolve, reject) => {
        fs.mkdir(path, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}