// utils/config.js
import 'dotenv/config';

export const TOOLS_BASE_URL = process.env.TOOLS_BASE_URL;
export const BUSINESS_GROUP_ID = process.env.BUSINESS_GROUP_ID;
export const ERP_API_BASE_URL = process.env.ERP_API_BASE_URL;
export const CREATE_LOG_CALL_REQUEST_LOGGER = process.env.CREATE_LOG_CALL_REQUEST_LOGGER;
export const ULTRAVOX_API_KEY= process.env.ULTRAVOX_API_KEY;
export const ULTRAVOX_API_URL= process.env.ULTRAVOX_API_URL;
export const E_ADMIN_API_KEY = process.env.E_ADMIN_API_KEY;
export const E_ADMIN_API_SECRET = process.env.E_ADMIN_API_SECRET;
export const ERP_SESSION_LOG_URL = process.env.ERP_SESSION_LOG_URL;
export const ULTRAVOX_OUTBOUND_API_URL = process.env.ULTRAVOX_OUTBOUND_API_URL;
export const DELAY_BETWEEN_OUTBOUND_CALL = process.env.DELAY_BETWEEN_OUTBOUND_CALL;
export const CALL_STATUS_LOGGER = process.env.CALL_STATUS_LOGGER;
export const OUTBOUND_SERVER_LOG_ENABLED = process.env.OUTBOUND_SERVER_LOG_ENABLED;


export const PORT = process.env.PORT || 3006;