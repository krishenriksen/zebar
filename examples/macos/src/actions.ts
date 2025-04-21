import { shellExec } from 'zebar';

export async function performAction(action: string): Promise<string> {
  try {
    const result = await shellExec('powershell', ['-Command', action]);
    if (result.success) {
      return result.stdout.trim();
    } else {
      console.error('Error in executing command:', result.stderr);
      return Promise.reject(result.stderr);
    }
  } catch (err) {
    console.error('Error in executing command:', err);
    return Promise.reject(
      err instanceof Error ? err.message : 'Unknown error occurred',
    );
  }
}
