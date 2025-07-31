import express from 'express';
import twilio from 'twilio';
import 'dotenv/config';
import { createUltravoxCall } from '../utils/ultravox-utils.js';
import { createUltravoxCallConfig } from '../config/ultravox-config.js';
import { hangupCall, fetchTelecomNumberByPhone,log_incoming_call_request,log_TransferCall_status,save_phone_company_log,getbusinessbyPhoneNumber,log_TransferCall_gc } from '../api/erpcall.js';
import {
  TOOLS_BASE_URL,
} from '../config/config.js';
import activeCalls from '../utils/activeCallsStore.js'; // adjust path accordingly
import { fetchCallDetails } from '../utils/twilioUtils.js';
import { logMessage } from '../utils/logger.js';
// const { twiml: { VoiceResponse } } = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

const router = express.Router();

// Hack: Dictionary to store Twilio CallSid and Ultravox Call ID mapping
// In production you will want to replace this with something more durable
// const activeCalls = new Map();

async function transferActiveCall(ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason, fromNumber, toNumber, direction, companyid, job_id, conversationSummary, intent_from, ResponseAccuracy, KnowledgeLimitationHandling, ConfidenceandClarity, ToneandEmpathy, EscalationHandling, CustomerSatisfactionOutcome, CustomerBehavior, CustomerEffortLevel, ConversationCompletion, EmotionalShiftDuringConversation, BackgroundNoiseLevelCustomer, BackgroundNoiseLevelAI, CallDisruptionDueToNoiseOrAudioQuality, OverallConversationQuality, callIntent, CallerToneandEmpathy) {
    try {
        logMessage('transferActiveCall called with parameters:', JSON.stringify({
            ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason, fromNumber, toNumber, direction, companyid, job_id
        }, null, 2));

        if (!isCallForwarding) {
            await log_incoming_call_request('Call forwarding is disabled', { 
                ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason, direction, companyid, job_id, conversationSummary,
                intent_from, ResponseAccuracy, KnowledgeLimitationHandling, ConfidenceandClarity, ToneandEmpathy,
                EscalationHandling, CustomerSatisfactionOutcome, CustomerBehavior, CustomerEffortLevel, ConversationCompletion, EmotionalShiftDuringConversation,
                BackgroundNoiseLevelCustomer, BackgroundNoiseLevelAI, CallDisruptionDueToNoiseOrAudioQuality, OverallConversationQuality, callIntent, CallerToneandEmpathy
            }, 'transferActiveCall');

            console.log('Call forwarding is disabled');
            return {
                status: 'false',
                message: 'Call forwarding is disabled'
            };
        }

        const callData = activeCalls.get(ultravoxCallId);
        console.log('Call data:', callData);

        if (!callData || !callData.twilioCallSid) {
            logMessage('Call not found or invalid CallSid');
            await log_incoming_call_request('Call not found or invalid CallSid', { 
                ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason, job_id, conversationSummary 
            }, 'transferActiveCall');
            throw new Error('Call not found or invalid CallSid');
        }

        const twilioCallSid = callData.twilioCallSid;
        const callSid = twilioCallSid;
        
        console.log('Getting Twilio credentials...');
        const result = await log_TransferCall_gc({
            callid: ultravoxCallId, twilioCallSid, fromNumber, toNumber, forwardingMobileNumber, firstname, 
            lastname, transferReason, isCallForwarding, direction, companyid, job_id, conversationSummary,
            intent_from, ResponseAccuracy, KnowledgeLimitationHandling, ConfidenceandClarity, ToneandEmpathy,
            EscalationHandling, CustomerSatisfactionOutcome, CustomerBehavior, CustomerEffortLevel, ConversationCompletion, EmotionalShiftDuringConversation,
            BackgroundNoiseLevelCustomer, BackgroundNoiseLevelAI, CallDisruptionDueToNoiseOrAudioQuality, OverallConversationQuality, callIntent, CallerToneandEmpathy
        }); 

        console.log('log_TransferCall result:', result);
        logMessage('log_TransferCall result:', JSON.stringify(result, null, 2));

        const twilio_account_sid = result?.message?.phone_credentials?.twilio_account_sid;
        const twilio_auth_token = result?.message?.phone_credentials?.twilio_auth_token;

        if (!twilio_account_sid || !twilio_auth_token) {
            await log_incoming_call_request('twilio_account_sid or twilio_auth_token is null', { 
                ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason, job_id 
            }, 'Missing Twilio credentials');
            throw new Error('Twilio credentials not found');
        }

        const client = twilio(twilio_account_sid, twilio_auth_token); 
        const conferenceName = `conference_${callSid}`;

        console.log('Updating call to redirect to conference entry point...');
        
        // Use the URL method to redirect the call
        const updatedCall = await client.calls(callData.twilioCallSid)
            .update({
                url: `${TOOLS_BASE_URL}/twilio/transfer-conference-entry-point?conferenceName=${encodeURIComponent(conferenceName)}&fromNumber=${encodeURIComponent(fromNumber)}&toNumber=${encodeURIComponent(toNumber)}&companyid=${encodeURIComponent(companyid)}&job_id=${encodeURIComponent(job_id)}&mainCallSid=${encodeURIComponent(callSid)}`,
                method: 'POST'
            });

        console.log('Call redirected successfully. Now creating outbound call to agent...');

        // Create the agent response TwiML
        const agentResponse = new twilio.twiml.VoiceResponse();
        agentResponse.say("You are being connected to a user. Here's a quick summary.");
        
        if (conversationSummary) {
            agentResponse.say(conversationSummary, { voice: "alice", language: "en-US" });
        }

        const agentDial = agentResponse.dial();
        agentDial.conference(conferenceName, {
            startConferenceOnEnter: false,
            endConferenceOnExit: true,
            // statusCallback: `${TOOLS_BASE_URL}/twilio/conference-status?${new URLSearchParams({
            // fromNumber, 
            // toNumber,
            // companyid,
            // job_id,
            // mainCallSid
            // })}`,
            // statusCallbackEvent: ['start', 'end', 'join', 'leave'],
            // statusCallbackMethod: 'POST'
        });

        // Create outbound call to the agent
        const outboundCall = await client.calls.create({
            to: forwardingMobileNumber,
            from: fromNumber,
            twiml: agentResponse.toString(),
            statusCallback: `${TOOLS_BASE_URL}/twilio/transfer-status?mainCallSid=${callSid}`,
            statusCallbackMethod: 'POST',
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
        });

        console.log('Outbound call initiated to specialist. SID:', outboundCall.sid);
        logMessage('Outbound call initiated to specialist. SID:', outboundCall.sid);

        return {
            status: 'success',
            message: 'Call transfer initiated'
        };

    } catch (error) {
        logMessage('Error transferring call:', error.message || error);
        console.error('Error transferring call:', error);
        
        await log_incoming_call_request('Error transferring call', { 
            ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason, direction, companyid, job_id 
        }, error.message);
        
        throw {
            status: 'error',
            message: 'Failed to transfer call',
            error: error.message
        };
    }
}


