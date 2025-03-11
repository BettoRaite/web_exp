import React, { useEffect, useMemo, useState, useRef } from "react";

const $subscribers = Symbol("");

export function proxy<T extends object>(state: T): T {
  Reflect.set(state, $subscribers, {});
  return new Proxy(state, {
    set: function (target, key, value) {
      if (Reflect.get(target, key) === value) {
        return false;
      }
      Reflect.set(target, key, value);
      const subscribers = Reflect.get(target, $subscribers) as Record<
        symbol,
        (key: string | symbol) => void
      >;
      Object.getOwnPropertySymbols(subscribers).forEach((fnKey) => {
        subscribers[fnKey](key);
      });
      return true;
    },
  });
}
export function useSnapshot<T extends object>(
  proxy: T & { [$subscribers]: Record<symbol, (key: symbol | string) => void> }
): T {
  const [_, forceUpdate] = useState(false);
  const { current: $fn } = useRef(Symbol(""));
  const { current: dependancies } = useRef<Set<string | symbol>>(new Set());
  dependancies.clear();
  proxy[$subscribers][$fn] = (key) => {
    if (dependancies.has(key)) {
      forceUpdate((v) => !v);
    }
  };
  console.log("RENDER");
  useEffect(() => {
    return () => {
      console.log("EFFECT");
      delete proxy[$subscribers][$fn];
    };
  }, [forceUpdate]);
  return new Proxy(proxy, {
    get: function (target, key) {
      dependancies.add(key);
      return Reflect.get(target, key);
    },
  });
}

const state = proxy({
  count: 1,
  text: "BFE.dev",
  mode: "count",
});

let rerenderCount = 0;
// Component using the proxy state
export default function Page() {
  // Subscribing
  const snap = useSnapshot(state);
  rerenderCount += 1;
  return (
    <div className="flex min-h-dvh justify-center items-center">
      <button
        className="bg-black text-white m-10 p-10 rounded-lg hover:bg-black/80 cursor-pointer"
        type="button"
        onClick={() => {
          ++state.count;
        }}
      >
        {snap.count}
      </button>
      <button
        className="bg-black text-white m-10 p-10 rounded-lg hover:bg-black/80 cursor-pointer"
        type="button"
        onClick={() => {
          state.text =
            "this is some text since we do not use it in render it does not cause rerender on change";
        }}
      >
        Click it
      </button>
      <p>Rerender count: {rerenderCount}</p>
    </div>
  );
}
