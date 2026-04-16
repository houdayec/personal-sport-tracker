export type AppConfig = {
    apiPrefix: string
    authenticatedEntryPath: string
    unAuthenticatedEntryPath: string
    tourPath: string
    locale: string
    enableMock: boolean
}

const appConfig: AppConfig = {
    apiPrefix: '/api',
    authenticatedEntryPath: '/fitness',
    unAuthenticatedEntryPath: '/sign-in',
    tourPath: '/',
    locale: 'fr',
    enableMock: false,
}

export default appConfig
