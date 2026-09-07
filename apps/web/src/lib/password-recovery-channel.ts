export const PASSWORD_RECOVERY_CHANNEL = 'interviewly-password-recovery';
export const PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS';

export interface PasswordResetSuccessMessage {
    type: typeof PASSWORD_RESET_SUCCESS;
}

export function broadcastPasswordResetSuccess() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
        return;
    }

    const channel = new BroadcastChannel(PASSWORD_RECOVERY_CHANNEL);
    const message: PasswordResetSuccessMessage = {
        type: PASSWORD_RESET_SUCCESS,
    };

    channel.postMessage(message);
    channel.close();
}
