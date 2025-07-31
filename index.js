import express from 'express';
import 'dotenv/config';
import { logMessage } from './utils/logger.js';

import { GET_outboundSETTINGS } from './api/erpcall.js';
// import {setoutboundSETTINGS} from './utils/application-cache.js';
import {
  PORT
} from './config/config.js';
import { router as twilioRoutes } from './routes/twilio.js';
import { router as webhookcall } from './routes/webhookcall.js';
// import activeCalls from './utils/activeCallsStore.js';
import { startBusinessJobLoop } from './utils/jobScheduler.js';

let FETCH_INTERVAL_MS = 60 * 1000; // Call every 60 seconds
let STOP_SCHEDULER=1;
 
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 



app.use('/twilio/', twilioRoutes);
app.use('/whook/', webhookcall);

// Start server
app.listen(PORT, async () => {
  //GET OUTBOUND SETTINGS
  const outboundSettings = await  GET_outboundSETTINGS();
  if (outboundSettings) {

    //console.log('Outbound settings retrieved successfully:', outboundSettings);
    logMessage('Outbound settings retrieved successfully:', outboundSettings);
    // setoutboundSETTINGS(outboundSettings); //SET CACHE
     //outboundSettings.message.success = true;
    if(outboundSettings?.message?.success)
    {
      logMessage('Outbound settings are successfully set in cache. : ',outboundSettings.message.settings.frequencysec);
      //console.log('Outbound settings are successfully set in cache. : ',outboundSettings.message.settings.frequencysec);
      FETCH_INTERVAL_MS= outboundSettings.message?.settings?.frequencysec  * 1000; // Convert seconds to milliseconds
      // STOP_SCHEDULER= outboundSettings?.message?.settings.stop_scheduler;
    }
    startBusinessJobLoop(FETCH_INTERVAL_MS);

  
    logMessage('Outbound settings:', outboundSettings);
    console.log('Outbound settings:', outboundSettings);
  } else {
    logMessage('Failed to retrieve outbound settings.');
    console.error('Failed to retrieve outbound settings.');
  }
  logMessage(` NEO AI Server is running on port ${PORT}`);
  console.log(` NEO AI Server is running on port ${PORT}`);    
   
});

