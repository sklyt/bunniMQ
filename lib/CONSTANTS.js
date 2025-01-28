// OPS

export const CREATE = 0x1
export const READ = 0x2
export const PUBLISH = 0x3
export const ACK = 0x4
export const OPTS = 0x5
export const NEWQUEUE = 0x6

// FLAGS 

export const NOOPTS = 0x00
export const JSONENCODED = 0x01



// current version 

export const PROTOCOL_VERSION = 0x0001


// MISC
export const ERROR = 0xFF
export const SUCCESS = 0xFE



// message 
export const PENDING = 0x1
export const DELIVERED = 0x2
export const FAILEDACK = 0x4
