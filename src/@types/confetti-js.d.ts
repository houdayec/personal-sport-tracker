declare module 'confetti-js' {
    type ConfettiTarget = HTMLCanvasElement | string

    interface ConfettiParams {
        target: ConfettiTarget
        max?: number
        size?: number
        animate?: boolean
        respawn?: boolean
        props?: Array<'circle' | 'square' | 'triangle' | 'line' | 'svg'>
        colors?: number[][]
        clock?: number
        rotate?: boolean
        start_from_edge?: boolean
        width?: number
        height?: number
    }

    export default class ConfettiGenerator {
        constructor(params?: ConfettiParams)
        render(): void
        clear(): void
    }
}
