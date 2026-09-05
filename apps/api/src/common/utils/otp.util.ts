import * as argon2 from 'argon2';
import { randomInt } from 'crypto';

export const generateOtp = (): string => {
    return randomInt(100000, 1000000).toString();
};

export const hashOtp = async (otp: string): Promise<string> => {
    return argon2.hash(otp, {
        type: argon2.argon2id,
    });
};

export const verifyOtp = async (
    hash: string,
    otp: string,
): Promise<boolean> => {
    return argon2.verify(hash, otp);
};
