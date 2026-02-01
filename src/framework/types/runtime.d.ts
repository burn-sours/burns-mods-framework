/**
 * Type declarations for the Frida runtime context.
 * These globals are available inside mod callbacks (hooks, loops, callables).
 */

// -- Frida built-ins --

declare class NativePointer {
    constructor(v: string | number | NativePointer);
    add(v: number | NativePointer): NativePointer;
    sub(v: number | NativePointer): NativePointer;
    and(v: number | NativePointer): NativePointer;
    or(v: number | NativePointer): NativePointer;
    xor(v: number | NativePointer): NativePointer;
    shr(v: number): NativePointer;
    shl(v: number): NativePointer;
    not(): NativePointer;
    equals(v: NativePointer): boolean;
    compare(v: NativePointer): number;
    isNull(): boolean;
    toInt32(): number;
    toUInt32(): number;
    toString(radix?: number): string;

    readS8(): number;
    readU8(): number;
    readS16(): number;
    readU16(): number;
    readS32(): number;
    readU32(): number;
    readS64(): Int64;
    readU64(): UInt64;
    readFloat(): number;
    readDouble(): number;
    readPointer(): NativePointer;
    readByteArray(length: number): ArrayBuffer;
    readUtf8String(size?: number): string;
    readUtf16String(length?: number): string;

    writeS8(value: number): NativePointer;
    writeU8(value: number): NativePointer;
    writeS16(value: number): NativePointer;
    writeU16(value: number): NativePointer;
    writeS32(value: number): NativePointer;
    writeU32(value: number): NativePointer;
    writeS64(value: number | Int64): NativePointer;
    writeU64(value: number | UInt64): NativePointer;
    writeFloat(value: number): NativePointer;
    writeDouble(value: number): NativePointer;
    writePointer(value: NativePointer): NativePointer;
    writeByteArray(value: ArrayBuffer | number[]): NativePointer;
    writeUtf8String(value: string): NativePointer;
}

declare class Int64 {
    constructor(v: string | number);
    toNumber(): number;
    toString(radix?: number): string;
}

declare class UInt64 {
    constructor(v: string | number);
    toNumber(): number;
    toString(radix?: number): string;
}

declare function ptr(v: string | number): NativePointer;
declare const NULL: NativePointer;

declare function send(message: any, data?: ArrayBuffer | number[]): void;
declare function recv(type: string, callback: (message: any) => void): void;

declare class NativeFunction extends NativePointer {
    constructor(address: NativePointer, returnType: string, argTypes: string[]);
}

declare class NativeCallback extends NativePointer {
    constructor(callback: (...args: any[]) => any, returnType: string, argTypes: string[]);
}

declare namespace Memory {
    function alloc(size: number): NativePointer;
    function allocUtf8String(str: string): NativePointer;
    function copy(dst: NativePointer, src: NativePointer, n: number): void;
    function protect(address: NativePointer, size: number, protection: string): boolean;
}

declare namespace Module {
    function findBaseAddress(name: string): NativePointer | null;
    function findExportByName(moduleName: string | null, exportName: string): NativePointer | null;
}

declare namespace Process {
    const pointerSize: number;
    const platform: string;
    const arch: string;
    function enumerateModules(): Array<{ name: string; base: NativePointer; size: number; path: string }>;
}

declare namespace Interceptor {
    function attach(target: NativePointer, callbacks: {
        onEnter?: (this: InvocationContext, args: InvocationArguments) => void;
        onLeave?: (this: InvocationContext, retval: InvocationReturnValue) => void;
    }): InvocationListener;
    function replace(target: NativePointer, replacement: NativeCallback): void;
    function revert(target: NativePointer): void;
}

interface InvocationContext {
    returnAddress: NativePointer;
    context: { [reg: string]: NativePointer };
    threadId: number;
}

interface InvocationArguments {
    [index: number]: NativePointer;
}

interface InvocationReturnValue extends NativePointer {
    replace(value: NativePointer | number): void;
}

interface InvocationListener {
    detach(): void;
}

// -- Game runtime (global) --

declare const game: GameRuntime;

interface GameRuntime {
    /** Resolve a module-relative offset to an absolute address, optionally chasing a pointer. */
    resolveAddress(moduleName: string, offset: number, pointer?: number): NativePointer | null;

    /** Read a named variable from the patch address table. */
    readVar(moduleName: string, name: string): any;

    /** Write a value to a named variable. */
    writeVar(moduleName: string, name: string, value: any): void;

