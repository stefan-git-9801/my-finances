import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'

/**
 * Shared Axios instance for the generated API client.
 * `withCredentials` sends the same-origin auth cookie the API sets on login.
 */
export const axiosInstance = axios.create({
  baseURL: '/',
  withCredentials: true,
})

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return axiosInstance(config).then(({ data }) => data)
}

export type ErrorType<Error> = AxiosError<Error>
export type BodyType<BodyData> = BodyData
