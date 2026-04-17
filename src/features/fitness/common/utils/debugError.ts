export const logFitnessErrorDev = (
    context: string,
    error: unknown,
    message?: string,
) => {
    if (!import.meta.env.DEV) {
        return
    }

    const prefix = `[Fitness][${context}]`
    if (message) {
        // eslint-disable-next-line no-console
        console.error(`${prefix} ${message}`, error)
        return
    }
    // eslint-disable-next-line no-console
    console.error(prefix, error)
}