router.post('/transfer-conference-entry-point', (req, res) => 
{
  try {
    const {
      conferenceName,
      fromNumber,
      toNumber,
      companyid,
      job_id,
      mainCallSid
    } = req.query;

    console.log('Received transfer-conference-entry-point request:', JSON.stringify(req.query, null, 2));
    logMessage('Received transfer-conference-entry-point request:', JSON.stringify(req.query, null, 2));
    
    if (!conferenceName) {
      console.error('Missing conferenceName in query parameters');
      logMessage('Missing conferenceName in query parameters');
      const errorResponse = new VoiceResponse();
      errorResponse.say('Conference name is missing. Please try again.');
      res.type('text/xml');
      return res.status(400).send(errorResponse.toString());
    }

    const response = new VoiceResponse();
    response.say('Please wait a moment while I connect you to a human agent.');
    const dial = response.dial();
    
    console.log('Dialing conference:', conferenceName);
    logMessage('Dialing conference:', conferenceName);
    
    // Build conference options object with FIXED recording setup
    const conferenceOptions = {
      startConferenceOnEnter: true,
      endConferenceOnExit: true,
      record: 'record-from-start', // This is correct for conference recording
      recordingTrack: 'both', // Add this
      recordingChannels: 'dual', // Specify dual-channel recording
      recordingStatusCallback: `${TOOLS_BASE_URL}/twilio/recording-status?companyid=${encodeURIComponent(companyid)}&job_id=${encodeURIComponent(job_id)}&mainCallSid=${encodeURIComponent(mainCallSid)}&conferenceName=${encodeURIComponent(conferenceName)}`,
      recordingStatusCallbackEvent: ['in-progress', 'completed', 'failed'],
      recordingStatusCallbackMethod: 'POST',  // Explicitly specify POST
      statusCallbackMethod: 'POST',           // Already present but confirm
    };

    // Add conference status callbacks if parameters are available
    if (fromNumber && toNumber && companyid && job_id && mainCallSid) {
      conferenceOptions.statusCallback = `${TOOLS_BASE_URL}/twilio/conference-status?fromNumber=${encodeURIComponent(fromNumber)}&toNumber=${encodeURIComponent(toNumber)}&companyid=${encodeURIComponent(companyid)}&job_id=${encodeURIComponent(job_id)}&mainCallSid=${encodeURIComponent(mainCallSid)}`;
      conferenceOptions.statusCallbackEvent = ['start', 'end', 'join', 'leave'];
      conferenceOptions.statusCallbackMethod = 'POST';
      
      console.log('Added callbacks with parameters:', { fromNumber, toNumber, companyid, job_id, mainCallSid });
      logMessage('Conference options set:', JSON.stringify(conferenceOptions, null, 2));
    } else {
      console.warn('Missing some parameters for callbacks, proceeding with basic conference setup');
      logMessage('Missing parameters for callbacks:', JSON.stringify({ fromNumber, toNumber, companyid, job_id, mainCallSid }, null, 2));
    }

    dial.conference(conferenceName, conferenceOptions);

    res.type('text/xml');
    res.send(response.toString());
    
    console.log('Conference TwiML sent successfully:', response.toString());
    logMessage('Conference TwiML sent successfully:', response.toString());
    
  } catch (error) {
    console.error('Error in transfer-conference-entry-point:', error.message);
    logMessage('Error in transfer-conference-entry-point:', error.message);
    
    const errorResponse = new VoiceResponse();
    errorResponse.say('There was an error connecting your call. Please contact support.');
    res.type('text/xml');
    res.status(500).send(errorResponse.toString());
  }
});





router.get('/transfer-status', async (req, res) => {
  try {
   console.log('*******/transfer-status GET*************');

  logMessage('*Received /transferCall request GET:', JSON.stringify(req.body, null, 2));
  console.log('********************');
  console.log('********************');
  console.log(req.body);
    const {
      CallSid,
      ParentCallSid,
      From,
      To,
      CallStatus,
      ConferenceSid, // May be present if related to conference events
      StatusCallbackEvent // Will be from Dial's statusCallback or Call Resource's statusCallback
    } = req.body;

    console.log('📞 Transfer status received:', {
      CallSid,
      ParentCallSid,
      From,
      To,
      CallStatus,
      ConferenceSid,
      StatusCallbackEvent
    });
  
  //logMessage('CallSid :' +CallSid + ' ParentCallSid :' +ParentCallSid + ' From :' +From + ' To :' +To + ' CallStatus :' +CallStatus + ' ConferenceSid :' +ConferenceSid + ' StatusCallbackEvent :' +StatusCallbackEvent);
   
  res.status(200).send("this is a GET request to /transfer-status endpoint. Please use POST method instead.");
  } catch (error) {
    console.error('❌ Error in /twilio/transfer-status webhook:', error.message);
    logMessage('Get Error in /twilio/transfer-status webhook:', error.message);
    // Even on error, return valid TwiML to Twilio to prevent call termination due to webhook error.
//     const twiml = new twilio.twiml.VoiceResponse();
//     twiml.say('An  occurred during transfer processing. Please try again or contact support.');
//     res.status(500).send(twiml.toString());
  }
});

