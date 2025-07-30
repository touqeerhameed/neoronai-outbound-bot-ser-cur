 import axios from 'axios';
import dotenv from 'dotenv';
// import { setBusinesses, setCompanyBusiness,setbusinessbyPhoneNumber} from '../utils/business-cache.js';
import {
  ERP_API_BASE_URL ,CREATE_LOG_CALL_REQUEST_LOGGER,E_ADMIN_API_KEY ,E_ADMIN_API_SECRET,ERP_SESSION_LOG_URL
} from '../config/config.js';
import { triggerOutboundCall } from './ultracall.js';
import { logMessage } from '../utils/logger.js';

dotenv.config();

/*
export async function fetchGroupBusiness(businessgroupid) {
  if (!businessgroupid) {
    console.error('businessgroupid is required');
    return null;
  }

  try {
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.getbusiness`,
      { businessgroupid },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const businesses = response.data?.message;

    if (!Array.isArray(businesses) || businesses.length === 0) {
      console.warn('No business records found for group:', businessgroupid);
      return null;
    }

    setBusinesses(businesses);
    console.log(`Loaded ${businesses.length} businesses for group ${businessgroupid}`);

    return businesses;

  } catch (error) {
    if (error.response) {
      console.error(
        'ERP API error:',
        error.response.status,
        error.response.statusText,
        error.response.data
      );
    } else if (error.request) {
      console.error('No response from ERP API:', error.request);
    } else {
      console.error('Unexpected error:', error.message);
    }

    return null;
  }
}
*/
export async function fetchCompanyBusiness(businessid) {
  if (!businessid) {
    console.error('businessid is required');
    return null;
  }

  try {
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.getbusinessbyId`,
      { businessid },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const business = response.data?.message;

    if (!business) {
      console.warn('No business record found for businessid:', businessid);
      return null;
    }

    console.log('Business found:', business);
    setCompanyBusiness(business);

    return business;

  } catch (error) {
    if (error.response) {
      console.error(
        'ERP API error:',
        error.response.status,
        error.response.statusText,
        error.response.data
      );
    } else if (error.request) {
      console.error('No response from ERP API:', error.request);
    } else {
      console.error('Unexpected error:', error.message);
    }

    return null;
  }
}

export async function getbusinessbyPhoneNumber(phone_number) {
  if (!phone_number) {
    console.error('phone_number is required');
    return null;
  }

  try {
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.getbusinessbyPhoneNumber`,
      { phone_number },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const business = response.data?.message;

    if (!business) {
      console.warn('No business record found for phone number:', phone_number);
      return null;
    }

    console.log('Business matched:', business);
    return business;

  } catch (error) {
    if (error.response) {
      // Server responded but returned error status (e.g. 404)
      console.error(
        'ERP API error:',
        error.response.status,
        error.response.statusText,
        error.response.data
      );
    } else if (error.request) {
      // Request sent but no response received
      console.error('No response from ERP API:', error.request);
    } else {
      // Some other error occurred
      console.error('Unexpected error:', error.message);
    }

    // Return null instead of throwing to keep app alive
    return null;
  }
}

