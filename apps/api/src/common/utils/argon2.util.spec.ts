import { hashArgon2id, verifyArgon2id } from './argon2.util.js';

describe('Argon2 utilities', () => {
    it('hashes and verifies a value using the PHC format', async () => {
        const hash = await hashArgon2id('Password@123');

        expect(hash).toMatch(
            /^\$argon2id\$v=19\$m=65536,t=3,p=4\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/u,
        );
        await expect(verifyArgon2id(hash, 'Password@123')).resolves.toBe(true);
        await expect(verifyArgon2id(hash, 'WrongPassword')).resolves.toBe(
            false,
        );
    });

    it('rejects malformed hashes without throwing', async () => {
        await expect(
            verifyArgon2id('not-an-argon2-hash', 'Password@123'),
        ).resolves.toBe(false);
    });
});