// --- /twilio/transfer-status route handler ---
router.post('/transfer-status', async (req, res) => {
  try {
   console.log('*******/transfer-status*************');

  logMessage('*Received /transferCall request: post', JSON.stringify(req.body, null, 2));
  console.log('********************');
  console.log('********************');
  console.log(req.body);
    const {
      CallSid,
      ParentCallSid,
      From,
      To,
      CallStatus,
      ConferenceSid, // May be present if related to conference events
      StatusCallbackEvent // Will be from Dial's statusCallback or Call Resource's statusCallback
    } = req.body;

    console.log('📞 Transfer status received:', {
      CallSid,
      ParentCallSid,
      From,
      To,
      CallStatus,
      ConferenceSid,
      StatusCallbackEvent
    });
  
  logMessage('CallSid :' +CallSid + ' ParentCallSid :' +ParentCallSid + ' From :' +From + ' To :' +To + ' CallStatus :' +CallStatus + ' ConferenceSid :' +ConferenceSid + ' StatusCallbackEvent :' +StatusCallbackEvent);
  const mainCallSid = req.query.mainCallSid;

    // Always return valid TwiML to prevent Twilio from hanging up due to an invalid response.
    const twiml = new twilio.twiml.VoiceResponse();

    if (!CallSid) {
      console.warn('Missing CallSid in transfer status webhook. Cannot process.');
      logMessage('Missing CallSid in transfer status webhook. Cannot process.');
      return res.status(200).send(twiml.toString());
    }
    //Update Event *************
    
    // Pass along mainCallSid to your logging function if needed
    const result = await log_TransferCall_status({
      ...req.body,
      mainCallSid
    });
    logMessage('Logging call Status', result);
    console.log('Logging call Status',result);

//     // Log specific events if needed, but ensure we always return TwiML
//     if (StatusCallbackEvent) { // Check if StatusCallbackEvent is present to differentiate
//       console.log(`Received status event '${StatusCallbackEvent}' for CallSid ${CallSid} with status ${CallStatus}.`);
//       // You can add more specific logic here based on CallSid and StatusCallbackEvent
//       // For example, update your activeCalls map, or log agent status.
//     } else {
//       // This might be a generic call status update if StatusCallbackEvent is not explicitly set
//       console.log(`Received generic call status update for CallSid ${CallSid} with status ${CallStatus}.`);
//     }
//     
//     res.status(200).send(twiml.toString());
  } catch (error) {
    console.error('❌ Error in /twilio/transfer-status webhook:', error.message);
    logMessage('Error in /twilio/transfer-status webhook:', error.message);
    // Even on error, return valid TwiML to Twilio to prevent call termination due to webhook error.
//     const twiml = new twilio.twiml.VoiceResponse();
//     twiml.say('An  occurred during transfer processing. Please try again or contact support.');
//     res.status(500).send(twiml.toString());
  }
});


