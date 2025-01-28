import { JSONENCODED } from "./CONSTANTS.js";
import debugLib from "./utils.js";




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
    parsed["meta"] =  parsed['flags'] == JSONENCODED ?  JSON.parse(data.subarray(6 + parsed["length"])) : data.subarray(6 + parsed["length"])
    // console.dir(parsed)
    debugLib.Debug(parsed.payload.toString(), "info")
    debugLib.Debug(parsed.meta.toString(), "info")
  
    return parsed
}