export type SignalSubscriber<T> = (value: T) => void;

export interface Signal<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe: (subscriber: SignalSubscriber<T>) => () => void;
}

export function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<SignalSubscriber<T>>();

  return {
    get: () => value,
    set: (nextValue: T) => {
      if (Object.is(value, nextValue)) return;
      value = nextValue;
      subscribers.forEach((subscriber) => subscriber(value));
    },
    subscribe: (subscriber: SignalSubscriber<T>) => {
      subscribers.add(subscriber);
      subscriber(value);
      return () => subscribers.delete(subscriber);
    },
  };
}
