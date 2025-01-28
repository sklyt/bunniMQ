function createDebugLib() {
    let isDebugEnabled = false;
    let logLevel = 'info'; // Default log level
  
    const levels = ['error', 'warn', 'info', 'debug'];
  
    function Debug(enable, message, level = 'info') {
      if (enable && levels.indexOf(level) <= levels.indexOf(logLevel)) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
      }
    }
  
    function setDebug(enabled, level = 'info') {
      isDebugEnabled = enabled;
      logLevel = level;
    }
  
    return {
      Debug: (message, level) => Debug(isDebugEnabled, message, level),
      setDebug,
    };
  }
  
  // Usage example
  const debugLib = createDebugLib();

  




export function creatTimer(minutes){
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + minutes);


}


export default debugLib
  
