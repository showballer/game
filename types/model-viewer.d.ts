import type { CSSProperties, DetailedHTMLProps, HTMLAttributes, Ref } from "react"

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        alt?: string
        poster?: string
        ar?: boolean | string
        "ar-modes"?: string
        "camera-controls"?: boolean | string
        "auto-rotate"?: boolean | string
        "shadow-intensity"?: string | number
        exposure?: string | number
        "environment-image"?: string
        "camera-orbit"?: string
        "field-of-view"?: string
        "touch-action"?: string
        "interaction-prompt"?: string
        "disable-zoom"?: boolean | string
        "min-camera-orbit"?: string
        "max-camera-orbit"?: string
        "max-camera-distance"?: string
        style?: CSSProperties
        slot?: string
        ref?: Ref<HTMLElement>
        [key: string]: unknown
      }
    }
  }
}

export {}