    /** Get the resolved NativePointer for a named variable. */
    getVarPtr(moduleName: string, name: string): NativePointer;

    /** Read a block variable (returns ArrayBuffer). */
    readBlock(moduleName: string, name: string): ArrayBuffer;

    /** Read raw memory at an address with a given type. */
    readMemory(address: string | NativePointer, type: string): any;

    /** Write raw memory at an address with a given type. */
    writeMemory(address: string | NativePointer, type: string, value: any): void;

    /** Read a pointer value at the given address. */
    readPointer(address: string | NativePointer): NativePointer;

    /** Allocate a block of memory. */
    alloc(size: number): NativePointer;

    /** Allocate a UTF-8 string in memory. */
    allocString(str: string): NativePointer;

    /** Register a native function from a hook definition for later calling. */
    registerFunction(moduleName: string, name: string, offset: string | number, returnType: string, paramTypes: string[]): void;

    /** Call a previously registered native function. */
    callFunction(moduleName: string, name: string, ...args: any[]): any;

    /** Check if a native function is registered. */
    hasFunction(moduleName: string, name: string): boolean;

    /** NOP out instructions at an address (backs up original bytes). */
    deleteInstruction(moduleName: string, address: string | number, size: number): void;

    /** Restore all NOPed instructions. */
    restoreInstructions(): void;

    /** Detach all hooks and revert all replacements. */
    cleanupHooks(): void;

    /** The game executable name (e.g. "tomb123.exe"). */
    readonly executable: string;

    /** The currently active game module name (e.g. "tomb1.dll") based on GameVersion. */
    readonly module: string | null;

    /** Check if a module is in this mod's supported modules list. */
    isModuleSupported(moduleName: string): boolean;

    /** Async delay. */
    delay(ms: number): Promise<void>;

    /** Dynamic mod state (set freely by mod code). */
    [key: string]: any;
}

// -- Game constants (union of tomb123 + tomb456) --

// Struct sizes
declare const ROOM_SIZE: number;
declare const ENTITY_SIZE: number;
declare const ENTITY_BONES_SIZE: number;
declare const ENTITY_POS_SIZE: number;
declare const ENTITY_POS_NO_ROT_SIZE: number;
declare const LARA_HAIR_SIZE: number;
declare const LARA_BASIC_SIZE: number;
declare const LARA_SHADOW_SIZE: number;
declare const LARA_APPEARANCE_SIZE: number;
declare const LARA_GUNFLAG_SIZE: number;
declare const AI_TRACKING_SIZE: number;
declare const PROJECTILE_SIZE: number;
declare const LARA_OUTFIT_SIZE: number;
declare const LARA_FACE_SIZE: number;

// Room field offsets
declare const ROOM_ENTITY_HEAD: number;

// Entity field offsets
declare const ENTITY_X: number;
declare const ENTITY_Y: number;
declare const ENTITY_Z: number;
declare const ENTITY_YAW: number;
declare const ENTITY_TILT: number;
declare const ENTITY_ROLL: number;
declare const ENTITY_LAST_X: number;
declare const ENTITY_ROOM: number;
declare const ENTITY_NEXT_IN_ROOM: number;
declare const ENTITY_NEXT_ID: number;
declare const ENTITY_HEALTH: number;
declare const ENTITY_BOX_INDEX: number;
declare const ENTITY_BONES: number;
declare const ENTITY_LAST_BONES: number;
declare const ENTITY_XZ_SPEED: number;
declare const ENTITY_Y_SPEED: number;
declare const ENTITY_CURRENT_STATE: number;
declare const ENTITY_TARGET_STATE: number;
declare const ENTITY_QUEUED_STATE: number;
declare const ENTITY_ANIM_ID: number;
declare const ENTITY_ANIM_FRAME: number;
declare const ENTITY_TIMER: number;
declare const ENTITY_FLAGS: number;
declare const ENTITY_BEHAVIOUR: number;
declare const ENTITY_STATUS: number;
declare const ENTITY_MODEL: number;
declare const ENTITY_DROP_1: number;
declare const ENTITY_DROP_2: number;
declare const ENTITY_DROP_3: number;
declare const ENTITY_DROP_4: number;
declare const ENTITY_PUSHBLOCK_BUSY: number;

// -- Logging globals --

/** Log a message to the UI log panel and stdout. */
declare function log(...args: any[]): void;

/** Log a warning to the UI log panel and stdout. */
declare function warn(...args: any[]): void;

/** Log an error to the UI log panel (red) and stderr. */
declare function error(...args: any[]): void;
