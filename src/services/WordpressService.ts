import axios from 'axios'
import appConfig from '@/configs/app.config'
import { TOKEN_TYPE, REQUEST_HEADER_AUTH_KEY } from '@/constants/api.constant'
import { PERSIST_STORE_NAME } from '@/constants/app.constant'
import deepParseJson from '@/utils/deepParseJson'
import store, { signOutSuccess } from '../store'
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

const unauthorizedCode = [401]

const WordpressService = axios.create({
    timeout: 60000,
    baseURL: import.meta.env.VITE_WOOCOMMERCE_BASE_URL,
})

WordpressService.interceptors.request.use(
    (config) => {
        const rawPersistData = localStorage.getItem(PERSIST_STORE_NAME)
        const persistData = deepParseJson(rawPersistData)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let accessToken = (persistData as any).auth.session.token

        if (!accessToken) {
            const { auth } = store.getState()
            accessToken = auth.session.token
        }

        if (accessToken) {
            config.headers[REQUEST_HEADER_AUTH_KEY] =
                `${TOKEN_TYPE}${accessToken}`
        }

        return config
    },
    (error) => {
        return Promise.reject(error)
    },
)

WordpressService.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error

        if (response && unauthorizedCode.includes(response.status)) {
            store.dispatch(signOutSuccess())
        }

        return Promise.reject(error)
    },
)

const WordpressApiService = {
    fetchData<Response = unknown, Request = Record<string, unknown>>(
        param: AxiosRequestConfig<Request>,
    ) {
        return new Promise<AxiosResponse<Response>>((resolve, reject) => {
            WordpressService(param)
                .then((response: AxiosResponse<Response>) => {
                    resolve(response)
                })
                .catch((errors: AxiosError) => {
                    reject(errors)
                })
        })
    },
}

export default WordpressApiService