router.post('/recording-status', async (req, res) => {
  try {
    const {
      CallSid,
      ConferenceSid, // This will be present for conference recordings
      RecordingSid,
      RecordingUrl,
      RecordingStatus,
      RecordingDuration,
      RecordingChannels,
      Timestamp
    } = req.body;

    const { companyid, job_id, mainCallSid, conferenceName } = req.query;

    console.log('📥 Twilio Recording Status Received:');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Request Query:', JSON.stringify(req.query, null, 2));
    
    logMessage('Received recording status webhook:', JSON.stringify({
      body: req.body,
      query: req.query
    }, null, 2));

    // Determine if this is a conference recording or call recording
    const isConferenceRecording = !!ConferenceSid;
    
    console.log(`Recording Type: ${isConferenceRecording ? 'Conference' : 'Call'} Recording`);
    
    if (RecordingUrl) {
      // Construct direct .mp3 download URL
      const mp3Url = `${RecordingUrl}.mp3`;
      
      console.log(`📼 Recording Available: ${mp3Url}`);
      console.log(`📊 Duration: ${RecordingDuration} seconds`);
      console.log(`🔊 Channels: ${RecordingChannels}`);
      
      // Save recording details to your database
      const recordingDetails = {
        callSid: CallSid,
        conferenceSid: ConferenceSid,
        recordingSid: RecordingSid,
        recordingUrl: mp3Url,
        status: RecordingStatus,
        duration: RecordingDuration,
        channels: RecordingChannels,
        timestamp: Timestamp,
        companyid: companyid,
        jobId: job_id,
        mainCallSid: mainCallSid,
        conferenceName: conferenceName,
        recordingType: isConferenceRecording ? 'conference' : 'call'
      };

      // TODO: Save to your database
      console.log('Recording details to save:', recordingDetails);
      logMessage('Recording details to save:', JSON.stringify(recordingDetails, null, 2));
      
      // You can call your database save function here
      // await saveRecordingToDatabase(recordingDetails);
    }

    res.status(200).send('Recording status received');
  } catch (error) {
    console.error('❌ Error in recording-status webhook:', error);
    logMessage('Error in recording-status webhook:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Function to retrieve conference recordings programmatically
async function getConferenceRecordings(conferenceSid, twilioClient) {
  try {
    console.log(`Fetching recordings for conference: ${conferenceSid}`);
    
    // Fetch recordings from the CONFERENCE resource, not the call resource
    const recordings = await twilioClient.conferences(conferenceSid)
      .recordings
      .list();

    console.log(`Found ${recordings.length} conference recordings`);
    
    recordings.forEach((recording, index) => {
      console.log(`Recording ${index + 1}:`, {
        sid: recording.sid,
        status: recording.status,
        duration: recording.duration,
        channels: recording.channels,
        url: recording.uri,
        downloadUrl: `${recording.uri}.mp3`
      });
    });

    return recordings;
  } catch (error) {
    console.error('Error fetching conference recordings:', error.message);
    return [];
  }
}

// Function to retrieve call recordings (for comparison)
async function getCallRecordings(callSid, twilioClient) {
  try {
    console.log(`Fetching recordings for call: ${callSid}`);
    
    // Fetch recordings from the CALL resource
    const recordings = await twilioClient.calls(callSid)
      .recordings
      .list();

    console.log(`Found ${recordings.length} call recordings`);
    return recordings;
  } catch (error) {
    console.error('Error fetching call recordings:', error.message);
    return [];
  }
}


router.post('/conference-status', async (req, res) => {
  console.log('📞 Conference Status Webhook Received');
  const {
    ConferenceSid,
    ConferenceName,
    CallSid,
    StatusCallbackEvent,
    Timestamp
  } = req.body;

  const { fromNumber, toNumber, companyid, job_id } = req.query;

  console.log('📞 Conference Event:', {
    ConferenceSid,
    ConferenceName,
    CallSid,
    Event: StatusCallbackEvent,
    Time: Timestamp,
    fromNumber,
    toNumber,
    companyid,
    job_id
  });

  logMessage('Conference Event:', JSON.stringify(req.body, null, 2));
  
  try {
    switch (StatusCallbackEvent) {
      case 'start':
        console.log(`🚀 Conference started: ${ConferenceName}`);
        logMessage(`Conference started: ${ConferenceName}`);
        break;

      case 'join':
        console.log(`👤 Participant joined: ${CallSid}`);
        logMessage(`Participant joined: ${CallSid}`);
        break;

      case 'leave':
        console.log(`🚪 Participant left: ${CallSid}`);
        logMessage(`Participant left: ${CallSid}`);

        const teleCRED = await fetchTelecomNumberByPhone(fromNumber);
        const client = twilio(teleCRED.twilio_account_sid, teleCRED.twilio_auth_token);

        const participants = await client.conferences(ConferenceSid)
          .participants
          .list({ status: 'in-progress' });

        console.log(`📊 Active participants remaining: ${participants.length}`);

        if (participants.length <= 1) {
          console.log(`⚠️ Ending conference ${ConferenceSid} due to low participant count`);
          await client.conferences(ConferenceSid)
            .update({ status: 'completed' });
          console.log(`✅ Conference ${ConferenceSid} ended`);
        }
        break;

      case 'end':
        console.log(`🛑 Conference ended: ${ConferenceName}`);
        logMessage(`Conference ended: ${ConferenceName}`);
        
        // Fetch recordings after conference ends
        const teleCRED1 = await fetchTelecomNumberByPhone(fromNumber);
        const client2 = twilio(teleCRED1.twilio_account_sid, teleCRED1.twilio_auth_token);
         
        // Wait a bit for recordings to be processed
        setTimeout(async () => {
          const recordings = await getConferenceRecordings(ConferenceSid, client2);
          logMessage(`Final recordings check: Found ${recordings.length} recordings for conference ${ConferenceSid}`);
          console.log(`Final recordings check: Found ${recordings.length} recordings`);
        }, 5000); // Wait 5 seconds
        
        break;
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Error handling conference status:', err.message);
    logMessage('Error handling conference status:', err.message);
    res.status(500).send('Error');
  }
});


router.post('/transferCall', async (req, res) => {

    console.log('/transferCall Transfer call request received:', req.body);  
    logMessage('Received /transferCall request:', JSON.stringify(req.body, null, 2));
    const { callId,isCallForwarding,forwardingMobileNumber,firstname,lastname,transferReason,fromNumber,toNumber,direction,companyid,job_id,conversationSummary,

      intent_from,
      ResponseAccuracy,
      KnowledgeLimitationHandling, ConfidenceandClarity,ToneandEmpathy,
      EscalationHandling,CustomerSatisfactionOutcome,CustomerBehavior,
      CustomerEffortLevel,ConversationCompletion,EmotionalShiftDuringConversation,
      BackgroundNoiseLevelCustomer,BackgroundNoiseLevelAI,CallDisruptionDueToNoiseOrAudioQuality,
      OverallConversationQuality,callIntent,CallerToneandEmpathy



     } = req.body;
    console.log(`/transferCall Request to transfer call with callId: ${callId}`);

    try {
        const result = await transferActiveCall(callId,isCallForwarding,forwardingMobileNumber,firstname,lastname,transferReason,fromNumber,toNumber,direction,companyid,job_id,conversationSummary,
           intent_from,
          ResponseAccuracy,
      KnowledgeLimitationHandling, ConfidenceandClarity,ToneandEmpathy,
      EscalationHandling,CustomerSatisfactionOutcome,CustomerBehavior,
      CustomerEffortLevel,ConversationCompletion,EmotionalShiftDuringConversation,
      BackgroundNoiseLevelCustomer,BackgroundNoiseLevelAI,CallDisruptionDueToNoiseOrAudioQuality,
      OverallConversationQuality,callIntent,CallerToneandEmpathy);
      logMessage('Transfer call result:', JSON.stringify(result, null, 2));
        res.json(result);
    } catch (error) {
      logMessage('Error in /transferCall:', error.message || error);
        res.status(500).json(error);
    }
});


// Add status callback handler
router.post('/callStatus', async (req, res) => {
  try {
      console.log('**************** Twilio status callback:', req.body);
      const twilioCallSid = req.body.CallSid;
      const status = req.body.CallStatus;
      console.log(`Call status / update for ${twilioCallSid}: ${status}`);
      
      // Find Ultravox call ID
      const ultravoxCallId = Array.from(activeCalls.entries())
          .find(([_, data]) => data.twilioCallSid === twilioCallSid)?.[0];

      if (status === 'completed' && ultravoxCallId) {
          console.log(`Processing completed call ${ultravoxCallId}`);
          
          // Add delay to ensure transcript is ready
          await new Promise(resolve => setTimeout(resolve, 2500));
          
          // Get and save transcript
          const transcript = await getCallTranscript(ultravoxCallId);
          await fetch(`${process.env.BASE_URL}/saveTranscript`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  callId: ultravoxCallId,
                  twilioCallSid,
                  transcript,
                  summary: transcriptSummary(transcript),
                  metadata: activeCalls.get(ultravoxCallId)
              })
          });
          
          activeCalls.delete(ultravoxCallId);
      }
      
      res.status(200).end();
  } catch (error) {
      console.error('Status callback error:', error);
      res.status(500).json({ 
          success: false,
          error: error.message 
      });
  }
});

router.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.json({
      status: 'ok',
      activeCalls: activeCalls.size,
      baseUrl: process.env.BASE_URL
  });
});
 