export async function getCallSessionDocnameExist(callId) {
  if (!callId) {
    console.error('Missing callId in getCallSessionDocname');
    return { success: false, error: 'Missing callId' };
  }

  try {
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.check_doc_exist`,
      { callid: callId },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const result = response.data;
    console.log('getCallSessionDocnameExist result:', result);

    console.log('result.message', result.message);
    console.log('result.message?.success', result.message?.success);
    console.log('result.message?.message?.name', result.message?.message?.name);

    if (result.message?.success && result?.message?.message?.name) {    
      console.log('Found match');
      return {
        success: true,
        docname: result?.message?.message?.name
      };
    } else {
      return {
        success: false,
        info: result.info || 'No matching record found.'
      };
    }
  } catch (error) {
    console.log('[getCallSessionDocname] Error:', error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}
export async function log_incoming_call_request(error_text, request_payload, company_found) {
  try {
    if(CREATE_LOG_CALL_REQUEST_LOGGER ===0)
      return null;
    
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.log_incoming_call_request`,
      {
        error_text,
        request_payload: JSON.stringify(request_payload),
        company_found
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const log = response.data?.message;
    if (!log) {
      console.log('Log request succeeded but no message returned');
      return null;
    }

    console.log('Log saved:', log);
    return log;

  } catch (error) {
    // Safe error handling (no crash)
    if (error.response) {
      // Server responded with status code outside 2xx
      console.log(
        'API responded with error:',
        error.response.status,
        error.response.statusText,
        error.response.data
      );
    } else if (error.request) {
      // Request made, but no response received
      console.log('No response from server:', error.request);
    } else {
      // Something else failed
      console.log('Unexpected error:', error.message);
    }

    // Optionally return null instead of throwing
    return null;

    // If you want to crash only in dev mode, you could:
    // if (process.env.NODE_ENV === 'development') throw error;
  }
}
export async function log_TransferCall_status(tcallData) {
  try {  
    //console.log('log_TransferCall_gc', JSON.stringify(tcallData));  

    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.log_TransferCall_status`,
       JSON.stringify(tcallData),  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const result = response.data;
    console.log("log_TransferCall_status *** : ",result)
    if (!result.message) {
      console.log('log_TransferCall_status succeeded but no message returned');
      return null;
    }

    //console.log('Call session logged:', result.message);
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to log log_TransferCall_status',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('log_TransferCall_status API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('log_TransferCall_status No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log(' log_TransferCall_status Request setup error:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}


export async function log_TransferCall_gc(tcallData) {
  try {    
     console.log('log_TransferCall_gc Payload:', tcallData);
     logMessage('log_TransferCall_gc Payload:', tcallData);
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.log_TransferCall_gc`,
       JSON.stringify(tcallData),  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const result = response.data;
    if (!result.message) {
      console.log('TransferCall succeeded but no message returned');
      return null;
    }

    //console.log('Call session logged:', result.message);
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to log call session',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('TransferCall Request setup error:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}

export async function log_CallSession(callData) {
  try {    

    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.log_CallSessionLog`,
       JSON.stringify(callData),  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const result = response.data;
    if (!result.message) {
      console.log('Call log succeeded but no message returned');
      return null;
    }

    //console.log('Call session logged:', result.message);
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to log call session',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('CallSession Request setup error:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}

export async function updateJobReminder(rem_details) {
  try {
    
    logMessage('updateJobReminder api:');   
    console.log('Creating booking with details:', rem_details);
    const url = `${ERP_API_BASE_URL}aiagentapp.api.appointments.update_job_reminder`;
    console.log('Booking URL:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {        
        'Content-Type': 'application/json',  
        'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`      
      },         
      body: JSON.stringify(rem_details),
    });
    //console.log('Response :', response);
    if (!response.ok) {
     
      logMessage('updateJobReminder !response.ok:', {
        status: response.status,
        statusText: response.statusText,
        error: await response.text()});


      await log_incoming_call_request('updateJobReminder !response.ok: ',  error,JSON.stringify(rem_details));
      throw new Error(`Failed to create booking: ${response}`);
    }

    const reminder_response = await response.json();
    return {
      //success: true,      
      reminder_response
    };
  } catch (error) {
    console.error('Failed to update updateJobReminderg:', error);
    logMessage('Failed to update updateJobReminderg:', {
      error: error.message,
      stack: error.stack,
      originalDetails: rem_details
    });
    // Log the error to your logging system
     await log_incoming_call_request('Failed to update updateJobReminderg ',  error,JSON.stringify(rem_details));
     return {     

      // Log here if booking not successufull 
      success: false,
      error: 'Failed to update updateJobReminderg'
    };
  }
}

