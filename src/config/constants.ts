
export const constants = {
    client: {
        routes: {
            forgotPassword: (token: string) => `${process.env.CLIENT_URL}/resetar-senha/${token}`,
            completeRegistration: (token : string) => `${process.env.CLIENT_URL}/finalizar-cadastro/${token}`
        }
    },

    errorJwtMessages: {
        badRequestErrorMessage: "Sessão inválida!",
        noAuthorizationInHeaderMessage: "Sem autorização!",
        authorizationTokenExpiredMessage: "Sessão expirada!",
    },
}