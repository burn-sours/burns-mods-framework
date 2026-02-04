# Function: Clone

## Description
Optimized memory copy function. Copies a block of bytes from a source address to a destination address using size-optimized paths — direct register copies for small sizes (1–32 bytes), SIMD-accelerated (SSE/AVX) block copies for larger sizes, and non-temporal stores for very large copies (>1.5 MB) to avoid polluting the CPU cache.

Useful as a fast native alternative to Frida's JavaScript-level memory copy when cloning entity data, world state, or other large structures.

## Notes
- Handles overlapping regions: copies backwards when destination is above source within the copy range.
- Returns the destination pointer (same as param 0).
- For sizes 0–15, uses direct byte/word/dword copies with no loop overhead.
- For sizes 16–32, copies from both ends using 16-byte reads.
- For sizes 33–128, uses aligned 16-byte block copies.
- For sizes >128, uses unrolled 128-byte loops with either register copies or SIMD instructions depending on size thresholds.
- For sizes >1.5 MB, uses non-temporal (streaming) stores to bypass the CPU cache.

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Call`                         |
| Params    | `pointer, pointer, uint64`     |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                                  |
|-----|-----------|----------------------------------------------|
| 0   | `pointer` | Destination address to copy to               |
| 1   | `pointer` | Source address to copy from                   |
| 2   | `uint64`  | Number of bytes to copy                      |

### Return Values

| Value     | Description                                  |
|-----------|----------------------------------------------|
| `pointer` | Returns the destination pointer (param 0)    |

## Usage
### Calling from mod code
```javascript
// Copy a block of memory from src to dest
const dest = Memory.alloc(size);
game.callFunction(game.module, 'Clone', dest, src, size);
```

## Pseudocode
```
function Clone(dest, src, size):
    if size == 0: return dest

    // Small copies (1-15 bytes): direct register-width copies
    if size <= 15:
        copy using byte/word/dword-sized reads and writes
        return dest

    // Medium copies (16-32 bytes): two 16-byte block copies from each end
    if size <= 32:
        copy first 16 bytes
        copy last 16 bytes (may overlap with first)
        return dest

    // Check for overlapping regions (dest within src..src+size)
    if dest > src and dest < src + size:
        copy backwards in 16-byte aligned blocks from end to start
        return dest

    // Forward copy path:
    // Align destination to 16-byte (or 32-byte for AVX) boundary
    // Copy in unrolled 128-byte loops

    if size > ~1.5 MB and AVX available:
        // Very large: use non-temporal (streaming) stores
        // Bypasses CPU cache for better throughput
        copy in 256-byte AVX blocks using vmovntdq
    else if size > 128:
        // Large: use register-width unrolled copies
        copy in 128-byte unrolled blocks
    
    // Handle remaining bytes via size-indexed jump table
    return dest
```
