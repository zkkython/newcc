export type Cursor = {
  x: number
  y: number
}

export const Cursor = {
  at(x: number, y: number): Cursor {
    return { x, y }
  },
}
