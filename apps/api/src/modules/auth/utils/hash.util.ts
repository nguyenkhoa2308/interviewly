import {
    hashArgon2id,
    verifyArgon2id,
} from '../../../common/utils/argon2.util.js';

export async function hashValue(value: string): Promise<string> {
    return hashArgon2id(value);
}

export async function verifyHash(
    hash: string,
    value: string,
): Promise<boolean> {
    return verifyArgon2id(hash, value);
}
