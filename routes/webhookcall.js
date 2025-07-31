 import axios from 'axios';
import express from 'express';
import 'dotenv/config';
import {
  ERP_API_BASE_URL,
  ULTRAVOX_API_KEY,
  ULTRAVOX_API_URL,
  E_ADMIN_API_KEY,
  E_ADMIN_API_SECRET,CALL_STATUS_LOGGER,
} from '../config/config.js';
import { logMessage } from '../utils/logger.js';
import { log_incoming_call_request,log_CallSession,appendCallWithTranscript,updateJobReminder,
  getCallSessionDocnameExist,uploadRecordingViaCustomAPI,getCallSessionDocname,log_call_joined_event,getCallStatusDocnameExist,update_callstatus_whevent,update_jobStatus } from '../api/erpcall.js';

import { getCallTranscript_Ultra,getCallRecording_Ultra,updateJobRecord } from '../api/ultracall.js';
import activeCalls from '../utils/activeCallsStore.js';

const router = express.Router();

// Note: all of these should be secured in a production application
// Handle requests for looking up spots on the calendar
 
// Handle requests for creating a booking
router.post('/callend', async (req, res) => {
  try {
    const body = req.body;
    logMessage('Received /callend request:', JSON.stringify(body, null, 2));
    console.log('How manytime it call /callend:');
     
    //STOP HERE IF RECORD CALL AGAIN
    
      
    //console.log('Received Ultravox webhook:', body);
    await log_incoming_call_request('received body /saveTranscript: ',  body, " when call ended");

    // Acknowledge unsupported event types quickly
    if (!body || body.event !== 'call.ended') {
        console.log('Ignoring unsupported event type:', body.event);
      return res.status(200).json({ success: true, ignored: true });
    }

    const callId = body?.call?.callId;
    const sessionCheck = await getCallSessionDocnameExist(callId);
    console.log('**************',sessionCheck);

    if (sessionCheck.success) {
      console.log('Session already exists:', sessionCheck.docname);

      return res.status(200).json({
        success: true,
        message: 'Call session already handled',
        docname: sessionCheck.docname
      });
    }
    const shortSummary = body?.call?.shortSummary;
    const summary = body?.call?.summary;
    const callended = body?.call?.ended
    const ISCALLTRANSCRIPT=body?.call?.metadata?.ISCALLTRANSCRIPT;
    const ISCALLRECORDING=body?.call?.metadata?.ISCALLRECORDING;

    const COMPANYID=body?.call?.metadata?.COMPANYID;
    const EMAILADDRESS=body?.call?.metadata?.EMAILADDRESS;
    const EMAILNOTIFICAION=body?.call?.metadata?.EMAILNOTIFICAION;

    console.log('Ultravox callId:', callId);
    console.log('Short summary:', shortSummary);
    // console.log('Full summary:', summary);

    if (!callId) {
      console.log('Missing callId in Ultravox webhook');
        await log_incoming_call_request('Missing callId in Ultravox webhook /scallend:',  error, `Line 69`);
      return res.status(200).json({ success: true, ignored: true });
    }  
    console.log('callId line 72:');
    console.log('callId line 72:');
    const CALL_SESSION_DATA = await log_CallSession(req.body);  
       await log_incoming_call_request('log_CallSession /callend:',  CALL_SESSION_DATA,`Line 75`);
    console.log('CALL_SESSION_DATA Response log_incoming_call_request:', CALL_SESSION_DATA);
    // console.log('CALL_SESSION_DATA Response:', CALL_SESSION_DATA);

    const callTranscriptEndpoint = await getCallTranscript_Ultra(callId);
    await log_incoming_call_request('getCallTranscript_Ultra /callend:',  callTranscriptEndpoint, `Line 81`);
   
    console.log('Fetched call callTranscriptEndpoint:', callTranscriptEndpoint);

    if(ISCALLTRANSCRIPT)
    {
    const APPEND_CALLWITH_TRANSCRIPT = await  appendCallWithTranscript(callTranscriptEndpoint,COMPANYID,EMAILADDRESS,EMAILNOTIFICAION,shortSummary,summary,callended);
    await log_incoming_call_request('appendCallWithTranscript /callend:',  APPEND_CALLWITH_TRANSCRIPT,  `Line 87`);
    }else{
      console.log('ISCALLTRANSCRIPT is false, not appending transcript');
    }
    //console.log('APPEND_CALLWITH_TRANSCRIPT Response:', APPEND_CALLWITH_TRANSCRIPT);

    await log_incoming_call_request('await getCallTranscript_Ultra /saveTranscript: ',  callTranscriptEndpoint, "after getCallTranscript_Ultra");

    if (!callTranscriptEndpoint) {
      console.log(`Transcript not found or failed to fetch for callId: ${callId}`);
    } else {
      //console.log(`Transcript fetched for callId ${callId}:`, callTranscriptEndpoint, 'messages');
      // TODO: Save or process transcript here
    }

    if(ISCALLRECORDING)
    {
      console.log('Recording enabled, fetching recording...');
      await  getCallRecording_Ultra(callId);
    }
    else{

      console.log('Recording not  enabled, not fetching recording...');
    }
     

   

    // Always acknowledge the webhook to prevent retries
    res.status(200).json({ success: true });

  } catch (error) {
    console.log('Error in /callend Line 117: ', error.message);
    await log_incoming_call_request('Error in /callend:',  error, error.message);
    
    // Do not throw or re-crash, just log and respond
    res.status(200).json({ 
      success: false,
      error: error.message 
    });
  }
});

