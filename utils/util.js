    // export const formattedTime = 
    //   new Date().toLocaleString('en-GB', {
    //       timeZone: 'Europe/London',
    //       hour12: false
    //     });


// export const  formattedTime = new Date().toUTCString();
export const formattedTime = new Date().toUTCString().replace('GMT', '+0000');