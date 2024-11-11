
/**
 * Wait for a given amount of time in ms.  Don't forget the await keyword when calling this function.
 * @param time in ms 
 * @returns 
 */
export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}