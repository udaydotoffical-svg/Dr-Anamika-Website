// Avighna mark: the official logo's ideas (a stethoscope forming the "V", the winged caduceus)
// redrawn as one clean emblem. Paths are shared by the SVG component, the favicon and the 3D label.
export const MARK = {
  // winged staff above the V
  wings: 'M31 16.5C26.5 11.5 19 9.5 11 9.2C16 12.6 23.5 16 31 19.6Z M31 21C25 17.6 16.5 16.2 7.5 16.8C13.5 19.6 22.5 22.6 31 25.2Z M31 26.2C25.6 24.2 18.5 24 11.5 25.2C17 27.4 24.5 29.6 31 30.2Z',
  // stethoscope: two ear tubes fall into the V, then a single tube curls down to the chest piece
  tube: 'M20 33C20 41 25.5 46 32 46C38.5 46 44 41 44 33',
  stem: 'M32 46V50.2',
  chest: { cx: 32, cy: 54.2, r: 4.2 },
  ears: [[20, 32], [44, 32]],
  staff: 'M32 14.5V36',
  finial: { cx: 32, cy: 12.6, r: 2.1 },
}
