import 'dotenv/config';
import https from 'node:https';
import {
  ULTRAVOX_API_KEY,
  ULTRAVOX_API_URL,
  TOOLS_BASE_URL 
} from '../config/config.js';
import { logMessage } from '../utils/logger.js';

 
export async function createUltravoxCall(callConfig) {
  const ultravoxConfig = {
    ...callConfig,
    experimentalSettings: {
      webhooks: [{
        url: `${TOOLS_BASE_URL}/cal/saveTranscript`,
        events: ['call.ended']
      }]
    }
  };

  console.log('Creating Ultravox call...');
  console.log('Payload:', JSON.stringify(ultravoxConfig, null, 2));
  console.log('API URL:', `${ULTRAVOX_API_URL}/calls`);

  return new Promise((resolve) => {
    try {
      const req = https.request(`${ULTRAVOX_API_URL}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': ULTRAVOX_API_KEY
        }
      });

      let data = '';

      req.on('response', (res) => {
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 400) {
            console.error(`Ultravox API Error ${res.statusCode}:`, data);
            resolve(null);
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (err) {
              console.error('Failed to parse Ultravox response:', err.message);
              resolve(null);
            }
          }
        });
      });

      req.on('error', (err) => {
        console.error('Failed to create Ultravox call:', err.message);
        resolve(null);
      });

      req.write(JSON.stringify(ultravoxConfig));
      req.end();

    } catch (err) {
      console.error('Unexpected error during Ultravox call:', err.message);
      resolve(null);
    }
  });
}


export async function getCallTranscript(callId) {
  if (!callId) {
    console.error('Missing callId for transcript fetch.');
    return null;
  }

  let allMessages = [];
  let nextCursor = null;

  try {
    do {
      const url = `${ULTRAVOX_API_URL}/calls/${callId}/messages${nextCursor ? `?cursor=${nextCursor}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': ULTRAVOX_API_KEY,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Ultravox API responded with status ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (!data?.results) {
        console.warn('No transcript messages found in response.');
        break;
      }

      allMessages = allMessages.concat(data.results);
      nextCursor = data.next ? new URL(data.next).searchParams.get('cursor') : null;

    } while (nextCursor);

    return allMessages;

  } catch (error) {
    console.error('Failed to fetch Ultravox messages:', error.message);
    return null;
  }
}
const assessmentReq=false;
const sharedAssessmentParameters = [
  {
            name: "ResponseAccuracy",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's self-assessed response accuracy based on its knowledge, as a digit 1-4. (4: Completely accurate, 3: Mostly accurate, 2: Somewhat inaccurate, 1: Frequently incorrect)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "KnowledgeLimitationHandling",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's self-assessment of how it handled knowledge limitations, as a digit 1-4. (4: Clearly stated limits, 3: Occasionally mentioned limits, 2: Rarely mentioned limits, 1: Overstepped limits)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "ConfidenceandClarity",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's self-assessed confidence and clarity in responses, as a digit 1-4. (4: Clear/Concise/Confident, 3: Mostly confident/Wordy/Vague, 2: Uncertain/Repetitive, 1: Confusing/Lacked direction)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "ToneandEmpathy",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's self-assessed tone and empathy during the call, as a digit 1-4. (4: Very appropriate, 3: Neutral, 2: Robotic, 1: Cold/Inappropriate)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "EscalationHandling",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's self-assessment of its escalation handling, as a digit 1-4. (4: Offered at right time, 3: Offered only when prompted, 2: Needed but delayed, 1: Needed but not offered)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          
          {
            name: "CustomerSatisfactionOutcome",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's assessment of the customer's final sentiment/satisfaction, as a digit 1-4. (4: Satisfied/Appreciative, 3: Neutral/Not dissatisfied, 2: Mildly frustrated, 1: Clearly unhappy/Angry)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "CustomerBehavior",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's assessment of the customer's overall tone and attitude, as a digit 1-4. (4: Calm/Cooperative, 3: Mildly confused/Assertive, 2: Impatient/Slightly rude, 1: Hostile/Abusive)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "CustomerEffortLevel",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's assessment of customer effort to get a helpful answer, as a digit 1-4. (4: Very little effort, 3: Some rephrasing, 2: Repeated clarification, 1: Gave up/Frustrated)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "ConversationCompletion",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's assessment of whether the query was completely handled, as a digit 1-4. (4: Fully handled, 3: Mostly handled, 2: Partially handled, 1: Not handled)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "EmotionalShiftDuringConversation",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's assessment of emotional shift during the conversation, as a digit 1-4. (4: Improved, 3: Stayed same, 2: Slightly worsened, 1: Significantly worsened)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "BackgroundNoiseLevelCustomer",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's assessment of background noise on the customer's side, as a digit 1-4. (4: No noise, 3: Minor noise, 2: Moderate noise, 1: High noise)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "BackgroundNoiseLevelAI",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's assessment of background noise/glitches from the AI/system side, as a digit 1-4. (4: Crystal clear, 3: Slight artifacts/echo, 2: Noticeable distortion/lag, 1: Difficult to hear)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "CallDisruptionDueToNoiseOrAudioQuality",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's assessment of call disruption due to noise/audio quality, as a digit 1-4. (4: No impact, 3: Slight impact, 2: Some parts repeated, 1: Seriously impacted)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            "required": assessmentReq
          },
          {
            name: "OverallConversationQuality",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's overall rating of the conversation quality, as a digit 1-4. (4: Excellent, 3: Good, 2: Fair, 1: Poor)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "callIntent",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's classification of the primary intent of the call, as a digit 1-4. (1: Information Inquiry, 2: Service/Support Request, 3: Sales/New Business Inquiry, 4: Other/Unclear)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          },
          {
            name: "CallerToneandEmpathy",
            location: "PARAMETER_LOCATION_BODY",
            schema: {
              "description": "The AI's assessment of the caller's tone and empathy during the call, as a digit 1-4. (4: Calm/Cooperative/Positive, 3: Neutral/Polite, 2: Impatient/Mildly frustrated, 1: Hostile/Angry/Abusive)",
              "type": "number",
              "enum": [1, 2, 3, 4]
            },
            required: assessmentReq
          }
]; 

// Define each tool as a separate variable
const transferCallTool = (FROM, TO, ISCALLFORWARDING, FORWARDING_MOBILE_NUMBER, COMPANYID, JOB_ID) => ({
  temporaryTool: {
    modelToolName: "transferCall",
    description: "Escalate to human agent", 
    staticParameters: [
      { "name": "fromNumber", "location": "PARAMETER_LOCATION_BODY", "value": FROM },
      { "name": "toNumber", "location": "PARAMETER_LOCATION_BODY", "value": TO },
      { "name": "isCallForwarding", "location": "PARAMETER_LOCATION_BODY", "value": ISCALLFORWARDING },
      { "name": "forwardingMobileNumber", "location": "PARAMETER_LOCATION_BODY", "value": FORWARDING_MOBILE_NUMBER },
      { "name": "direction", "location": "PARAMETER_LOCATION_BODY", "value": "OUTBOUND" },
      { "name": "companyid", "location": "PARAMETER_LOCATION_BODY", "value": COMPANYID },
      { "name": "job_id", "location": "PARAMETER_LOCATION_BODY", "value": JOB_ID },
      { "name": "intent_from", "location": "PARAMETER_LOCATION_BODY", "value": "outbound Transfer" }
    ],         
    automaticParameters: [{
      "name": "callId",
      "location": "PARAMETER_LOCATION_BODY",
      "knownValue": "KNOWN_PARAM_CALL_ID"
    }],
    dynamicParameters: [
      { name: "firstname", location: "PARAMETER_LOCATION_BODY", schema: { type: "string" }, required: false },
      { name: "lastname", location: "PARAMETER_LOCATION_BODY", schema: { type: "string" }, required: false },
      { name: "transferReason", location: "PARAMETER_LOCATION_BODY", schema: { type: "string" }, required: false },
      { name: "conversationSummary", location: "PARAMETER_LOCATION_BODY", schema: { 
          description: "A concise summary of the current conversation",
          type: "string" 
        }, required: false 
      },
      ...sharedAssessmentParameters
    ],
    http: {
      baseUrlPattern: `${TOOLS_BASE_URL}/twilio/transferCall`,
      httpMethod: "POST",
    }
  }
});

const bookAppointmentTool = (FROM, TO, IS_APPOINTMENT_EMAIL) => ({
  temporaryTool: {
    modelToolName: "bookAppointment",
    description: "Schedule appointments",
    staticParameters: [
      { "name": "fromNumber", "location": "PARAMETER_LOCATION_BODY", "value": TO },
      { "name": "toNumber", "location": "PARAMETER_LOCATION_BODY", "value": FROM },
      { "name": "isAppointEmail", "location": "PARAMETER_LOCATION_BODY", "value": IS_APPOINTMENT_EMAIL },
      { "name": "intent_from", "location": "PARAMETER_LOCATION_BODY", "value": "outbound Appointment" }
    ],
    automaticParameters: [{
      "name": "callId",
      "location": "PARAMETER_LOCATION_BODY",
      "knownValue": "KNOWN_PARAM_CALL_ID"
    }],
    dynamicParameters: [       
      { name: "firstname", location: "PARAMETER_LOCATION_BODY", schema: { type: "string" }, required: true },
      { name: "lastname", location: "PARAMETER_LOCATION_BODY", schema: { type: "string" }, required: true },
      { name: "contactnumber", location: "PARAMETER_LOCATION_BODY", schema: { type: "string" }, required: true },
      { name: "emailaddress", location: "PARAMETER_LOCATION_BODY", schema: { type: "string" }, required: true },
      { name: "purpose", location: "PARAMETER_LOCATION_BODY", schema: { type: "string" }, required: true },
      { name: "appointmentdate", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", format: "date" }, required: true },
      { name: "appointmenttime", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", format: "time" }, required: true },
      { name: "conversationSummary", location: "PARAMETER_LOCATION_BODY", schema: { 
          description: "A 2-3 sentence summary of the conversation",
          type: "string"
        }, required: true 
      },
      ...sharedAssessmentParameters
    ],
    http: {
      baseUrlPattern: `${TOOLS_BASE_URL}/whook/bookAppointment`,
      httpMethod: "POST",
    }
  }
});

const hangUpCallTool = (FROM, TO, COMPANYID, JOB_ID) => ({
  temporaryTool: {
    modelToolName: "hangUpCall",
    description: "Ends the call when the conversation is complete.",
    staticParameters: [
      { "name": "fromNumber", "location": "PARAMETER_LOCATION_BODY", "value": FROM },
      { "name": "toNumber", "location": "PARAMETER_LOCATION_BODY", "value": TO },
      { "name": "direction", "location": "PARAMETER_LOCATION_BODY", "value": "OUTBOUND" },
      { "name": "companyid", "location": "PARAMETER_LOCATION_BODY", "value": COMPANYID },
      { "name": "job_id", "location": "PARAMETER_LOCATION_BODY", "value": JOB_ID },
      { "name": "intent_from", "location": "PARAMETER_LOCATION_BODY", "value": "outbound Hangup" }
    ], 
    automaticParameters: [{
      name: "callId",
      location: "PARAMETER_LOCATION_BODY",
      knownValue: "KNOWN_PARAM_CALL_ID"
    }],
    dynamicParameters: [            
      ...sharedAssessmentParameters
    ],
    http: {
      baseUrlPattern: `${TOOLS_BASE_URL}/twilio/hangUpCall`,
      httpMethod: "POST"
    }
  }
});

const confirmAppointmentAttendanceTool = (FROM, TO, COMPANYID, JOB_ID) => ({
  temporaryTool: {
    modelToolName: "confirmAppointmentAttendance",
    description: "Asks the user to confirm their appointment attendance today.",
    staticParameters: [
      { name: "fromNumber", location: "PARAMETER_LOCATION_BODY", value: FROM },
      { name: "toNumber", location: "PARAMETER_LOCATION_BODY", value: TO },
      { name: "direction", location: "PARAMETER_LOCATION_BODY", value: "OUTBOUND" },
      { name: "companyid", location: "PARAMETER_LOCATION_BODY", value: COMPANYID },
      { name: "job_id", location: "PARAMETER_LOCATION_BODY", value: JOB_ID },
      { name: "intent_from", location: "PARAMETER_LOCATION_BODY", value: "appointmentReminder" }
    ],
    automaticParameters: [{
      name: "callId",
      location: "PARAMETER_LOCATION_BODY",
      knownValue: "KNOWN_PARAM_CALL_ID"
    }],
    dynamicParameters: [       
      { 
        name: "confirmationResponse", 
        location: "PARAMETER_LOCATION_BODY", 
        schema: { 
          type: "string",
          enum: ["yes", "no", "maybe"],
          description: "User's confirmation whether they will attend the appointment"
        },
        required: true 
      },
      { 
        name: "conversationSummary", 
        location: "PARAMETER_LOCATION_BODY", 
        schema: {
          description: "Short summary of the appointment confirmation interaction.",
          type: "string"
        },
        required: true 
      },
      
    ],
    http: {
      baseUrlPattern: `${TOOLS_BASE_URL}/whook/confirmAttendance`,
      httpMethod: "POST"
    }
  }
});

// Updated function using the separate tool variables
function createSelectedTools(FROM, TO, IS_APPOINTMENT_EMAIL, ISCALLFORWARDING, FORWARDING_MOBILE_NUMBER, COMPANYID, JOB_ID) {
  return [
    transferCallTool(FROM, TO, ISCALLFORWARDING, FORWARDING_MOBILE_NUMBER, COMPANYID, JOB_ID),
    bookAppointmentTool(FROM, TO, IS_APPOINTMENT_EMAIL),
    hangUpCallTool(FROM, TO, COMPANYID, JOB_ID),
    confirmAppointmentAttendanceTool(FROM, TO, COMPANYID, JOB_ID)  // New tool added
  ];
} 



export function buildUltravoxCallConfig(job) {
  // Normalize booleans to string "true" or "false"
  const normalizeBoolString = (input) => {
    const val = String(input).toLowerCase();
    return ['true', '1', 'yes'].includes(val) ? "true" : "false";
  };

  const Istscriptstring = normalizeBoolString(job.iscalltranscript);
  const IsRecordingstring = normalizeBoolString(job.iscallrecording);
  const IsEmailnotistring = normalizeBoolString(job.emailnotification);
  const maxDurationnow = `${job.max_call_dur_insec}s`;

  const FROM=job.telecom_phone_number;
  const TO=job.call_phone_no;
  const JOB_ID=job.job_id;

  const IS_APPOINTMENT_EMAIL=job.emailnotification;  
  const ISCALLFORWARDING= job.iscallforwarding;
  const FORWARDING_MOBILE_NUMBER=job.forwardingmobilenumber;
  const COMPANY_NAME=job.companyname;
  const COMPANYID=job.business_id;

  const full_name=job.full_name;
  const job_email_address=job.job_email_address;
  const call_phone_no=job.call_phone_no;
  logMessage('REPLACE FULLNAME: full_name '+ full_name ,' EMAILADDRESS  job_email_address :' +job_email_address, ' CALLPHONENO: call_phone_no ' + call_phone_no);

  // 1. Get UK time with BST/GMT awareness
  const ukDateOptions = {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };

  const ukTimeOptions = {
    timeZone: 'Europe/London',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  };
  console.log('job record: ',job);
  if(job.scheduler_priority_title === 'Reminder') 
    {
      console.log(job);
      console.log('job.ob_sch_priority: ',job.ob_sch_priority);
      console.log('job.appointment_date: ',job.appointment_date);
      console.log('job.appointment_time: ',job.appointment_time);
      console.log('job.appointment_for: ',job.appointment_for);
      logMessage('job.appointment_time_slot: ' +job.appointment_time_slot + ' job.appointment_date: ' + job.appointment_date + ' job.appointment_time: ' + job.appointment_time);
    }

  //appointment_time_slot

    // 2. Format dates/times explicitly for UK
  const currentDate = new Date().toLocaleDateString('en-GB', ukDateOptions)
    .split('/').reverse().join('-'); // Converts DD/MM/YYYY → YYYY-MM-DD

  const currentTime = new Date().toLocaleTimeString('en-GB', ukTimeOptions); // HH:mm (24h)


  return {
    systemPrompt: ` ${job.prompt.replace(/\[CURRENT_DATE_YYYY-MM-DD\]/g, currentDate)
                  .replace(/\[CURRENT_TIME_HH:MM \(24h\)\]/g, currentTime)
                  .replace(/\[FULLNAME\]/g, full_name || '') // Replace FULLNAME with job.full_name
                  .replace(/\[EMAILADDRESS\]/g, job_email_address || '') // Replace EMAILADDRESS with job.job_email_address
                  .replace(/\[CALLPHONENO\]/g, call_phone_no || '') 
                  .replace(/\[APPOINTMENT_TIMESLOT\]/g, 
                  job.scheduler_priority_title === 'Reminder' 
                   ? (formatUKReadableTime(job.appointment_time) || '')  : '') 

                      
                } `,
    model: 'fixie-ai/ultravox',
    voice: job.voice || 'en-GB-Neural2-A',
    temperature: job.temperature ?? 0.3,
    firstSpeaker: 'FIRST_SPEAKER_AGENT',
    medium: {
      twilio: {
        // You can add voiceSettings here if needed
      }
    },    
    transcriptOptional: job.iscalltranscript === true || job.iscalltranscript === 'true' || job.iscalltranscript === 1,
    recordingEnabled: job.iscallrecording === true || job.iscallrecording === 'true' || job.iscallrecording === 1,
    maxDuration: maxDurationnow,
    selectedTools: createSelectedTools(FROM, TO,IS_APPOINTMENT_EMAIL,ISCALLFORWARDING,FORWARDING_MOBILE_NUMBER,COMPANYID,JOB_ID ),//selectedTools,
    metadata: {
      direction: "OUTBOUND",
      company: job.companyname,
      callfrom: FROM,
      callto: TO,
      ISCALLTRANSCRIPT: Istscriptstring,
      ISCALLRECORDING: IsRecordingstring,
      COMPANYID: job.business_id,
      EMAILADDRESS: job.emailaddress,
      JOB_EMAILADDRESS: job.job_email_address,
      EMAILNOTIFICAION: IsEmailnotistring,
      JOB_ID: job.job_id,
    }
  };
}

function formatUKReadableTime(time24) {
  try {
    if (!time24 || typeof time24 !== 'string') return '';

    const [hourStr, minuteStr] = time24.split(':');
    if (!hourStr || !minuteStr) return '';

    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) return '';

    let nextHour = (hour + 1) % 24;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const nextHour12 = nextHour % 12 || 12;

    if (minute === 0) return `${hour12}${ampm}`;
    if (minute === 15) return `quarter past ${hour12}`;
    if (minute === 30) return `half past ${hour12}`;
    if (minute === 45) return `quarter to ${nextHour12}`;

    if (minute < 30) return `${minute} past ${hour12}`;
    return `${60 - minute} to ${nextHour12}`;
  } catch (error) {
    console.error("Time formatting error:", error);
    return '';
  }
}


export const ULTRAVOX_CALL_CONFIG_1 = (job,Istscriptstring,IsRecordingstring,IsEmailnotistring,iscalltranscriptvar,iscallrecordingvar,emailnotificationvar) => ({
    //emailnotification,job.iscalltranscript,job.iscallrecording
    systemPrompt: ` ${job.prompt}  `,
    model: 'fixie-ai/ultravox',
    voice: job.voice || 'en-GB-Neural2-A', // UK English voice
    temperature: job.temperature, // Slightly higher for natural variance
    firstSpeaker: 'FIRST_SPEAKER_AGENT',
   // selectedTools: createSelectedTools(FROM, TO,IS_APPOINTMENT_EMAIL,ISCALLFORWARDING,FORWARDING_MOBILE_NUMBER),//selectedTools,
    medium: { 
      twilio: {
        //voiceSettings: {
        //   speed: 0.85, // 85% normal speed
        //  pauseSilence: '1.5s'
        //}
      } 
    },
    recordingEnabled: iscalltranscriptvar,
    transcriptOptional: iscallrecordingvar,
    maxDuration: '60s',
    metadata: {
        direction: "OUTBOUND",
        company: job.companyname,
        callfrom: job.telecom_phone_number,
        callto: job.call_phone_no,
        ISCALLTRANSCRIPT: Istscriptstring,
        ISCALLRECORDING:  IsRecordingstring,
        
        COMPANYID: job.business_id,
        EMAILADDRESS: job.email_address,
        EMAILNOTIFICAION : IsEmailnotistring,
      }
});
 