router.get('/admin/active-calls', (req, res) => {
  res.json({ activeCount: activeCalls.size });
});
 
router.post('/hangUpCall', async (req, res) => {
  try {
    const { callId,companyid,toNumber,fromNumber,direction,
      intent_from, ResponseAccuracy,
     KnowledgeLimitationHandling, ConfidenceandClarity,ToneandEmpathy,
     EscalationHandling,CustomerSatisfactionOutcome,CustomerBehavior,
     CustomerEffortLevel,ConversationCompletion,EmotionalShiftDuringConversation,
     BackgroundNoiseLevelCustomer,BackgroundNoiseLevelAI,CallDisruptionDueToNoiseOrAudioQuality,
     OverallConversationQuality,callIntent,CallerToneandEmpathy
     } = req.body;

    if (!callId || typeof callId !== 'string') {
      console.log("/hangUpCall Invalid or missing callId");
      //return res.status(400).json({ success: false, error: 'Invalid or missing callId' });
    }
    console.log(' /hangUpCall callId : ',callId);
    const callDetails = activeCalls.get(callId);

    if (!callDetails || !callDetails.twilioCallSid) {
      console.log("/hangUpCall Call not found or invalid Twilio SID");
      return res.status(404).json({ success: false, error: 'Call not found or invalid Twilio SID' });
    }
    console.log(' /hangUpCall callDetails.twilioCallSid : ',callDetails.twilioCallSid);

    const teleCRED =await fetchTelecomNumberByPhone(fromNumber);
    console.log('teleCRED : ' , teleCRED);

    const client = twilio(teleCRED.twilio_account_sid, teleCRED.twilio_auth_token);

    await client.calls(callDetails.twilioCallSid).update({ status: 'completed' });

    // activeCalls.delete(callId);
    const hangupCallresult =await hangupCall(callId,"Agent",
      companyid,toNumber,fromNumber,direction,
       intent_from, ResponseAccuracy,
     KnowledgeLimitationHandling, ConfidenceandClarity,ToneandEmpathy,
     EscalationHandling,CustomerSatisfactionOutcome,CustomerBehavior,
     CustomerEffortLevel,ConversationCompletion,EmotionalShiftDuringConversation,
     BackgroundNoiseLevelCustomer,BackgroundNoiseLevelAI,CallDisruptionDueToNoiseOrAudioQuality,
     OverallConversationQuality,callIntent,CallerToneandEmpathy


    );
    console.log('hangupCall : ',hangupCallresult);

    return res.status(200).json({ success: true, message: 'Call ended successfully' });

  } catch (error) {
    console.log('❌ /hangUpCall Error hanging up call:', error.message || error);
    return res.status(500).json({ success: false, error: 'Internal Server Error. Failed to hang up call.' });
  }
});