router.post('/calljoin', async (req, res) => {
  try {
    const body = req.body;
    logMessage('Received /calljoin request:', JSON.stringify(body, null, 2));
    console.log('Received Ultravox WEBHOOK calljoin:', body);
    //CHECK HERE IF CALL SESSION ID ALREADY EXIST
     
    const callId = body?.call?.callId;
    const sessionCheck = await getCallStatusDocnameExist(callId);
    console.log('**************',sessionCheck);

    if (sessionCheck.success) {
      console.log('Session Call Staus already exists:', sessionCheck.docname);

      return res.status(200).json({
        success: true,
        message: 'Call Status session already handled',
        docname: sessionCheck.docname
      });
    }


     await log_incoming_call_request('RECEIVED body /calljoin: ',  body, " when call joined");   
    console.log('Ultravox log_call_joined_event:', callId); 
    const call_joined_event=await log_call_joined_event(body);
    console.log('log_call_joined_event Response:', call_joined_event);

    console.log('CALL JOIN ENDED calljoin:');
    res.status(200).json({ success: true });

} catch (error)
 {
   console.log('Error in /calljoin Line 154: ', error.message);
    await log_incoming_call_request('Error in /callend:',  error, error.message);

  //console.log('Error in /calljoin:', error.message);   
  }
});

router.post('/confirmAttendance', async (req, res) => {
  try {
    
    const body = req.body;
    logMessage('Received /confirmAttendance request:', JSON.stringify(body, null, 2));
    console.log('Received Ultravox webhook confirmAttendance:', body);

    // Validate required fields
    const requiredFields = ['callId', 'job_id', 'confirmationResponse'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
        logMessage('Received missingFields request:');
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
    }

    const { callId, job_id, confirmationResponse } = body;
    console.log(`Attendance confirmation for callId ${callId} and jobId ${job_id}: ${confirmationResponse}`);    
    const updateResult = await updateJobReminder(body);
    console.log('updateResultresponse:', updateResult);
     

    res.status(200).json({
      success: true,
      message: 'Attendance confirmed successfully',
      updateResult
    });

  } catch (error) {
    console.error('Error in /confirmAttendance:', error);
    await log_incoming_call_request('Error in /confirmAttendance:', error, error.message);
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});


router.post('/bookAppointment', async (req, res) => {
  console.log('Got a request for bookAppointment:', req.body);
  logMessage('Received /bookAppointment request:', JSON.stringify(req.body, null, 2));
  await log_incoming_call_request('Webhook /bookAppointment: ',  null,JSON.stringify(req.body));

  const booking = await createBooking(req.body);
  console.log('Booking response:', booking);
  res.json(booking);
});

router.post('/updateAppointment', async (req, res) => {
  console.log('Got a request for updateAppointment:', req.body);
  
  // Validate required fields
  //const requiredFields = ['firstname', 'lastname', 'postcode', 'address', 'doornumber'];
  // const missingFields = requiredFields.filter(field => !req.body[field]);
  /*
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  } */
  const booking = await updateBooking(req.body);
  console.log('Booking update response:', booking);
  res.json(booking);
});

router.post('/callStatus', async (req, res) => {
  try {
    const payload = req.body;
    const jobId = req.query.job_id;
    console.log('this is orignal call : Received /callStatus webhook:', payload);

    const twilioSid = req.body.CallSid;
    const ultravoxCallId = req.query.ultravoxCallId;

    console.log('Received /callStatus webhook for job:', jobId, 'with CallSid:', twilioSid, 'and ultravoxCallId:', ultravoxCallId);

    if (ultravoxCallId) {
      console.log('Storing call in activeCalls map with ultravoxCallId:', ultravoxCallId);
      activeCalls.set(ultravoxCallId, {
      twilioCallSid: twilioSid,
      createdAt: new Date().toISOString(),
      type: 'outbound',
      status: 'active'
    });
  }

    console.log('Received /callStatus webhook for job:', jobId);
    await log_incoming_call_request('Outbound callStatus:',payload, "Check for anything");

    console.log('Received /Ultra status callback:**********');
    // Log or store the status callback
    console.log('[TWILIO STATUS CALLBACK]', payload);
    const payloadWith={...payload, job_id: jobId};
    if(CALL_STATUS_LOGGER)
    {
      const result= await update_callstatus_whevent(payloadWith);
      console.log('update_callstatus_whevent result:', result);

    }else
    {
      console.log('CALL_STATUS_LOGGER:', CALL_STATUS_LOGGER);
    }
    let callduration=0
    if(payload.CallStatus=='completed' )
    {
      console.log('Call completed, setting call duration',payload.CallStatus);
      console.log('Call completed, setting call duration',payload.CallDuration);
      callduration=payload.CallDuration;      
    }
    if (['completed', 'failed', 'canceled', 'busy', 'no-answer'].includes(payload.CallStatus)) {
      activeCalls.delete(ultravoxCallId);
    }//ALSO 

    //     setTimeout(() => {
    //   if (activeCalls.has(ultravoxCallId)) {
    //     activeCalls.delete(ultravoxCallId);
    //     console.log(`Fallback cleanup: ${ultravoxCallId} removed after 5 minutes.`);
    //   }
    // }, 5 * 60 * 1000); // 5 minutes

    const  result= await updateJobRecord(
    jobId,
    payload.CallStatus,
    payload.CallSid,
    payload.Timestamp,
    callduration    
  );    

    res.status(200).send(result);  
  } catch (err) {
    await log_incoming_call_request('Error outbound callback /callStatus:',req.body, err.message);
    console.error('Error handling callback /callStatus:', err);
    res.status(500).send('Webhook Error');
  }
});



 
async function createBooking(details) {
  try {
    if(!details.isAppointEmail)
      {
          console.log('createBooking Email is disable', details);
          return  {     
          success: false,
          error: 'Appointment Email is disable'
        };

      } 
    logMessage('Received /bookAppointment request:', JSON.stringify(details, null, 2));   
    console.log('Creating booking with details:', details);
    const url = `${ERP_API_BASE_URL}aiagentapp.api.appointments.book_google_appointment`;
    console.log('Booking URL:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {        
        'Content-Type': 'application/json',  
        'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`      
      },         
      body: JSON.stringify(details),
    });
    //console.log('Response :', response);
    if (!response.ok) {
      //const errorText = await response.text();
      // console.error('Failed to create booking:', {
      //   status: response.status,
      //   statusText: response.statusText,
      //   error: errorText,
      // });
      // throw new Error(`Failed to create booking: ${response.statusText}`);
      logMessage('createBooking /bookAppointment !response.ok:', {
        status: response.status,
        statusText: response.statusText,
        error: await response.text()});


      await log_incoming_call_request('createBooking /bookAppointment !response.ok: ',  error,JSON.stringify(details));
      throw new Error(`Failed to create booking: ${response}`);
    }

    const booking = await response.json();
    return {
      //success: true,      
      booking
    };
  } catch (error) {
    console.error('Failed to create appoitment booking:', error);
    logMessage('createBooking /bookAppointment error:', {
      error: error.message,
      stack: error.stack,
      originalDetails: details
    });
    // Log the error to your logging system
     await log_incoming_call_request('createBooking /bookAppointment: ',  error,JSON.stringify(details));
     return {     

      // Log here if booking not successufull 
      success: false,
      error: 'Failed to create booking'
    };
  }
}


