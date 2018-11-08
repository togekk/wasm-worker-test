import wasmWorker from 'wasm-worker';


(async () => {
    const options = {
        getImportObject: () => {
            return {
                env: {
                    memory: new WebAssembly.Memory({ initial: 10 }),
                    abort: (filename, line, column) => {
                        throw Error("abort called at " + line + ":" + column);
                    }
                },
                loader: instance => {

                    const hasBigInt64 = typeof BigUint64Array !== "undefined";

                    function getStringImpl(U32, U16, ptr) {
                        var dataLength = U32[ptr >>> 2];
                        var dataOffset = (ptr + 4) >>> 1;
                        var dataRemain = dataLength;
                        var parts = [];
                        const chunkSize = 1024;
                        while (dataRemain > chunkSize) {
                            let last = U16[dataOffset + chunkSize - 1];
                            let size = last >= 0xD800 && last < 0xDC00 ? chunkSize - 1 : chunkSize;
                            let part = U16.subarray(dataOffset, dataOffset += size);
                            parts.push(String.fromCharCode.apply(String, part));
                            dataRemain -= size;
                        }
                        return parts.join("") + String.fromCharCode.apply(String, U16.subarray(dataOffset, dataOffset + dataRemain));
                    }

                    var rawExports = instance.exports;
                    var memory = rawExports.memory;
                    var memory_allocate = rawExports["memory.allocate"];
                    var memory_fill = rawExports["memory.fill"];
                    var memory_free = rawExports["memory.free"];
                    var table = rawExports.table;
                    var setargc = rawExports._setargc || function () { };

                    var buffer, I8, U8, I16, U16, I32, U32, F32, F64, I64, U64;
                    var baseModule: any = new Object();

                    function checkMem() {
                        if (buffer !== memory.buffer) {
                            buffer = memory.buffer;
                            I8 = new Int8Array(buffer);
                            U8 = new Uint8Array(buffer);
                            I16 = new Int16Array(buffer);
                            U16 = new Uint16Array(buffer);
                            I32 = new Int32Array(buffer);
                            U32 = new Uint32Array(buffer);
                            if (hasBigInt64) {
                                I64 = new BigInt64Array(buffer);
                                U64 = new BigUint64Array(buffer);
                            }
                            F32 = new Float32Array(buffer);
                            F64 = new Float64Array(buffer);
                        }
                    }
                    checkMem();

                    function newString(str) {
                        var dataLength = str.length;
                        var ptr = memory_allocate(4 + (dataLength << 1));
                        var dataOffset = (4 + ptr) >>> 1;
                        checkMem();
                        U32[ptr >>> 2] = dataLength;
                        for (let i = 0; i < dataLength; ++i) U16[dataOffset + i] = str.charCodeAt(i);
                        return ptr;
                    }

                    baseModule.newString = newString;

                    function getString(ptr) {
                        checkMem();
                        return getStringImpl(U32, U16, ptr);
                    }

                    baseModule.getString = getString;

                    function computeBufferSize(byteLength) {
                        const HEADER_SIZE = 8;
                        return 1 << (32 - Math.clz32(byteLength + HEADER_SIZE - 1));
                    }

                    function newArray(view, length, unsafe) {
                        var ctor = view.constructor;
                        if (ctor === Function) {
                            ctor = view;
                            view = null;
                        } else {
                            if (length === undefined) length = view.length;
                        }
                        var elementSize = ctor.BYTES_PER_ELEMENT;
                        if (!elementSize) throw Error("not a typed array");
                        var byteLength = elementSize * length;
                        var ptr = memory_allocate(12);
                        var buf = memory_allocate(computeBufferSize(byteLength));
                        checkMem();
                        U32[ptr >>> 2] = buf;
                        U32[(ptr + 4) >>> 2] = 0;
                        U32[(ptr + 8) >>> 2] = byteLength;
                        U32[buf >>> 2] = byteLength;
                        U32[(buf + 4) >>> 2] = 0;
                        if (view) {
                            new ctor(buffer, buf + 8, length).set(view);
                            if (view.length < length && !unsafe) {
                                let setLength = elementSize * view.length;
                                memory_fill(buf + 8 + setLength, 0, byteLength - setLength);
                            }
                        } else if (!unsafe) {
                            memory_fill(buf + 8, 0, byteLength);
                        }
                        return ptr;
                    }

                    baseModule.newArray = newArray;

                    function getArray(ctor, ptr) {
                        var elementSize = ctor.BYTES_PER_ELEMENT;
                        if (!elementSize) throw Error("not a typed array");
                        checkMem();
                        var buf = U32[ptr >>> 2];
                        var byteOffset = U32[(ptr + 4) >>> 2];
                        var byteLength = U32[(ptr + 8) >>> 2];
                        return new ctor(buffer, buf + 8 + byteOffset, (byteLength - byteOffset) / elementSize);
                    }

                    baseModule.getArray = getArray;

                    function freeArray(ptr) {
                        checkMem();
                        var buf = U32[ptr >>> 2];
                        memory_free(buf);
                        memory_free(ptr);
                    }

                    baseModule.freeArray = freeArray;

                    function newFunction(fn) {
                        if (typeof fn.original === "function") fn = fn.original;
                        var index = table.length;
                        table.grow(1);
                        table.set(index, fn);
                        return index;
                    }

                    baseModule.newFunction = newFunction;

                    function getFunction(ptr) {
                        return wrapFunction(table.get(ptr), setargc);
                    }

                    baseModule.getFunction = getFunction;

                    return Object.defineProperties(baseModule, {
                        I8: { get: function () { checkMem(); return I8; } },
                        U8: { get: function () { checkMem(); return U8; } },
                        I16: { get: function () { checkMem(); return I16; } },
                        U16: { get: function () { checkMem(); return U16; } },
                        I32: { get: function () { checkMem(); return I32; } },
                        U32: { get: function () { checkMem(); return U32; } },
                        I64: { get: function () { checkMem(); return I64; } },
                        U64: { get: function () { checkMem(); return U64; } },
                        F32: { get: function () { checkMem(); return F32; } },
                        F64: { get: function () { checkMem(); return F64; } }
                    });

                    function wrapFunction(fn, setargc) {
                        var wrap = (...args) => {
                            setargc(args.length);
                            return fn(...args);
                        }
                        wrap.original = fn;
                        return wrap;
                    }



                }
            }
        }
    }
    const wasm = await wasmWorker('optimized.wasm', options);

    await wasm.run(({ instance, params, importObject }) => {
        const loader = importObject.loader(instance);
        const wasm = instance.exports;
        const arr = loader.getArray(Float64Array, wasm.get_array(10));
        console.log(arr);
    }, [{ test: 'test' }])
})();
