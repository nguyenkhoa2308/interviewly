import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
    providerId: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(configService: ConfigService) {
        super({
            clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
            clientSecret: configService.getOrThrow<string>(
                'GOOGLE_CLIENT_SECRET',
            ),
            callbackURL: configService.getOrThrow<string>(
                'GOOGLE_CALLBACK_URL',
            ),
            scope: ['email', 'profile'],
        });
    }

    validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ) {
        const email = profile.emails?.[0]?.value;

        if (!email) {
            return done(new Error('Google account does not provide an email'));
        }

        const googleProfile: GoogleProfile = {
            providerId: profile.id,
            email: email.toLowerCase(),
            fullName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value ?? null,
        };

        done(null, googleProfile);
    }
}
