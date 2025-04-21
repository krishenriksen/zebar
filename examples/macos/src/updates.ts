import { performAction } from './actions';

export async function getUpdates(): Promise<string> {
  try {
    const result = await performAction('(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search("IsInstalled=0").Updates.Count');
    return result === '0' ? 'Error' : result;
  } catch (err) {
    console.error('Error fetching updates:', err);
    return 'Error';
  }
}
