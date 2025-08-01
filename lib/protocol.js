import { JSONENCODED } from "./CONSTANTS.js";
import debugLib from "./utils.js";



// FIXME: uhm better protocol and protocol handling, very random protocol, no thought or inspiration behind it's creation. what does rabbitmq use as a protocol
// can we create a minimal version
/**
 * 
 * @param {Buffer} data 
 * @returns 
 */
export function parseProtocol(data){
   
    const parsed = {}
    parsed["flags"] = data.readInt8(1);
    parsed["length"] = data.readUint32BE(2)
    parsed["payload"] = data.subarray(6, 6+parsed["length"])

    try {
            parsed["meta"] =  parsed['flags'] == JSONENCODED ?  JSON.parse(data.subarray(6 + parsed["length"])) 
                                                    : data.subarray(6 + parsed["length"])
    } catch (error) {
        debugLib.Debug("protocol parser: JSON Parse", "error")
    }

    // console.dir(parsed)
    debugLib.Debug(parsed.payload.toString(), "info")
    debugLib.Debug(parsed.meta, "info")
  
    return parsed
}