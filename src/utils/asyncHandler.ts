export function asyncHandler(
  fn: (...args: unknown[]) => Promise<unknown>
) {
  return (...args: unknown[]) => {
    const next = args[args.length - 1] as (err?: unknown) => void;
    Promise.resolve(fn(...args)).catch(next);
  };
}