export async function appendCallWithTranscript(callData,COMPANYID,EMAILADDRESS,EMAILNOTIFICAION,shortSummary,summary,callended) {
  try {
    const payload = {
      ...callData,
      COMPANYID: COMPANYID,
      EMAILADDRESS: EMAILADDRESS,
      EMAILNOTIFICAION: EMAILNOTIFICAION,
      SHORTSUMMARY:shortSummary,
      SUMMARY:summary,
      CALLENDED:callended,
      ERP_SESSION_LOG_URL: ERP_SESSION_LOG_URL
    };

    console.log('appendCallWithTranscript Payload:', payload);
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.save_call_with_transcript`,
      JSON.stringify(payload), // Direct stringification as requested
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const result = response.data;
    if (!result.status === 'success') {
      console.log('Transcript save succeeded but no success status', result);
      return null;
    }

    console.log('appendCallWithTranscript Transcript saved for call:', result);
    return result;

  } catch (error) {
    const errorInfo = {
      status: 'error',
      message: 'Failed to save transcript',
      details: null
    };

    if (error.response) {
      errorInfo.details = {
        status: error.response.status,
        data: error.response.data
      };
      console.error('Transcript API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      errorInfo.details = 'No response received';
      console.error('Transcript API No response:', error.request);
    } else {
      errorInfo.details = error.message;
      console.error('Transcript API Setup error:', error.message);
    }

    // Return error object instead of throwing
    return errorInfo;
    
    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorInfo;
  }
}


 export async function uploadRecordingViaCustomAPI({
  fileBlob,
  filename,
  doctype,
  docname,
  apiKey,
  apiSecret,
  baseUrl
}) {
  try {
    // Validate required parameters
    if (!fileBlob || !(fileBlob instanceof Blob)) {
      throw new Error('Invalid or missing Blob object.');
    }
    if (!filename || !doctype || !docname || !apiKey || !apiSecret || !baseUrl) {
      throw new Error('Missing required upload parameters.');
    }

    console.log('filename: ', filename);
    console.log('doctype: ', doctype);
    console.log('docname: ', docname);
    console.log('baseUrl: ', baseUrl);

    // Convert blob to base64
    const buffer = await fileBlob.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    // Build payload
    const payload = {
      filename,
      content_base64: base64Data,
      doctype,
      docname
    };
    const apiurl= `${baseUrl}aiagentapp.api.file_upload.upload_call_recording`;
    console.log('API URL:', apiurl);
    const response = await fetch(apiurl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    

    if (!response.ok || result.error) {
      console.log('result error:', result);
      console.log('[uploadRecordingViaCustomAPI] Upload failed:', result.error || result);
      return { success: false, error: result.error || response.statusText };
    }

    console.log('[uploadRecordingViaCustomAPI] Upload successful:', result);
    return { success: true, result };

  } catch (error) {
    console.log('[uploadRecordingViaCustomAPI] Upload error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getCallSessionDocname(callId) {
  try {
    

    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.get_call_session_docname`,
        { callid: callId },   // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );
    console.log('getCallSessionDocname Response:', response.data);
    const result = response.data;
    if (!result.message) {
      console.log('Call log succeeded but no message returned');
      return null;
    }

    console.log('Call session logged:', result.message);
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to log call session',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('getCallSessionDocname Request setup error:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}


export async function save_phone_company_log(callData) {
  try {
    

    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.save_phone_company_log`,
       JSON.stringify(callData),  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const result = response.data;
    if (!result.message) {
      console.log('Phone Company Call log succeeded but no message returned');
      return null;
    }

    //console.log('Call session logged:', result.message);
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to Phone Company log call ',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('Request setup error:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}

export async function log_call_joined_event(callData) {
  try {
    

    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.log_call_joined_event`,
       JSON.stringify(callData),  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const result = response.data;
    if (!result.message) {
      console.log('Joined Call log succeeded but no message returned');
      return null;
    }

    //console.log('Call session logged:', result.message);
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to log Join call session',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('JoinCall API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server for joincall';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('Request setup error on Join Call:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}
export async function getCallStatusDocnameExist(callId) {
  if (!callId) {
    console.error('Missing callId in getCallStatusDocnameExist');
    return { success: false, error: 'Missing callId' };
  }

  try {
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.check_doc_joincall_exist`,
      { callid: callId },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const result = response.data;
    console.log('getCallStatusDocnameExist result:', result);

    console.log('result.message', result.message);
    console.log('result.message?.success', result.message?.success);
    console.log('result.message?.message?.name', result.message?.message?.name);

    if (result.message?.success && result?.message?.message?.name) {    
      console.log('Found match');
      return {
        success: true,
        docname: result?.message?.message?.name
      };
    } else {
      return {
        success: false,
        info: result.info || 'No matching record found.'
      };
    }
  } catch (error) {
    console.log('[getCallStatusDocnameExist] Error:', error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}
//OUTBOUND CALLS
export async function GET_outboundSETTINGS() {
  try {    

    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.outbound.get_outbound_settings`,
       {}, // Empty body, as no parameters are passed
       
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );    
    const result = response.data;
    if (!result.message) {
      console.log('Call log succeeded but no message returned');
      return null;
    }

    //console.log('Call session logged:', result.message);
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to log call session',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('GET_outboundSETTINGS Request setup error:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}

export async function GET_teleCreden(phone_num) {
  try {    
     
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.outbound.get_teleCreden`,
        {phone_num} ,  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );    
    const result = response.data;
    if (!result.message) {
      console.log('Tele Creden succeeded but no message returned');
      return null;
    }
    
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to log Tele Creden',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('GET_teleCreden Request setup error:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}

export async function get_business_jobs_Schedule(active_calls) {

  try {  
    logMessage('active_calls : ',active_calls);  
    console.log('active_calls : ',active_calls);
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.outbound.get_business_jobs_Schedule`,
       {active_calls},  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );    
    const result = response.data;
    // console.log('GET_businessJOBS Response:', result);
    if (!result.message) {
      logMessage('get_business_jobs_Schedule succeeded but no message returned');
      //console.log('get_business_jobs_Schedule succeeded but no message returned');
      return null;
    }
    // Call your outbound AI function here
    if(result.message.data.length!==0)
    {
      //logMessage('get_business_jobs_Schedule succeeded but no message returned');
      logMessage('** Found Queue JOBS :', result.message.data.length);
      logMessage('** Found active_calls_count :', active_calls);
      logMessage('Found Queue JOBS result.message.data:', result.message.data);

      await triggerOutboundCall(result.message.data);
    }else
    {
      //console.log('NO Outbound Call record found');
      logMessage('NO Outbound Call record found');
    }
    
    // console.log('GET_businessJOBS Here:', result.message);
    logMessage('get_business_jobs_Schedule Done: Count : ',result.message.data.length);
    //console.log('get_business_jobs_Schedule Done: Count : ',result.message.data.length);
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to log call session',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('get_business_jobs_Schedule Request setup error:', error.message);
      console.log('GET_buget_business_jobs_Schedule  Request setup error:', error);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}

export async function GET_businessJOBS(active_calls) {

  try {    
    // console.log('active_calls : ',active_calls);
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.outbound.get_business_jobs`,
       {active_calls},  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );    
    const result = response.data;
    // console.log('GET_businessJOBS Response:', result);
    if (!result.message) {
      console.log('GET_businessJOBS succeeded but no message returned');
      return null;
    }
    // Call your outbound AI function here
    if(result.message.data.length!==0)
    {
      console.log('** Found Queue JOBS :', result.message.data.length);
      console.log('** Found active_calls_count :', active_calls);
      console.log('Found Queue JOBS result.message.data:', result.message.data);

      await triggerOutboundCall(result.message.data);
    }else
    {
      console.log('NO Outbound Call record found');
    }
    
    // console.log('GET_businessJOBS Here:', result.message);
    console.log('GET_businessJOBS Done: Count : ',result.message.data.length);
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to log call session',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('GET_businessJOBS Request setup error:', error.message);
      console.log('GET_businessJOBS Request setup error:', error);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}

export async function fetchTelecomNumberByPhone(phoneNumber) {
  if (!phoneNumber) {
    console.error('phoneNumber is required');
    return null;
  }

  try {
    const response = await axios.get(
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.get_telecom_by_phone`,
      {
        params: { phone_number: phoneNumber },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );
     
    const data = response.data;
    console.log('data : ',data);

    if (!data?.message?.success || !data.message) {
      console.log('No Telecom record found for phone number:', phoneNumber);
      return null;
    }

    console.log('Telecom record found:', data.message);
    return data.message.data;

  } catch (error) {
    if (error.response) {
      console.error('ERP API error:', error.response.status, error.response.statusText, error.response.data);
    } else if (error.request) {
      console.error('No response from ERP API:', error.request);
    } else {
      console.error('Unexpected error:', error.message);
    }

    return null;
  }
}

export async function hangupCall(callid, hangup_by,
   companyid,toNumber,fromNumber,direction,
       intent_from, ResponseAccuracy,
     KnowledgeLimitationHandling, ConfidenceandClarity,ToneandEmpathy,
     EscalationHandling,CustomerSatisfactionOutcome,CustomerBehavior,
     CustomerEffortLevel,ConversationCompletion,EmotionalShiftDuringConversation,
     BackgroundNoiseLevelCustomer,BackgroundNoiseLevelAI,CallDisruptionDueToNoiseOrAudioQuality,
     OverallConversationQuality,callIntent,CallerToneandEmpathy
) {
  if (!callid || !hangup_by) {
    console.error('callid and hangup_by are required');
    return null;
  }

  try {

      const request= {
      "callid": callid,
      "hangup_by": hangup_by,
      "companyid": companyid,
      "toNumber": toNumber,
      "fromNumber": fromNumber,
      "direction": direction,
      "intent_from":intent_from,
      "ResponseAccuracy": ResponseAccuracy,
      "KnowledgeLimitationHandling": KnowledgeLimitationHandling,
      "ConfidenceandClarity": ConfidenceandClarity,
      "ToneandEmpathy": ToneandEmpathy,
      "EscalationHandling": EscalationHandling,
      "CustomerSatisfactionOutcome": CustomerSatisfactionOutcome,
      "CustomerBehavior": CustomerBehavior,      
      "CustomerEffortLevel": CustomerEffortLevel,
      "ConversationCompletion": ConversationCompletion,
      "EmotionalShiftDuringConversation": EmotionalShiftDuringConversation,
      "BackgroundNoiseLevelCustomer": BackgroundNoiseLevelCustomer,
      "BackgroundNoiseLevelAI": BackgroundNoiseLevelAI,
      "CallDisruptionDueToNoiseOrAudioQuality": CallDisruptionDueToNoiseOrAudioQuality,
      "OverallConversationQuality": OverallConversationQuality,
      "callIntent": callIntent,
      "CallerToneandEmpathy": CallerToneandEmpathy
    };


    const response = await axios.post(      
      `${ERP_API_BASE_URL}aiagentapp.api.aiapi.hangup_call_api`,         
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

    const data = response.data;
    // console.log('Hangup API Response:', data);
    return data;

  } catch (error) {
    if (error.response) {
      console.error(
        'Frappe API error:',
        error.response.status,
        error.response.statusText,
        error.response.data
      );
    } else if (error.request) {
      console.error('No response from Frappe API:', error.request);
    } else {
      console.error('Unexpected error:', error.message);
    }
    return null;
  }
}
// Simulated outbound call function (replace with your own)

export async function update_jobStatus(name,prompt_status,sid,updated_time,callduration) {
  try {    
     console.log('update_jobStatus name:', name);
     console.log('update_jobStatus sid:', sid);
     console.log('update_jobStatus prompt_status:', prompt_status);

    const payload = {
      name,
      prompt_status,
      sid,
      updated_time,
      callduration
    };
    console.log('update_jobStatus Payload:', payload);
    const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.outbound.update_job_status`,
        {name,prompt_status,sid,updated_time,callduration} ,  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );    
    const result = response.data;
    if (!result.message) {
      console.log('Job Status succeeded but no message returned');
      return null;
    }
    
    return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to update Job Status',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('update_jobStatus Request setup error:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}

export async function update_callstatus_whevent(payload) {

  try {
    
      const response = await axios.post(
      `${ERP_API_BASE_URL}aiagentapp.api.outbound.update_callstatus_whevent`,
       JSON.stringify(payload),  // Send complete body directly
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${E_ADMIN_API_KEY}:${E_ADMIN_API_SECRET}`
        }
      }
    );

      const result = response.data;
      if (!result.message) {
        console.log('update_callstatus_whevent succeeded but no message returned');
        return null;
      }

      //console.log('Call session logged:', result.message);
      return result;

  } catch (error) {
    // Unified error handling
    const errorResponse = {
      status: 'error',
      message: 'Failed to call status',
      details: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.details = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      console.log('JoinCall API Error Response:', errorResponse.details);
    } else if (error.request) {
      // No response received
      errorResponse.details = 'No response from server for call status';
      console.log('No response received:', error.request);
    } else {
      // Setup error
      errorResponse.details = error.message;
      console.log('Request setup error on call status:', error.message);
    }

    // Return error object instead of throwing
    return errorResponse;

    // Optional: Throw in development
    // if (process.env.NODE_ENV === 'development') throw error;
    // return errorResponse;
  }
}
 