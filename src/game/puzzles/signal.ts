export type SignalState = {
  dials: [number, number, number];
  target: [number, number, number];
  solved: boolean;
};

export function initSignal(): SignalState {
  const rand = () => Math.floor(Math.random() * 10);
  return {
    dials: [0, 0, 0],
    target: [rand(), rand(), rand()],
    solved: false,
  };
}

export function checkSignal(s: SignalState): boolean {
  return s.dials.every((d, i) => d === s.target[i]);
}