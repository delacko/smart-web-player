export const timeout = async (
  prom: Promise<any>,
  time: number
): Promise<void> => {
  let timerId: number;
  return await Promise.race([
    prom,
    new Promise((resolve, reject) => (timerId = setTimeout(reject, time))),
  ]).finally(() => clearTimeout(timerId));
};
