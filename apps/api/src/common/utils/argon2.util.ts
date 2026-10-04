import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

const ARGON2_VERSION = 19;
const DEFAULT_MEMORY_COST = 65_536;
const DEFAULT_TIME_COST = 3;
const DEFAULT_PARALLELISM = 4;
const DEFAULT_HASH_LENGTH = 32;
const DEFAULT_SALT_LENGTH = 16;

interface Argon2Parameters {
    memory: number;
    passes: number;
    parallelism: number;
}

function deriveArgon2id(
    value: string,
    salt: Buffer,
    parameters: Argon2Parameters,
    tagLength: number,
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        argon2(
            'argon2id',
            {
                message: Buffer.from(value, 'utf8'),
                nonce: salt,
                parallelism: parameters.parallelism,
                tagLength,
                memory: parameters.memory,
                passes: parameters.passes,
            },
            (error, derivedKey) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(derivedKey);
            },
        );
    });
}

function encodeBase64(value: Buffer): string {
    return value.toString('base64').replace(/=+$/u, '');
}

function decodeBase64(value: string): Buffer {
    return Buffer.from(value, 'base64');
}

export async function hashArgon2id(value: string): Promise<string> {
    const salt = randomBytes(DEFAULT_SALT_LENGTH);
    const parameters = {
        memory: DEFAULT_MEMORY_COST,
        passes: DEFAULT_TIME_COST,
        parallelism: DEFAULT_PARALLELISM,
    };
    const derivedKey = await deriveArgon2id(
        value,
        salt,
        parameters,
        DEFAULT_HASH_LENGTH,
    );

    return [
        '',
        'argon2id',
        `v=${ARGON2_VERSION}`,
        `m=${parameters.memory},t=${parameters.passes},p=${parameters.parallelism}`,
        encodeBase64(salt),
        encodeBase64(derivedKey),
    ].join('$');
}

export async function verifyArgon2id(
    encodedHash: string,
    value: string,
): Promise<boolean> {
    const match =
        /^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/u.exec(
            encodedHash,
        );

    if (!match || Number(match[1]) !== ARGON2_VERSION) return false;

    const salt = decodeBase64(match[5]);
    const expected = decodeBase64(match[6]);
    if (salt.length < 8 || expected.length < 4) return false;

    try {
        const actual = await deriveArgon2id(
            value,
            salt,
            {
                memory: Number(match[2]),
                passes: Number(match[3]),
                parallelism: Number(match[4]),
            },
            expected.length,
        );

        return (
            actual.length === expected.length &&
            timingSafeEqual(actual, expected)
        );
    } catch {
        return false;
    }
}
