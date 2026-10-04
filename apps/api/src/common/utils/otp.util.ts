import { randomInt } from 'crypto';

import { hashArgon2id, verifyArgon2id } from './argon2.util.js';

export const generateOtp = (): string => {
    return randomInt(100000, 1000000).toString();
};

export const hashOtp = async (otp: string): Promise<string> => {
    return hashArgon2id(otp);
};

export const verifyOtp = async (
    hash: string,
    otp: string,
): Promise<boolean> => {
    return verifyArgon2id(hash, otp);
};
