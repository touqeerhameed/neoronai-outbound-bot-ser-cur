// utils/twilioUtils.js
import twilio from 'twilio';
import { getbusinessbyPhoneNumber } from '../api/erpcall.js';


export async function fetchCallDetails(callSid,From) {
  try {
    if (!callSid) throw new Error('Missing call SID');

    //GET COMPANY DETAIL
    console.log('📞 Fetching call details for From:', From);
    const company = await getbusinessbyPhoneNumber(From);
    if (!company) {
      console.error(`❌ No company found for phone number: ${From}`);
      return null;
    }
    console.log('📞 Company details:', company);
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    const call = await client.calls(callSid).fetch();

    return {
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
      from: call.from,
      to: call.to,
      status: call.status,
      sid: call.sid
    };
  } catch (err) {
    console.error(`❌ fetchCallDetails failed for SID ${callSid}:`, err.message);
    return null;
  }
}
