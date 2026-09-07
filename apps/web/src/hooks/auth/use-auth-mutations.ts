import { useMutation } from '@tanstack/react-query';

import {
    forgotPassword,
    login,
    register,
    resendVerification,
    resetPassword,
    verifyEmail,
} from '@/services/auth.service';

export function useLogin() {
    return useMutation({ mutationFn: login });
}

export function useRegister() {
    return useMutation({ mutationFn: register });
}

export function useVerifyEmail() {
    return useMutation({ mutationFn: verifyEmail });
}

export function useResendVerification() {
    return useMutation({ mutationFn: resendVerification });
}

export function useForgotPassword() {
    return useMutation({ mutationFn: forgotPassword });
}

export function useResetPassword() {
    return useMutation({ mutationFn: resetPassword });
}
