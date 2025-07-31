let outboundSETTINGS={};
let businessData = [];
let companyBusinessData = undefined;
let businessbyPhoneNumber= undefined;

export  function setoutboundSETTINGS(data) {
  console.log('All company business Setting businesses in cache:', data);
  outboundSETTINGS = data;

}

export function getoutboundSETTINGS() {
  return outboundSETTINGS;
}

export function setBusinesses(data) {
  console.log('All company business Setting businesses in cache:', data);
  businessData = data;

}

export function getBusinesses() {
  return businessData;
}


export function setCompanyBusiness(data) {
  console.log('Setting companyBusinessData in cache:', data);
  companyBusinessData = data;

}

export function getCompanyBusiness() {
  return companyBusinessData;
}




export function setbusinessbyPhoneNumber(data) {
  console.log('Setting setbusinessbyPhoneNumber in cache:', data);
  businessbyPhoneNumber = data;

}

export function getbusinessbyPhoneNumber() {
  return businessbyPhoneNumber;
}