// This is your recording status webhook
router.post('/recording-status_1',  async (req, res) => {
//router.post('/recording-status', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const {
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingStatus,
      RecordingDuration,
      RecordingChannels,
      Timestamp
    } = req.body;

    logMessage('Received recording status webhook:', JSON.stringify(req.body, null, 2));
    console.log('📥 Twilio Recording Status Received:');
    console.log(req.body);

    // Construct direct .mp3 download URL
/*    const mp3Url = `${RecordingUrl}.mp3`;

    // Save to database or internal logs
    const recordingDetails = {
      callSid: CallSid,
      recordingSid: RecordingSid,
      recordingUrl: mp3Url,
      status: RecordingStatus,
      duration: RecordingDuration,
      channels: RecordingChannels,
      timestamp: Timestamp,
    };

    // Example: Save this data to DB (replace with your DB logic)
    await saveRecordingToDatabase(recordingDetails);
*/
    // Respond to Twilio
    res.status(200).send('Recording status received');
  } catch (error) {
    console.error('❌ Error in recording-status webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/conference-status_11',  async (req, res) => {
  console.log('📞 Conference Status Webhook Received');
  const {
    ConferenceSid,
    ConferenceName,
    CallSid,
    StatusCallbackEvent,
    Timestamp
  } = req.body;

  // ✅ Get fromNumber and toNumber from query
  const { fromNumber, toNumber,companyid,job_id } = req.query;

  console.log('📞 Conference Event:', {
    ConferenceSid,
    ConferenceName,
    CallSid,
    Event: StatusCallbackEvent,
    Time: Timestamp,
    fromNumber,
    toNumber,
    companyid,
    job_id
  });

  logMessage('Conference Event:', JSON.stringify(req.body, null, 2));
  try {
   
    switch (StatusCallbackEvent) {
      case 'start':
        logMessage(`🚀 Conference started: ${ConferenceName}`);
        console.log(`🚀 Conference started: ${ConferenceName}`);
        break;

      case 'join':
        logMessage(`👤 Participant joined: ${CallSid}`);
        console.log(`👤 Participant joined: ${CallSid}`);
        break;

      case 'leave':
        logMessage(`🚪 Participant left: ${CallSid}`);
        console.log(`🚪 Participant left: ${CallSid}`);

        const teleCRED =await fetchTelecomNumberByPhone(fromNumber);
        console.log('teleCRED : ' , teleCRED);
        const client = twilio(teleCRED.twilio_account_sid, teleCRED.twilio_auth_token);

        // Check remaining participants in the conference
        const participants = await client.conferences(ConferenceSid)
          .participants
          .list({ status: 'in-progress' });

        console.log(`📊 Active participants remaining: ${participants.length}`);

        // 🔴 If only 1 or 0 participants left, end the conference
        if (participants.length <= 1) {
          console.log(`⚠️ Ending conference ${ConferenceSid} due to low participant count: ${participants.length}`);
          await client.conferences(ConferenceSid)
            .update({ status: 'completed' });

          console.log(`✅ Conference ${ConferenceSid} ended due to low participant count.`);
        }

        break;

      case 'end':
        console.log(`🛑 Conference ended: ${ConferenceName}`);
        break;
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Error handling conference status:', err.message);
    res.status(500).send('Error');
  }
});

async function transferActiveCall_29July_1838(ultravoxCallId,isCallForwarding,forwardingMobileNumber,firstname,lastname,transferReason,fromNumber,toNumber,direction,companyid,job_id,conversationSummary,
      intent_from,
      ResponseAccuracy,
      KnowledgeLimitationHandling, ConfidenceandClarity,ToneandEmpathy,
      EscalationHandling,CustomerSatisfactionOutcome,CustomerBehavior,
      CustomerEffortLevel,ConversationCompletion,EmotionalShiftDuringConversation,
      BackgroundNoiseLevelCustomer,BackgroundNoiseLevelAI,CallDisruptionDueToNoiseOrAudioQuality,
      OverallConversationQuality,callIntent,CallerToneandEmpathy
) {
    try {
      logMessage('transferActiveCall called with parameters:');

        if(!isCallForwarding)
        {
           await log_incoming_call_request('Call forwarding is  disable', { ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason,direction,companyid,job_id,conversationSummary,
             intent_from,
          ResponseAccuracy,
      KnowledgeLimitationHandling, ConfidenceandClarity,ToneandEmpathy,
      EscalationHandling,CustomerSatisfactionOutcome,CustomerBehavior,
      CustomerEffortLevel,ConversationCompletion,EmotionalShiftDuringConversation,
      BackgroundNoiseLevelCustomer,BackgroundNoiseLevelAI,CallDisruptionDueToNoiseOrAudioQuality,
      OverallConversationQuality,callIntent,CallerToneandEmpathy

           }, 'transferActiveCall');

           console.log('Call forwarding is  disable');
           return {
           status: 'false',
            message: 'Call forwarding is  disable',
            //callDetails: updatedCall
           }
        }
        console.log('Transferring call with ID:', ultravoxCallId);        

        logMessage('Transferring call with ID:', ultravoxCallId);

        const callData = activeCalls.get(ultravoxCallId);
        console.log('Call data:', callData);

        if (!callData || !callData.twilioCallSid) {
            console.log('inside');
            logMessage('*******Call not found or invalid CallSid');
            await log_incoming_call_request('Call not found or invalid CallSid', { ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason,job_id,conversationSummary }, 'transferActiveCall');
            throw new Error('Call not found or invalid CallSid');
        }

        // Verify Twilio client initialization
        // if (!client) {
        const twilioCallSid=callData.twilioCallSid;
        console.log('twilioCallSid',twilioCallSid);
        logMessage('twilioCallSid', twilioCallSid);
        const callSid=twilioCallSid;
        //GET PHONE NUMBER TWILO CREDENTIAL with TONUMBER
        console.log('Logging log_TransferCall *', {callid: ultravoxCallId,twilioCallSid, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason ,fromNumber, toNumber,direction,companyid,job_id});
        const result = await log_TransferCall_gc({callid: ultravoxCallId,twilioCallSid,fromNumber, toNumber, forwardingMobileNumber,firstname, 
                                                                                lastname,transferReason,isCallForwarding,direction,companyid,job_id,conversationSummary,
        intent_from,
        ResponseAccuracy,
        KnowledgeLimitationHandling, ConfidenceandClarity,ToneandEmpathy,
        EscalationHandling,CustomerSatisfactionOutcome,CustomerBehavior,
        CustomerEffortLevel,ConversationCompletion,EmotionalShiftDuringConversation,
        BackgroundNoiseLevelCustomer,BackgroundNoiseLevelAI,CallDisruptionDueToNoiseOrAudioQuality,
        OverallConversationQuality,callIntent,CallerToneandEmpathy
        }); 
        console.log('log_TransferCall result:', result);
        logMessage('log_TransferCall result:', JSON.stringify(result, null, 2));

        console.log('Twilio credentials:', result);                
        
        const twilio_account_sid=result?.message?.phone_credentials?.twilio_account_sid;
        const twilio_auth_token=result?.message?.phone_credentials?.twilio_auth_token;

        if (!twilio_account_sid || !twilio_auth_token) {
         
          await log_incoming_call_request('twilio_account_sid or  twilio_auth_token is null', { ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason,job_id }, error.message);
          throw new Error('Twilio credentials not found');
        }

        const client = twilio(twilio_account_sid, twilio_auth_token); 
        const conferenceName = `conference_${callSid}`;       

        // First create a new TwiML to handle the transfer
       // const twiml = new twilio.twiml.VoiceResponse();
        console.log('destinationNumber:', forwardingMobileNumber);

        console.log(`URL IS :: ${TOOLS_BASE_URL}/twilio/recording-status?companyid=${companyid}&job_id=${job_id}`);
        logMessage(`URL IS :: ${TOOLS_BASE_URL}/twilio/recording-status?companyid=${companyid}&job_id=${job_id}`);
        const shouldRecordConference=true;
        let recordSetting = 'do-not-record'; // Default: Do not record
        if (shouldRecordConference) {
            recordSetting = 'record-from-start'; // Or 'true' for a simpler "on"
        }
        logMessage('recordSetting::', recordSetting);

        const callerResponse = new twilio.twiml.VoiceResponse();
        callerResponse.say('Please wait a moment while I connect you to a human agent.');
        const callerDial = callerResponse.dial();
        console.log('conferenceName:', conferenceName);
        logMessage('conferenceName:', conferenceName);
        console.log(callerDial);
        logMessage('callerDial:', callerDial.toString());

        callerDial.conference(conferenceName, {
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        // record: 'record-from-start',
        // recordingStatusCallback: `${TOOLS_BASE_URL}/twilio/recording-status?companyid=${companyid}&job_id=${job_id}&mainCallSid=${callSid}`,
        // recordingStatusCallbackEvent: ['in-progress', 'completed', 'failed'],
        // statusCallback: `${TOOLS_BASE_URL}/twilio/conference-status?fromNumber=${fromNumber}&toNumber=${toNumber}&companyid=${companyid}&job_id=${job_id}&mainCallSid=${callSid}`, // ADD THIS
        // statusCallbackEvent: ['start', 'end', 'join', 'leave'],
        // statusCallbackMethod: 'POST',
      }); 
       
      /*  const callerResponse = new twilio.twiml.VoiceResponse();
        callerResponse.say('Please wait a moment while I connect you to a human agent.');
        const callerDial = callerResponse.dial();      
        
        callerDial.conference(conferenceName, {
        startConferenceOnEnter: true,
        endConferenceOnExit: true,   // <--- This will end call when agent exits
        record: recordSetting,
        recordingStatusCallback:`${TOOLS_BASE_URL}/twilio/recording-status?companyid=${companyid}&job_id=${job_id}&mainCallSid=${callSid}`,
        recordingStatusCallbackEvent: ['in-progress', 'completed', 'failed'], // FIXED
        statusCallback: `${TOOLS_BASE_URL}/twilio/conference-status?fromNumber=${fromNumber}&toNumber=${toNumber}&companyid=${companyid}&job_id=${job_id}&mainCallSid=${callSid}`, // ADD THIS
        statusCallbackEvent: ['start', 'end', 'join', 'leave'], // ADD THIS
        statusCallbackMethod: 'POST' // ADD THIS 
        });*/ 
        console.log('Dial here:');
        logMessage('Dial here:', callerResponse.toString());

        // const updatedCall = await client.calls(callData.twilioCallSid)
        // .update({
        //     url: `${TOOLS_BASE_URL}/twilio/transfer-conference-entry-point?conferenceName=${conferenceName}&fromNumber=${fromNumber}&toNumber=${toNumber}&companyid=${companyid}&job_id=${job_id}&mainCallSid=${callSid}`,
        //     method: 'POST'
        // });

        const updatedCall = await client.calls(callData.twilioCallSid)
            .update({
                url: `${TOOLS_BASE_URL}/twilio/transfer-conference-entry-point?conferenceName=${encodeURIComponent(conferenceName)}&fromNumber=${encodeURIComponent(fromNumber)}&toNumber=${encodeURIComponent(toNumber)}&companyid=${encodeURIComponent(companyid)}&job_id=${encodeURIComponent(job_id)}&mainCallSid=${encodeURIComponent(callSid)}`,
                method: 'POST'
            });

       // TODO 29 July
        // const updatedCall = await client.calls(callData.twilioCallSid)
        //     .update({
        //         twiml:  callerResponse.toString()
        //     }); 
        // Step 2: Call the specialist and play the summary before joining conference
    const agentResponse = new twilio.twiml.VoiceResponse();

    agentResponse.say("You are being connected to a user. Here's a quick summary.");
    if(conversationSummary)
    {
    agentResponse.say(conversationSummary, { voice: "alice", language: "en-US" }); // TTS summary
    }
    else{

    console.log('conversationSummary : ',conversationSummary);
    }
    // fromNumber=fromNumber;
    // toNumber=toNumber;
    logMessage( `URL is : ${TOOLS_BASE_URL}/twilio/conference-status?fromNumber=${fromNumber}&toNumber=${toNumber}&companyid=${companyid}&job_id=${job_id}`);
    const agentDial = agentResponse.dial();
    agentDial.conference(conferenceName, {
      startConferenceOnEnter: false,
      endConferenceOnExit: true,
      
      
    });
    console.log(`${TOOLS_BASE_URL}/twilio/transfer-status?mainCallSid=${callSid}`);

    logMessage('Agent Dial here:', agentResponse.toString());

    const outboundCall = await client.calls.create({
      to: forwardingMobileNumber,
      from: fromNumber,
      twiml: agentResponse.toString(), 
      // Optional: Track outbound call creation status too
      statusCallback: `${TOOLS_BASE_URL}/twilio/transfer-status?mainCallSid=${callSid}`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

       console.log('Outbound call initiated to specialist. SID:', outboundCall.sid);
       logMessage('Outbound call initiated to specialist. SID:', outboundCall.sid);
       
          return {
            status: 'success',
            message: 'Call transfer initiated',
            //callDetails: updatedCall
        };

    } catch (error) {
        logMessage('Error transferring call:', error.message || error);
        console.error('Error transferring call:', error);
        //Error in transferring call
        await log_incoming_call_request('Error transferring call', { ultravoxCallId, isCallForwarding, forwardingMobileNumber, firstname, lastname, transferReason,direction,companyid,job_id }, error.message);
        throw {
            status: 'error',
            message: 'Failed to transfer call',
            error: error.message
        };
    }
}
// Fixed transfer-conference-entry-point route
router.post('/transfer-conference-entry-point_1', (req, res) => {
  try {
    // Extract ALL required parameters from query string
    const {
      conferenceName,
      fromNumber,
      toNumber,
      companyid,
      job_id,
      mainCallSid
    } = req.query;

    logMessage('Received transfer-conference-entry-point request:', JSON.stringify(req.query, null, 2));
    
    // Validate required parameters
    if (!conferenceName) {
      console.error('Missing conferenceName in query parameters');
      return res.status(400).send('Missing conferenceName parameter');
    }

    const response = new VoiceResponse();
    response.say('Please wait a moment while I connect you to a human agent.');
    const dial = response.dial();
    
    logMessage('Dialing conference:', conferenceName);
    
    // Build conference options object
    const conferenceOptions = {
      startConferenceOnEnter: true,
      endConferenceOnExit: true,
      record: 'record-from-start'
    };

    // Only add callbacks if we have the required parameters
    if (fromNumber && toNumber && companyid && job_id && mainCallSid) {
      conferenceOptions.statusCallback = `${TOOLS_BASE_URL}/twilio/conference-status?fromNumber=${fromNumber}&toNumber=${toNumber}&companyid=${companyid}&job_id=${job_id}&mainCallSid=${mainCallSid}`;
      conferenceOptions.statusCallbackEvent = ['start', 'end', 'join', 'leave'];
      conferenceOptions.statusCallbackMethod = 'POST';
      conferenceOptions.recordingStatusCallback = `${TOOLS_BASE_URL}/twilio/recording-status?companyid=${companyid}&job_id=${job_id}&mainCallSid=${mainCallSid}`;
      conferenceOptions.recordingStatusCallbackEvent = ['in-progress', 'completed', 'failed'];
    } else {
      console.warn('Missing some parameters for callbacks, proceeding with basic conference setup');
      logMessage('Missing parameters:', { fromNumber, toNumber, companyid, job_id, mainCallSid });
    }

    dial.conference(conferenceName, conferenceOptions);

    res.type('text/xml');
    res.send(response.toString());
    
    logMessage('Conference TwiML sent:', response.toString());
    
  } catch (error) {
    console.error('Error in transfer-conference-entry-point:', error.message);
    logMessage('Error in transfer-conference-entry-point:', error.message);
    
    // Return a basic TwiML response to prevent call failure
    const errorResponse = new VoiceResponse();
    errorResponse.say('There was an error connecting your call. Please try again or contact support.');
    res.type('text/xml');
    res.status(500).send(errorResponse.toString());
  }
});


router.post('/transfer-conference-entry-point_2', (req, res) => {
  logMessage('Received transfer-conference-entry-point request:', JSON.stringify(req.query, null, 2));
  const response = new VoiceResponse();
  response.say('Please wait a moment while I connect you to a human agent.');
  const dial = response.dial();
  logMessage('Dialing conference:', req.query.conferenceName);
  dial.conference(req.query.conferenceName, {
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
    record: 'record-from-start',
    statusCallback: `${TOOLS_BASE_URL}/twilio/conference-status?fromNumber=${fromNumber}&toNumber=${toNumber}&companyid=${companyid}&job_id=${job_id}&mainCallSid=${callSid}`, // ADD THIS
    statusCallbackEvent: ['start', 'end', 'join', 'leave'],
    statusCallbackMethod: 'POST',
    recordingStatusCallback: `${TOOLS_BASE_URL}/twilio/recording-status?companyid=${companyid}&job_id=${job_id}&mainCallSid=${callSid}`,
    recordingStatusCallbackEvent: ['in-progress', 'completed', 'failed']
  });

  res.type('text/xml');
  res.send(response.toString());
});
// Route: /twilio/transfer-conference-entry-point
router.post('/transfer-conference-entry-point_1', (req, res) => {
  const {
    conferenceName,
    companyid,
    job_id,
    mainCallSid,
    fromNumber,
    toNumber,
  } = req.query;

  console.log('➡️ Received transfer-conference-entry-point for conference:', conferenceName);
  logMessage('Received transfer-conference-entry-point:', JSON.stringify(req.query, null, 2));

 
  res.type('text/xml');
  res.send(response.toString());
});
 
export { router};

// 📋 Available record values:
// Option	Description
// 'do-not-record'	❌ Default. The call is not recorded.
// 'record-from-start'	✅ Recording begins as soon as the first participant joins the conference.
// 'record-from-answer'	✅ Recording begins after the first participant answers.
// 'record-from-ringing'	✅ Recording begins as soon as the call starts ringing. Useful for full call capture including ring tone.
// 'record-from-connect'	✅ Starts recording once both participants are connected in the conference. Best if you only want conversation audio.
// 'true' (deprecated)	Same as 'record-from-start'. Not recommended—use a specific value instead.