async function updateBooking(details) {
  try {
    console.log('Update booking with details:', details);
    
    // Destructure with default values to prevent undefined errors
    const { 
      id, 
      new_firstname = null, 
      new_lastname = null, 
      new_postcode = null, 
      new_address = null, 
      new_doornumber = null,     
    } = details;

    console.log('Received fields:', {
      id,
      new_firstname,
      new_lastname,
      new_postcode,
      new_address,
      new_doornumber,      
    });

    // Validate at least one update field is present
    const updateFields = ['new_firstname', 'new_lastname', 'new_postcode', 'new_address', 'new_doornumber']
      .filter(field => details[field] !== undefined);

    if (updateFields.length === 0) {
      throw new Error('No update fields provided');
    }

    // Build payload dynamically
    const payload = {
      name: id,
      ...(new_firstname && { firstname: new_firstname }),
      ...(new_lastname && { lastname: new_lastname }),
      ...(new_postcode && { postcode: new_postcode }),
      ...(new_address && { address: new_address }),
      ...(new_doornumber && { doornumber: new_doornumber }),
     
    };

    console.log('Constructed payload:', payload);

    const response = await fetch(`${ERP_API_BASE_URL}/zero_integration.api.apiai.update_survey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        // Uncomment and use actual auth headers
        // 'Authorization': `Bearer ${config.apiKey}`,
        // 'cal-api-version': '2024-08-13'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('ERP Update Error:', {
        status: response.status,
        error: responseData,
        payloadSent: payload
      });
      throw new Error(responseData.message || 'Update failed');
    }

    return {
      success: true,
      booking: responseData
    };

  } catch (error) {
    console.error('Update Booking Failure:', {
      error: error.message,
      stack: error.stack,
      originalDetails: details
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}
// Webhook endpoint

/*
router.post('/call-status', async (req, res) => {
 try {
    console.log(`************ Received call status update:`);
    const { CallSid, CallStatus, To, Duration, CallDuration } = req.body;
    console.log(`************* Received status update for call ${CallSid}: ${CallStatus}`);
    
    res.status(200).end();
    // res.json(booking);

    }
    catch (error) {
    console.error('Error handling call status_2:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
  
}); */
  
export { router };