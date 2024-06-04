import { IPCEvent } from 'global';
import { useEffect } from 'react';

const listen = <T>(channel: string, callback: IPCEvent) => {
  window.electronAPI.on(channel, callback)

  // Cleanup the event listener on unmount
  return () => {
    window.electronAPI.removeListener(channel, callback)
  }
}

export default listen
