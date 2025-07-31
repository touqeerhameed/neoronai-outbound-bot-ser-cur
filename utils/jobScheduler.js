// jobScheduler.js

import { get_business_jobs_Schedule,GET_outboundSETTINGS } from '../api/erpcall.js';
import activeCalls from './activeCallsStore.js';
import { logMessage } from '../utils/logger.js';



export function startBusinessJobLoop(intervalMs) {  
  async function loop() {
    let STOP_SCHEDULER= 1
    try {
      logMessage('Active call count:', activeCalls.size);
      //console.log('Active call count:', activeCalls.size);

      const outboundSettings = await  GET_outboundSETTINGS();
      if (outboundSettings) 
        {
          //outboundSettings.message.success = true;
          if(outboundSettings?.message?.success)
          {            
            STOP_SCHEDULER= outboundSettings.message?.settings?.stop_scheduler;
            intervalMs= outboundSettings.message.settings.frequencysec  * 1000;
          }
        } 

      if(!STOP_SCHEDULER)
      {
      const result = await get_business_jobs_Schedule(activeCalls.size);
      logMessage('Result from get_business_jobs_Schedule:', result);
      //console.log('Result from get_business_jobs_Schedule:', result);
      }else{

        console.log('Scheduler is disable, You can enable it any Time from Outbound Setting- Currently:',outboundSettings);
      }
    } catch (err) {
      logMessage('❌ Error in get_business_jobs_Schedule:', err.message);
      console.error('❌ Error in get_business_jobs_Schedule:', err.message);
      console.error('❌ Error in get_business_jobs_Schedule:', err);
    } finally {
      setTimeout(loop, intervalMs); // Schedule next run after completion
    }
  }

  loop(); // Start loop
}
